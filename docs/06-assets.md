# 步骤6：素材处理

> 前置步骤：[步骤5：合并](05-merge.md) + [步骤1.5：音频与字幕准备（仅口播模式）](01.5-voice-prepare.md)
> 下一步：[步骤7：校验](07-validate.md)

---

## 目标

复制占位素材和 BGM 到工作目录。

> ℹ️ **口播模式的配音音频和字幕由步骤 1.5 准备**，本步骤**不处理**配音音频（避免重复）。若配音音频缺失，本步骤会 warning 提示回到步骤 1.5。

---

## 输入

| 来源 | 说明 |
|------|------|
| project.json | 获取 theme、audio |
| 状态文件 | 口播模式下，校验 `state.voice` 字段（步骤 1.5 产物） |
| 引用规则 | — |

---

## 操作

### 第 1 步：运行素材设置脚本

```bash
node scripts/setup-assets.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} --theme={white|black} --bgm={bgmStyle}
```

**参数说明**：
- `--cwd`：Agent 工作目录（必传，脚本从这里推断 workdir 路径）
- `--theme`：主题色（`white` 或 `black`，默认 `white`）
- `--bgm`：BGM 风格（如 `tech-pulse`，不传则不复制 BGM）

**示例**：

```bash
# 复制占位素材 + BGM
node scripts/setup-assets.js --cwd=/path/to/agent/workspace cv_abc123 --theme=white --bgm=tech-pulse

# 仅复制占位素材（无 BGM）
node scripts/setup-assets.js --cwd=/path/to/agent/workspace cv_abc123 --theme=black
```

脚本会自动完成：
1. 将占位 SVG 复制到 `{workdir}/{skillProjectId}/assets/placeholders/{theme}/`
2. 将 BGM 复制到 `{workdir}/{skillProjectId}/assets/placeholders/bgm/`

> ℹ️ **audio.path 自动对齐**：Step 5 `merge-regions.js` 已经把 `audio.path` 填成 `./assets/placeholders/bgm/{bgmStyle}.mp3`，所以本步骤复制 BGM 后路径天然对齐，**无需手动更新 project.json**。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| placeholders/ | `{workdir}/{skillProjectId}/assets/placeholders/{theme}/` | 占位 SVG（7 个） |
| bgm/ | `{workdir}/{skillProjectId}/assets/placeholders/bgm/` | BGM 文件 |
| voice/voice.mp3 | `{workdir}/{skillProjectId}/assets/voice/` | **口播模式专用**，由步骤 1.5 准备 |
| subtitles/subtitle.srt | `{workdir}/{skillProjectId}/assets/subtitles/` | **口播模式专用**，由步骤 1.5 准备 |

---

## 自检

> [E] Error — 不符合将阻断（脚本自动校验） | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

**脚本自动校验**：

- `setup-assets.js` 输出 `[✓] 占位素材已复制 (N 个)` 即表示成功
- `setup-assets.js` 输出 `[✓] BGM 已复制: {bgmStyle}` 即表示 BGM 成功（不传 `--bgm` 跳过）
- `validate.js`（Step 7）会校验所有引用的资源文件是否存在

**AI 写完后自查**：

无（步骤本身由脚本完成，无 AI 设计动作）。

---

## 下一步

进入 [步骤7：校验](07-validate.md)