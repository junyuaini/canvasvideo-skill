# 基本原则

> Skill 核心行为准则，跨所有交互生效。

---

## R1 不打扰用户

| 场景 | 规则 |
|------|------|
| 临时脚本 | 写了就放着，不主动删除 |
| 废弃文件 | 保留，除非用户明确要求清理 |
| 不规范文件 | 不触碰 |
| 服务端警告但能正常工作 | 静默继续 |
| 已确认的设计稿/项目 | 不二次确认 |

**严禁**：
- ❌ 调用 `DeleteFile` 删除任何文件（除非用户明确说"删掉 XX"）
- ❌ 调用 `requires_approval: true` 的命令（除非用户明确同意）
- ❌ 主动询问"要不要删/清理/重置"
- ❌ 把"清理工作目录"作为流程一步

---

## R3 状态承接

| 规则 | 说明 |
|------|------|
| 设计文档仅在本地 | 不上传服务器 |
| 设计确认后才上传 | 由 AI 流程自行保证（不通过脚本硬拦） |
| 视频生成后不回设计 | 所有迭代直接改 project.json |
| 固定 skillProjectId | 同一项目多次上传使用相同 ID |
| 首次注册无感 | 由 `getOrCreateUser` 自动完成 |
| skillProjectId 必须走脚本 | 严禁 LLM 自编 ID（详见 R6） |

---

## R4 凭证安全

| 规则 | 说明 |
|------|------|
| 首次告知必须强调 | ⚠️ + 代码块 + 存放路径 + 风险提示 |
| 非首次不再展示账号 | 严禁在迭代或非首次场景输出 userToken |
| 查询账号只读本地 | 绝不调用服务端接口 |
| 不主动重置账号 | 用户要重置时引导手动删除 `.user.json` |

---

## R5 错误信息呈现

| 规则 | 说明 |
|------|------|
| 能机器读的不要让人读 | 详细日志藏到 `.canvasvideo/error.log`，对话只给一句话总结 |
| 能恢复的不要让人重做 | 自动重试1次再报错；保留中间产物供下次复用 |
| 能本地解决的不要联网 | 账号查询、状态读取、设计文档等只读本地 |

---

## R6 skillProjectId 规范

**严禁 LLM 自编 skillProjectId** —— 必须由 `state.js#generateSkillProjectId(userId)` 生成。

### 格式

```
cv_{userShort6}_{timestamp_base36}_{random8_hex}
   │      │              │                │
   │      │              │                └─ 8 位小写 hex（防同毫秒撞车）
   │      │              └─ 13 位 base36 毫秒时间戳
   │      └─ 6 位小写 hex（userId 前 6 位，区分用户）
   └─ 固定前缀
```

示例：`cv_a1b2c3_mqtk95pt_0b43fa53`

### 为什么必须这样

- **避免用户撞车**：服务端以 `skillProjectId` 作为项目主键存盘。旧版 `cv_{ts}_{rand}` 没有用户区分，不同用户偶然撞到同一 ID 会直接互相覆盖。`userShort6` 物理上把每个用户的 ID 空间隔开。
- **防止 LLM 自编**：旧版正则 `/^[a-zA-Z0-9_-]+$/` 几乎是全字符集，LLM 经常自编 `cv_test_001` / `cv_demo_abc` 之类的 ID 通过校验。新格式必须由脚本生成，LLM 拿不到 userId 就编不出来。
- **服务端严格校验**：服务端正则 `^cv_[a-z0-9]{6}_[a-z0-9]+_[a-z0-9]+$`，不通过直接 400 拒绝。

### 严禁

- ❌ 硬编码任何 skillProjectId 到 prompt / 文档 / 示例代码里
- ❌ 让用户手填 skillProjectId
- ❌ 用 `cv_test_001` / `cv_demo` / `cv_xxx` 等"看起来对"的占位 ID
- ❌ 旧格式（`cv_{ts}_{rand}`，2 段下划线）—— 已被服务端拒绝

### 出错时怎么办

服务端返回 400 + "skillProjectId 格式不合法" → 删掉 `canvasvideo-workdir/.canvasvideo/project-state.json` 和 `canvasvideo-workdir/{旧ID}/` 目录，重新执行 Step 1（`init-project`），脚本会自动用本地 `.user.json` 里的 userId 生成新格式 ID。

---

## R7 口播模式前置条件

**口播模式（dubbing）必须先执行步骤 1.5（prepare-voice.js）才能继续**。

### 强制链

```
state.mode === 'dubbing'
   ↓
跑 prepare-voice.js（用户素材 / TTS 生成二选一）
   ↓
state.voice 字段被填充（source/audioPath/srtPath/duration/subtitleCount/voiceName）
   ↓
跑 generate-skeleton.js（步骤3）
   ↓
脚本自动校验 state.voice 存在，否则直接报错
   ↓
继续后续步骤
```

### 缺一不可

| 字段 | 必须由 | 否则 |
|------|--------|------|
| `state.voice` | `prepare-voice.js` 写入 | `generate-skeleton.js:252` 报错阻断 |
| `assets/voice/voice.mp3` | `prepare-voice.js` 复制 | 视频无声 |
| `assets/subtitles/subtitle.srt` | `prepare-voice.js` 复制 | 视频无字幕 |
| `skeleton.audio.path` | `generate-skeleton.js` 用 `state.voice.audioPath` 覆盖 | AI 在 MD 里写错路径会导致无声 |

### 双重保险

- **脚本层**：[generate-skeleton.js:252](file:///D:/TRAE%20SOLO/%E8%A7%86%E9%A2%91%E5%88%B6%E4%BD%9C/CanvasVideo-All/canvasvideo-skill/scripts/generate-skeleton.js#L252) 强制校验 state.voice 存在
- **路径层**：`audio.path` 不再依赖 MD 模板里的字面量，**强制用 `state.voice.audioPath` 覆盖**（防止 AI 在 MD 里写错路径）

### 严禁

- ❌ 口播模式跳过步骤 1.5，直接跑步骤 2-3
- ❌ 把 MP3/SRT 放到非标准路径（如 `assets/voice.mp3` / `assets/voiceover/xxx.mp3`）
- ❌ 用 FFmpeg / Whisper 之类的工具替代 prepare-voice.js 处理音频（当前不支持）
- ❌ 在 MD 模板里写 `audio.path: "./assets/voice.mp3"`（旧版字面量），正确写法由脚本自动覆盖

### 调整口径

| 情况 | 处理 |
|------|------|
| 用户只给 MP3，没 SRT | 报错：口播模式必须有字幕；提示用 Whisper 或自动生成 |
| 用户只给 SRT，没 MP3 | 报错：口播模式必须有配音；提示用 TTS 或自己录 |
| TTS 网络失败 | 报错，**不**生成空文件；提示重试 |
| 音频时长 ≠ SRT 总时长 | warning（不阻断），让用户决定是否调整 |
| 多次跑 prepare-voice | 覆盖（与 setup-assets 一致） |

---

## R8 项目新建 vs 沿用

**AI 必须根据用户本次意图，明确选择"新建项目"还是"沿用现有项目"，并通过 `--new` 标志把决策结果传给 init-project 脚本。**

### 为什么必须有这个决策

init-project.js 默认行为是"沿用现有 state.json 下的项目"——只要本地有 `.canvasvideo/project-state.json` 就不会建新项目。

但用户的意图不总是"沿用"：

- 用户昨天做完一个《好运设计》视频，今天说"再帮我做个 AI 学习入门"——这是新主题、新内容，必须新建项目
- 用户说"把昨天的视频第三段时长缩短一点"——这是同一项目的修改，必须沿用
- 用户没说清楚就来了——必须停下来澄清，不能猜

如果 AI 不传 `--new` 又想新建项目，就会出现"昨天的项目被悄悄覆盖"的灾难性 bug（Trae 之前实际踩过）。

### R2 与 R3 的关系

- **R3「状态承接」**说"固定 skillProjectId"——指的是**同一个项目**内多次上传复用同一个 ID
- **R2「项目新建 vs 沿用」**说"什么时候换项目 ID"——指的是**不同项目**之间必须显式区分

两条不冲突：R3 管"项目内一致性"，R2 管"项目间隔离"。

### 决策矩阵

| 用户输入语义 | 关键词示例 | AI 决策 | init-project 命令 |
|------------|----------|--------|-------------------|
| **新主题 / 新内容 / 新视频** | "做个新的"、"再做个"、"下一个"、"换个主题"、"给我做 AI 学习"、"今天录了个音频" | **新建项目** | 加 `--new` |
| **修改 / 迭代当前项目** | "改一下"、"调整"、"换个颜色"、"加个结尾"、"缩短一点"、"第三段重做" | **沿用项目** | **不加** `--new` |
| **完全没说清楚** | "帮我处理一下视频"、"接着搞" | **停下来澄清** | 不调脚本 |

### 三种状态对应的脚本日志

```
# 1. 沿用（state.json 存在，无 --new）
📌 state.json 已存在 → 沿用现有项目 cv_a1b2c3_mqtk95pt_0b43fa53
   如需创建新项目（例如换了主题），请加 --new 标志

# 2. 新建（state.json 不存在）
🆕 state.json 不存在 → 创建新项目

# 3. 强制重建（state.json 存在 + --new）
🔄 --new 标志 → 删除老 state.json，强制重建项目
   老项目: cv_a1b2c3_mqtk95pt_0b43afa2（已弃用）
🆕 state.json 不存在 → 创建新项目
```

AI 必须把脚本输出**原样转发给用户**（特别是 🔄 分支的"老项目 ID 已弃用"），让用户看到决策结果。

### 严禁

- ❌ AI 自作主张猜"用户应该是要新建"——必须让用户选，或在用户原话明确包含新主题关键词时才加 `--new`
- ❌ 沿用现有项目时也加 `--new`（会把昨天的项目删掉）
- ❌ 看到脚本打 📌 但用户语义明显是新建时，还继续沿用而不报错——必须停下来提醒用户"看起来是新主题，要不要加 --new？"
- ❌ 把 init-project 第二次跑（哪怕 mode 不变）当成"自动新建"——必须显式 `--new`

### 出错时怎么办

| 现象 | 处理 |
|------|------|
| 用户说"做个新视频"，脚本却打 📌 沿用 | 立刻停下来提示："检测到 workdir 已有项目 xxx，本次似乎要新建。要不要加 --new？" |
| AI 加了 `--new` 但脚本打 🆕 而不是 🔄 | state.json 已被人手动删除，正常流程，继续 |
| 加了 `--new` 但脚本报 mode 冲突 | 用户本意是改模式，按脚本提示手动清理 workdir |

