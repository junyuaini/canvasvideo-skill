# 步骤1：初始化

> 前置步骤：无（用户首次提出需求）
> 下一步：[步骤2：骨架设计](02-skeleton-design.md)

---

## 目标

初始化工作目录和项目状态。

---

## 输入

| 来源 | 说明 |
|------|------|
| 用户输入 | 视频主题、时长、风格等需求 |
| 引用规则 | `rules/01-principles.md` §R2（首次交互必问） |

---

## 操作

### 第 1 步：确定模式

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

### 第 2 步：必问信息

**创作模式**：
- 视频内容/主题
- 预计时长（秒）
- 目标受众

**口播模式**：
- 音频文件路径（.mp3）
- SRT 字幕文件路径（.srt）

### 第 3 步：初始化工作目录

```js
const path = require('path');
const { ensureProjectWorkdir } = require('./scripts/scaffold');

const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');
const state = require('./scripts/state').loadOrCreateProject(workdirRoot);
const skillProjectId = state.skillProjectId;

ensureProjectWorkdir(workdirRoot, skillProjectId);
```

### 第 4 步：保存用户需求

将用户需求记录到项目状态：

```js
state.mode = 'creative'; // 或 'voiceover'
state.theme = userTheme;
state.duration = userDuration;
state.audience = userAudience;
require('./scripts/state').saveProject(workdirRoot, state);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目目录 | `{workdir}/{skillProjectId}/` | 工作目录 |
| state.json | `{workdir}/.canvasvideo/state.json` | 项目状态 |

---

## 自检

- [ ] 模式已确定（创作/口播）
- [ ] 必问信息已获取
- [ ] 工作目录已创建
- [ ] skillProjectId 已生成

---

## 下一步

进入 [步骤2：骨架设计](02-skeleton-design.md)
