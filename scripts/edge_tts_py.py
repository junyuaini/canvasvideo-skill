#!/usr/bin/env python3
"""
edge_tts_py.py — CanvasVideo Skill 的 TTS 兜底实现（Python 版）

完整复刻 node-edge-tts 1.2.10 的能力：
  1. WebSocket DRM 协议（ConnectionId + Sec-MS-GEC + TrustedClientToken + 头）
  2. 流式接收音频（Path:audio 二进制帧）与字幕（Path:audio.metadata JSON）
  3. 字级字幕输出（与 node-edge-tts 同结构：{part, start, end}，ms 单位）
  4. 重试（指数退避 3s/6s/9s/...，最多 8 次）
  5. 文本按标点切分（默认 120 字/块）
  6. 字幕按标点切短（与 tts.js groupEntriesByPunctuation 行为一致）
  7. MP3 时长探测（48kbps CBR）+ 跨块 offset 累计（用真实音频时长）
  8. CLI 入口（被 prepare-voice.js 用 child_process 同步调用）

依赖：websockets>=11.0（已 pip install websockets）

CLI:
  python edge_tts_py.py --text "..." --voice zh-CN-YunxiNeural --output-dir <dir>

返回:
  stdout: "OK\t<mp3_path>\t<srt_path>\t<duration_ms>\t<subtitle_count>\t<voice>"
  exit 0: 成功
  exit 1: 失败
"""
import argparse
import asyncio
import hashlib
import json
import os
import random
import re
import struct
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import websockets

# ====== DRM 常量（与 node-edge-tts drm.js 保持一致）======
TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
CHROMIUM_FULL_VERSION = "143.0.3650.75"
WSS_BASE = (
    f"wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1"
    f"?TrustedClientToken={TRUSTED_CLIENT_TOKEN}"
    f"&Sec-MS-GEC={{SEC_MS_GEC}}&Sec-MS-GEC-Version=1-{CHROMIUM_FULL_VERSION}"
    f"&ConnectionId={{CONNECTION_ID}}"
)
WSS_HOST = "speech.platform.bing.com"
WSS_ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
USER_AGENT = (
    f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    f"(KHTML, like Gecko) Chrome/{CHROMIUM_FULL_VERSION.split('.')[0]}.0.0.0 "
    f"Safari/537.36 Edg/{CHROMIUM_FULL_VERSION.split('.')[0]}.0.0.0"
)

# ====== 默认值 ======
DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"
DEFAULT_RATE = "+0%"
DEFAULT_VOLUME = "+0%"
DEFAULT_PITCH = "+0Hz"
DEFAULT_LANG = "zh-CN"
DEFAULT_CHUNK_SIZE = 120
DEFAULT_TIMEOUT = 120  # 秒
MAX_RETRIES = 8
RETRY_BASE_MS = 3000

# 48kbps = 6000 bytes/s（CBR 固定比特率，与 tts.js getMp3DurationMsFromBuffer 一致）
MP3_BITRATE_BYTES_PER_SEC = 6000

# ====== 日志 ======
def log(level, msg, *args):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    line = f"{ts} [{level}] {msg}"
    if args:
        line += " " + " ".join(str(a) for a in args)
    print(line, file=sys.stderr, flush=True)


def info(msg, *a): log("INFO", msg, *a)
def warn(msg, *a): log("WARN", msg, *a)
def error(msg, *a): log("ERROR", msg, *a)


# ====== DRM：Sec-MS-GEC ======
def generate_sec_ms_gec():
    """与 node-edge-tts drm.js generateSecMsGecToken 完全一致。"""
    windows_file_time_epoch = 11644473600
    now_sec = int(time.time())
    ticks = (now_sec + windows_file_time_epoch) * 10_000_000
    rounded_ticks = ticks - (ticks % 3_000_000_000)
    str_to_hash = f"{rounded_ticks}{TRUSTED_CLIENT_TOKEN}"
    h = hashlib.sha256(str_to_hash.encode("ascii")).hexdigest().upper()
    return h


# ====== 文本切分（与 tts.js splitTextIntoChunks 一致）======
_PUNCT_PATTERN_SRC = r"，。！？…!?,?"
def _escape_re_chars(s):
    out = []
    for c in s:
        if c in r".*+?^${}()|[]\\":
            out.append("\\" + c)
        else:
            out.append(c)
    return "".join(out)


def split_text_into_chunks(text, chunk_size=DEFAULT_CHUNK_SIZE):
    if chunk_size <= 0:
        raise ValueError(f"chunkSize 必须为正数，当前: {chunk_size}")
    escaped = _escape_re_chars(_PUNCT_PATTERN_SRC)
    pattern = re.compile(
        rf"[^{escaped}]+(?:[{escaped}]|(?<!\d)\.(?!\d))?",
        re.UNICODE,
    )
    sentences = pattern.findall(text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        chunks = []
        for i in range(0, len(text), chunk_size):
            chunks.append(text[i:i + chunk_size])
        return chunks if chunks else [text]

    chunks = []
    current = ""
    for sentence in sentences:
        if len(sentence) >= chunk_size:
            if current:
                chunks.append(current)
                current = ""
            for j in range(0, len(sentence), chunk_size):
                chunks.append(sentence[j:j + chunk_size])
            continue
        if len(current) + len(sentence) > chunk_size and current:
            chunks.append(current)
            current = sentence
        else:
            current += sentence
    if current:
        chunks.append(current)
    return chunks


# ====== SRT 时间格式化 ======
def format_srt_time(ms: int) -> str:
    if ms < 0:
        ms = 0
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def serialize_srt(entries):
    lines = []
    for i, (start, end, text) in enumerate(entries, 1):
        lines.append(str(i))
        lines.append(f"{format_srt_time(start)} --> {format_srt_time(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


# ====== 短字幕聚合（与 tts.js groupEntriesByPunctuation 一致）======
_TRAILING_PUNCT_RE = re.compile(
    r"([，。！？；：、,!?;:\"\"''《》【】…—–]|(?<!\d)\.(?!\d))$"
)
_STRIP_PUNCT_RE = re.compile(
    r"[，。！？；：、,!?;:\"\"''《》【】…—–\s]+|(?<!\d)\.(?!\d)"
)
_DECIMAL_DOT_GUARD = re.compile(r"^\.$")

# 词内标点提取：把 "一千年了。" 拆成 "一千年了" + "。"
# 在 groupEntriesByPunctuation 入口处调用，把连续 entry.part 切干净
_INNER_PUNCT_SPLIT_RE = re.compile(
    r"(?<![,.!?;:])([，。！？；：、,!?;:\"\"''《》【】…—–])"
)


def _split_inner_punctuation(entries):
    """把每个 entry.part 里夹带的标点拆成独立 entry。
    例如 entry.part="了一千年了。" → ["了一千年了", "。"]
    返回新的 entries 列表（不修改原列表）。"""
    out = []
    for e in entries:
        raw = e.get("part") or ""
        if not raw:
            continue
        # 找所有标点位置，按位置切片
        last = 0
        chunks = []
        for m in _INNER_PUNCT_SPLIT_RE.finditer(raw):
            if m.start() > last:
                chunks.append(raw[last:m.start()])
            chunks.append(m.group(1))
            last = m.end()
        if last < len(raw):
            chunks.append(raw[last:])
        chunks = [c for c in chunks if c != ""]
        if len(chunks) <= 1:
            out.append(e)
            continue
        # 平均分配时间
        s, en = e["start"], e["end"]
        span = max(1, en - s)
        step = span / len(chunks)
        for i, c in enumerate(chunks):
            cs = s + int(step * i)
            ce = s + int(step * (i + 1))
            out.append({"part": c, "start": cs, "end": ce})
    return out


def _align_entries_to_source(entries, source_text):
    """用原文章节按标点切出 N 段，把 entry 流累计字数切分 + 总时间跨度均分。
    返回 [start, end, text] 列表。
    算法：
      1. source_text 按标点切出 N 个子句
      2. 累计 entry.part 字符数（过滤 SENTENCE 整段 part 避免重复）→ 找每个子句的 char 索引
      3. 子句 end 用"下一个子句的 entry 时间"或"块总结束时间"
    """
    if not source_text or not source_text.strip():
        return None
    # 按标点切原文（保留标点用于切分信号）
    sentence_puncts = re.compile(r"([，。！？；：、,!?;:\s]+)")
    parts = [p for p in sentence_puncts.split(source_text) if p]
    subs = []
    cur = []
    sentence_punct_chars = set("，。！？；：、,!?;:")
    for p in parts:
        is_punct = bool(sentence_puncts.fullmatch(p))
        if is_punct:
            if cur and any(ch in p for ch in sentence_punct_chars):
                subs.append("".join(cur))
                cur = []
        else:
            cur.append(p)
    if cur:
        subs.append("".join(cur))
    if not subs:
        return None

    # 过滤 SENTENCE 整段 part：只保留 wordBoundary 单字/词 entry
    WORD_PART_MAX_LEN = 10
    word_entries = []
    for e in entries:
        if isinstance(e, dict):
            raw = e.get("part") or ""
            es, ee = e.get("start", 0), e.get("end", 0)
        else:
            raw = getattr(e, "part", "") or ""
            es, ee = getattr(e, "start", 0), getattr(e, "end", 0)
        raw_clean = _STRIP_PUNCT_RE.sub("", raw)
        if not raw_clean:
            continue
        if len(raw_clean) > WORD_PART_MAX_LEN:
            # SENTENCE 整段 part：当作块结束时间锚点（不入字数累加）
            word_entries.append({"part": raw, "start": es, "end": ee, "is_sentence": True, "text_clean": raw_clean})
        else:
            word_entries.append({"part": raw, "start": es, "end": ee, "is_sentence": False, "text_clean": raw_clean})

    if not word_entries:
        return None

    # 总时间跨度：第一个 word entry start ~ 最后一个非 SENTENCE entry end 或 SENTENCE entry end
    first_es = word_entries[0]["start"]
    # 找最后一个 entry end（优先 SENTENCE，否则最后一个 word）
    last_ee = word_entries[-1]["end"]

    # 累计字数 + 时间戳定位
    result = []
    char_idx = 0
    sub_idx = 0
    sub_char_count = len(_STRIP_PUNCT_RE.sub("", subs[0]))
    sub_start_time = None
    sub_end_time = None
    for e in word_entries:
        if sub_start_time is None and not e["is_sentence"]:
            sub_start_time = e["start"]
        if e["is_sentence"]:
            # SENTENCE 整段 part：只作锚点（用其 end 作整个剩余的 end）
            if sub_idx < len(subs):
                # 剩余子句的 end 都用 SENTENCE part 的 end 平均分配
                remain = len(subs) - sub_idx
                # 此处不处理，由末尾统一补
                pass
            continue
        sub_end_time = e["end"]
        char_idx += len(e["text_clean"])
        if char_idx >= sub_char_count and sub_idx < len(subs) - 1:
            t = _STRIP_PUNCT_RE.sub("", subs[sub_idx]).strip()
            if t:
                result.append([sub_start_time if sub_start_time is not None else 0, sub_end_time if sub_end_time is not None else 0, t])
            sub_idx += 1
            if sub_idx < len(subs):
                sub_char_count += len(_STRIP_PUNCT_RE.sub("", subs[sub_idx]))
                sub_start_time = None
                sub_end_time = None
    # 末尾剩余子句：在 SENTENCE 整段 part 范围内按字数均分
    if sub_idx < len(subs):
        # 找 SENTENCE 整段 part 的 end 作为末尾时间锚点
        sentence_part_end = last_ee
        # 找 SENTENCE 整段 part 的 start 作为末尾时间起点
        sentence_part_start = None
        for e in word_entries:
            if e["is_sentence"]:
                sentence_part_start = e["start"]
                break
        if sentence_part_start is None:
            sentence_part_start = first_es
        # 当前子句起始时间用 sub_start_time（最后累积的最后 word entry start），如未设用 SENTENCE start
        cur_start = sub_start_time if sub_start_time is not None else sentence_part_start
        # 剩余子句在 [cur_start, sentence_part_end] 间按字数均分
        remain_count = len(subs) - sub_idx
        remain_chars = sum(len(_STRIP_PUNCT_RE.sub("", subs[i])) for i in range(sub_idx, len(subs)))
        cur_end = cur_start
        for i in range(sub_idx, len(subs)):
            t = _STRIP_PUNCT_RE.sub("", subs[i]).strip()
            if not t:
                continue
            sub_chars = len(_STRIP_PUNCT_RE.sub("", subs[i]))
            # 按字数比例分配时间
            if remain_chars > 0:
                span = max(1, sentence_part_end - cur_start)
                portion = sub_chars / remain_chars
                cur_end = cur_start + int(span * portion)
            else:
                cur_end = sentence_part_end
            result.append([cur_start, cur_end, t])
            cur_start = cur_end
    return result


def group_entries_by_punctuation(entries, source_text=None):
    """把字级 entries 按标点切出 N 个子句。
    优先用 source_text 精确对齐（如有），否则用协议标点切。
    """
    if source_text:
        aligned = _align_entries_to_source(entries, source_text)
        if aligned and len(aligned) >= 2:
            return aligned
    return _group_entries_by_protocol(entries)


def _group_entries_by_protocol(entries):
    entries = _split_inner_punctuation(entries)
    result = []
    buffer = []
    buf_start = None
    buf_end = None

    def flush():
        nonlocal buffer, buf_start, buf_end
        if not buffer:
            return
        text = _STRIP_PUNCT_RE.sub("", "".join(buffer)).strip()
        if text:
            result.append([buf_start, buf_end, text])
        buffer = []
        buf_start = None
        buf_end = None

    SENTENCE_BOUNDARY_PART_RE = re.compile(r"[\u4e00-\u9fff]{20,}")
    INTERNAL_SPLIT_RE = re.compile(r"([，。！？；：、,!?;:\s]+)")
    in_sentence_mode = False
    for entry in entries:
        if isinstance(entry, dict):
            raw = entry.get("part") or ""
            es, ee = entry.get("start", 0), entry.get("end", 0)
        else:
            raw = getattr(entry, "part", "") or ""
            es, ee = getattr(entry, "start", 0), getattr(entry, "end", 0)
        if not raw.strip():
            continue
        if SENTENCE_BOUNDARY_PART_RE.fullmatch(raw.strip()) and len(raw.strip()) >= 6:
            buffer = []
            buf_start = None
            buf_end = None
            text = raw.strip()
            sub_texts = [t for t in INTERNAL_SPLIT_RE.split(text) if t and not INTERNAL_SPLIT_RE.fullmatch(t)]
            sentence_puncts = set("，。！？；：、,!?;:")
            cur = []
            subs = []
            for tok in sub_texts:
                if INTERNAL_SPLIT_RE.fullmatch(tok):
                    if cur and any(p in tok for p in sentence_puncts):
                        subs.append("".join(cur))
                        cur = []
                else:
                    cur.append(tok)
            if cur:
                subs.append("".join(cur))
            if not subs:
                subs = [text]
            span = max(1, ee - es)
            step = span / len(subs)
            for i, t in enumerate(subs):
                s_i = es + int(step * i)
                e_i = es + int(step * (i + 1))
                t_clean = _STRIP_PUNCT_RE.sub("", t).strip()
                if t_clean:
                    result.append([s_i, e_i, t_clean])
            buf_start = None
            buf_end = None
            in_sentence_mode = True
            continue
        if in_sentence_mode:
            continue
        if buf_start is None:
            buf_start = es
        buf_end = ee
        m = _TRAILING_PUNCT_RE.search(raw)
        if m and not (
            _DECIMAL_DOT_GUARD.match(raw) and buffer and re.search(r"\d$", buffer[-1])
        ):
            word_part = raw[: m.start()].strip()
            if word_part:
                buffer.append(word_part)
            buffer.append(m.group(1))
            flush()
        else:
            buffer.append(raw.strip())
    flush()
    return result


# ====== MP3 时长探测（与 tts.js getMp3DurationMsFromBuffer 一致）======
def get_mp3_duration_ms(buf: bytes) -> int:
    if not buf:
        return 0
    header_size = 0
    if buf[0:3] == b"ID3":
        size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]
        header_size = 10 + size
    trailer_size = 0
    if len(buf) >= 128 and buf[-128] == 0x54 and buf[-127] == 0x41 and buf[-126] == 0x47:
        trailer_size = 128
    audio_bytes = len(buf) - header_size - trailer_size
    if audio_bytes <= 0:
        return 0
    return round((audio_bytes * 8) / 48)


# ====== 单块合成 ======
def escape_xml(unsafe: str) -> str:
    return (
        unsafe.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


async def _iter_messages(ws, timeout):
    """逐帧迭代 WebSocket 消息。带超时。"""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while True:
        remaining = deadline - loop.time()
        if remaining <= 0:
            raise asyncio.TimeoutError(f"Timed out (>{timeout}s)")
        msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        if isinstance(msg, (bytes, bytearray, memoryview)):
            yield bytes(msg)
        else:
            yield msg


async def _synthesize_inner(text, voice, rate, volume, pitch, lang, audio_path, sub_path, timeout):
    """合成一段文本到 audio_path，字幕条目写入 sub_path（JSON）。
    不做重试——重试在外层 synthesize_one_chunk_with_retry 包。"""
    sec_ms_gec = generate_sec_ms_gec()
    connection_id = str(uuid.uuid4()).replace("-", "")
    url = (
        f"wss://{WSS_HOST}/consumer/speech/synthesize/readaloud/edge/v1"
        f"?TrustedClientToken={TRUSTED_CLIENT_TOKEN}"
        f"&Sec-MS-GEC={sec_ms_gec}"
        f"&Sec-MS-GEC-Version=1-{CHROMIUM_FULL_VERSION}"
        f"&ConnectionId={connection_id}"
    )
    request_id = uuid.uuid4().hex

    # 配置帧（同步发送，按 node-edge-tts 行为）
    speech_config = (
        "Content-Type:application/json; charset=utf-8\r\n"
        "Path:speech.config\r\n\r\n"
        '{\n'
        '  "context": {\n'
        '    "synthesis": {\n'
        '      "audio": {\n'
        '        "metadataoptions": {\n'
        '          "sentenceBoundaryEnabled": "true",\n'
        '          "wordBoundaryEnabled": "true"\n'
        '        },\n'
        '        "outputFormat": "audio-24khz-48kbitrate-mono-mp3"\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}'
    )

    # SSML 帧
    ssml = (
        f"X-RequestId:{request_id}\r\n"
        f"Content-Type:application/ssml+xml\r\n"
        f"Path:ssml\r\n\r\n"
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        f'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="{lang}">\n'
        f'  <voice name="{voice}">\n'
        f'    <prosody rate="{rate}" pitch="{pitch}" volume="{volume}">\n'
        f'      {escape_xml(text)}\n'
        f'    </prosody>\n'
        f'  </voice>\n'
        f'</speak>'
    )

    audio_buf = bytearray()
    sub_entries = []  # 字级字幕
    turn_end_received = False

    extra_headers = {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Origin": WSS_ORIGIN,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
    }

    async with websockets.connect(
        url,
        additional_headers=extra_headers,
        max_size=None,
        ping_interval=None,
        ping_timeout=None,
        open_timeout=timeout,
    ) as ws:
        await ws.send(speech_config)
        await ws.send(ssml)

        async for raw in _iter_messages(ws, timeout):
            if isinstance(raw, bytes):
                sep = b"Path:audio\r\n"
                idx = raw.find(sep)
                if idx >= 0:
                    audio_buf.extend(raw[idx + len(sep):])
            else:
                msg = raw
                if "Path:turn.end" in msg:
                    turn_end_received = True
                    break
                if "Path:audio.metadata" in msg:
                    try:
                        payload = msg.split("\r\n\r\n")[-1]
                        data = json.loads(payload)
                        for elem in data.get("Metadata", []):
                            d = elem.get("Data", {})
                            txt = d.get("text", {}).get("Text", "")
                            offset = d.get("Offset", 0)
                            duration = d.get("Duration", 0)
                            sub_entries.append({
                                "part": txt,
                                "start": int(offset / 10000),
                                "end": int((offset + duration) / 10000),
                            })
                    except Exception as e:
                        warn(f"解析 Path:audio.metadata 失败：{e}")
                # Path:response 是流控帧，忽略

    if not turn_end_received:
        # 警告而非崩溃：服务器异常断开，但音频/字幕流可能已部分完整
        warn(f"未收到 Path:turn.end（已收到音频 {len(audio_buf)} 字节、字幕 {len(sub_entries)} 条），按当前数据出")
    if not audio_buf:
        raise RuntimeError("未获取到音频数据，请检查网络或音色名")

    Path(audio_path).write_bytes(bytes(audio_buf))
    Path(sub_path).write_text(
        json.dumps(sub_entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return audio_path, sub_path


# 重试包装要在 websockets.connect 之外
async def synthesize_one_chunk_with_retry(text, voice, rate, volume, pitch, lang, audio_path, sub_path, timeout):
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = await _synthesize_inner(
                text, voice, rate, volume, pitch, lang, audio_path, sub_path, timeout
            )
            if attempt > 1:
                info(f"第 {attempt} 次重试合成成功")
            return result
        except Exception as e:
            last_err = e
            msg = str(e)
            retriable = bool(re.search(
                r"ECONNRESET|ETIMEDOUT|socket hang up|429|503|ENOTFOUND|EAI_AGAIN|Timed out|Connection|WinError 64|WinError 10054|WebSocketException|Exception",
                msg, re.I,
            ))
            if not retriable or attempt == MAX_RETRIES:
                if attempt > 1:
                    error(f"合成失败（已重试 {attempt - 1} 次）：{msg}")
                raise
            delay = RETRY_BASE_MS * attempt / 1000.0
            warn(f"合成失败（第 {attempt}/{MAX_RETRIES} 次）：{msg}，{delay:.1f}s 后重试")
            await asyncio.sleep(delay)
    raise last_err


# 兼容旧 API 别名
synthesize_one_chunk = synthesize_one_chunk_with_retry


# ====== 检测文本不是 SRT ======
_SRT_TIMECODE_RE = re.compile(r"\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}")


def assert_not_srt(text):
    if isinstance(text, str) and _SRT_TIMECODE_RE.search(text):
        raise ValueError(
            "检测到输入文本含 SRT 时间戳（如 \"00:00:00,000 --> 00:00:08,500\"），TTS 不应朗读 SRT 原始格式。"
            "请传纯文本 .txt 文件（每行一段字幕，段末以中英文句号结尾），不要传 .srt。"
        )


# ====== 长文本合成 ======
async def synthesize_long_text(
    text, voice, rate, volume, pitch, lang, chunk_size, short_subtitle, timeout, output_dir
):
    assert_not_srt(text)
    chunks = split_text_into_chunks(text, chunk_size)
    info(f"文本分块: {len(chunks)} 块 | chunkSize={chunk_size} | 总字数={len(text)}")

    with tempfile.TemporaryDirectory(prefix="canvasvideo-tts-py-") as tmpdir:
        all_audio = []
        # 先用单块方式：每块存自己的 sub_entries，循环结束再 group
        chunks_data = []  # [(sub_entries, audio_bytes), ...]
        for i, chunk in enumerate(chunks, 1):
            info(f"合成第 {i}/{len(chunks)} 块（{len(chunk)} 字）")
            tmp_audio = os.path.join(tmpdir, f"chunk_{random.randrange(1<<32):08x}.mp3")
            tmp_sub = tmp_audio + ".json"
            await synthesize_one_chunk_with_retry(
                chunk, voice, rate, volume, pitch, lang, tmp_audio, tmp_sub, timeout
            )
            audio_bytes = Path(tmp_audio).read_bytes()
            sub_data = json.loads(Path(tmp_sub).read_text(encoding="utf-8"))
            sub_entries = sub_data if isinstance(sub_data, list) else []
            all_audio.append(audio_bytes)
            chunks_data.append((sub_entries, chunk, audio_bytes))
            info(
                f"第 {i}/{len(chunks)} 块完成 | 字级 {len(sub_entries)} 条"
            )

        # 单块时（<120字），整文 source_text 切 = chunk
        if len(chunks) == 1:
            base_entries = group_entries_by_punctuation(chunks_data[0][0], source_text=text)
            all_entries = base_entries
        else:
            # 多块：分别 group（单块 source_text = chunk），再叠加 offset
            all_entries = []
            offset_ms = 0
            for sub_entries, chunk, audio_bytes in chunks_data:
                base_entries = group_entries_by_punctuation(sub_entries, source_text=chunk)
                for s, e, txt in base_entries:
                    all_entries.append([s + offset_ms, e + offset_ms, txt])
                audio_duration_ms = get_mp3_duration_ms(audio_bytes)
                offset_ms += audio_duration_ms

        # 同步修复: 最后一条子句的 end 对齐到 audioDurationMs（避免比音频快 ~880ms-2s）
        # 原因：字级 entry.end 是 word 在流中的理论结束位置，不含 MP3 收尾静音 + ID3 padding
        # 末条对齐到真实音频时长，让字幕与音频同步
        # 注：方案 A（整体延展 ratio）会导致中段子句被挤压、出现短持续时间（如 98ms）的"瞬闪"问题，
        #     实际用户感知偏差主要在末条；前 N-1 条 end 偏小 ~880ms 落在音频句间静音区，对用户无感
        if all_entries:
            total_audio_duration_ms = sum(
                get_mp3_duration_ms(ad) for _, _, ad in chunks_data
            )
            all_entries[-1][1] = max(all_entries[-1][1], total_audio_duration_ms)

    if short_subtitle:
        info(f"字幕切短: {len(all_entries)} 条（已按标点切分）")
    else:
        info("短字幕关闭，保留当前切分")

    merged_srt = serialize_srt(all_entries)
    total_audio = b"".join(all_audio)
    info(f"合成完成 | 总音频 {len(total_audio)} 字节 | 总字幕 {len(all_entries)} 条")
    return total_audio, merged_srt, len(all_audio), all_entries


# ====== CLI ======
async def cli_main(args):
    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8").strip()
    elif args.text_path:
        text = Path(args.text_path).read_text(encoding="utf-8").strip()
    elif args.text:
        text = args.text.strip()
    else:
        error("必须传 --text / --text-file / --text-path")
        sys.exit(1)

    if not text:
        error("文本为空")
        sys.exit(1)
    if len(text) > 50000:
        error(f"文本过长（{len(text)} 字 > 50000 字上限）")
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    audio_path = output_dir / (args.audio_name or "voice.mp3")
    srt_path = output_dir / (args.srt_name or "subtitle.srt")

    info(
        f"textToAudioSrt | 音色={args.voice} | 字数={len(text)} | "
        f"输出 mp3={audio_path} srt={srt_path} | 短字幕={args.short_subtitle}"
    )

    audio_bytes, srt_text, _, all_entries = await synthesize_long_text(
        text=text,
        voice=args.voice,
        rate=args.rate,
        volume=args.volume,
        pitch=args.pitch,
        lang=args.lang,
        chunk_size=args.chunk_size,
        short_subtitle=args.short_subtitle,
        timeout=args.timeout,
        output_dir=output_dir,
    )

    if not audio_bytes:
        error("合成失败：未获取到音频数据")
        sys.exit(1)
    if not srt_text:
        warn("未获取到字幕数据，SRT 将为空文件")

    audio_path.write_bytes(audio_bytes)
    srt_path.write_text(srt_text, encoding="utf-8")

    # 提取最后一条字幕的 end 作为总时长
    duration_ms = all_entries[-1][1] if all_entries else 0

    # OK 标记 + 6 个字段（prepare-voice.js 解析用）
    print(
        "OK\t"
        + str(audio_path) + "\t"
        + str(srt_path) + "\t"
        + str(duration_ms) + "\t"
        + str(len(all_entries)) + "\t"
        + args.voice
    )
    info(f"输出完成 | mp3={audio_path} | srt={srt_path} | duration_ms={duration_ms} | subtitles={len(all_entries)}")


def parse_cli():
    p = argparse.ArgumentParser(description="edge_tts_py — CanvasVideo TTS 兜底（Python 版）")
    src = p.add_mutually_exclusive_group()
    src.add_argument("--text", help="直接传文本")
    src.add_argument("--text-file", help="从文件读文本（与 --text-file 同义）")
    src.add_argument("--text-path", help="从文件读文本")
    p.add_argument("--voice", default=DEFAULT_VOICE)
    p.add_argument("--rate", default=DEFAULT_RATE)
    p.add_argument("--volume", default=DEFAULT_VOLUME)
    p.add_argument("--pitch", default=DEFAULT_PITCH)
    p.add_argument("--lang", default=DEFAULT_LANG)
    p.add_argument("--chunk-size", type=int, default=DEFAULT_CHUNK_SIZE)
    p.add_argument("--short-subtitle", action="store_true", default=True)
    p.add_argument("--no-short-subtitle", dest="short_subtitle", action="store_false")
    p.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    p.add_argument("--output-dir", required=True, help="输出目录")
    p.add_argument("--audio-name", default="voice.mp3")
    p.add_argument("--srt-name", default="subtitle.srt")
    p.add_argument("--proxy", default=None, help="WSS 代理 URL（暂未实现）")
    return p.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(cli_main(parse_cli()))
    except Exception as e:
        error(f"FATAL: {e}")
        sys.exit(1)
