# 视觉丰富度规则（Richness Rules）

> 视频组件丰富度的 6 条强制门槛 + 评分参考 + 提升组合拳示例。
> **本文档是 hard rule 单一来源**，被以下流程引用：
> - 子流程：video_design_guide.md 步骤 7（组件清单）、步骤 11（自检）
> - 自检：references/selfcheck-rules.md L4 检查

> **节奏类规则不在本文档**，详见 [`timing-rules.md`](./timing-rules.md)。

---

## 为什么需要这份规则？

历史上观察到的 low 视频通病：
- 7 个区域都是"标题 + 副标题 + 主体"上下堆栈
- 78% 组件都是 `TitleComponent + CardComponent`
- 多张 Card 长得一模一样（同色、同字号、同 variant）
- 设计稿写了素材清单但 `project.json` 里 0 个 ImageComponent
- 一个 1-3 分钟的视频只用了 1 种 GraphicComponent diagram 类型

**根本原因**：LLM 倾向于"安全选择"——只用最熟的 2-3 个组件、所有配色用同一套渐变、避免使用"我不熟的"图形。
本规则的目标就是**强制把丰富度顶上来**，让生成的视频接近真实示例项目的质感。

---

## 6 条强制门槛

### 门槛 1：组件类型覆盖率 ≥ 60%

**计算方法**：使用的不同组件类型数 / 10 ≥ 0.6

**通过示例**：
- 用了 `Title / Text / Image / Card / Badge / Shock / Graphic` = 7 种 / 10 = **70% ✅**
- 用了 `Title / Card / Aggregate` = 3 种 / 10 = **30% ❌**

**判定**：≥ 60% 通过；< 60% 必须重写组件清单（video_design_guide.md 步骤 7）。

---

### 门槛 2：同一类型组件连续使用 ≤ 3 个

**含义**：同一个 AggregateComponent 内的子组件，或在相邻位置（同一区域）出现的同类型组件不能超过 3 个。

**违例**：
```
P3:
  CardComponent  ← 1
  CardComponent  ← 2
  CardComponent  ← 3
  CardComponent  ← 4 ❌ 必须穿插其他类型
```

**修复方案**：
- 在 4 张 Card 中插入 1 张 ImageComponent
- 或把第 4 张 Card 改成 ShockComponent / QuoteComponent
- 或在 Card 之间夹一个 BadgeComponent 角标

---

### 门槛 3：每个区域至少 1 个"非纯文字组件"

**非纯文字组件**：`ImageComponent` / `GraphicComponent` / `QuoteComponent` / 含 image 的 `CardComponent (variant: image-text/text-image/overlay/gallery)`

**违例**：
```
P5（PAIN）:
  TitleComponent
  BadgeComponent × 3
  ❌ 没有图片、图形、引用，纯文字堆
```

**修复方案**：
- 在 P5 加一张痛点场景图（ImageComponent）
- 或用 GraphicComponent comparison（左右对比图）替代 Badge 列表
- 或加一个 QuoteComponent 用户证言

---

### 门槛 4：素材清单实现率 = 100%

**含义**：design.md "用户素材清单"里**任何标记为非空状态的素材**（`[已具备]` / `[AI 自动生成 - 占位]` / `[待用户提供]`），**必须在 project.json 里有对应的 ImageComponent 引用**。

**违例**：
```
design.md 素材清单：
  1. AI 大脑光效图 [AI 自动生成 - 占位] - 用于 P1
  2. 办公场景图 [待用户提供] - 用于 P4

project.json：
  ❌ 0 个 ImageComponent → 素材全都没引用
```

**修复方案**：

#### A. `[AI 自动生成 - 占位]` → 引用占位图

详见 [`../templates/placeholders/url-factory.md`](../templates/placeholders/url-factory.md)。**默认使用 Picsum 随机图 + Aggregate 叠中文水印**：

**方式 1（推荐）：Picsum + AggregateComponent 叠水印**

通过 `seed` 固定图片 + 自加中文胶囊水印"※ 演示图片 请替换"。

Seed 命名：`{领域}-{场景}`，如 `couple-love`、`tech-ai`、`corporate-team`

```json
{
  "id": "P3-PLACEHOLDER-001",
  "type": "AggregateComponent",
  "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
  "content": {},
  "customStyle": { "background": "transparent", "padding": "0", "border": "none" },
  "children": [
    {
      "id": "P3-PLACEHOLDER-001-img",
      "type": "ImageComponent",
      "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
      "content": {
        "image": "https://picsum.photos/seed/tech-ai/1280/720",
        "fit": "cover",
        "borderRadius": 12
      },
      "customStyle": {}
    },
    {
      "id": "P3-PLACEHOLDER-001-watermark",
      "type": "ShockComponent",
      "position": { "x": 180, "y": 200, "w": 400, "h": 80 },
      "content": { "text": "※ 演示图片 请替换" },
      "customStyle": {
        "background": "rgba(15,23,42,0.55)",
        "color": "#FFFFFF",
        "fontSize": "28px",
        "fontWeight": "700",
        "padding": "14px 28px",
        "borderRadius": "999px",
        "border": "none",
        "shadow": "0 4px 16px rgba(0,0,0,0.25)",
        "letterSpacing": "2px"
      }
    }
  ]
}
```

**方式 2（备选）：本地 SVG**

Picsum 不可达 / 超时 / 用户拒绝远程图时使用。SVG 自带水印，**不要再叠 Aggregate**。

```json
{
  "type": "ImageComponent",
  "content": {
    "image": "./assets/placeholders/light/hook.svg",
    "fit": "cover",
    "borderRadius": 0
  }
}
```

> Skill 的 `scripts/scaffold.js` 在调用 `scaffoldWorkdir({theme})` 时会自动复制 SVG 到工作目录的 `assets/placeholders/{light|dark}/`。LLM **直接写本地路径就行**。

#### B. `[待用户提供]` → 也用占位图，提示用户后续替换

LLM 不能凭空假设用户已提供，**仍然先用占位图**，但在 design.md 备注列写"用户提供后替换"。

#### C. `[已具备]` → 用真实路径

例：`./assets/images/logo.png`

**特殊豁免**：
- 用户明确说"不要图片，纯文字风格"时可以跳过门槛 4，但 design.md 素材清单也要清空

---

### 门槛 5：GraphicComponent 至少 3 种 diagram 类型（视频 ≥ 60s）

**含义**：1 分钟以上的视频，必须用 GraphicComponent 至少 3 次，且每次的 `diagram` 字段不重复（除非数据本身适合相同类型）。

**16 种 diagram 任选 3 种**：`flow` / `process` / `cycle` / `cycle-arrows` / `pyramid` / `funnel` / `comparison` / `architecture` / `timeline` / `matrix` / `pie` / `donut` / `line` / `bar` / `heatmap` / `radar`

**违例**：
```
P2: GraphicComponent diagram=flow
P6: GraphicComponent diagram=flow
❌ 只用了 1 种 diagram
```

**修复方案**：
- P3（三大支柱）→ 把 3 张 Card 换成 GraphicComponent diagram=`pyramid`
- P4（四件事）→ 把 4 张 Card 换成 GraphicComponent diagram=`matrix` 或 `cycle`
- P5（三个边界）→ 把 3 个 Badge 换成 GraphicComponent diagram=`comparison`

**短视频豁免**：
- < 30 秒：免门槛 5
- 30-60 秒：至少用 1 次 GraphicComponent

---

### 门槛 6：同区域同类组件配色差异化

**含义**：当同一区域内连续出现 ≥ 3 个同类型组件（如 3 张 Card / 3 个 Badge）时，**配色必须有至少 2 种基调**。

**违例**：
```
P3 三张支柱卡：
  P3-003: bg = linear-gradient(蓝紫)
  P3-004: bg = linear-gradient(蓝紫)  ← 完全一样
  P3-005: bg = linear-gradient(蓝紫)  ← 完全一样
❌ 三张卡视觉上像复制粘贴
```

**修复方案（任选）**：

**A. 渐进色阶**（推荐"递进/排序"型内容）：
```
P3-003: 蓝紫色（#6366F1 → #A855F7）
P3-004: 紫红色（#A855F7 → #EC4899）
P3-005: 红橙色（#EC4899 → #F97316）
```

**B. 对比基调**（推荐"对比/分类"型内容）：
```
P3-003: 红色基调（痛苦色）
P3-004: 绿色基调（希望色）
```

**C. 多色映射**（推荐"多维度并列"型内容）：
```
P4-003 写文档：蓝色 #2563EB
P4-004 查资料：紫色 #A855F7
P4-005 做分析：青色 #06B6D4
P4-006 自动化：橙色 #F59E0B
```

---

## 提升丰富度示例（low → good）

### ❌ Low 版

```json
"P3-002": {
  "type": "AggregateComponent",
  "children": [
    { "id": "P3-003", "type": "CardComponent", "content": { "title": "万亿级参数" } },
    { "id": "P3-004", "type": "CardComponent", "content": { "title": "海量训练数据" } },
    { "id": "P3-005", "type": "CardComponent", "content": { "title": "Transformer" } }
  ]
}
```
3 张同色卡片排排站，0 个非文字组件。

### ✅ Good 版

```json
"P3-002": {
  "type": "GraphicComponent",
  "content": {
    "diagram": "pyramid",
    "title": "让 AI 聪明的三大支柱",
    "items": [
      { "label": "Transformer 架构", "description": "注意力机制 · 理解上下文" },
      { "label": "海量训练数据", "description": "5000 亿+ token" },
      { "label": "万亿级参数", "description": "约人脑神经元规模" }
    ]
  },
  "customStyle": { "primary": "#FF6B6B", "accent": "#FFE66D", "secondary": "#4ECDC4" }
},
"P3-006": {
  "type": "ImageComponent",
  "content": { "image": "./assets/images/transformer-arch.png" }
},
"P3-007": {
  "type": "QuoteComponent",
  "content": { "text": "注意力机制是 Transformer 真正的灵魂", "author": "Vaswani et al." }
}
```

**改进**：
- ✅ 1 个 Graphic (pyramid) + 1 个 Image + 1 个 Quote = **3 种组件类型**
- ✅ pyramid 内置 3 色阶（primary/accent/secondary）→ 视觉差异天然存在
- ✅ Image 把"Transformer 架构"从抽象变具象
- ✅ Quote 给视频加了"权威感"

---

## 与其他规则文件的关系

| 文档 | 解决的问题 |
|---|---|
| [`components-catalog.md`](./components-catalog.md) | "选哪个组件" + "组件 customStyle 怎么写" |
| [`themes-catalog.md`](./themes-catalog.md) | "用哪个主题" + "白底/黑底配色应该怎样" |
| [`timing-rules.md`](./timing-rules.md) | "节奏快慢、画面动态密度" |
| [`layout-rules.md`](./layout-rules.md) | "区域坐标、组件 Y、尺寸、对比度、布局多样化" |
| **本文档（richness-rules）** | "**组件够不够丰富、配色够不够有层次、视觉够不够能打**" |
