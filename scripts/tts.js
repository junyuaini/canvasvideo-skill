/**
 * CanvasVideo Skill - TTS 文本转音频模块（口播模式专用）
 *
 * 基于 node-edge-tts（微软 Azure 语音服务免费接口），把任意长度的中文文章
 * 转成带 SRT 字幕的 MP3 音频。是 CanvasVideo Skill 步骤 1.5（音频与字幕准备）
 * 的核心引擎。
 *
 * 依赖：
 *   - node-edge-tts（已在 canvasvideo-skill/package.json 中声明）
 *
 * 导出：
 *   - textToAudioSrt(options)  ：主 API，返回 [mp3Path, srtPath]
 *   - listChineseVoices()       ：返回中文声音清单（10 个常用 + 其它语种统计）
 *   - printVoiceList()          ：把声音清单打印到控制台（CLI 调试用）
 *   - DEFAULT_VOICE             ：'zh-CN-XiaoxiaoNeural'
 *
 * 引擎要求：Node.js >= 16
 */

const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ===== 常量配置 =====
const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const DEFAULT_RATE = '+0%';
const DEFAULT_VOLUME = '+0%';
const DEFAULT_PITCH = '+0Hz';
const DEFAULT_CHUNK_SIZE = 120;
const DEFAULT_TTS_MAX_RETRIES = 8;
const DEFAULT_TTS_RETRY_BASE_MS = 3000;

// ===== 日志工具 =====
function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}
function logInfo(msg, ...args) { console.log(`${ts()} [INFO] ${msg}`, ...args); }
function logWarn(msg, ...args) { console.warn(`${ts()} [WARN] ${msg}`, ...args); }
function logError(msg, ...args) { console.error(`${ts()} [ERROR] ${msg}`, ...args); }

// ===== 文本切分 =====
function splitTextIntoChunks(text, chunkSize = DEFAULT_CHUNK_SIZE) {
  if (chunkSize <= 0) {
    throw new Error(`chunkSize 必须为正数，当前: ${chunkSize}`);
  }
  const delims = '，。！？；…!?.;';
  const escaped = delims.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sentencePattern = new RegExp(`[^${escaped}]+[${escaped}]?`, 'g');
  let sentences = text.match(sentencePattern) || [];
  sentences = sentences.map(s => s.trim()).filter(Boolean);

  if (sentences.length === 0) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks.length ? chunks : [text];
  }

  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length >= chunkSize) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let j = 0; j < sentence.length; j += chunkSize) {
        chunks.push(sentence.substring(j, j + chunkSize));
      }
      continue;
    }
    if (current.length + sentence.length > chunkSize && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ===== SRT 工具 =====
function parseSrtTime(timeStr) {
  const [h, m, sms] = timeStr.split(':');
  const [s, ms] = sms.split(',');
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
}
function formatSrtTime(ms) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  ms %= 3600000;
  const m = Math.floor(ms / 60000);
  ms %= 60000;
  const s = Math.floor(ms / 1000);
  ms %= 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
function serializeSrt(entries) {
  if (!entries.length) return '';
  const lines = [];
  entries.forEach(([start, end, text], i) => {
    lines.push(String(i + 1));
    lines.push(`${formatSrtTime(start)} --> ${formatSrtTime(end)}`);
    lines.push(text);
    lines.push('');
  });
  return lines.join('\n');
}

// ===== 字幕聚合：把字级条目按标点切短 =====
const TRAILING_PUNCT_RE = /([，。！？；：、,!?;:\."""''《》【】…—–]+)\s*$/;
const STRIP_PUNCT_RE = /[，。！？；：、,!?;:\."""''《》【】…—–\s]+/g;
function groupEntriesByPunctuation(entries) {
  // entries: [{part, start, end}, ...] 毫秒时间戳
  const result = [];
  let buffer = [];
  let bufStart = null;
  let bufEnd = null;
  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join('').replace(STRIP_PUNCT_RE, '').trim();
    if (text) {
      result.push([bufStart, bufEnd, text]);
    }
    buffer = [];
    bufStart = null;
    bufEnd = null;
  };
  for (const entry of entries) {
    const raw = entry.part || '';
    if (!raw.trim()) continue;
    if (bufStart === null) bufStart = entry.start;
    bufEnd = entry.end;
    const punctMatch = raw.match(TRAILING_PUNCT_RE);
    if (punctMatch) {
      const wordPart = raw.slice(0, raw.length - punctMatch[0].length).trim();
      if (wordPart) buffer.push(wordPart);
      buffer.push(punctMatch[1]);
      flush();
    } else {
      buffer.push(raw.trim());
    }
  }
  flush();
  return result;
}

// ===== 入参校验 =====
function validateText(text) {
  if (!text || !text.trim()) {
    throw new Error('文章内容不能为空');
  }
}
function validateOutputDir(outputDir) {
  if (!outputDir || !outputDir.trim()) {
    throw new Error('输出目录不能为空');
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

// ===== MP3 时长探测 =====
// EdgeTTS 输出固定 audio-24khz-48kbitrate-mono-mp3 (CBR 48kbps)
// MP3 文件 = 可选 ID3v2 头 + 音频帧 (CBR 固定比特率)
// 用 (音频字节数 / 比特率) 反算时长，误差 < 100ms / 3 分钟
function getMp3DurationMsFromBuffer(buf) {
  if (!buf || !buf.length) return 0;
  // 跳过 ID3v2 头（"ID3" + 4 字节版本 + syncsafe 整数大小）
  let headerSize = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
    headerSize = 10 + size;
  }
  // 跳过 ID3v1 尾（最后 128 字节以 "TAG" 开头）
  let trailerSize = 0;
  if (buf.length >= 128 && buf[buf.length - 128] === 0x54
      && buf[buf.length - 127] === 0x41 && buf[buf.length - 126] === 0x47) {
    trailerSize = 128;
  }
  const audioBytes = buf.length - headerSize - trailerSize;
  // 48 kbps = 48 * 1000 / 8 = 6000 bytes/s
  const durationMs = Math.round((audioBytes * 8) / 48);
  return durationMs;
}

// ===== TTS 业务处理 =====
async function synthesizeOneChunk(text, voice, rate, volume, pitch, tmpDir) {
  const tmpAudio = path.join(tmpDir, `chunk_${crypto.randomBytes(4).toString('hex')}.mp3`);
  const tts = new EdgeTTS({
    voice,
    lang: 'zh-CN',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    saveSubtitles: true,
    rate,
    volume,
    pitch,
    timeout: 120000,
  });
  await tts.ttsPromise(text, tmpAudio);

  const subJsonPath = tmpAudio + '.json';
  let entries = [];
  if (fs.existsSync(subJsonPath)) {
    const subData = JSON.parse(await fsp.readFile(subJsonPath, 'utf8'));
    entries = Array.isArray(subData) ? subData : [];
    await fsp.unlink(subJsonPath).catch(() => {});
  }
  const audioBuffer = await fsp.readFile(tmpAudio);
  await fsp.unlink(tmpAudio).catch(() => {});

  // 探测真实音频时长（不再用字级 end，避免块间累积漂移）
  const audioDurationMs = getMp3DurationMsFromBuffer(audioBuffer);

  return { audio: audioBuffer, entries, audioDurationMs };
}

// 重试包装：Azure edge WebSocket 偶发 ECONNRESET / 429 / socket hang up
// 最多重试 5 次，指数退避 500ms / 1s / 2s / 4s
async function synthesizeOneChunkWithRetry(text, voice, rate, volume, pitch, tmpDir) {
  const maxRetries = DEFAULT_TTS_MAX_RETRIES;
  const baseMs = DEFAULT_TTS_RETRY_BASE_MS;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await synthesizeOneChunk(text, voice, rate, volume, pitch, tmpDir);
      if (attempt > 1) {
        logInfo(`第 ${attempt} 次重试合成成功`);
      }
      return result;
    } catch (err) {
      lastErr = err;
      const msg = (err && err.message) || String(err);
      const retriable = /ECONNRESET|ETIMEDOUT|socket hang up|429|503|ENOTFOUND|EAI_AGAIN/i.test(msg);
      if (!retriable || attempt === maxRetries) {
        if (attempt > 1) {
          logError(`合成失败（已重试 ${attempt - 1} 次）：${msg}`);
        }
        throw err;
      }
      const delay = baseMs * attempt;
      logWarn(`合成失败（第 ${attempt}/${maxRetries} 次）：${msg}，${delay}ms 后重试`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// 检测文本是否为 SRT 格式（避免把序号+时间戳当语音文本传给 Azure TTS）
const SRT_TIMECODE_RE = /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/;
function assertNotSrt(text) {
  if (typeof text === 'string' && SRT_TIMECODE_RE.test(text)) {
    throw new Error(
      '检测到输入文本含 SRT 时间戳（如 "00:00:00,000 --> 00:00:08,500"），TTS 不应朗读 SRT 原始格式。' +
      '请传纯文本 .txt 文件（每行一段字幕，段末以中英文句号结尾），不要传 .srt。'
    );
  }
}

async function synthesizeLongText({
  text, voice, rate, volume, pitch, chunkSize, shortSubtitle,
}) {
  assertNotSrt(text);
  const chunks = splitTextIntoChunks(text, chunkSize);
  logInfo(`文本分块: ${chunks.length} 块 | chunkSize=${chunkSize} | 总字数=${text.length}`);

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'canvasvideo-tts-'));
  const allAudio = [];
  let allEntries = [];
  let offsetMs = 0;

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logInfo(`合成第 ${i + 1}/${chunks.length} 块（${chunk.length} 字）`);
      const { audio, entries, audioDurationMs } = await synthesizeOneChunkWithRetry(chunk, voice, rate, volume, pitch, tmpDir);
      allAudio.push(audio);
      const baseEntries = groupEntriesByPunctuation(entries);
      for (const [start, end, txt] of baseEntries) {
        allEntries.push([start + offsetMs, end + offsetMs, txt]);
      }
      // 改：用真实音频时长累计 offset（不再用字级 end，避免块间累积漂移）
      // EdgeTTS 字级 end 通常比真实音频短 ~880ms/块（MP3 收尾静音 + ID3 padding）
      // 改用 audioDurationMs 后，每块独立计时，不累积
      offsetMs += audioDurationMs;
      logInfo(`第 ${i + 1}/${chunks.length} 块完成 | 字级 ${entries.length} 条 | 子句 ${baseEntries.length} 条 | 块时长 ${audioDurationMs}ms | 累计偏移 ${offsetMs} ms`);
    }
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  if (shortSubtitle) {
    logInfo(`字幕切短: ${allEntries.length} 条（已按标点切分）`);
  } else {
    logInfo('短字幕关闭，保留当前切分');
  }

  const mergedSrt = serializeSrt(allEntries);
  const totalAudio = Buffer.concat(allAudio);
  logInfo(`合成完成 | 总音频 ${totalAudio.length} 字节 | 总字幕 ${allEntries.length} 条`);
  return { audio: totalAudio, srt: mergedSrt };
}

// ===== 保存输出 =====
// 关键：mp3 和 srt 可以输出到不同目录、不同文件名
//  - audioDir + audioFileName：合成音频最终落点
//  - srtDir + srtFileName    ：字幕最终落点
//  - baseName 旧字段保留兼容（同目录同前缀）
async function saveOutputs(audioBuffer, srtText, audioDir, audioFileName, srtDir, srtFileName) {
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  if (srtDir && srtDir !== audioDir && !fs.existsSync(srtDir)) fs.mkdirSync(srtDir, { recursive: true });
  const audioPath = path.join(audioDir, audioFileName);
  const srtPath = srtDir ? path.join(srtDir, srtFileName) : path.join(audioDir, srtFileName);
  await fsp.writeFile(audioPath, audioBuffer);
  await fsp.writeFile(srtPath, srtText, 'utf8');
  return [audioPath, srtPath];
}

// ===== 主 API =====

/**
 * 合成文本为 MP3 + SRT
 *
 * @param {Object} options
 * @param {string} options.text              文章文本（必填）
 * @param {string} [options.voice]           音色，默认 zh-CN-XiaoxiaoNeural
 * @param {string} [options.rate]            语速，如 '+10%'，默认 '+0%'
 * @param {string} [options.volume]          音量，默认 '+0%'
 * @param {string} [options.pitch]           音调，如 '+5Hz'，默认 '+0Hz'
 * @param {number} [options.chunkSize]       长文每块字符数，默认 200
 * @param {boolean} [options.shortSubtitle]  是否按标点切短字幕，默认 true
 * @param {string} [options.outputDir]       输出目录（兼容旧 API，会同时放 MP3 和 SRT）
 * @param {string} [options.baseName]        输出文件名前缀（兼容旧 API）
 * @param {string} [options.audioDir]        MP3 输出目录（推荐）
 * @param {string} [options.audioFileName]   MP3 文件名（推荐）
 * @param {string} [options.srtDir]          SRT 输出目录（推荐，可与 audioDir 不同）
 * @param {string} [options.srtFileName]     SRT 文件名（推荐）
 * @returns {Promise<[string, string]>}      [mp3Path, srtPath]
 */
async function textToAudioSrt({
  text,
  voice = DEFAULT_VOICE,
  rate = DEFAULT_RATE,
  volume = DEFAULT_VOLUME,
  pitch = DEFAULT_PITCH,
  chunkSize = DEFAULT_CHUNK_SIZE,
  shortSubtitle = true,
  // 兼容旧 API
  outputDir = 'output',
  baseName = null,
  // 推荐用法（支持 MP3/SRT 分目录）
  audioDir = null,
  audioFileName = null,
  srtDir = null,
  srtFileName = null,
} = {}) {
  validateText(text);

  // 解析输出位置
  const isLegacyMode = !audioDir;  // 没传 audioDir → 用旧 API 路径
  let finalAudioDir, finalSrtDir, finalAudioName, finalSrtName;
  if (isLegacyMode) {
    finalAudioDir = validateOutputDir(outputDir);
    finalSrtDir = finalAudioDir;
    finalAudioName = `${baseName || 'audio'}.mp3`;
    finalSrtName = `${baseName || 'audio'}.srt`;
  } else {
    finalAudioDir = audioDir;
    finalSrtDir = srtDir || audioDir;
    finalAudioName = audioFileName || 'voice.mp3';
    finalSrtName = srtFileName || 'subtitle.srt';
  }

  logInfo(`textToAudioSrt | 音色=${voice} | 字数=${text.length} | 输出 mp3=${finalAudioDir}/${finalAudioName} srt=${finalSrtDir}/${finalSrtName} | 短字幕=${shortSubtitle}`);

  const { audio, srt } = await synthesizeLongText({
    text, voice, rate, volume, pitch, chunkSize, shortSubtitle,
  });

  if (!audio.length) {
    throw new Error('合成失败：未获取到音频数据，请检查网络或音色名');
  }
  if (!srt) {
    logWarn('未获取到字幕数据，SRT 将为空文件');
  }

  const [audioPath, srtPath] = await saveOutputs(audio, srt, finalAudioDir, finalAudioName, finalSrtDir, finalSrtName);
  logInfo(`输出完成 | mp3=${audioPath} | srt=${srtPath}`);
  return [audioPath, srtPath];
}

// ===== 中文声音清单 =====
const CHINESE_VOICES = [
  { shortName: 'zh-CN-XiaoxiaoNeural',         gender: '女', style: '温柔亲切',   useCase: '通用、情感、知识分享（默认）' },
  { shortName: 'zh-CN-YunxiNeural',            gender: '男', style: '沉稳青年',   useCase: '科技、产品解说、博客' },
  { shortName: 'zh-CN-YunyangNeural',          gender: '男', style: '成熟新闻',   useCase: '新闻播报、纪录片、正式场合' },
  { shortName: 'zh-CN-YunjianNeural',          gender: '男', style: '浑厚有力',   useCase: '体育、广告、冲击力内容' },
  { shortName: 'zh-CN-YunxiaNeural',           gender: '男', style: '少年感',     useCase: '二次元、年轻化内容' },
  { shortName: 'zh-CN-XiaoyiNeural',           gender: '女', style: '甜美女声',   useCase: '儿童、活泼、少女向' },
  { shortName: 'zh-CN-shaanxi-XiaoniNeural',   gender: '女', style: '陕西话',     useCase: '本地化、搞笑、地域文化' },
  { shortName: 'zh-CN-liaoning-XiaobeiNeural', gender: '女', style: '东北话',     useCase: '本地化、搞笑、地域文化' },
  { shortName: 'zh-HK-HiuMaanNeural',          gender: '女', style: '粤语(港)',   useCase: '粤港澳市场' },
  { shortName: 'zh-TW-HsiaoChenNeural',        gender: '女', style: '台湾普通话', useCase: '台湾市场、温柔女声' },
];
const OTHER_LOCALES = [
  { prefix: 'en-', label: '英语', count: 47 },
  { prefix: 'ja-', label: '日语', count: 2 },
  { prefix: 'ko-', label: '韩语', count: 3 },
];

/**
 * 返回中文声音清单 + 其它语种统计
 * @returns {Object} { chinese: [...], otherLocales: [...], totalCount: 322 }
 */
function listChineseVoices() {
  return {
    chinese: CHINESE_VOICES.slice(),  // 拷贝避免外部修改
    otherLocales: OTHER_LOCALES.slice(),
    totalCount: 322,
  };
}

/**
 * 把声音清单打印到控制台（CLI 调试用）
 */
function printVoiceList() {
  console.log(`=== 中文声音速查（${CHINESE_VOICES.length} 个）===\n`);
  console.log('ShortName'.padEnd(34) + '性别  风格       适合场景');
  console.log('='.repeat(95));
  for (const v of CHINESE_VOICES) {
    console.log(
      v.shortName.padEnd(34) +
      v.gender + '    ' +
      v.style.padEnd(8) +
      v.useCase
    );
  }
  console.log('\n--- 其它语种（部分）---');
  for (const o of OTHER_LOCALES) {
    console.log(`  ${o.label} (${o.prefix}*): ${o.count} 个`);
  }
  console.log('\n总声库: 322 个声音（中文 14 + 其它 308）');
}

// ===== CLI 入口（仅调试用，平时由 prepare-voice.js 调用 JS API）=====
if (require.main === module) {
  // 简化 CLI：只支持查看声音列表（与原 article-tts-toolbox-js CLI 兼容）
  // 完整 TTS 合成走 prepare-voice.js
  printVoiceList();
  process.exit(0);
}

module.exports = {
  textToAudioSrt,
  listChineseVoices,
  printVoiceList,
  DEFAULT_VOICE,
  // 兼容旧 API（如有外部调用）
  splitTextIntoChunks,
  serializeSrt,
};
