# 视频设计指南（CanvasVideo Skill 权威规范）

> 本指南是 AI 执行视频设计的完整规范。AI 必须严格按照本指南"步骤 0 + 五阶段十一步"执行，不能跳过任何步骤。
> 适用范围：**创作模式 / 口播模式** 下的首次视频设计。视频迭代场景（已生成视频后修改）不走本指南，直接改 project.json。

---

## 使用说明

1. **用户提供需求**：项目主题/受众/时长/风格（创作模式）或 口播音频+SRT（口播模式）
2. **AI 执行**：AI 必须按本指南的"步骤 0 + 五阶段十一步"，**逐步生成设计文档，不能跳过任何步骤，不能一次性输出最终结果**
3. **最终输出**：阶段五完成后，输出完整的设计文档（含步骤 0、五阶段十一步、用户素材清单），不含 JSON
4. **JSON 生成**：用户确认设计文档后，再进入下一环节生成 project.json 配置

---

## 阶段总览

| 阶段 | 名称 | 步骤 | 产出 |
|------|------|------|------|
| 步骤 0 | 视频目标 | 0 | 项目元信息表（主题/受众/时长/风格） |
| 阶段一 | 内容理解 | 1-3 | 内容类型表、情绪曲线 |
| 阶段二 | 视觉策略 | 4-5 | 区域规划表、配色方案 |
| 阶段三 | 布局设计 | 6-8 | ASCII 布局图、组件清单、节奏设计 |
| 阶段四 | 组件样式与时间轴 | 9-10 | customStyle、时间轴 |
| 阶段五 | 自检 | 11 | 自检报告 |
| 附加 | 用户素材清单 | — | 素材表 + 状态标注 |

---

## 步骤 0：视频目标（项目元信息）

> **目标**：明确视频的基础元信息，作为后续所有阶段的输入约束
> **输入**：用户在第一次交互中提供的需求（主题、受众、时长、风格、模式）
> **产出**：项目元信息表

### 产出格式

| 字段 | 内容 |
|------|------|
| 模式 | 创作模式 / 口播模式 |
| 主题 | （用户提供，例：大模型科普） |
| 目标受众 | （用户提供，例：开发者 / 大众用户 / 行业人士） |
| 预计时长 | （秒，例：180 秒） |
| 风格 | （用户提供，例：轻松幽默 / 专业严谨 / 科技感） |
| 文案来源 | 创作模式：AI 自动生成 / 口播模式：用户 SRT |
| 输出语言 | 中文 / 英文 / 双语（默认中文） |
| **是否有配音音频** | ✅ 有（口播模式必须有）/ ❌ 无（创作模式默认无） |
| **是否生成字幕** | ✅ 是（仅当有配音音频时）/ ❌ 否（无配音音频时严禁生成） |

> **关键约束**：本表确定后，后续阶段所有产出（情绪曲线、区域规划、配色等）必须围绕本表的"风格 + 受众 + 时长"展开。
>
> **🚨 字幕与音频共生强制规则**：
> - 创作模式 → "是否有配音音频" = ❌ → "是否生成字幕" 必须 = ❌（**严禁** 在 project.json 写 subtitles）
> - 口播模式 → "是否有配音音频" = ✅ → "是否生成字幕" 必须 = ✅（subtitles 严格来自用户 SRT）
> - 详见 [`../../SKILL.md#24-️字幕与音频共生规则强制`](../../SKILL.md) 第 2.4 节

---

## 阶段一：内容理解

> **目标**：理解文案内容，确定每段的内容类型和情绪强度
> **输入**：用户提供的文案（口播模式来自 SRT；创作模式由 AI 根据主题先撰写）
> **产出**：内容类型标注表、视频风格识别、情绪曲线

### 步骤 1：文案分段

**说明**：按语义将文案分成若干段落，每段只讲一个意思，不超过 20 秒。

**产出示例**：

| 段落ID | 时间段 | 文案内容 | 语义完整性 |
|--------|--------|---------|-----------|
| 1 | 0-12秒 | 画布视频，JSON配置，一键成片，让AI轻松制作专业视频。 | ✅ |
| 2 | 12-24秒 | 传统视频制作内容多、流程散、复用少，画布视频把这一切变成一份JSON配置。 | ✅ |
| 3 | 24-36秒 | 写JSON、填内容、设时间、点录制，四步完成一个可交付的视频。 | ✅ |
| 4 | 36-48秒 | 10+组件类型、20+布局模板、0代码门槛、1键浏览器录制导出。 | ✅ |
| 5 | 48-60秒 | 现在就开始，复制模板，5分钟做出你的第一个视频。 | ✅ |

### 步骤 2：内容类型标注

**说明**：根据识别逻辑，标注每段的主类型、次类型和情绪强度。

**识别逻辑**（按优先级匹配）：
1. 段落包含数字+成果词（"4小时"、"省了"）→ RESULT
2. 段落包含"如何"、"步骤"、"首先" → SOLVE
3. 段落包含"关键"、"最重要"、"核心" → KEY
4. 段落包含"痛点"、"问题"、"困扰" → PAIN
5. 段落包含"如果"、"假设"、"想象一下" → SCENE
6. 段落位于视频开头（前5秒），且包含反问/悬念 → HOOK
7. 段落位于视频末尾（后5秒），且包含"关注"、"评论" → CTA
8. 以上都不匹配 → 按上下文推断，或标记为 SCENE

**产出示例**：

| 段落ID | 时间段 | 文案 | 主类型 | 次类型 | 次类型占比 | 情绪强度 |
|--------|--------|------|--------|--------|-----------|---------|
| 1 | 0-12秒 | 画布视频... | HOOK | PRODUCT | 30% | 高 |
| 2 | 12-24秒 | 传统视频制作... | PAIN | SOLVE | 25% | 中低 |
| 3 | 24-36秒 | 写JSON... | SOLVE | — | — | 中 |
| 4 | 36-48秒 | 10+组件类型... | RESULT | PRODUCT | 20% | 中高 |
| 5 | 48-60秒 | 现在就开始... | CTA | — | — | 中 |

### 步骤 3：视频风格识别

**说明**：统计文案中的特征词，确定视频风格（TECH / STORY / PRODUCT）。

**评分规则**：
- TECH 特征词（JSON、配置、组件、代码等）：每个 1.5 分
- TECH 数字（10+、20+、0、1 等）：每个 0.5 分
- STORY 特征词（如果、假设、曾经等）：每个 1.5 分
- STORY 情感词（轻松、专业等）：每个 0.5 分
- PRODUCT 特征词（产品、模板、复制等）：每个 1.5 分

**判定规则**：TECH 得分 ≥ PRODUCT 得分 × 1.5 → TECH 风格；否则 PRODUCT 或 STORY。

**产出示例**：

| 风格 | 特征词数量 | 数字加分 | 总分 | 结论 |
|------|-----------|---------|------|------|
| TECH | 7个（JSON、配置、组件、模板、代码、浏览器、导出） | 6个 | 13.5 | ✅ 主风格 |
| STORY | 0个 | 2个（轻松、专业） | 1.0 | |
| PRODUCT | 3个（画布视频、产品、复制模板） | 0个 | 4.5 | |

**情绪曲线**：

| 段落 | 内容类型 | 情绪强度 | 视觉强度 |
|------|---------|---------|---------|
| 1 | HOOK | 高 | 大字号、强对比、全屏 |
| 2 | PAIN | 中低 | 中字号、对比色、左右对比 |
| 3 | SOLVE | 中 | 中字号、流程图、步骤展示 |
| 4 | RESULT | 中高 | 大字号、数据高亮、图表 |
| 5 | CTA | 中 | 大字号、按钮感、引导色 |

---

## 阶段二：视觉策略

> **目标**：确定每个区域的设计意图和配色方案
> **输入**：阶段一的产出
> **产出**：区域规划表、主题配色方案

### 步骤 4：区域规划

**说明**：根据内容类型，确定每个区域的设计意图、建议组件数、焦点组件，以及是否需要图片素材。

**图片素材建议**：
- HOOK 区域：可考虑产品 logo 图、品牌背景图
- SCENE 区域：场景插画、环境照片
- PAIN 区域：痛点场景图、对比图（Before）
- SOLVE 区域：步骤截图、操作界面图
- RESULT 区域：成果截图、数据图表、用户反馈图
- CTA 区域：产品截图、二维码、引导图

**产出示例**：

| 区域 | 时间段 | 内容类型 | 设计意图（1句话） | 建议组件数 | 焦点组件 | 建议图片素材 |
|------|--------|---------|----------------|-----------|---------|------------|
| P1 | 0-12秒 | HOOK | 让用户3秒内记住产品名字和核心价值 | 2-3个 | ShockComponent（金句） | 产品logo图 |
| P2 | 12-24秒 | PAIN | 让用户产生共鸣，感受到传统方式的痛点 | 3-4个 | 对比组件（Before/After） | 痛点场景图 |
| P3 | 24-36秒 | SOLVE | 清晰展示4个步骤，降低认知门槛 | 4-5个 | 流程图（步骤可视化） | 步骤截图 |
| P4 | 36-48秒 | RESULT | 用数据证明产品能力，增强信服 | 3-4个 | 数据高亮（大数字） | 成果截图 |
| P5 | 48-60秒 | CTA | 引导用户立即行动，降低决策门槛 | 2-3个 | CTA按钮（大按钮） | 产品截图 |

### 步骤 5：主题配色方案

> ⚠️ **本步骤强制前置**：开始选主题前，**必须先查阅 [`../../references/themes-catalog.md`](../../references/themes-catalog.md)** 的"主题选择决策表"。

**说明**：
1. **选择背景主题**：根据视频风格和内容氛围，**只能在 `white` / `black` 二选一**（v1.4 不支持自定义主题）
2. **确定配色**：根据背景主题，确定主色、辅色、强调色、背景色、文字色

**🚫 严禁**：
- 写 `theme: "default"` / `theme: "colorful"` / `theme: "custom"` / `theme: null` —— schema 校验会直接拒绝
- 不写 theme 字段 —— 系统 fallback 会渲染异常
- 用户要求"自定义品牌主题"时，**不要**承诺定制 theme，而是引导：保持 white/black 主题，通过组件级 customStyle 体现品牌色

**主题决策（简版，详情见 themes-catalog.md）**：

| 适用场景 | 选 |
|---|---|
| 商务、教学、科普、案例、产品演示 | **极简白**（`white`） |
| 代码、AI、技术、数据看板、品牌发布 | **沉浸黑**（`black`） |
| 用户没明确要求 | **极简白**（默认） |

> **统一称呼**：与用户对话时一律说"极简白 / 沉浸黑"，写 project.json 时用 `"white"` / `"black"`。

**背景主题选择**：

| 背景主题 | 别名 | 适用场景 | 特点 |
|---------|------|---------|------|
| white | 🤍 极简白 | 科技、商务、简洁 | 白底，深色文字，清爽专业 |
| black | 🌌 沉浸黑 | 深色、沉浸、高端 | 黑底，亮色文字，高级感 |

**产出示例**：

| 背景主题 | 风格 | 主色 | 辅色 | 强调色 | 背景色 | 文字色 |
|---------|------|------|------|--------|--------|--------|
| white | TECH | #2563EB（蓝） | #06B6D4（青） | #F59E0B（橙） | #FFFFFF（白） | #111827（深灰） |

**区域配色应用**：

| 区域 | 内容类型 | 主色调 | 辅助色 | 强调色 | 特殊处理 |
|------|---------|--------|--------|--------|---------|
| P1 | HOOK | 深灰标题 | 青色副标题 | 橙色金句 | 金句用渐变背景 |
| P2 | PAIN | 红色（痛点） | 绿色（解决方案） | 白色文字 | 左右对比色 |
| P3 | SOLVE | 蓝色步骤 | 青色步骤 | 橙色高亮 | 当前步骤橙色 |
| P4 | RESULT | 蓝色数据 | 青色数据 | 橙色关键数字 | 大数字用 Shock |
| P5 | CTA | 蓝色按钮 | 白色文字 | 橙色紧迫感 | 按钮用渐变 |

---

## 阶段三：布局设计

> **目标**：确定每个区域的布局结构、元素位置和出现顺序
> **输入**：阶段二的产出
> **产出**：ASCII 布局图、元素清单、节奏设计

### 步骤 6：布局位置设计

**说明**：确定每个区域使用哪种模式（模式一/二/三），并用 ASCII 图展示组件位置关系。

**三种模式说明**（控制布局和视频显示逻辑）：
- **模式一（纯动态）**：所有组件都是普通组件，按时间依次出现，自动聚拢到视口中央，只需配置 w/h
- **模式二（纯固定）**：整个区域就是一个 AggregateComponent，内部所有子组件位置固定，需手动配置 x/y/w/h
- **模式三（混合）**：外层组件（普通组件 + AggregateComponent）按动态模式自动聚拢，内层 AggregateComponent 按固定模式手动配置位置

**嵌套规则**：AggregateComponent 可以嵌套 AggregateComponent，最多嵌套两层（外层→内层→最内层）。

**时间控制说明**：所有模式下，每个组件（包括 AggregateComponent 内部的子组件）都可以独立配置 start/end 时间，根据内容需要决定出现顺序。

**产出示例**：

**P1（模式一）**：
```
┌─────────────────┐
│                 │
│   画布视频      │  ← TitleComponent（60px，深灰，居中）
│                 │
│  让AI轻松制作视频 │  ← ShockComponent（36px，白字，渐变背景）
│                 │
└─────────────────┘
```

**P2（模式三）**：
```
┌─────────────────┐
│ 传统视频制作有多难 │  ← TitleComponent（46px，居中上）
├────────┬────────┤
│  内容多  │        │
│  流程散  │ JSON配置 │  ← 左：BadgeComponent（红） 右：BadgeComponent（绿）
│  复用少  │  搞定   │
└────────┴────────┘
        ↑ AggregateComponent（左右对比）
```

**P3（模式三）**：
```
┌─────────────────┐
│   四步完成视频    │  ← TitleComponent（标题，居中上）
│  从JSON到成片    │  ← TextComponent（副标题，中）
├────┬────┬────┬──┤
│写JSON│填内容│设时间│点录制│  ← AggregateComponent（4步骤横排）
└────┴────┴────┴──┘
```

**P4（模式三）**：
```
┌─────────────────┐
│  为什么选画布视频  │  ← TitleComponent（标题，居中上）
├────┬────┬────┬──┤
│ 10+│ 20+│  0 │ 1 │  ← AggregateComponent（4个大数字横排）
│组件 │模板 │代码│键导出│
└────┴────┴────┴──┘
```

**P5（模式一）**：
```
┌─────────────────┐
│                 │
│   现在就开始     │  ← TitleComponent（标题，居中）
│                 │
│ 5分钟做出你的第一个 │  ← ShockComponent（金句，居中）
│      视频       │
│                 │
│  [复制模板开始]  │  ← BadgeComponent（按钮，居中）
│                 │
└─────────────────┘
```

### 步骤 7：组件清单

> ⚠️ **本步骤强制前置**：开始填写组件清单前，**必须先查阅 [`../../references/components-catalog.md`](../../references/components-catalog.md)** 的"选型决策树"和各组件 content 字段说明。不查直接写组件类型 / content / 必填字段会大概率出错。

**说明**：列出每个区域的所有组件，包括父组件/子组件关系、类型、表达内容和位置。

**规则**：
1. 所有组件必须用 customStyle，禁止用 theme。
2. **组件 ID 必须使用数字编号格式：`{区域}-###`（如 P1-001, P2-003, P3-005）**
3. 同一区域内的组件按顺序编号，确保唯一性。
4. 可用组件包括 `TitleComponent`、`TextComponent`、`ImageComponent`、`CardComponent`、`QuoteComponent`、`BadgeComponent`、`CornerComponent`、`ShockComponent`、`GraphicComponent`、`AggregateComponent`。
5. 图形/流程/架构/时间线/图表类表达优先考虑 `GraphicComponent`，复杂组合布局再使用 `AggregateComponent`。

**产出示例**：

| 区域 | 元素ID | 父组件/子组件 | 组件类型 | 表达内容 | 位置 |
|------|--------|-------------|---------|---------|------|
| P1 | P1-001 | 父组件 | TitleComponent | "画布视频" | 居中上 |
| P1 | P1-002 | 父组件 | ShockComponent | "让AI轻松制作视频" | 居中下 |
| P2 | P2-001 | 父组件 | TitleComponent | "传统视频制作有多难" | 居中上 |
| P2 | P2-002 | 父组件 | AggregateComponent | 左右对比容器 | 下 |
| P2 | P2-003 | 子组件 | BadgeComponent | "内容多" | 左1 |
| P2 | P2-004 | 子组件 | BadgeComponent | "流程散" | 左2 |
| P2 | P2-005 | 子组件 | BadgeComponent | "复用少" | 左3 |
| P2 | P2-006 | 子组件 | BadgeComponent | "JSON配置搞定" | 右 |
| P3 | P3-001 | 父组件 | TitleComponent | "四步完成视频" | 居中上 |
| P3 | P3-002 | 父组件 | TextComponent | "从JSON到成片" | 居中中 |
| P3 | P3-003 | 父组件 | AggregateComponent | 4步骤容器 | 下 |
| P3 | P3-004 | 子组件 | CardComponent | "写JSON" | 左1 |
| P3 | P3-005 | 子组件 | CardComponent | "填内容" | 左2 |
| P3 | P3-006 | 子组件 | CardComponent | "设时间" | 左3 |
| P3 | P3-007 | 子组件 | CardComponent | "点录制" | 左4 |
| P4 | P4-001 | 父组件 | TitleComponent | "为什么选画布视频" | 居中上 |
| P4 | P4-002 | 父组件 | AggregateComponent | 大数据容器 | 下 |
| P4 | P4-003 | 子组件 | ShockComponent | "10+" | 左1 |
| P4 | P4-004 | 子组件 | ShockComponent | "20+" | 左2 |
| P4 | P4-005 | 子组件 | ShockComponent | "0" | 左3 |
| P4 | P4-006 | 子组件 | ShockComponent | "1" | 左4 |
| P5 | P5-001 | 父组件 | TitleComponent | "现在就开始" | 居中上 |
| P5 | P5-002 | 父组件 | ShockComponent | "5分钟做出你的第一个视频" | 居中中 |
| P5 | P5-003 | 父组件 | BadgeComponent | "复制模板开始" | 居中下 |

### 步骤 8：节奏设计

**说明**：描述每个区域的组件出现节奏，包括间隔和停留策略。

**产出示例**：

| 区域 | 节奏描述 |
|------|---------|
| P1 | 标题先出，金句1秒后出现，形成层次 |
| P2 | 标题先出，痛点依次出现（间隔0.5秒），最后方案出现，形成对比 |
| P3 | 标题→副标题→步骤依次出现，形成递进 |
| P4 | 标题→大数据依次出现，形成冲击 |
| P5 | 标题→金句→按钮，逐步引导行动 |

---

## 阶段四：组件样式与时间轴

> **目标**：确定每个组件的具体样式和时间轴
> **输入**：阶段三的产出
> **产出**：customStyle、时间轴

### 步骤 9：视觉样式设计

> ⚠️ **本步骤强制前置**：开始写 customStyle 前，**必须先查阅 [`../../references/components-catalog.md`](../../references/components-catalog.md)** 的"字段速查"表（文末），确认每个组件的必填字段没有遗漏，嵌套结构（Title 用 level1、Text 用 paragraph）写对。

**说明**：为每个区域的组件设计 customStyle，包括字号、颜色、阴影、圆角等。

#### 9.0 ⚠️ customStyle 结构总规则（极其重要，错了会运行时报错）

**前端 `ComponentFactory._validateCustomStyle()` 对 customStyle 的格式有严格校验，必须按下表写**：

| 组件类型 | 顶层结构 | 必填字段 |
|------|------|------|
| **TitleComponent** | `{ "level{N}": { ... } }`，N 由 `content.level` 决定，默认 1 → `level1` | fontSize, fontWeight, color, lineHeight |
| **TextComponent** | `{ "{style}": { ... } }`，style 由 `content.style` 决定，默认 `paragraph` | fontSize, color, lineHeight |
| **ImageComponent** | 直接平铺（无嵌套） | borderRadius, shadow, captionColor, captionFontSize |
| **CardComponent** | 直接平铺 | background, borderRadius, padding, titleColor, titleFontSize, titleFontWeight, descriptionColor, descriptionFontSize |
| **QuoteComponent** | 直接平铺 | background, borderLeft, borderRadius, padding, textColor, textFontSize, authorColor, authorFontSize, iconSize |
| **BadgeComponent** | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight, shadow |
| **CornerComponent** | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight |
| **ShockComponent** | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight, border, shadow |
| **GraphicComponent** | 直接平铺 | background, textColor, primary, accent, secondary, lineColor, borderRadius, padding, titleFontSize, itemFontSize, shadow |
| **AggregateComponent** | 不需要 customStyle（只负责布局） | — |

#### 9.1 正确写法 vs 错误写法（务必避免）

**✅ TitleComponent（正确，必须有 level1 嵌套层）**：
```json
{
  "id": "P1-001",
  "type": "TitleComponent",
  "content": { "text": "画布视频", "level": 1 },
  "customStyle": {
    "level1": {
      "fontSize": "60px",
      "fontWeight": "900",
      "color": "#111827",
      "lineHeight": "1.1"
    }
  }
}
```

**❌ TitleComponent（错误，会报"customStyle 缺少 level1"）**：
```json
{
  "customStyle": {
    "fontSize": "60px",
    "fontWeight": "900",
    "color": "#111827",
    "lineHeight": "1.1"
  }
}
```

**✅ ShockComponent（正确，直接平铺，9 个必填字段都不能少）**：
```json
{
  "id": "P1-002",
  "type": "ShockComponent",
  "content": { "text": "让AI轻松制作视频" },
  "customStyle": {
    "color": "transparent",
    "textColor": "#FFFFFF",
    "padding": "16px 32px",
    "borderRadius": "16px",
    "fontSize": "36px",
    "fontWeight": "800",
    "border": "none",
    "shadow": "0 4px 16px rgba(37,99,235,0.3)"
  }
}
```

**✅ TextComponent（正确，必须有 paragraph 或自定义 style 嵌套层）**：
```json
{
  "id": "P3-002",
  "type": "TextComponent",
  "content": { "text": "从JSON到成片", "style": "paragraph" },
  "customStyle": {
    "paragraph": {
      "fontSize": "28px",
      "color": "#6B7280",
      "lineHeight": "1.4"
    }
  }
}
```

#### 9.2 各区域 customStyle 完整示例

**P1（HOOK）**：
```json
{
  "P1-001": {
    "type": "TitleComponent",
    "customStyle": {
      "level1": {
        "fontSize": "60px",
        "fontWeight": "900",
        "color": "#111827",
        "lineHeight": "1.1"
      }
    }
  },
  "P1-002": {
    "type": "ShockComponent",
    "customStyle": {
      "color": "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
      "textColor": "#FFFFFF",
      "padding": "16px 32px",
      "borderRadius": "16px",
      "fontSize": "36px",
      "fontWeight": "800",
      "border": "none",
      "shadow": "0 4px 16px rgba(37,99,235,0.3)"
    }
  }
}
```

**P2（PAIN）**：
```json
{
  "P2-001": {
    "type": "TitleComponent",
    "customStyle": {
      "level1": {
        "fontSize": "46px",
        "fontWeight": "900",
        "color": "#111827",
        "lineHeight": "1.12"
      }
    }
  },
  "P2-003_to_P2-005": {
    "type": "BadgeComponent",
    "customStyle": {
      "color": "#DC2626",
      "textColor": "#FFFFFF",
      "padding": "10px 24px",
      "borderRadius": "999px",
      "fontSize": "28px",
      "fontWeight": "800",
      "shadow": "0 4px 12px rgba(220,38,38,0.4)"
    }
  },
  "P2-006": {
    "type": "BadgeComponent",
    "customStyle": {
      "color": "#059669",
      "textColor": "#FFFFFF",
      "padding": "12px 28px",
      "borderRadius": "999px",
      "fontSize": "32px",
      "fontWeight": "900",
      "shadow": "0 4px 12px rgba(5,150,105,0.4)"
    }
  }
}
```

**P3（SOLVE）**：
```json
{
  "P3-001": {
    "type": "TitleComponent",
    "customStyle": {
      "level1": {
        "fontSize": "46px",
        "fontWeight": "900",
        "color": "#111827",
        "lineHeight": "1.12"
      }
    }
  },
  "P3-002": {
    "type": "TextComponent",
    "customStyle": {
      "paragraph": {
        "fontSize": "28px",
        "color": "#6B7280",
        "lineHeight": "1.4"
      }
    }
  },
  "P3-004_to_P3-007": {
    "type": "CardComponent",
    "customStyle": {
      "background": "#FFFFFF",
      "borderRadius": "14px",
      "padding": "20px",
      "titleColor": "#2563EB",
      "titleFontSize": "24px",
      "titleFontWeight": "800",
      "descriptionColor": "#6B7280",
      "descriptionFontSize": "18px"
    }
  }
}
```

**P4（RESULT）**：
```json
{
  "P4-001": {
    "type": "TitleComponent",
    "customStyle": {
      "level1": {
        "fontSize": "46px",
        "fontWeight": "900",
        "color": "#111827",
        "lineHeight": "1.12"
      }
    }
  },
  "P4-003_to_P4-006": {
    "type": "ShockComponent",
    "customStyle": {
      "color": "transparent",
      "textColor": "#2563EB",
      "padding": "20px 12px",
      "borderRadius": "12px",
      "fontSize": "72px",
      "fontWeight": "950",
      "border": "none",
      "shadow": "0 4px 12px rgba(37,99,235,0.15)"
    }
  }
}
```

**P5（CTA）**：
```json
{
  "P5-001": {
    "type": "TitleComponent",
    "customStyle": {
      "level1": {
        "fontSize": "54px",
        "fontWeight": "900",
        "color": "#111827",
        "lineHeight": "1.1"
      }
    }
  },
  "P5-002": {
    "type": "ShockComponent",
    "customStyle": {
      "color": "transparent",
      "textColor": "#F59E0B",
      "padding": "12px 24px",
      "borderRadius": "12px",
      "fontSize": "40px",
      "fontWeight": "900",
      "border": "none",
      "shadow": "none"
    }
  },
  "P5-003": {
    "type": "BadgeComponent",
    "customStyle": {
      "color": "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
      "textColor": "#FFFFFF",
      "padding": "16px 40px",
      "borderRadius": "999px",
      "fontSize": "28px",
      "fontWeight": "900",
      "shadow": "0 4px 16px rgba(37,99,235,0.4)"
    }
  }
}
```

#### 9.3 自检要点（生成 project.json 前必查）

- [ ] 每个 `TitleComponent` 的 customStyle 是否有 `level{content.level}` 嵌套？默认 `level1`
- [ ] 每个 `TextComponent` 的 customStyle 是否有 `paragraph` 或 `content.style` 嵌套？
- [ ] 平铺类组件（Image / Card / Quote / Badge / Corner / Shock / Graphic）是否所有必填字段都有值（不能为空字符串/null/undefined）？
- [ ] `AggregateComponent` 没有 customStyle（如果加了会被忽略，但建议不要写）

### 步骤 10：时间轴设计

**说明**：确定每个组件的 start、end 和出现顺序。

**产出示例**：

| 区域 | 元素 | start | end | 出现顺序 |
|------|------|-------|-----|---------|
| P1 | 标题 | 0 | 12 | 第1 |
| P1 | 金句 | 1 | 12 | 第2 |
| P2 | 标题 | 12 | 24 | 第1 |
| P2 | 痛点1 | 13 | 24 | 第2 |
| P2 | 痛点2 | 13.5 | 24 | 第3 |
| P2 | 痛点3 | 14 | 24 | 第4 |
| P2 | 方案 | 15 | 24 | 第5 |
| P3 | 标题 | 24 | 36 | 第1 |
| P3 | 副标题 | 24.5 | 36 | 第2 |
| P3 | 步骤1 | 26 | 36 | 第3 |
| P3 | 步骤2 | 27 | 36 | 第4 |
| P3 | 步骤3 | 28 | 36 | 第5 |
| P3 | 步骤4 | 29 | 36 | 第6 |
| P4 | 标题 | 36 | 48 | 第1 |
| P4 | 数据1 | 37 | 48 | 第2 |
| P4 | 数据2 | 38 | 48 | 第3 |
| P4 | 数据3 | 39 | 48 | 第4 |
| P4 | 数据4 | 40 | 48 | 第5 |
| P5 | 标题 | 48 | 60 | 第1 |
| P5 | 金句 | 49 | 60 | 第2 |
| P5 | 按钮 | 50 | 60 | 第3 |

---

## 阶段五：自检

> **目标**：对设计文档进行自检，确保质量
> **输入**：阶段一到四的所有产出
> **产出**：自检报告

### 步骤 11：自检报告

**说明**：按 L0-L3 四级检查，并进行设计原则检查。

#### L0 检查（致命错误）

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 组件 start ≥ 字幕 start | ✅ 通过 | 所有组件 start 时间正确 |
| 组件 end ≤ 下一区域 start | ✅ 通过 | 无时间重叠 |
| 相邻区域无时间重叠 | ✅ 通过 | P1(0-12), P2(12-24), P3(24-36), P4(36-48), P5(48-60) |
| 图片切换 end=start | ✅ 通过 | 无图片切换场景 |
| **TitleComponent.customStyle 含 `level{N}` 嵌套** | ✅ 通过 | 所有 Title 默认 level1，customStyle.level1 已配置 |
| **TextComponent.customStyle 含 `paragraph` 或 style 嵌套** | ✅ 通过 | TextComponent 已用 paragraph 嵌套 |
| **平铺类组件必填字段无空值** | ✅ 通过 | Badge/Card/Shock 等所有必填字段已写齐 |
| **字幕与音频共生（强制）** | ✅ 通过 | 创作模式→无 audio 字段且 subtitles 数组为空/不存在；口播模式→audio 与 subtitles 同时存在 |

#### L1 检查（严重违规）

| 检查项 | 结果 | 修复内容 |
|--------|------|---------|
| 区域组件数 ≥ 最小要求 | ✅ 通过 | P1(2), P2(5), P3(6), P4(5), P5(3) |
| 无与字幕重复文字 | ✅ 通过 | 无重复 |
| 标题→副标题→图片顺序 | ✅ 通过 | 顺序正确 |
| 多逻辑分组用 Aggregate | ✅ 通过 | P2,P3,P4 使用 AggregateComponent |

#### L2 检查（中等建议）

| 检查项 | 结果 | 建议 |
|--------|------|------|
| 浅色背景→深色文字 | ✅ 通过 | 文字色 #111827 |
| 文字叠图→白色 + shadow | ⚠️ 建议 | P2 痛点 badge 白色文字，已加 shadow |
| 主体图片→borderRadius=0 | ✅ 通过 | 无主体图片 |
| 长图高度 ≥ 400px | ✅ 通过 | 无长图 |
| badge 文字 >4 字→宽度 ≥ 120px | ✅ 通过 | 所有 badge 符合 |
| 竖排文字→writingMode | ✅ 通过 | 无竖排文字 |

#### L3 检查（轻微优化）

| 检查项 | 结果 | 建议 |
|--------|------|------|
| 阴影统一性 | ⚠️ 优化 | P1 阴影 0 4px 16px，P2 阴影 0 4px 12px，建议统一 |
| 圆角统一性 | ⚠️ 优化 | P1 圆角 16px，P2 圆角 999px，P3 圆角 14px，建议统一风格 |
| 渐变方向 | ⚠️ 优化 | P1 和 P5 渐变方向相同，建议 P5 用反向渐变增加变化 |

#### 设计原则检查

| 原则 | 结果 | 说明 |
|------|------|------|
| 一个区域一个焦点 | ✅ 通过 | P1(金句), P2(对比), P3(步骤), P4(数据), P5(按钮) |
| 信息分层 | ✅ 通过 | 大标题→中副标题→小内容 |
| 用对比制造冲击 | ✅ 通过 | P2 红绿对比，P4 大数据 |
| 用真实替代抽象 | ⚠️ 建议 | P3 缺少步骤截图，P4 缺少成果截图 |
| 情绪曲线 | ✅ 通过 | 高→中低→中→中高→中 |

#### L4 丰富度检查（⚠️ 不通过必须重写步骤 7-9）

> **本检查的所有规则定义在 [`../../references/visual-richness-rules.md`](../../references/visual-richness-rules.md)。**
> 任何一条不通过，必须回到步骤 7（组件清单）和步骤 9（customStyle）重新设计，**不允许在任何条目"⚠️ 注意"或"⚠️ 建议"，必须明确通过/不通过**。

| 检查项 | 通过条件 | 结果 | 实际值 |
|------|---------|------|------|
| 组件类型覆盖率 | ≥ 60%（用满 ≥ 6 种组件类型） | ✅/❌ | 用了 X/10 种 = XX% |
| 同一类型连续使用 | ≤ 3 个 | ✅/❌ | 最长连续 X 个（在 PX 区域） |
| 每区域非纯文字组件 | 每个区域 ≥ 1 个 | ✅/❌ | 缺失区域：PX, PY |
| 素材清单实现率 | 100%（清单中所有素材都有 ImageComponent 引用） | ✅/❌ | 清单 X 个素材，project.json 引用 Y 个 |
| Graphic diagram 多样性 | ≥ 3 种（视频时长 ≥ 60s） | ✅/❌ | 用了 [flow, pyramid, comparison] = X 种 |
| 同区域同类组件配色差异 | 连续 ≥ 3 个同类组件，至少 2 种基调 | ✅/❌ | PX 区 3 张 Card 配色：[蓝紫, 蓝紫, 蓝紫] = 1 种基调 |

**填写示例（真实自检表）**：

```
| 组件类型覆盖率 | ≥ 60% | ✅ | 用了 7/10 种 = 70%（Title/Text/Image/Card/Badge/Shock/Graphic） |
| 同一类型连续使用 | ≤ 3 | ✅ | 最长连续 3 个（P3 三张支柱 Card） |
| 每区域非纯文字组件 | ≥ 1 个 | ✅ | P1=Shock, P2=Graphic, P3=Card+Image, P4=Aggregate(Card), P5=Graphic, P6=Graphic, P7=Shock |
| 素材清单实现率 | 100% | ❌ | 清单 8 个，project.json 引用 0 个 → 必须补 8 个 ImageComponent |
| Graphic diagram 多样性 | ≥ 3 种 | ❌ | 只用了 flow × 2 → 必须把 P3 改 pyramid、P4 改 matrix |
| 同区域同类配色差异 | ≥ 2 种基调 | ❌ | P3 三张 Card 用同一蓝紫渐变 → 必须改成"渐进色阶"或"对比基调" |
```

**评分标准**：
- 全部通过 ✅ → 进入步骤 11.5
- 任何一条 ❌ → 回到步骤 7-9 重新设计；重写后再次自检

#### 步骤 11.5：丰富度评分（建议达到 ≥ 45 分）

按 [`../../references/visual-richness-rules.md`](../../references/visual-richness-rules.md) 的评分表打分：

| 维度 | 0 分 | 5 分 | 10 分 | 实际得分 |
|---|---|---|---|---|
| 组件类型多样性 | < 4 种 | 5-6 种 | ≥ 7 种 | X |
| 同类连续 | 5+ | 4 | ≤ 3 | X |
| 非文字组件 | 有区域 0 个 | 每区域 ≥ 1 个 | 多种穿插 | X |
| 素材实现率 | < 50% | 50-99% | 100% | X |
| Graphic 多样性 | 0-1 种 | 2 种 | ≥ 3 种 | X |
| 同类配色差异 | 100% 同色 | 部分差异 | 渐变/对比/多色 | X |
| **总分** | | | | **X / 60** |

**判定**：
- < 30 分：视频会很 low，**必须重写**
- 30-44 分：中等，**建议优化**（如果用户不接受可以保留）
- ≥ 45 分：接近真实示例水平，**可以打包上传**

---

## 附加产出：用户素材清单

### 素材清单（带状态标注）

| 序号 | 素材类型 | 素材描述 | 用于区域 | 用途说明 | 存放路径 | 状态 |
|------|---------|---------|---------|---------|---------|------|
| 1 | 图片 | 产品 logo 或品牌标识图 | P1 | HOOK 区域展示品牌 | `assets/images/logo.png` | [AI 自动生成] |
| 2 | 图片 | 痛点场景图（如混乱的剪辑界面） | P2 | PAIN 区域对比展示 | `assets/images/pain.png` | [待用户提供] |
| 3 | 截图 | 步骤1：写 JSON 的界面截图 | P3 | SOLVE 区域步骤展示 | `assets/images/step-1.png` | [AI 自动生成] |
| 4 | 截图 | 步骤2：填内容的界面截图 | P3 | SOLVE 区域步骤展示 | `assets/images/step-2.png` | [AI 自动生成] |
| 5 | 截图 | 步骤3：设时间的界面截图 | P3 | SOLVE 区域步骤展示 | `assets/images/step-3.png` | [AI 自动生成] |
| 6 | 截图 | 步骤4：点录制的界面截图 | P3 | SOLVE 区域步骤展示 | `assets/images/step-4.png` | [AI 自动生成] |
| 7 | 截图 | 产品成果截图或数据图表 | P4 | RESULT 区域数据展示 | `assets/images/result.png` | [待用户提供] |
| 8 | 图片 | 产品界面截图或引导图 | P5 | CTA 区域行动引导 | `assets/images/cta.png` | [AI 自动生成] |

### 状态标注规则（CanvasVideo Skill 专用）

| 状态 | 含义 | Skill 行为 |
|------|------|-----------|
| `[已具备]` | 用户已通过 `copyUserAsset()` 提供素材 | 直接使用真实路径（如 `./assets/images/logo.png`） |
| `[待用户提供]` | 建议用户提供以提升真实度，但当前先用占位图 | scaffold 自动复制 SVG 占位 + project.json 引用占位 URL/SVG |
| `[AI 自动生成 - 占位]` | 由 Skill 自动生成水印占位图（在线 URL 或本地 SVG） | scaffold 自动复制对应主题的 SVG，project.json 写占位路径 |

> **占位图由 Skill 主动管理**：调用 `scaffoldWorkdir({theme})` 时会把 `templates/placeholders/{light|dark}/` 下的 7 张 SVG（hook/scene/pain/solve/result/cta/generic）复制到 `assets/placeholders/{light|dark}/`。
> 所有占位图**自带水印 "📷 演示图片 · 请自行替换"**，引导用户替换为真实素材。
> 详见 [`../../templates/placeholders/url-factory.md`](../../templates/placeholders/url-factory.md)。

**模式差异化**：
- **创作模式**：所有缺失素材标 `[AI 自动生成 - 占位]`（默认）；用户主动提供后切换为 `[已具备]`
- **口播模式**：音频/SRT **必须**标 `[已具备]`（不允许 AI 生成）；其它素材按创作模式规则

**素材替换说明**：
- 占位图都带醒目水印，用户一眼就能识别"这是占位图"
- 用户在 `assets/images/` 下放真实素材（与素材清单中的"存放路径"对齐）后，重新打包上传即可替换
- 替换素材后无需修改配置，**前提是文件名 + 路径与 project.json 写的一致**

---

## 禁止事项

1. 禁止留空任何表格单元格
2. 禁止添加指南中没有的章节
3. 禁止修改表格结构
4. 禁止用 theme，必须用 customStyle
5. 禁止跳过任何步骤（步骤 0 + 11 步必须全部产出）
6. 禁止在自检报告中全部填"通过"，必须真实检查
7. **禁止 AggregateComponent 使用预设 layout 模板，必须用自定义 position 模式（手动配置 x/y/w/h）**
8. **禁止组件 ID 使用英文单词，必须使用数字编号格式：`{区域}-###`（如 P1-001, P2-003, P3-005）**
9. 禁止把设计文档上传到服务器（只保留在本地 `canvasvideo-workdir/{skillProjectId}/design.md`）
10. **禁止 TitleComponent 的 customStyle 直接平铺**：必须有 `level{content.level}` 嵌套层（例：`{ "level1": { "fontSize": "60px", ... } }`），否则会触发 `customStyle 缺少 "level1"` 运行时报错
11. **禁止 TextComponent 的 customStyle 直接平铺**：必须有 `paragraph` 或 `content.style` 嵌套层
12. **禁止平铺类组件遗漏必填字段**：Image / Card / Quote / Badge / Corner / Shock / Graphic 各自有固定的必填字段表（见步骤 9.0），**任何字段空值或缺失都会运行时报错**
13. **禁止在创作模式（无配音音频）的 project.json 写 `subtitles` 数组或 `audio` 字段**：纯图文视频挂字幕条非常违和，前端字幕渲染依赖 audio 时间轴，二者必须同生共死（详见 SKILL.md §2.4）

---

## 输出要求

AI 输出 design.md 时，直接给出以下完整产出，不要包含任何说明文字：

### 步骤 0 产出
- 项目元信息表

### 阶段一产出
- 步骤 1：文案分段表
- 步骤 2：内容类型标注表
- 步骤 3：视频风格识别表 + 情绪曲线表

### 阶段二产出
- 步骤 4：区域规划表
- 步骤 5：主题配色方案表 + 区域配色应用表

### 阶段三产出
- 步骤 6：每个区域的 ASCII 布局图
- 步骤 7：组件清单表（含父组件/子组件）—— **组件 ID 必须用数字编号格式：`{区域}-###`**
- 步骤 8：节奏设计表

### 阶段四产出
- 步骤 9：每个区域的 customStyle（JSON 格式）
- 步骤 10：时间轴设计表

### 阶段五产出
- 步骤 11：自检报告（L0-L3 + 设计原则检查）

### 附加产出
- **用户素材清单**：含状态标注（`[已具备] / [待用户提供] / [AI 自动生成]`）

**要求**：
1. 所有表格必须填充实例，不能留空
2. 不要输出任何说明、解释、分析文字
3. 只输出表格和 JSON 代码块
4. 自检报告必须真实，不能全部填"通过"
5. 输出末尾追加引导语："**查看后请告诉 AI：需要修改的地方，或'确认设计和素材'以进入视频生成。**"
