# 步骤1：初始化

> 前置步骤：无（用户首次提出需求）
> 下一步：[步骤2：骨架设计](02-skeleton-design-creative.md)（创作模式）或 [02-skeleton-design-dubbing.md](02-skeleton-design-dubbing.md)（口播模式）

---

## 目标

初始化工作目录 → 确认模式 → 收集必要信息。

---

## 两种模式

| 模式 | 用户提供 | 字幕 | AI负责 |
|------|---------|------|--------|
| 创作模式 | 主题/时长/受众等文本 | ❌ 不生成 | 自动生成画面、组件、占位素材；配BGM |
| 口播模式 | 音频(.mp3/.wav/.m4a) + SRT字幕 | ✅ 必须有 | 严格按音频/SRT排版 |

---

## 操作

### 步骤1：确认模式

**AI 自动推断**：

| 推断条件 | 推断结果 |
|---------|---------|
| 用户提供 `.mp3/.wav/.m4a/.srt` 路径 | 口播模式 |
| 其他所有情况 | 创作模式 |

**用 AskUserQuestion 告知用户推断结果，确认是否正确**：

- 说明两种模式区别：
  - **创作模式**：AI 自动生成画面、动画、BGM，适合没有现成录音的情况
  - **口播模式**：您提供音频+字幕，AI 按音频节奏排版画面，适合有现成录音的情况
- 让用户确认模式或切换

**严禁**：让用户回答"你想用什么模式"这种开放式问题。

---

### 步骤2：收集信息

根据确认后的模式，收集对应字段。**已获取的字段不再重复索要**。

#### 创作模式

| 字段名 | 描述 | 是否必填 | 规则/默认值 |
|--------|------|---------|------------|
| `content` | 视频内容/主题 | **必填** | 描述视频要讲什么 |
| `duration` | 预计时长（秒） | 非必填 | 默认 `15`，建议给用户选项如 `15s/30s/60s/90s` |
| `audience` | 目标受众 | 非必填 | 默认 `大众用户`，建议给用户选项如 `开发者/大学生/企业用户/大众` |
| `theme` | 背景主题 | 非必填 | 默认 `white`（`white` \| `black`）|
| `aspect` | 视频比例 | 非必填 | 默认 `4:3`（`4:3` \| `16:9` \| `1:1` \| `9:16`）|
| `style` | 风格调性 | 非必填 | 默认 `warm`（`warm` \| `tech` \| `business` \| `art`）|
| `bgm` | 是否配BGM | 非必填 | 默认 `true`（`true` \| `false`）|

> **备注**：给用户选项时，根据用户提出的主题内容，AI 自行判断给出合理选项，不写死。

**向用户确认默认方案**：
```
已获取您的内容：{简要复述}
默认按以下方案创作，您看是否需要调整？
- 时长：15秒
- 受众：大众用户
- 风格：warm
- 背景：white
- BGM：配
如无需调整，直接回复"可以"即可。
```

#### 口播模式

| 字段名 | 描述 | 是否必填 | 规则/默认值 |
|--------|------|---------|------------|
| `audio` | 音频文件路径 | **必填** | `.mp3/.wav/.m4a` 格式 |
| `subtitle` | SRT字幕文件路径 | **必填** | `.srt` 格式 |
| `theme` | 背景主题 | 非必填 | 默认 `white`（`white` \| `black`）|
| `aspect` | 视频比例 | 非必填 | 默认 `4:3`（`4:3` \| `16:9` \| `1:1` \| `9:16`）|

---

### 步骤3：初始化工作目录

```js
const path = require('path');
const { ensureProjectWorkdir } = require('./scripts/scaffold');

const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');
const state = require('./scripts/state').loadOrCreateProject(workdirRoot);
const skillProjectId = state.skillProjectId;

ensureProjectWorkdir(workdirRoot, skillProjectId);
```

---

### 步骤4：保存项目配置

```js
state.mode = 'creative'; // 或 'voiceover'
state.content = userContent;
state.duration = userDuration;
state.audience = userAudience;
state.theme = userTheme;
state.aspect = userAspect;
state.style = userStyle;
state.bgm = userBgm;
require('./scripts/state').saveProjectState(workdirRoot, state);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目目录 | `{workdir}/{skillProjectId}/` | 工作目录 |
| state.json | `{workdir}/.canvasvideo/state.json` | 项目状态 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] 模式已确定（创作/口播）
- [E] 必填信息已获取（content 或 audio+subtitle）
- [E] 工作目录已创建
- [E] skillProjectId 已生成
