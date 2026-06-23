# 步骤1：初始化

> 前置步骤：无（用户首次提出需求）
> 下一步：[步骤2：骨架设计](02-skeleton-design-creative.md)

---

## 目标

初始化工作目录和项目状态，确定模式，收集必要信息。

---

## 两种模式

| 模式 | 用户提供 | 字幕 | AI负责 |
|------|---------|------|--------|
| 创作模式 | 主题/目标/时长/风格等文本 | ❌ 不生成 | 自动生成画面、组件、占位素材；配BGM |
| 口播模式 | 音频(.mp3/.wav/.m4a) + SRT字幕 | ✅ 必须有 | 严格按音频/SRT排版 |

**默认行为**：
- 创作模式：不允许 `subtitles`；`audio` 默认配BGM
- 口播模式：必须同时有 `audio` 和 `subtitles`

---

## 操作

### 步骤1：确定模式

**推断 + 确认**：

1. **AI 推断**：
   - 用户提供 `.mp3/.wav/.m4a/.srt` → 推断为**口播模式**
   - 其他情况 → 默认推断为**创作模式**

2. **跟用户确认**（AskUserQuestion）：
   - 告知推断结果
   - 说明两种模式区别：
     - 创作模式：AI 自动生成画面、动画、BGM
     - 口播模式：用户提供音频+字幕，AI 按节奏排版
   - 让用户确认或切换
   - 根据确认后的模式收集必问项

**严禁**：
- ❌ 让用户回答"你想用什么模式"这种开放式问题
- ✅ 确认式询问：LLM自动推断模式，用AskUserQuestion一次性确认

---

### 步骤2：收集入参

#### 创作模式

| 字段名 | 描述 | 是否必填 | 规则/默认值 |
|--------|------|---------|------------|
| `content` | 视频内容/主题 | **必填** | 描述视频要讲什么 |
| `duration` | 预计时长（秒） | **必填** | 正整数 |
| `audience` | 目标受众 | **必填** | 如"开发者"、"大学生"、"大众用户" |
| `theme` | 背景主题 | 非必填 | 默认 `white`（`white` \| `black`）|
| `aspect` | 视频比例 | 非必填 | 默认 `4:3`（`4:3` \| `16:9` \| `1:1` \| `9:16`）|
| `style` | 风格调性 | 非必填 | 默认 `warm`（`warm` \| `tech` \| `minimal`）|
| `bgm` | 是否配BGM | 非必填 | 默认 `true`（`true` \| `false`）|

#### 口播模式

| 字段名 | 描述 | 是否必填 | 规则/默认值 |
|--------|------|---------|------------|
| `audio` | 音频文件路径 | **必填** | `.mp3/.wav/.m4a` 格式 |
| `subtitle` | SRT字幕文件路径 | **必填** | `.srt` 格式 |
| `theme` | 背景主题 | 非必填 | 默认 `white`（`white` \| `black`）|
| `aspect` | 视频比例 | 非必填 | 默认 `4:3`（`4:3` \| `16:9` \| `1:1` \| `9:16`）|

**模式自动判定**：
- 用户提供 `.mp3/.wav/.m4a/.srt` 路径 → 推断为**口播模式**
- 其他情况 → 默认推断为**创作模式**
- 用 AskUserQuestion 告知用户推断结果，让用户确认或切换

**口播模式输入校验**：

| 项 | 规则 |
|----|------|
| 必须提供 | `.mp3/.wav/.m4a` 音频 + `.srt` 字幕 |
| 路径不存在/扩展名不支持 | 阻塞进入下一步，要求重新提供 |
| 路径含 `..` 等穿越字符 | 拒绝拷贝 |

**素材白名单（硬规则）**：
- ✅ 只允许：音频文件、字幕文件
- ❌ 严禁将 `.txt/.doc/.png/.jpg/.pdf/.mp4` 等作为创作依据
- ❌ 严禁擅自挑选素材（多个音频/SRT时必须跟用户确认）
- 例外：用户明确说"也用这张图片/这个文档"

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

将用户需求记录到项目状态：

```js
state.mode = 'creative'; // 或 'voiceover'
state.theme = userTheme;
state.duration = userDuration;
state.audience = userAudience;
require('./scripts/state').saveProjectState(workdirRoot, state);
```

**音频配置**（创作模式默认配BGM）：

系统不区分录音/BGM——`audio` 字段就是"一个音频文件"。通过设置/不设置 `loop/fadeIn/fadeOut` 表达用法意图。

```jsonc
// 写法1：字符串简写（配音用法，向后兼容）
"audio": "./assets/voice.mp3"

// 写法2：对象形式（BGM用法，推荐）
"audio": {
  "path": "./assets/bgm.mp3",
  "loop": true,
  "fadeIn": 1,
  "fadeOut": 2
}
```

**用法判定与字幕共生（强制）**：

| 场景 | audio写法 | subtitles | 行为 |
|------|----------|-----------|------|
| 配音用法 | 字符串或对象只有path | ✅ 必须 | 不设loop/fadeIn/fadeOut |
| BGM用法 | 对象，含loop=true | ❌ 严禁 | 必须设loop/fadeIn/fadeOut |
| 静音 | 不写audio | ❌ 严禁 | — |

| audio用法 | subtitles | 是否允许 |
|-----------|-----------|---------|
| 配音用法 | ✅ 有 | ✅ 允许 |
| BGM用法 | ❌ 无 | ✅ 允许 |
| 无audio | ❌ 无 | ✅ 允许 |
| 配音用法 | ❌ 无 | ❌ 不允许（云端拦截） |
| BGM用法 | ✅ 有 | ❌ 严禁 |
| 无audio | ✅ 有 | ❌ 绝对禁止 |

**BGM 风格匹配**（创作模式）：

| 视频主题/关键词 | 选用 BGM |
|---|---|
| AI / 编程 / 算法 / 数据 / 科技 | `tech-pulse` |
| 咖啡 / 餐饮 / 生活方式 / 温馨 | `warm-cafe` |
| 创业 / 成长 / 励志 / 教育 | `uplifting` |
| 企业 / B2B / 演示 / 商务 | `corporate` |
| 教程 / 科普 / Vlog / 轻松 | `light-pop` |
| 旅行 / 纪录片 / 大场面 | `cinematic` |
| 不明确 | `corporate`（默认） |

**BGM 路径写法**：
```jsonc
{
  "audio": {
    "path": "./assets/placeholders/bgm/{风格}.mp3",
    "loop": true,
    "fadeIn": 1,
    "fadeOut": 2
  }
}
```

**用户主动拒绝BGM**：不写audio字段，视频静音播出。

**BGM 不存在时**：静音播出，不强行写不存在的路径。

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
- [E] 必问信息已获取
- [E] 工作目录已创建
- [E] skillProjectId 已生成
- [E] 音频配置正确（BGM配loop，配音不配loop）
- [E] 字幕配置正确（口播必须有，创作必须无）

---

## 下一步

创作模式 → [步骤2：骨架设计（创作模式）](02-skeleton-design-creative.md)

口播模式 → [步骤2：骨架设计（口播模式）](02-skeleton-design-dubbing.md)
