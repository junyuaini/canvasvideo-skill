"""
语音识别 + SRT 字幕生成工具
用法：python3 audio2srt.py <音频文件路径> [语言代码]
示例：python3 audio2srt.py audio.mp3 zh
"""
import sys
import os
from faster_whisper import WhisperModel

def format_timestamp(seconds):
    """将秒数格式化为 SRT 时间戳格式 HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def audio_to_srt(audio_path, lang="zh", model_size="tiny"):
    """
    从音频文件生成 SRT 字幕
    :param audio_path: 音频文件路径
    :param lang: 语言代码 (zh=中文, en=英文, ja=日语等)
    :param model_size: 模型大小 (tiny/base/small/medium/large)
    """
    if not os.path.exists(audio_path):
        print(f"错误：文件不存在 - {audio_path}")
        sys.exit(1)

    print(f"正在加载 Whisper 模型 ({model_size})...")
    # 使用 CPU int8 量化，节省内存
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    print(f"正在识别语音（语言：{lang}）...")
    segments, info = model.transcribe(audio_path, language=lang, beam_size=5)

    print(f"检测到语言：{info.language}，概率：{info.language_probability:.2f}")

    srt_lines = []
    for i, segment in enumerate(segments, start=1):
        start = format_timestamp(segment.start)
        end = format_timestamp(segment.end)
        text = segment.text.strip()
        srt_lines.append(f"{i}")
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(text)
        srt_lines.append("")

    # 保存 SRT 文件
    srt_path = os.path.splitext(audio_path)[0] + ".srt"
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    print(f"\n字幕已保存到：{srt_path}")
    print(f"共生成 {i} 条字幕")

    # 计算总时长
    total_duration = sum(seg.end - seg.start for seg in segments) if i > 0 else 0
    print(f"音频总时长约：{total_duration:.1f} 秒")

    return srt_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 audio2srt.py <音频文件路径> [语言代码] [模型大小]")
        print("示例：python3 audio2srt.py audio.mp3 zh tiny")
        sys.exit(1)

    audio_file = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "zh"
    model = sys.argv[3] if len(sys.argv) > 3 else "tiny"

    audio_to_srt(audio_file, language, model)
