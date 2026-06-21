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
| **音频用途** | ✅ 配音（用户提供 mp3 + SRT）/ ✅ BGM（背景音乐，AI 自动选）/ ❌ 静音（用户主动拒绝）|
| **BGM 选源**（仅 BGM 模式填）| 内置库 `templates/bgm/{xxx}.mp3` —— 风格按视频主题自动匹配 |
| **是否生成字幕** | ✅ 是（仅当配音用法时）/ ❌ 否（BGM 用法或静音时严禁生成） |

> **关键约束**：本表确定后，后续阶段所有产出（情绪曲线、区域规划、配色等）必须围绕本表的"风格 + 受众 + 时长"展开。
>
> **🚨 音频用途 + 字幕共生强制规则**：
> - **配音用法**（用户提供 mp3 + SRT）→ audio 字段不设 loop/fadeIn/fadeOut；subtitles 必填
> - **BGM 用法**（AI 自动配 BGM 或用户提供纯背景音乐）→ audio 设为对象 `{ path, loop:true, fadeIn:1, fadeOut:2 }`；subtitles **严禁**填
> - **静音**（用户主动拒绝）→ 不写 audio 字段；subtitles **严禁**填
> - **创作模式默认 = BGM 用法**（除非用户主动说"不要 BGM"）
> - 详见 [`../../references/mode-rules.md`](../../references/mode-rules.md) §3（字幕共生强制规则）

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

> ⚠️ **创作模式区域时长强约束（详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) 门槛 3、门槛 4）**：
> - 单一区域 duration ≤ 15 秒（**严禁 25s/30s 这种"省事的整数"**）
> - 区域数推荐：30s ≥ 3 个；60s ≥ 6 个；120s ≥ 10 个；180s ≥ 14 个
> - 各区域时长可不等长（按内容多少调整，6-15s 之间灵活分配）

**图片素材建议**：
- HOOK 区域：可考虑产品 logo 图、品牌背景图
- SCENE 区域：场景插画、环境照片
- PAIN 区域：痛点场景图、对比图（Before）
- SOLVE 区域：步骤截图、操作界面图
- RESULT 区域：成果截图、数据图表、用户反馈图
- CTA 区域：产品截图、二维码、引导图

**产出示例**（60 秒视频，6 个区域，时长不等长）：

| 区域 | 时间段 | 时长 | 内容类型 | 设计意图（1句话） | 建议组件数 | 焦点组件 | 建议图片素材 |
|------|--------|---|---------|----------------|-----------|---------|------------|
| P1 | 0-8 | 8s | HOOK | 让用户3秒内记住产品名字和核心价值 | 3 | ShockComponent | 产品logo图 |
| P2 | 8-18 | 10s | PAIN | 让用户感受到传统方式的痛点 | 5 | Badge（红色） | 痛点场景图 |
| P3 | 18-30 | 12s | SOLVE | 清晰展示4个步骤，降低认知门槛 | 6 | 流程图（步骤） | 步骤截图 |
| P4 | 30-42 | 12s | RESULT | 用数据证明产品能力 | 5 | Shock（大数字） | 成果截图 |
| P5 | 42-52 | 10s | CTA-1 | 引导用户立即行动 | 4 | Badge（CTA按钮） | 产品截图 |
| P6 | 52-60 | 8s | CTA-2 | 收束情绪 + 二维码 | 2 | ShockComponent | 二维码 |

> **总组件数 ≈ 25**，时长 60s → 密度 0.42（**注意**：本示例略低于门槛 7.4 的 0.6，是为了易读；实际生成请把组件数提到 36+）

#### 区域布局坐标（必填，详见 [`../../references/layout-rules.md`](../../references/layout-rules.md) §1）

**规则：每行 4 个区域，超过 4 个换行**

| 区域索引 | 行/列 | x | y |
|---|---|---|---|
| P1 | 行1·列1 | 120  | 50 |
| P2 | 行1·列2 | 900  | 50 |
| P3 | 行1·列3 | 1680 | 50 |
| P4 | 行1·列4 | 2460 | 50 |
| P5 | 行2·列1 | 120  | 650 |
| P6 | 行2·列2 | 900  | 650 |
| P7 | 行2·列3 | 1680 | 650 |
| P8 | 行2·列4 | 2460 | 650 |
| P9 | 行3·列1 | 120  | 1250 |
| P10 | 行3·列2 | 900  | 1250 |
| P11 | 行3·列3 | 1680 | 1250 |
| P12 | 行3·列4 | 2460 | 1250 |

**canvas 尺寸**：

| 区域数 | canvas |
|---|---|
| 1-4 | `width: 3300, height: 700` |
| 5-8 | `width: 3300, height: 1300` |
| 9-12 | `width: 3300, height: 1900` |

#### settings 三个过渡参数（必填，详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) §settings）

```json
"settings": {
  "preFullViewDuration": 0.4,    // 上限 0.6，推荐 0.4
  "postFullViewDuration": 0.4,   // 上限 0.6，推荐 0.4
  "contentZoomRatio": 0.9         // 区间 0.85-0.95，推荐 0.9
}
```

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

**🎨 文字与背景对比度强制规则**：

| 场景 | 背景特征 | 文字色要求 | 错误示例 |
|------|---------|-----------|---------|
| 白底/浅底 | `white` 主题，背景色 `#FFFFFF` ~ `#F3F4F6` | 文字必须用深色：`#111827`、`#1F2937`、`#374151` | ❌ 白底用 `#9CA3AF` 浅灰文字，看不清 |
| 黑底/深底 | `black` 主题，背景色 `#000000` ~ `#1F2937` | 文字必须用亮色：`#FFFFFF`、`#F3F4F6`、`#E5E7EB` | ❌ 黑底用 `#6B7280` 中灰文字，看不清 |
| 图片上方 | 任何背景图、渐变图、带纹理的图 | 文字必须加 `textShadow` 或 `backdropFilter: blur`，且文字色与图片主色调差异 ≥ 50% | ❌ 蓝天图上用浅蓝文字，融为一体 |
| 彩色背景块 | Badge、Card、强调色背景 | 背景色亮度 > 50% 时用深色文字；背景色亮度 < 50% 时用亮色文字 | ❌ 橙色背景 `#F59E0B` 上用黄色文字 |

**亮度快速判断**：
- 背景是白/浅灰/浅蓝/浅绿 → 文字用 `#111827`（深灰黑）
- 背景是黑/深灰/深蓝/深紫 → 文字用 `#FFFFFF`（纯白）
- 背景是彩色（橙、红、青等）→ 文字用黑或白，取决于哪个更醒目

**严禁**：
- 文字色与背景色属于同一色系且亮度接近（如浅灰底 + 更浅灰字）
- 图片上方文字不加 `textShadow` 或 `backdropFilter`
- 为了"美观"使用低对比度配色（如 `#E5E7EB` 底 + `#D1D5DB` 字）

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
>
> ⚠️ **占位图必须用 Aggregate 包装**：当某个组件是 `[AI 自动生成 - 占位]` 的 ImageComponent 时，**必须**写成 AggregateComponent (children: [ImageComponent (Unsplash URL) + ShockComponent (※ 演示图片 请替换 胶囊水印)])，详见 [`../../templates/placeholders/url-factory.md`](../../templates/placeholders/url-factory.md)。

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

> ⚠️ **节奏硬性约束（强制，详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) 4 条门槛）**：
> 1. **末组件→区域 end ≤ 2 秒**：每个区域必须有一个"收尾组件"在 `end - 2s` 之内出现
> 2. **相邻组件 start 间隔 ≤ 3 秒**：同区域不允许大段空白
> 3. **创作模式单区域 duration ≤ 15 秒**：长区域必须拆分
> 4. **创作模式总密度 ≥ 0.6 个组件/秒**：60s 视频至少 36 个组件

**产出示例**：

| 区域 | 时长 | 末组件→end | 节奏描述 |
|------|---|---|---------|
| P1 | 8s | 1.5s | 标题先出 → 金句 1.5s 后出现 → 收尾图片 6.5s 出现 |
| P2 | 10s | 1.0s | 标题先出 → 3 个痛点 Badge 依次出现（间隔 1.5s） → 方案 Badge 在 17s 出现做收尾 |
| P3 | 12s | 0.8s | 标题 + 副标 → 4 个步骤 Card 依次出现（每个间隔 1.5-4s） → 最后步骤在 29.2s 出现 |
| P4 | 12s | 1.2s | 标题先出 → 4 个数据 Shock 依次出现 → 最后数据在 40.8s 收尾 |
| P5 | 10s | 0.5s | 标题 → 金句 → 按钮 Badge → 图标光线收尾 51.5s |
| P6 | 8s | 1.0s | 行动召唤大字 → 二维码 59s 收尾 |

> 上表为**口播模式**示例（末组件停留 0.5-1.5s 区间，全部 ≤ 2s 上限）。
> **创作模式**应更紧凑，每个区域末组件停留 ≤ 1s（推荐 0.3-1.0s），原因详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) 门槛 1。

---

## 阶段四：组件样式与时间轴

> **目标**：确定每个组件的具体样式和时间轴
> **输入**：阶段三的产出
> **产出**：customStyle、时间轴

### 步骤 9：视觉样式设计

> ⚠️ **本步骤强制前置**：开始写 customStyle 前，**必须先批量调云端 API** 拿组件字段：
> ```http
> POST /cv/api/component/spec/batch
> { "components": [{ "type": "GraphicComponent", "variant": "comparison" }, ...] }
> ```
> 单次最多 20 个，超过分批。详见 [`../../references/components-catalog.md`](../../references/components-catalog.md) §"通过 API 查询字段详情"。
> **严禁凭直觉编字段名**——只能用 API 返回的 key。**API 返回的 `hardcoded` 数组里的元素调不了**，用户问到时直接告诉他。

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

#### 9.3 自检要点

写完 customStyle 后必须自检结构完整性，**详见 [`../../references/selfcheck-rules.md`](../../references/selfcheck-rules.md) L0 检查**（TitleComponent.level{N} 嵌套、TextComponent style 嵌套、平铺类必填字段、AggregateComponent 无 customStyle）。

### 步骤 10：时间轴设计

**说明**：确定每个组件的 start、end 和出现顺序。

> ⚠️ **创作模式节奏强约束（详见 [`../../references/timing-rules.md`](../../references/timing-rules.md)）**：
> - 单一区域 duration ≤ 15 秒
> - 末组件 start 到区域 end 间隔 ≤ 2 秒
> - 同区域相邻组件 start 间隔 ≤ 3 秒
> - 视频总时长 60s 推荐 ≥ 6 个区域

**产出示例**（60 秒视频，**符合门槛 7**）：

| 区域 | 时长 | 元素 | start | end | 末组件→end |
|------|---|------|-------|-----|---|
| P1 | 8s | 标题 | 0 | 8 | — |
| P1 |  | 金句 | 1.5 | 8 | — |
| P1 |  | **图片（收尾）** | 6.5 | 8 | **1.5s ✅** |
| P2 | 10s | 标题 | 8 | 18 | — |
| P2 |  | 痛点1 | 9.5 | 18 | — |
| P2 |  | 痛点2 | 11 | 18 | — |
| P2 |  | 痛点3 | 12.5 | 18 | — |
| P2 |  | **方案 Badge（收尾）** | 17 | 18 | **1.0s ✅** |
| P3 | 12s | 标题 | 18 | 30 | — |
| P3 |  | 副标 | 19 | 30 | — |
| P3 |  | 步骤1 | 20.5 | 30 | — |
| P3 |  | 步骤2 | 22 | 30 | — |
| P3 |  | 步骤3 | 24 | 30 | — |
| P3 |  | **步骤4（收尾）** | 29.2 | 30 | **0.8s ✅** |
| P4 | 12s | 标题 | 30 | 42 | — |
| P4 |  | 数据1 | 31.5 | 42 | — |
| P4 |  | 数据2 | 33 | 42 | — |
| P4 |  | 数据3 | 35 | 42 | — |
| P4 |  | **数据4（收尾）** | 40.8 | 42 | **1.2s ✅** |
| P5 | 10s | 标题 | 42 | 52 | — |
| P5 |  | 金句 | 43.5 | 52 | — |
| P5 |  | 按钮 Badge | 45 | 52 | — |
| P5 |  | **图标/光线（收尾）** | 51.5 | 52 | **0.5s ✅** |
| P6 | 8s | 行动召唤 | 52 | 60 | — |
| P6 |  | **二维码（收尾）** | 59 | 60 | **1.0s ✅** |

> **关键观察**：
> 1. 每个区域都有"收尾组件"在 end-2s 之内出现，避免最后画面静止；**实际间隔 0.5-1.5s 不等**（不要全都卡在 2s）
> 2. **本表为口播模式示例**：上限 2s；如果是**创作模式**，应进一步收紧到 ≤ 1s（推荐 0.3-1.0s），详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) 门槛 1
> 3. 同区域内相邻组件 start 间隔最大 4s（在 P3/P4 中），**实际写设计时建议控制在 ≤ 3s**
> 4. 单区域时长 ≤ 12s，远低于 15s 上限

---

## 阶段五：自检

> **目标**：对设计文档进行系统自检，确保进入打包前没有致命错误和丰富度问题
> **输入**：阶段一到四的所有产出 + 实际的 project.json 草稿
> **产出**：自检报告（写入 design.md）

### 步骤 11：自检报告

**完整检查规则**：详见 [`../../references/selfcheck-rules.md`](../../references/selfcheck-rules.md)（L0~L4 五级检查 + 设计原则 + 丰富度评分）

**LLM 操作要点**：

1. **按规则文件的检查表逐项填写** ✅/❌ + 实际值，禁止全部填"通过"
2. **不通过的处理**：
   - L0 / L4 任何一条 ❌ → **必须回到步骤 7-9 重写**，重写后再次自检
   - L1 ❌ → 视严重度决定是否重写
   - L2 ❌ → 记录在备注里，建议修复（特别是对比度相关）
   - L3 ❌ → 可保留，作为后续优化项
3. **丰富度评分**：按规则文件的 70 分制评分；
   - < 50 分 → **必须重写**
   - 50-64 分 → 建议优化
   - ≥ 65 分 → 可以打包上传

**design.md 中的自检报告格式**：

按 selfcheck-rules.md 的「填写示例」章节复制表格框架，逐项填入本视频实际值。**所有 ✅/❌ 必须基于实际项目数据**，例如：

```
| 末组件停留 ≤ 2s | ✅ | P1=2.0, P2=1.8, P3=2.0, P4=2.0, P5=2.0, P6=2.0 |
```

**严禁**：
- 把 selfcheck-rules.md 里的"示例值"原样抄进 design.md（必须填本视频的真实值）
- 在 L0 / L4 给出"⚠️ 注意"或"⚠️ 建议"（必须明确通过/不通过）
- 全部填"通过"不列实际值

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
> 所有占位图**自带水印 "※ 演示图片 请替换"**，引导用户替换为真实素材。
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
13. **禁止在创作模式（无配音音频）的 project.json 写 `subtitles` 数组或 `audio` 字段**：纯图文视频挂字幕条非常违和，前端字幕渲染依赖 audio 时间轴，二者必须同生共死（详见 [`../../references/mode-rules.md`](../../references/mode-rules.md) §3）

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
- 步骤 11：自检报告（按 [`../../references/selfcheck-rules.md`](../../references/selfcheck-rules.md) L0~L4 + 设计原则 + 丰富度评分）

### 附加产出
- **用户素材清单**：含状态标注（`[已具备] / [待用户提供] / [AI 自动生成]`）

**要求**：
1. 所有表格必须填充实例，不能留空
2. 不要输出任何说明、解释、分析文字
3. 只输出表格和 JSON 代码块
4. 自检报告必须真实，不能全部填"通过"
5. 输出末尾追加引导语："**查看后请告诉 AI：需要修改的地方，或'确认设计和素材'以进入视频生成。**"

---

## 下一步：design.md → project.json

用户确认本设计文档后，进入下一个子流程：把 design.md 翻译成 `project.json`。

详见 **[`./build_project_json.md`](./build_project_json.md)** —— 字段映射规则、组件字段 API 调用、本地校验流程。
