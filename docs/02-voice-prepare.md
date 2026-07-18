# 步骤2：音频与字幕准备（仅口播模式）

> 前置步骤：[步骤1：初始化](01-init.md)（state.mode 必须为 `dubbing`）
> 下一步：[步骤3：骨架设计（口播模式）](03-skeleton-design-dubbing.md)

---

## 目标

把配音音频（MP3）和字幕（SRT）准备好，存到 workdir 的标准路径，**并在 state.json 写入 voice 字段**。后续步骤（骨架设计、合并）直接读这个字段。

---

## 产出

### 文件

```
{workdir}/{skillProjectId}/
└── assets/
    ├── voice/
    │   └── voice.mp3              # 配音音频（统一名称）
    └── subtitles/
        └── subtitle.srt            # 字幕（统一名称）
```

### state.json 新增字段

```json
{
  "voice": {
    "source": "user" | "generated",
    "audioPath": "./assets/voice/voice.mp3",
    "srtPath": "./assets/subtitles/subtitle.srt",
    "duration": 39.375,
    "subtitleCount": 18,
    "voiceName": "zh-CN-XiaoxiaoNeural" | null
  }
}
```

| 字段 | 说明 |
|------|------|
| `source` | 素材来源，方便排查 |
| `audioPath` | 相对 workdir 的路径，merge-regions 自动填到 `project.json.audio.path` |
| `srtPath` | 相对 workdir 的路径，方便骨架设计时直接读 |
| `duration` | 音频时长（秒），取自 SRT 末条字幕 end time |
| `subtitleCount` | 字幕条目数 |
| `voiceName` | TTS 音色名（仅 generated 时填），用户素材时为 null |

---

## 两种素材来源

口播模式支持两种方式获得素材，**任选其一**：

| 来源 | 适用场景 | 是否需要联网 | 是否需要 TTS 工具箱 |
|------|---------|------------|-------------------|
| **用户提供** | 用户自己录了音 / 有现成配音 | 否 | 否 |
| **AI 自动生成** | 用户提供文章文本，让 AI 用 TTS 合成 | 是（Azure TTS） | 是 |

---

## 方式 A：用户提供 MP3 + SRT

### 输入要求

| 字段 | 格式 | 说明 |
|------|------|------|
| 音频 | `.mp3` / `.wav` / `.m4a` | 至少 1KB，建议 mp3 格式 |
| 字幕 | `.srt` | 标准 SRT 格式（条目序号 + 时间戳 + 文本） |

**校验**：
- MP3 文件存在 + 非空
- SRT 文件存在 + 非空 + 可被 `srt-parser.js` 解析
- 字幕条目数 ≥ 1

### 执行命令

```bash
node scripts/prepare-voice.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} \
  --mp3="C:\path\to\recording.mp3" \
  --srt="C:\path\to\subtitle.srt"
```

**参数说明**：
- `--cwd`：Agent 工作目录（必传，脚本从这里推断 workdir 路径）
- `{skillProjectId}`：项目 ID
- `--mp3`：用户音频文件绝对路径
- `--srt`：用户字幕文件绝对路径

---

## 方式 B：AI 自动生成（基于 TTS 模块）

> TTS 模块（`scripts/tts.js`）基于微软 Azure 语音服务，**完全免费，无需 API Key**，仅需联网。`tts.js` 内部 8 次重试 + 指数退避兜底网络异常。

### 前置：装依赖

**JS 后端（必装，一次）**：
```bash
cd canvasvideo-skill && npm install
```
> 一次性安装 4 个依赖：`adm-zip` + `node-edge-tts` + `sharp` + **`ffmpeg-static`**（22MB，npm 自动装，无需系统装 ffmpeg）。

**TTS 唯一后端**：node-edge-tts（JS）。`tts.js` 内部有 8 次重试 + 指数退避兜底网络异常。

### SRT 校准（voice-align）⭐ v0.7 新增

> **作用**：把字级 SRT（每字一条）的中段漂移从 ±1s 压到 ±200ms。

**原理**：
1. 合成完成后，把整段 MP3 转 PCM 16kHz mono（ffmpeg-static 跑）
2. 计算每 100ms 帧的 RMS（人声能量）
3. 检测每个"人声起点"（连续 300ms 静音后第一个有声帧）
4. 把每条 SRT 字幕的 start 跟最近的人声起点对齐（最大偏移 2000ms）

**启用方式**：默认开启（`prepare-voice.js` 显式传 `enableVoiceAlign: true`），无需传参。

**调用链**：
```
prepare-voice.js (默认 enableVoiceAlign: true)
  ↓
tts.js → synthesizeLongText({ enableVoiceAlign: true })
  ↓
voice-detect.js → detectVoiceStarts(MP3) → alignSrtStartsByVoice(SRT, voiceStarts)
```

**异常处理**（用户机器 ffmpeg 跑不了时）：
- `try/catch` 包裹整个 voice-align 流程
- 任何异常 → 保留字级 SRT（**视频仍能正常生成**）
- `spawnSync` 加 `timeout: 30s` + `killSignal: SIGKILL` 防止 EFTYPE 卡 hang

**用户机器 ffmpeg-static 跑不动的影响**：
- SRT 保持字级精度（±1s 漂移）
- 视频仍能生成（不影响主流程）
- 仅 SRT 校准功能失效（**不阻断**）

### TTS 唯一后端（node-edge-tts）

TTS 走 `scripts/tts.js`（基于 `node-edge-tts`）—— **唯一后端**。`tts.js` 内部有 8 次重试 + 指数退避兜底网络异常。

**为什么不留 Python 兜底**：
- 4 个 npm 依赖（含 ffmpeg-static）已覆盖所有平台
- 不依赖外部 Python 环境（用户机器少装一个东西）
- 字级字幕天然带边界信息（不需 Python 端再算一次 RMS）

### 文本来源（二选一）

| 方式 | 参数 | 适用 |
|------|------|------|
| 命令行直接传 | `--text="你的文章..."` | 短文（< 2000 字） |
| 从文件读 | `--text-file=<path>` | 长文 / 已有草稿 |

### 执行命令

```bash
# 从命令行文本生成（默认女声 Xiaoxiao）
node scripts/prepare-voice.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} \
  --generate --text="今天我们聊聊 AI 时代的核心竞争力。"

# 切换男声 + 从文件读文本
node scripts/prepare-voice.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} \
  --generate --text-file="C:\path\to\article.txt" --voice="zh-CN-YunxiNeural"

# 调整语速 / 音量 / 音调
node scripts/prepare-voice.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} \
  --generate --text="你的文章..." --rate="+15%" --volume="+20%" --pitch="+5Hz"
```

**参数说明**：
- `--cwd`：Agent 工作目录（必传）
- `{skillProjectId}`：项目 ID
- `--generate`：切换到 TTS 生成模式
- `--text="..."` 或 `--text-file=<path>`：文本（必传其一）
- `--voice`：TTS 音色，默认 `zh-CN-XiaoxiaoNeural`（温柔女声）
  - 更多音色：`node scripts/tts.js`（会打印中文声音速查表 + 其它语种统计）
- `--rate`：语速，如 `+10%` / `-20%`，默认 `+0%`
- `--volume`：音量，默认 `+0%`
- `--pitch`：音调，如 `+5Hz` / `-2Hz`，默认 `+0Hz`

### TTS 限制

- 单次文本 ≤ 50000 字（脚本自动按 200 字/块合成）
- 必须联网（调 Azure 端点）
- 网络失败时脚本会报错，不会留下空文件

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning | [I] Info

**脚本自动校验**：
- [E] state.mode === 'dubbing'（非口播模式直接报错）
- [E] 必传参数齐全
- [E] 用户素材：文件存在 + 非空 + SRT 可解析
- [E] TTS 生成：返回非空 + 文件已写入目标路径
- [E] 字幕数 ≥ 1

**AI 写完后自查**：
- [W] 音频时长 ≈ 字幕末条 end time（差距 > 2s 时提示用户检查）
- [I] 字幕文本已与用户/AI 确认，避免后续返工

---

## 常见问题

**Q: 字幕 SRT 是用 Whisper 转的吗？**
A: 当前不支持。Whisper 集成在另一个工具集成的范畴。本次只做"用户给 SRT" + "TTS 生成 SRT"两种。如果用户只录了音没字幕，需要自己先用 Whisper / 剪映 / 飞书妙记等工具转出 SRT，再走方式 A。

**Q: TTS 生成的配音质量不满意？**
A: 试试换音色（`--voice=zh-CN-YunxiNeural` 等），或调整 `--rate` / `--pitch`。Azure TTS 中文质量已经很好，但具体效果因内容而异。

**Q: 可以跑多次 prepare-voice 吗？**
A: 可以，新素材会**覆盖**旧的（与 setup-assets 一致）。如果换音色重生成，记得把 state.json 的 `voice.voiceName` 也更新。

**Q: 不跑这个步骤直接进 step 2 会怎样？**
A: 步骤 3 骨架设计时读不到 SRT 文件，AI 会要求先准备素材。state.voice 为空时，后续步骤也会提示。
---

## 重新生成（可重复执行）

**如果用户对生成的配音不满意，可以重新跑本步骤** —— 行为与"骨架可重复设计"完全一致。

```bash
# 改完参数后再跑一次即可
node scripts/prepare-voice.js --cwd=<Agent工作目录> {skillProjectId} \
  --generate --text="修改后的文章..." --voice=zh-CN-YunxiNeural
```

**会发生什么**：
- ✅ 覆盖 `assets/voice/voice.mp3` 和 `assets/subtitles/subtitle.srt`
- ✅ 刷新 `state.voice`（duration / subtitleCount / voiceName 全部更新）
- ✅ 步骤 4（generate-skeleton.js）下次跑时会自动用新的 `state.voice` 覆盖
- ❌ 不会**回滚**步骤 3 之后的所有产物（如 skeleton.json / regions/ / project.json），需要 AI 流程决定是否重做

**典型场景**：
- 音色不满意（`--voice=...`）
- 语速太慢/太快（`--rate=...`）
- 文章改了一两段（重传文本）
- 整体重写（换文章）

**约束**：
- 状态模式不能变（口播模式锁定）
- `skillProjectId` 保持不变（保持同一个预览链接）

---

## 下一步

- ✅ 配音音频 + 字幕就绪 → 进入 [步骤3：骨架设计（口播模式）](03-skeleton-design-dubbing.md)
- 重新 init 即可（项目模式已固定为口播）