---
name: "canvasvideo"
description: "通过自然语言一键生成可分享的画布视频（H5）。支持创作模式（提供主题/时长/风格）与口播模式（提供音频+SRT）。当用户说'做视频/制作视频/生成视频/做一个 H5/出一个画布视频/视频迭代/换背景音乐/改章节内容'时触发。"
---

# CanvasVideo Skill

CanvasVideo Skill 帮助用户通过自然语言创建符合 CanvasVideo 规范的视频项目，支持创作模式与口播模式。

参考设计文档：`.code/documents/CanvasVideo_代码级设计.md` v1.4

---

## 触发条件

当用户请求**制作视频 / 创建短视频 / 生成 H5 视频页面 / 出一个视频**时触发。

---

## 总体流程

```
[第零次] 安装就位（用户无感）
    ↓
[第一次] 理解需求 + 模式选择（创作 / 口播）
    ↓
[第二次] 生成本地 design.md + 素材清单
    ↓
[第三次] 多轮设计微调（loop）
    ↓ 用户确认
[第四次] 打包 zip + 首次自动后置注册 + 上传 → previewUrl
    ↓
[第五次] 用户在浏览器查看视频
    ↓
[第六次] 视频迭代（不再走设计文档）
```

平行能力：
- **[第七次] 用户主动查询账号**（自然语言指令，任意时刻可触发，只读本地）

---

## 一、第零次交互：安装与首次准备（用户无感）

用户从 AI 工具的 Skill 市场把 CanvasVideo Skill 安装下来后，**Skill 进入待命**：

- ❌ 不主动创建任何工作目录
- ❌ 不主动注册账号
- ❌ 不主动询问任何信息
- ✅ 等待用户通过自然语言触发"创建视频"或"查询账号"等意图

工作目录、`.user.json`、`.canvasvideo/` 等本地文件都在**首次需要时由内部脚本自动创建**，用户和 LLM 都不需要预先准备。

---

## 二、第一次交互：理解需求 + 模式选择

### 2.1 模式定义

| 模式 | 用户提供 | 字幕（subtitles） | AI 负责 |
|------|---------|-----------------|--------|
| **创作模式** | 主题/目标/时长等文本信息 | ❌ **不生成字幕**（无配音音频） | 自动生成画面、组件、占位素材；视频以图文为主，靠组件文字传递信息 |
| **口播模式** | 口播音频（必须） + SRT 字幕（必须） | ✅ **必须有字幕**（与 SRT 一致） | 严格按音频/SRT 排版，自动生成画面素材 |

**默认行为**：
- 创作模式：所有缺失素材都可由 AI 自动生成；**`project.json` 中不允许出现 `audio` 字段，也不允许出现 `subtitles` 数组**
- 口播模式：音频和 SRT 字幕**必须**由用户提供，不允许 AI 占位生成；`project.json` 中**必须同时**有 `audio` 字段和 `subtitles` 数组

### 2.2 追问规则

- 用户首条消息已含"模式 + 时长 + 受众"等关键信息时，**不要再问一遍**
- 关键信息缺失时，温和追问，不强制必填，不主动 timeout
- 提示用户可以"按默认创作模式继续"

### 2.2.1 ⚠️ 主题二选一（必问，不允许跳过）

**当前 v1.4 仅支持两种主题**，**严禁让用户自由发挥（如"我要橙色品牌主题""做一个粉色少女风"）**。在确认需求后，**必须**用以下话术让用户从两个固定选项中二选一：

```
当前 CanvasVideo 提供两种风格主题（仅支持这两种）：

🤍 极简白（white）
  - 白底 + 多色光晕，深字清晰
  - 适合：商务演示、产品介绍、知识科普、教学课程、案例分享
  - 我的建议默认：📖 偏向阅读/演示场景

🌌 沉浸黑（black）
  - 深紫蓝底 + 霓虹高亮，沉浸感强
  - 适合：技术分享、AI/代码、数据看板、品牌发布、潮流内容
  - 我的建议默认：💻 偏向科技/沉浸场景

请选 1 还是 2？也可以告诉我你的视频主题，我帮你推荐。
```

**主题选择决策**：

| 用户输入 | LLM 行为 |
|---|---|
| 用户说"1"/"白"/"极简白"/"用白色" | `theme: "white"` |
| 用户说"2"/"黑"/"沉浸黑"/"用黑色" | `theme: "black"` |
| 用户说"你帮我选" | 按主题决策表（详见 themes-catalog.md）自动选；告诉用户选了哪种 + 一句话理由 |
| 用户说"用我们公司的品牌色 / 橙色 / 粉色 / 蓝紫渐变" | **不要承诺定制**，引用 themes-catalog.md §"用户提出'自定义主题'时的标准回复"话术，引导用户在 white/black 内选择，再用 customStyle 体现品牌色 |
| 用户首条消息已明确说"用黑色主题 / 白色主题" | 直接采用，不再问 |

**严禁**：
- 让用户回答"你想用什么主题"这种开放式问题（容易诱导用户编一个不存在的主题名）
- 接受 `theme: "default"` / `"colorful"` / `"company-brand"` / 任意自定义名称
- 在 design.md 步骤 5 主题选择表里写"自定义"行

### 2.3 口播模式输入校验

- 必须提供 `.mp3 / .wav / .m4a` 音频和 `.srt` 字幕
- 路径不存在或扩展名不支持时**阻塞进入第二阶段**，要求用户重新提供
- 路径包含 `..` 等穿越字符时拒绝拷贝

### 2.4 ⚠️ 音频用途智能判定（强制）

**核心原则**：**系统不区分录音/BGM**——`audio` 字段就是"一个音频文件"。**LLM 通过设置/不设置 `loop / fadeIn / fadeOut` 三个字段来表达用法意图**。

#### 2.4.1 字段结构

```jsonc
{
  // 写法 1：字符串简写（向后兼容；视为"配音用法"）
  "audio": "./assets/voice.mp3",

  // 写法 2：对象形式（推荐；通过字段表达用法）
  "audio": {
    "path": "./assets/bgm.mp3",
    "loop": true,        // ⭐ 仅 BGM 用法设置；配音用法保持默认 false
    "fadeIn": 1,         // ⭐ 仅 BGM 用法设置；配音用法保持默认 0
    "fadeOut": 2         // ⭐ 仅 BGM 用法设置；配音用法保持默认 0
  }
}
```

#### 2.4.2 用法判定规则（LLM 必读）

| 场景 | audio 写法 | 是否配 SRT | LLM 行为 |
|---|---|---|---|
| **配音用法**（口播 / TTS 解说） | 字符串 OR 对象只有 path | ✅ **必须** | **不设** loop/fadeIn/fadeOut |
| **BGM 用法**（背景音乐） | 对象，含 loop=true | ❌ **严禁配 SRT** | **必须设** `loop: true, fadeIn: 1, fadeOut: 2` |

**判定流程图**：

```
用户提供了 SRT 字幕？
├─ 是 → 配音用法 → audio: "./xxx.mp3"（或 { path: "./xxx.mp3" }）
│       不设 loop/fadeIn/fadeOut
│
└─ 否 → BGM 用法 → audio: { path, loop:true, fadeIn:1, fadeOut:2 }
        不设 subtitles 数组
```

#### 2.4.3 字幕共生规则（保留）

**字幕必须始终与"配音音频"共生，二者同生共死**。

> **配音音频** ≠ **背景音乐**：
> - "配音"= 用户口播 / TTS 解说 → 必须配 SRT
> - "BGM" = 背景音乐 → **严禁** 配 SRT（字幕条会跟着音乐进度走，毫无意义）

**判定矩阵**：

| audio 用法 | subtitles 字段 | 是否允许 | 说明 |
|---|---|---|---|
| 配音用法（不设 loop/fade） | ✅ 有 | ✅ 允许 | 标准口播模式 |
| BGM 用法（设了 loop/fade） | ❌ 无 | ✅ 允许 | 标准 BGM 模式 |
| 无 audio | ❌ 无 | ✅ 允许 | 纯图文创作模式（不推荐，详见 §2.4.4） |
| 配音用法 | ❌ 无 | ❌ **不允许** | validate.js 会拦截 |
| BGM 用法 | ✅ 有 | ❌ **严禁** | 字幕会乱跑 |
| 无 audio | ✅ 有 | ❌ **绝对禁止** | LLM 严禁主动生成 subtitles |

#### 2.4.4 创作模式默认配 BGM（强制）

**创作模式启动时**，LLM **默认必须**给视频配上 BGM——除非用户主动说"不要 BGM"。

**目的**：纯图文视频如果完全静音，观感会很冷清；配一段轻量 BGM 能瞬间提升专业度。

**自动选源策略**：
1. **不要询问用户偏好风格**（避免增加用户决策成本）
2. LLM 根据视频主题/风格**自动**从 `templates/bgm/` 内置库中选一首最匹配的
3. 直接把选中的文件路径写到 project.json，并设上 `loop: true, fadeIn: 1, fadeOut: 2`
4. 视频生成完成时，**简短告知用户**："我给视频配了一段 {风格} 风的 BGM，如果想换可以告诉我"

**用户主动拒绝 BGM**（说"不要 BGM"/"静音"/"不加音乐"）：
- 不写 audio 字段
- 视频静音播出（仍然合法）

**详见 [`templates/bgm/bgm-catalog.md`](./templates/bgm/bgm-catalog.md)** —— 完整 BGM 库速查与风格匹配表。

#### 2.4.5 字幕规则补充（仅配音用法适用）

1. **严禁创作模式或 BGM 模式生成 `subtitles` 字段**
   - 用户要求"加字幕条但不要配音" → 一句话拒绝："字幕需要跟配音对齐，没配音的字幕会乱跑"

2. **配音模式下字幕必须完整覆盖音频**
   - 最早 `start` ≈ 0
   - 最晚 `end` ≈ audio 时长（容差 ±0.5s）
   - 字幕之间不允许 > 3s 空白

3. **字幕文本要求**
   - 必须严格来自用户提供的 SRT，**严禁 LLM 自己改写、压缩、扩展**
   - 一条 ≤ 25 字（中文）/ 15 词（英文）
   - 不允许包含 emoji（部分前端字幕样式不支持）

### 2.5 ⚠️ 创作模式节奏与动态密度规则（强制）

**问题背景**：创作模式没有 SRT 钉时间，LLM 倾向把 60s 视频均分成 5×12s，并把所有组件挤在区域开头几秒，剩下十几秒画面死寂——观感像幻灯片，不像视频。

**核心原则**：**创作模式必须人工补一个"节拍器"**，强制保证画面动态密度。

**4 条强约束（详见 [`references/visual-richness-rules.md`](./references/visual-richness-rules.md) 门槛 7）**：

| 约束 | 规则 | 适用 |
|------|------|------|
| **7.1 末组件停留 ≤ 2s** | 每个区域内最后一个组件 start 到区域 end 的间隔 ≤ 2 秒 | 创作 + 口播模式 |
| **7.2 出场间隔 ≤ 3s** | 同区域相邻两个组件的 start 时差 ≤ 3 秒 | 创作 + 口播模式 |
| **7.3 单区域 ≤ 15s** | 任何单一区域 duration ≤ 15 秒 | **仅创作模式** |
| **7.4 总密度 ≥ 0.6/s** | 组件总数 / 视频总时长 ≥ 0.6 | **仅创作模式** |

**操作建议（写设计时实践）**：
1. **每个区域必须有"收尾组件"**：在 `end - 2s` 之内出现一个新组件（可以是 ImageComponent / GraphicComponent / ShockComponent / Quote / Badge 任意一种）
2. **不要追求"区域整数化"**：6s/8s/10s/12s 这样的不等长区域才是好节奏
3. **60s 视频建议 ≥ 6 个区域**：宁可拆细也不要单一区域 > 15s
4. **组件之间用 1.5-3s 间隔密集出场**：大于 3s 一定要补过渡组件

**违例示例（严禁）**：
```
P3 区：start=24, end=36, duration=12s
  P3-001 标题  start=24
  P3-002 卡片  start=26
  P3-003 卡片  start=27
  ❌ 最后一个 start=27, 区域 end=36，静止 9 秒
```

**修复**：
```
方案 A：缩短区域 → P3 改为 24-30s（6s）
方案 B：补尾段 → 加 P3-004 图片 start=34, end=36（让最后 start 接近 end-2s）
方案 C：把已有组件 start 后移 → P3-002 start=28, P3-003 start=33（出场间隔合规但末组件挂着）
```

### 2.6 ⚠️ 区域布局与画布过渡参数（强制规则）

#### 2.6.1 regions 布局：每行 4 个，超出换行

**规则**：所有区域按"从左到右一行 4 个"排布，超过 4 个换到下一行。

**viewport 尺寸规则**：
- **默认**：用户未提尺寸要求时，使用 `viewport: { width: 780, height: 585 }`（4:3 比例）
- **用户指定比例**：用户主动提比例时，按下方映射表换算像素尺寸
- **严禁**：不要主动问用户"要什么比例"，除非用户自己提

**常见比例映射表**（基准宽度 780px，按比例算高度）：

| 比例 | 用途 | viewport |
|---|---|---|
| 4:3（默认）| 通用横屏、PPT 风格 | `width: 780, height: 585` |
| 16:9 | 宽屏视频、电影感 | `width: 780, height: 439` |
| 1:1 | 正方形、社交媒体 | `width: 780, height: 780` |
| 9:16 | 竖屏、短视频 | `width: 439, height: 780` |
| 3:4 | 竖屏、小红书 | `width: 585, height: 780` |

**坐标公式**（基于 viewport 动态计算，区域紧挨无额外间隙）：

```
x = 120 + col × viewport.width
y = 50 + row × viewport.height
```

其中 `row = Math.floor((index - 1) / 4)`，`col = (index - 1) % 4`

**以默认 780×585 为例**：

| 列序 | x 坐标 |
|---|---|
| 第 1 列 | `120` |
| 第 2 列 | `120 + 780 = 900` |
| 第 3 列 | `120 + 2×780 = 1680` |
| 第 4 列 | `120 + 3×780 = 2460` |

| 行序 | y 坐标 |
|---|---|
| 第 1 行 | `50` |
| 第 2 行 | `50 + 585 = 635` |
| 第 3 行 | `50 + 2×585 = 1220` |
| 第 4 行 | `50 + 3×585 = 1805` |

**canvas 尺寸公式**（覆盖所有区域的最小画布）：
```
canvas.width  = 最右侧区域 x + viewport.width + 60   // 右边距 60
canvas.height = 最下方区域 y + viewport.height + 65  // 底边距 65
```

**以默认 780×585 为例**：

| 区域数 | 行数 | 最右 x | 最下 y | 推荐 canvas |
|---|---|---|---|---|
| 1-4 | 1 行 | 2460 | 50 | `width: 3300, height: 700` |
| 5-8 | 2 行 | 2460 | 635 | `width: 3300, height: 1285` |
| 9-12 | 3 行 | 2460 | 1220 | `width: 3300, height: 1870` |
| 13-16 | 4 行 | 2460 | 1805 | `width: 3300, height: 2455` |

**示例（默认 780×585，10 个区域，2 行）**：
```json
"viewport": { "width": 780, "height": 585 },
"regions": [
  { "name": "P1", "x": 120,  "y": 50  },
  { "name": "P2", "x": 900,  "y": 50  },
  { "name": "P3", "x": 1680, "y": 50  },
  { "name": "P4", "x": 2460, "y": 50  },
  { "name": "P5", "x": 120,  "y": 635 },
  { "name": "P6", "x": 900,  "y": 635 },
  { "name": "P7", "x": 1680, "y": 635 },
  { "name": "P8", "x": 2460, "y": 635 },
  { "name": "P9", "x": 120,  "y": 1220 },
  { "name": "P10","x": 900,  "y": 1220 }
],
"canvas": { "width": 3300, "height": 1285 }
```

**严禁**：
- 写每行 5 个或 6 个（横向太长，跨区域过场动画会拖沓）
- 写每行 3 个（与已有真实示例不一致，破坏视觉节奏）
- 行间距不固定（默认 780×585 时行间距 = 585，即 viewport.height）

#### 2.6.3 组件 Y 坐标：必须连续递增，禁止重叠

**规则**：同一区域内，所有组件的 `position.y` 必须**严格递增**，后一个组件的 `y` 必须 ≥ 前一个组件的 `y + h + 间距`（建议间距 10-20px）。

**错误示例**（P1-006/P1-007/P1-008 的 y 都回退到 0，与 Title 重叠）：
```json
// ❌ 错误：y 坐标回退，组件堆叠
{ "id": "P1-001", "position": { "y": 0,   "h": 90 } },  // bottom=90
{ "id": "P1-002", "position": { "y": 95,  "h": 50 } },  // bottom=145
{ "id": "P1-003", "position": { "y": 150, "h": 44 } },  // bottom=194
{ "id": "P1-004", "position": { "y": 200, "h": 300 } }, // bottom=500
{ "id": "P1-005", "position": { "y": 510, "h": 60 } },  // bottom=570
{ "id": "P1-006", "position": { "y": 0,   "h": 80 } },  // ❌ y=0 < 570，重叠！
{ "id": "P1-007", "position": { "y": 0,   "h": 100 } }, // ❌ y=0 < 570，重叠！
{ "id": "P1-008", "position": { "y": 0,   "h": 120 } }  // ❌ y=0 < 570，重叠！
```

**正确示例**：
```json
// ✅ 正确：y 坐标连续递增
{ "id": "P1-001", "position": { "y": 0,   "h": 90 } },  // bottom=90
{ "id": "P1-002", "position": { "y": 100, "h": 50 } },  // bottom=150
{ "id": "P1-003", "position": { "y": 165, "h": 44 } },  // bottom=209
{ "id": "P1-004", "position": { "y": 220, "h": 300 } }, // bottom=520
{ "id": "P1-005", "position": { "y": 535, "h": 60 } },  // bottom=595
{ "id": "P1-006", "position": { "y": 605, "h": 80 } },  // ✅ y=605 ≥ 595+10
{ "id": "P1-007", "position": { "y": 695, "h": 100 } }, // ✅ y=695 ≥ 605+10
{ "id": "P1-008", "position": { "y": 805, "h": 120 } }  // ✅ y=805 ≥ 695+10
```

**自检公式**：生成完一个区域的所有组件后，按 `y` 排序，检查是否满足 `sorted[i].y ≥ sorted[i-1].y + sorted[i-1].h + 10`。不满足必须修正。

**严禁**：
- 同一区域内出现两个组件 `y` 相同或后一个 `y` 小于前一个的 `bottom`
- 为了"对齐美观"故意把后面组件的 `y` 设成 0（这是严重错误）

#### 2.6.4 区域布局：必须多样化，禁止复制粘贴

**规则**：相邻区域（如 P1→P2→P3）的组件结构、类型顺序、排列方式**不能完全相同**。必须至少有 3 种不同的布局模板交替使用。

**错误示例**（所有 10 个区域都是完全相同的 8 组件结构）：
```
P1: Title → Text → Badge → Aggregate(Image+Shock) → Text → Shock → Quote → Card
P2: Title → Text → Badge → Aggregate(Image+Shock) → Text → Shock → Quote → Card  ❌ 与 P1 完全相同
P3: Title → Text → Badge → Aggregate(Image+Shock) → Text → Shock → Quote → Card  ❌ 与 P1 完全相同
...
P10: 同上 ❌
```

**正确示例**（3 种布局模板交替）：
```
P1（模板 A）: Title → Text → Aggregate(Image+Shock) → Text → Shock → Quote
P2（模板 B）: Title → Badge → Image → Text → Card → Quote
P3（模板 C）: Title → Text → Image → Shock → Quote → Card
P4（模板 A）: Title → Text → Aggregate(Image+Shock) → Text → Shock → Quote  ✅ 与 P1 相同但间隔 3 个区域
...
```

**布局变化维度**（至少变化 2 个以上）：
1. **组件数量**：有的区域 5 个组件，有的 7 个，有的 9 个
2. **组件类型组合**：有的区域用 Card，有的不用；有的用 GraphicComponent，有的用 ImageComponent
3. **排列顺序**：图片放上面还是放中间；Quote 放开头还是结尾
4. **有无 Aggregate**：有的区域图片直接放顶层，有的包在 Aggregate 里
5. **文字密度**：有的区域以图为主（1 图+2 文），有的以文为主（4 文+1 图）

**自检方法**：生成完所有区域后，把每个区域的"组件类型序列"列出来对比。如果任意两个相邻区域的类型序列完全相同，必须修改其中一个。

#### 2.6.2 settings 三个动画参数（必须设置，有上限）

**视频开始/结束/区域切换的三个过渡时长，影响整体节奏**：

| 字段 | 含义 | 推荐值 | 上限 | 严禁 |
|---|---|---|---|---|
| `preFullViewDuration` | 视频**开始前**的全景预览时长（秒） | **0.4** | **0.6** | > 0.6 会让用户等太久 |
| `postFullViewDuration` | 视频**结束后**的全景回收时长（秒） | **0.4** | **0.6** | > 0.6 会让结尾拖沓 |
| `contentZoomRatio` | 视频播放区域的内容缩放比例 | **0.9** | — | 不要写 1.0（会贴边、不美观）；不要 < 0.85（内容会偏小） |

**完整 settings 示例**：
```json
"settings": {
  "autoPlay": false,
  "loop": false,
  "minScale": 0.01,
  "maxScale": 5,
  "ease": 0.08,
  "contentZoomRatio": 0.9,
  "preFullViewDuration": 0.4,
  "postFullViewDuration": 0.4
}
```

**严禁**：
- `preFullViewDuration / postFullViewDuration > 0.6`
- `contentZoomRatio = 1.0` 或 `< 0.85`
- 漏掉这三个字段（系统 fallback 可能不符合预期）

#### 2.6.3 占位图策略：Pollinations AI 生成图 + AggregateComponent 叠水印

**默认主用方案**（视觉效果最好、主题最匹配）：
- 图源：**Pollinations AI Image API** `https://image.pollinations.ai/prompt/{URL编码的prompt}?width=1280&height=720&nologo=true` —— 免费、免 key、根据英文 prompt 实时生成 AI 图片
- 水印：用 **AggregateComponent 把 ImageComponent 和 ShockComponent 组合在一起**，ShockComponent 显示中文胶囊水印"※ 演示图片 请替换"
- 优势：prompt 完全可控，生成的图与视频主题 100% 匹配；图床字体不支持中文也无所谓（我们自己叠中文水印）

**Prompt 编写要点**：
- 用英文，简洁具体：`{主体} + {场景/动作} + {光线/氛围} + {风格修饰}`
- 示例：情侣视频 → `romantic couple walking in sunset park, soft lighting, warm colors`
- 严禁写中文 prompt、写太长的 prompt（> 200 字符）、写敏感内容

**离线兜底方案**：
- Pollinations AI 不可达 / 超时 / 用户拒绝远程图 → 用本地 SVG（`./assets/placeholders/{light|dark}/{hint}.svg`）
- SVG 自带水印，**不要再叠 Aggregate**，否则会双水印

**详见 [`templates/placeholders/url-factory.md`](./templates/placeholders/url-factory.md)**：
- 8 个常见主题 × 推荐 prompt 速查表
- 极简白 / 沉浸黑 主题适配的 Aggregate 完整模板（含胶囊样式）
- 决策表 + 严禁清单

**严禁**：
- 在 ImageComponent 直接写 Pollinations AI URL 而不套 Aggregate（图片裸奔没水印，用户分不清是占位还是真实素材）
- SVG 兜底再叠 Aggregate 水印（会重复）
- 修改水印文字"※ 演示图片 请替换"

---

## 三、第二次交互：生成本地设计文档与素材清单

LLM 调用 `scripts/scaffold.js` 的 `ensureProjectWorkdir()` 自动建目录，再写 `design.md`：

```
canvasvideo-workdir/{skillProjectId}/
├── design.md                  # 设计内容 + 素材准备清单
├── assets/
│   └── images/
└── .canvasvideo/
    └── project-state.json
```

### 3.1 ⚠️ 强制规范：必须遵循 video_design_guide.md + 查阅知识库

**`design.md` 的内容必须严格按照 [`templates/designs/video_design_guide.md`](./templates/designs/video_design_guide.md) 的"步骤 0 + 五阶段十一步 + 用户素材清单"产出**。

**生成 design.md 步骤 7（组件清单）和步骤 9（customStyle）前，LLM 必须先查阅以下知识库**：

| 文件 | 用途 | 必查时机 |
|------|------|---------|
| [`references/components-catalog.md`](./references/components-catalog.md) | 10 个组件的 content / customStyle / 适用场景 / 反例 / 选型决策树 | 步骤 7 选组件、步骤 9 写 customStyle |
| [`references/themes-catalog.md`](./references/themes-catalog.md) | 仅支持的两种主题（white/black）色板 + 选型决策 + 自定义主题应对话术 | 步骤 5 选主题、用户提自定义主题需求时 |
| [`references/visual-richness-rules.md`](./references/visual-richness-rules.md) | 6 条丰富度强制门槛 + 丰富度评分表 + 提升组合拳示例 | 步骤 11 自检（必含 L4 丰富度检查）、生成 project.json 前最后自查 |
| [`templates/placeholders/url-factory.md`](./templates/placeholders/url-factory.md) | 占位图速查表：placehold.co 在线水印 URL × 14 + 本地 SVG × 14 + 引用策略 | 写素材清单 / project.json 中 ImageComponent 时（特别是 `[AI 自动生成 - 占位]` 状态） |
| [`templates/projects/README.md`](./templates/projects/README.md) | 示例项目索引（按场景选 base） | 步骤 0 确定模式后 |
| [`templates/projects/示例-产品演示型-2分钟口播.json`](./templates/projects/示例-产品演示型-2分钟口播.json) | 产品/工具演示型完整样板（120s） | 用户做产品演示时参考节奏与组件搭配 |
| [`templates/projects/示例-案例分享型-1分钟口播.json`](./templates/projects/示例-案例分享型-1分钟口播.json) | 案例/故事分享型完整样板（53s） | 用户做案例分享时参考五段式叙事 |

**必查规则**：
- 如果用户没明确说做什么类型，**默认参考"案例分享型"示例**（叙事结构更通用）
- 选组件时**先翻 components-catalog.md 的"选型决策树"**，不要凭直觉
- 写 customStyle 时**先翻 components-catalog.md 的"字段速查"**，不要凭记忆

**📋 必须包含的产出**：

- 步骤 0：视频目标（项目元信息表）
- 阶段一（步骤 1-3）：文案分段、内容类型标注、风格识别 + 情绪曲线
- 阶段二（步骤 4-5）：区域规划、主题配色方案
- 阶段三（步骤 6-8）：ASCII 布局图、组件清单、节奏设计
- 阶段四（步骤 9-10）：customStyle、时间轴
- 阶段五（步骤 11）：自检报告（L0-L3 + 设计原则）
- 附加：用户素材清单（含状态标注）

**严禁**：
- 跳过任何阶段或步骤
- 一次性输出所有产出（必须按顺序逐步生成）
- 留空表格单元格
- 自检报告全部填"通过"
- 使用 theme（必须用 customStyle）
- 组件 ID 用英文单词（必须用 `{区域}-###` 格式）
- **不查 components-catalog.md 就开始写 customStyle**（很大概率会漏字段或写错嵌套）
- **跳过 L4 丰富度检查直接打包上传**（违反 visual-richness-rules.md 6 条门槛会生成 low 视频）
- **L4 检查任何一条不通过仍上传**（必须回到步骤 7-9 重新设计；重写后再次自检）
- **创作模式下出现连续 ≥ 2 秒画面静止段**（违反门槛 7.1 末组件停留 ≤ 2s；详见 §2.5）
- **创作模式区域 duration > 15 秒**（违反门槛 7.3；必须拆分为更短区域）
- **同区域相邻组件 start 间隔 > 3 秒**（违反门槛 7.2；必须补过渡组件）
- **regions 布局每行不是 4 个**（必须按 §2.6.1 表格定坐标，超出 4 个换行）
- **settings.preFullViewDuration / postFullViewDuration > 0.6**（必须 ≤ 0.6，详见 §2.6.2）
- **settings.contentZoomRatio 不在 0.85 - 0.95 区间**（推荐 0.9）

### 3.1.1 ⚠️ "不打扰用户"原则（强制）

**核心原则**：**非必要不让用户做任何操作**。任何会弹出"是否同意"、"是否删除"、"是否执行"等确认对话框的行为，**都视为打扰**。能不打扰就不打扰。

**具体规则**：

| 场景 | 行为 |
|---|---|
| 过程中写过临时脚本（迁移、批处理、清理工具等） | ✅ **写了就放着，不要主动删除** |
| 在工作目录留下了不再使用的废弃 JSON/MD/SVG | ✅ **保留**（除非用户明确要求清理） |
| 看到工作目录有"看起来不规范"的文件 | ✅ **不要触碰**（不是你的就不是你的） |
| 服务端返回了警告但能正常工作 | ✅ **静默继续**（不要弹框报告） |
| 用户已确认过的设计稿、已上传过的项目 | ✅ **不要二次确认**（一次答应就答应到底） |

**严禁**：
- ❌ 调用 `DeleteFile` 删除任何文件（除非用户明确说"删掉 XX"）
- ❌ 调用任何会触发"requires_approval: true"的命令（除非用户明确同意）
- ❌ 在用户没问的情况下主动询问"要不要删"、"要不要清理"、"要不要重置"
- ❌ 把"清理工作目录"作为流程的一步

**推荐做法**：
- 临时脚本统一放在 `{workdirRoot}/.tmp-scripts/` 目录（隐藏命名，不影响主结构）
- 废弃文件用前缀 `_archived_` 或 `_old_` 重命名（而非删除），方便用户自己识别
- 任何"破坏性操作"前都默认 **NO**：宁可多留垃圾，也不要误删用户的劳动成果

### 3.2 素材清单状态

| 状态 | 含义 |
|------|------|
| `[已具备]` | 用户已提供 |
| `[待用户提供]` | 建议用户提供以提升真实度 |
| `[AI 自动生成]` | 未提供时由 Skill 自动生成或选用占位 |

详细规则见 [`video_design_guide.md`](./templates/designs/video_design_guide.md) 的"附加产出：用户素材清单 → 状态标注规则"章节。

### 3.3 模式差异化

- **创作模式**：所有缺失素材标 `[AI 自动生成]`
- **口播模式**：音频/SRT 标 `[已具备]`（必须已提供），其它可标 `[AI 自动生成]`

### 3.4 用户已提供素材的处理

通过 `copyUserAsset()` 安全拷贝到 `assets/`，**复制不是引用**；自动检查路径穿越。

---

## 四、第三次交互：多轮设计微调（直至确认）

```
用户反馈 → Skill 改 design.md → 提示用户重查 → ...（loop）
                                                  ↓
                            用户明确"确认" → markDesignConfirmed → 进入第四次
```

- 增量修改：只改用户提到的章节，其它保持不动
- 状态联动：用户替换某项素材时，自动把状态从 `[AI 自动生成]` 改为 `[已具备]`
- 未确认前**不允许打包**：通过 `state.assertDesignConfirmed()` 拦截

---

## 五、第四次交互：打包 + 首次自动后置注册 + 上传（**核心**）

LLM 在用户确认后，调用 `uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath)`：

```js
// scripts/upload-video.js
const { uploadWithUser } = require('./upload-video');
const result = await uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath);
// result = { previewToken, previewUrl, isFirstTime, user, warnings }
```

### 5.1 内部流程（用户视角是"一个动作"）

```
1. ensureWorkdirRoot()
2. readLocalUser(workdirRoot)
   ├─ 本地存在且合法 → user, isFirstTime=false
   └─ 不存在 / 损坏 → 进入注册分支
        a. generateUserId() + generateUserToken()
        b. POST /api/users/register
        c. 409 冲突 → 重生一次再 register
        d. 写 canvasvideo-workdir/.user.json
        e. 本地写失败 → 抛错并把 userId/userToken 暴露给上层
        f. user, isFirstTime=true
3. POST /api/projects/upload (zip + skillProjectId + userId + userToken)
4. 返回 { previewToken, previewUrl, isFirstTime, user }
```

### 5.2 输出文案规则

#### 首次（`isFirstTime === true`）— ⚠️ 必须特别强调

LLM **必须**按以下格式输出，不可省略任何元素：

```
✅ 视频已上线：{previewUrl}

📤 这条链接可以直接分享给同事、朋友、客户或社群——
   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。

🎮 播放页快捷键（先点开链接试试）：
   • 空格         播放 / 暂停
   • ← / →        快退 / 快进
   • 双击空格     全景 / 退出全景
   • ↑ / ↓        显示 / 隐藏组件 ID

🖼️ 想换掉占位图（带"※ 演示图片 请替换"水印的）？
   1. 把你的真实图片放到工作目录的 ./assets/images/ 下
   2. 然后告诉我："把 P3-004 的图片替换成 ./assets/images/my-photo.png"
   3. 我会自动改 project.json 并重新打包上传，链接保持不变

🛠️ 想调整视频里某个组件的样式？
   1. 在播放页按 ↑ 显示组件 ID
   2. 找到要改的组件 ID（如 P4-001、P3-003）
   3. 告诉我具体怎么改，常见说法举例：
      • "P4-001 再大一点"
      • "P3-003 改成红色"
      • "P2-002 文字太长了，缩短一点"
      • "P5-003 按钮换成绿色，圆角再大一点"
      • "P1-002 副标题加粗"
      • "P6 区域多停 2 秒"
      • "把 P3-004 移到右边"

⚠️ 重要：本次为你创建了 CanvasVideo 账号

  userId:    {user.userId}
  userToken: {user.userToken}

📁 凭证已保存到本地：{workdirRoot}/.user.json

🔒 这是你登录视频列表页面的唯一凭证。
   - 请妥善保管，不要泄露给他人
   - 如果该文件丢失，账号将无法找回（你的视频链接仍可正常访问，但无法在网页上看到列表）
   - 如需在其他设备使用，请将 .user.json 复制过去
```

#### 非首次（`isFirstTime === false`）— 仅链接 + 操作引导

```
✅ 视频已上线 / 已更新：{previewUrl}

📤 链接可以直接分享给同事、朋友、客户或社群——
   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。

🎮 快捷键：空格=播放/暂停 · ←→=快进快退 · 双击空格=全景 · ↑↓=显示/隐藏组件 ID

🖼️ 替换占位图：把图片放到 ./assets/images/，然后说"把 P3-004 替换成 my-photo.png"
🛠️ 调整组件：先按 ↑ 显示 ID，再说"P4-001 再大一点 / P3-003 改成红色"
```

**严禁**在非首次输出中泄露 userId / userToken。

#### 警告 (`warnings`)

`getOrCreateUser` 返回的 `warnings` 数组包含本地文件损坏等提示，LLM 应在首次告知前作为前置补充：

```
⚠️ 检测到本地账号文件存在但无法使用：xxx；已为你重新创建账号
（然后正常输出首次告知）
```

### 5.3 错误处理

| 场景 | LLM 行为 |
|------|------|
| 注册返回 409（重试后仍冲突） | 提示"账号生成异常，请稍后重试"，不走上传 |
| 注册成功但本地写失败 | 把错误信息原文给用户（已含 userId/userToken），强烈提示手动备份 |
| upload 返回 401 | 提示"账号验证失败，请检查 .user.json 是否正确" |
| upload 返回 413 | 提示具体阈值，建议压缩素材或减少时长 |
| upload 返回 5xx | 退避 1s 重试 1 次，仍失败则保留 zip 供用户重试 |
| 网络中断 | 提示"上传中断，请稍后重试"；保留本地 zip 供下次复用 |

---

## 六、第六次交互：视频迭代（不再走设计文档）

```
用户反馈视频修改意见
  ↓
LLM 直接改 project.json 或替换 assets
  ↓
validate → package → uploadWithUser
  ↓
isFirstTime 必为 false（账号已存在）→ 仅返回链接，不再提示账号
```

- 严禁在迭代时再次展示账号信息
- 严禁在视频已生成后回头修改 design.md（提示用户："如需重做设计，请创建新视频"）

---

## 七、第七次交互：用户主动查询账号（任意时刻可触发）

### 7.1 意图识别

LLM 必须识别以下泛化表达，统一走查询账号分支：

```
我的账号是什么 / 给我看一下我的 token / 我的 userId 是多少
我的 CanvasVideo 凭证 / 把账号告诉我 / 我的账号信息
我的 token / 显示账号 / 看一下账号
```

### 7.2 行为约束

- 调用 `readLocalUser(workdirRoot)`，**只读本地，绝不调用任何服务端接口**
- 查询不应触发注册（即使本地无账号也不要顺手注册）

### 7.3 输出文案

#### 本地有账号

```
你的 CanvasVideo 账号：

  userId:    {user.userId}
  userToken: {user.userToken}

📁 存放路径：{workdirRoot}/.user.json
🔒 请妥善保管，丢失无法找回
```

#### 本地无账号（文件不存在）

```
本地未找到 CanvasVideo 账号。
在你首次创作并上传视频时会自动为你创建。
```

#### 本地账号文件损坏

```
本地账号文件已损坏：{workdirRoot}/.user.json
请删除该文件后重新触发首次上传，将会重新为你创建一个新账号。
（注意：原账号关联的视频列表将无法找回）
```

**严禁打印损坏文件的原始内容**。

### 7.4 拒绝重置请求

用户说"修改我的 userToken / 重置账号 / 换一个 token" 等：

```
账号体系采用极简凭证，无重置机制。
如需更换，请删除 canvasvideo-workdir/.user.json 后重新创建视频，
但原账号关联的视频列表将无法找回（视频本身的分享链接仍可访问）。
```

---

## 八、文件结构

```
canvasvideo-skill/
├── SKILL.md                    # 本文件：Skill 主入口
├── references/                 # ⭐ 知识库（LLM 必查）
│   ├── components-catalog.md   # 10 个组件 content/customStyle/选型决策树
│   ├── themes-catalog.md       # 仅支持 white/black 两种主题 + 决策表 + 话术
│   └── visual-richness-rules.md # 6 条丰富度强制门槛 + 评分表（防止 low 视频）
├── docs/                       # （可选扩展）编排细则
│   ├── design-orchestrator.md
│   ├── video-orchestrator.md
│   ├── design-guide.md
│   └── authoring-guide.md
├── schema/
│   └── project.schema.json     # 视频项目 JSON Schema
├── templates/
│   ├── designs/                # 设计文档规范（权威）
│   │   └── video_design_guide.md  # ★ 步骤 0 + 五阶段十一步 + 状态标注
│   ├── projects/               # 视频项目模板与高质量示例
│   │   ├── README.md           # 示例索引（LLM 必查）
│   │   ├── 通用视频.json        # 最简兜底模板
│   │   ├── 示例-产品演示型-2分钟口播.json  # 产品演示样板
│   │   └── 示例-案例分享型-1分钟口播.json  # 案例叙事样板
│   └── placeholders/           # ⭐ 占位图模板（带水印的 SVG，按主题/场景）
│       ├── url-factory.md      # 占位图速查表（在线 URL + 本地 SVG）
│       ├── light/              # 极简白主题占位（hook/scene/pain/solve/result/cta/generic）
│       └── dark/               # 沉浸黑主题占位
└── scripts/
    ├── scaffold.js             # ensureWorkdir / 写 design.md / 拷贝用户素材
    ├── state.js                # 读写 .canvasvideo/project-state.json
    ├── validate.js             # 校验 project.json
    ├── package.js              # 打包 zip
    └── upload-video.js         # ★ 用户体系 + 上传（核心）
```

工作目录（自动创建，不要求用户准备）：

```
{Agent 当前工作目录}/canvasvideo-workdir/    ← ⭐ 默认放在 Agent CWD 下
├── .user.json                                ← 极简两字段：{ userId, userToken }
└── {skillProjectId}/
    ├── design.md
    ├── project.json
    ├── assets/
    │   └── images/
    └── .canvasvideo/
        └── project-state.json
```

---

## 九、工作目录路径推算（LLM 视角）

> ⚠️ **重要变更（v1.5）**：工作目录从"Skill 目录的父目录"改为 **Agent 当前工作目录（CWD）**。
> **原因**：Skill 安装目录（如 `C:\Users\xxx\.trae-cn\skills\canvasvideo\`）通常需要管理员权限，且全局共享会冲突；放到 Agent CWD（用户当前打开的项目目录）下更符合直觉，权限稳定，每个项目互不干扰。

### 9.1 路径推算优先级

LLM 必须按以下顺序确定工作根目录：

| 优先级 | 路径来源 | 计算公式 |
|---|---|---|
| **第 1 优先** | **Agent 当前工作目录（CWD）** | `process.cwd() + "/canvasvideo-workdir/"` |
| 第 2 优先（兜底） | Skill 目录的父目录 | `path.dirname(SKILL.md 父目录) + "/canvasvideo-workdir/"`（只在 Agent 无法获取 CWD 时用） |

### 9.2 LLM 实现指引（必读）

**在 Trae / Cursor / Claude Code 等主流 Agent 中**：
- LLM 默认有"当前工作目录"概念（用户当前打开的项目根目录）
- LLM 在调用 Node 脚本时，工作目录就是当前 Agent CWD
- **LLM 必须把 `workdirRoot` 设为 Agent CWD 下的 `canvasvideo-workdir/`**

```javascript
// ✅ 推荐写法（v1.5 起）
const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');

// ❌ 旧写法（v1.4 及以前），权限可能受限
const skillDir = path.dirname(__filename); // SKILL.md 父目录
const workdirRoot = path.resolve(skillDir, '../canvasvideo-workdir');
```

**给用户的提示**（首次启动时）：
> 我会在你当前的项目目录下创建一个 `canvasvideo-workdir/` 文件夹，存放所有视频项目和登录凭证。如果不希望放在这里，请明确告诉我目标路径。

### 9.3 路径推算汇总表

| 项 | 计算 |
|---|---|
| Agent 当前工作目录（CWD） | `process.cwd()` |
| 工作根目录 | **CWD + `canvasvideo-workdir/`** |
| 项目工作目录 | 工作根目录 + `{skillProjectId}/` |
| 用户凭证文件 | 工作根目录 + `.user.json` |
| 设计文档 | 项目工作目录 + `design.md` |
| 项目 JSON | 项目工作目录 + `project.json` |
| 用户素材目录 | 项目工作目录 + `assets/images/` |

**任何首次写文件前都应调用 `ensureProjectWorkdir(workdirRoot, skillProjectId)`**，不要假设目录存在。

### 9.4 skillProjectId 生成规则（强制）

**规则**：`skillProjectId` **必须通过 `scripts/state.js` 的 `loadOrCreateProject()` 生成**，禁止 LLM 自己编造 ID。

**正确流程**：
```js
const state = require('./scripts/state').loadOrCreateProject(workdir);
// state.skillProjectId 由程序自动生成，格式：cv_{timestamp36}_{random8}
// 示例：cv_m3v9z_a1b2c3d4
```

**错误示例**（LLM 自己编造的 ID，严禁）：
```
❌ cv_20260621_couple_love     ← 模型自己写的日期+主题名
❌ cv_project_1                ← 太简单，没有随机性
❌ couple_love                 ← 缺少 cv_ 前缀
❌ cv_123456                   ← 没有 random 部分
```

**原因**：
1. `state.js` 生成的 ID 包含时间戳（36 进制）+ 8 位随机十六进制，保证全局唯一
2. 同一项目多次上传必须复用相同的 `skillProjectId`，服务器才能复用 `previewToken`
3. 如果 LLM 每次自己编一个新 ID，同一项目会被当成不同项目，导致重复创建、previewToken 不固定

**自检**：生成 ID 后检查格式是否为 `cv_{7-10 位字母数字}_{8 位十六进制}`，如果不是，说明没有正确调用 `state.js`。

---

## 十、上传接口

> **服务端默认地址（v1.4 起硬编码）**：`http://8.147.60.112/cv`
> 程序化调用 / CLI 时不指定 `serverUrl` 即使用此默认值。
> 如需切换，在 [scripts/upload-video.js](./scripts/upload-video.js) 顶部修改 `DEFAULT_SERVER_URL` 常量即可，无需改其他地方。

### 10.1 视频上传

```
POST {serverUrl}/api/projects/upload
Content-Type: multipart/form-data
  - skillProjectId: String   (必填)
  - zip:            File     (必填)
  - userId:         String   (必填)  ← v1.4 起强制
  - userToken:      String   (必填)  ← v1.4 起强制
  - meta:           Object   (可选)

响应: { success, skillProjectId, previewToken, previewUrl }
```

### 10.2 用户注册

```
POST {serverUrl}/api/users/register
Content-Type: application/json
  body: { userId, userToken }

响应: { success, userId }

错误码:
  - 409 / USER_ID_CONFLICT  → Skill 端重生 userId 后重试一次
```

### 10.3 用户项目列表（前端用）

```
POST {serverUrl}/api/users/projects
Content-Type: application/json
  body: { userId, userToken }

响应: { success, projects: [{ previewToken, name, updatedAt }] }
```

---

## 十一、用户体系（API Key 模式，v1.4）

### 11.1 极简凭证

- `userId` 格式：`cu-{12位十六进制}` 例：`cu-a1b2c3d4e5f6`
- `userToken` 格式：`ut-{32位十六进制}` 例：`ut-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d`
- 无密码、无邮箱、无 displayName，无找回机制

### 11.2 服务端只存 hash

```
data/users/{userId}.json
{
  "userId": "cu-...",
  "userTokenHash": "<sha256>",
  "createdAt": "...",
  "projects": ["..."]
}
```

明文 `userToken` 仅存于用户本地 `canvasvideo-workdir/.user.json`。

### 11.3 注册时机

**仅在首次打包并即将上传那一刻自动注册**，不在：
- ❌ Skill 启动时
- ❌ 用户输入需求时
- ❌ 生成设计文档时

### 11.4 单机模式与边界

- 一台机器一份 `.user.json`，所有项目共享同一账号
- `.user.json` 丢失 = 网页登录入口无法看到列表（视频分享链接仍可访问）
- 跨设备：手动复制 `.user.json` 到目标机器
- 不支持账号合并、不支持服务端找回、不支持重置

---

## 十二、重要约束（变更不得违反）

1. **第一次交互不强行追问**：用户只需提供需求即可，其它信息可后续补充
2. **设计文档仅在本地**：不上传服务器
3. **设计确认后才上传**：`assertDesignConfirmed()` 拦截
4. **视频生成后不回设计**：所有迭代直接改 project.json
5. **固定 skillProjectId**：同一项目多次上传使用相同 ID，服务器复用 previewToken
6. **首次注册无感**：用户不需要主动注册，由 `getOrCreateUser` 自动完成
7. **首次告知必须强调**：⚠️ + 代码块 + 存放路径 + 风险提示，缺一不可
8. **非首次不再展示账号**：严禁在迭代或非首次场景输出 userToken
9. **查询账号只读本地**：绝不调用任何服务端接口
10. **不主动重置账号**：用户要重置时引导其手动删除 `.user.json`

---

## 十三、使用样例（LLM 编排参考）

### 13.1 首次创建视频

```js
// 路径推算（v1.5：使用 Agent CWD，不再依赖 Skill 目录）
const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');

// 1. 状态
const state = require('./scripts/state').loadOrCreateProject(workdir);

// 2. 写设计 + 用户确认（多轮）
require('./scripts/scaffold').writeDesignMd(workdirRoot, state.skillProjectId, designMd);

// 3. 用户确认后
require('./scripts/state').markDesignConfirmed(workdir);

// 4. 准备占位素材（SVG + BGM）
const { ensurePlaceholders, ensureBgm } = require('./scripts/scaffold');
ensurePlaceholders(workdirRoot, state.skillProjectId, project.theme);
// 创作模式默认配 BGM；口播模式跳过
const bgm = ensureBgm(workdirRoot, state.skillProjectId, project.bgmStyle);
if (bgm.hasBgm) {
  project.audio = { path: bgm.copied[0], loop: true, fadeIn: 1, fadeOut: 2 };
}

// 5. 打包 + 自动注册 + 上传
const { uploadWithUser } = require('./scripts/upload-video');
const result = await uploadWithUser(SERVER_URL, workdirRoot, state.skillProjectId, zipPath);

// 6. 输出文案
if (result.warnings.length) {
  // 拼到首次告知前面
}
if (result.isFirstTime) {
  // 按 §5.2 首次模板输出 ⚠️ 强调
} else {
  // 仅输出 result.previewUrl
}
```

### 13.2 查询账号

```js
const { readLocalUser } = require('./scripts/upload-video');
const { user, error } = readLocalUser(workdirRoot);
if (user) {
  // 按 §7.3 输出账号信息
} else if (error) {
  // 文件损坏：按 §7.3 输出错误说明，不打印 raw
} else {
  // 文件不存在：按 §7.3 输出"未注册"提示
}
```
