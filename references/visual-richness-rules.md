# 视觉丰富度规则（CanvasVideo Skill 强制约束）

> 本文档是 LLM 生成 `project.json` 时**必须满足的硬性丰富度门槛**。
> 任何一条不通过都必须**回到 design.md 步骤 7-9 重新设计**，不允许直接打包上传。

---

## ⚠️ 为什么需要这份规则？

历史上观察到的 low 视频通病：
- 7 个区域都是"标题 + 副标题 + 主体"上下堆栈
- 78% 组件都是 `TitleComponent + CardComponent`
- 多张 Card 长得一模一样（同色、同字号、同 variant）
- 设计稿写了素材清单但 `project.json` 里 0 个 ImageComponent
- 一个 1-3 分钟的视频只用了 1 种 GraphicComponent diagram 类型

**根本原因**：LLM 倾向于"安全选择"——只用最熟的 2-3 个组件、所有配色用同一套渐变、避免使用"我不熟的"图形。
本规则的目标就是**强制把丰富度顶上来**，让生成的视频接近真实示例项目的质感。

---

## 🚧 6 条强制门槛（任何一条不通过都要重写）

### 门槛 1：组件类型覆盖率 ≥ 60%

**计算方法**：使用的不同组件类型数 / 10 ≥ 0.6

**通过示例**：
- 用了 `Title / Text / Image / Card / Badge / Shock / Graphic` = 7 种 / 10 = **70% ✅**
- 用了 `Title / Card / Aggregate` = 3 种 / 10 = **30% ❌**

**判定**：≥ 60% 通过；< 60% 必须重写组件清单（步骤 7）。

### 门槛 2：同一类型组件连续使用 ≤ 3 个

**含义**：同一个 AggregateComponent 内的子组件，或在相邻位置（同一区域）出现的同类型组件不能超过 3 个。

**违例示例**：
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

### 门槛 3：每个区域至少 1 个"非纯文字组件"

**非纯文字组件**：`ImageComponent` / `GraphicComponent` / `QuoteComponent` / 含 image 的 `CardComponent (variant: image-text/text-image/overlay/gallery)`

**违例示例**：
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

### 门槛 4：素材清单实现率 = 100%

**含义**：design.md "用户素材清单"里**任何标记为非空状态（`[已具备]` / `[AI 自动生成]` / `[待用户提供]`）的素材**，**必须在 project.json 里有对应的 ImageComponent 引用**。

**违例示例**：
```
design.md 素材清单：
  1. AI 大脑光效图 [AI 自动生成] - 用于 P1
  2. 办公场景图 [待用户提供] - 用于 P4

project.json：
  ❌ 0 个 ImageComponent → 7 个素材全都没引用
```

**修复方案**：
- 删除清单中不需要的素材行（要诚实），或
- 在 project.json 对应区域加 ImageComponent，path 指向 `./assets/images/{素材文件名}`

**特殊豁免**：
- 用户明确说"不要图片，纯文字风格"时可以跳过门槛 4，但 design.md 素材清单也要清空
- "占位素材未及时生成"不是豁免理由——也要写 ImageComponent，路径指向占位

### 门槛 5：GraphicComponent 至少使用 3 种 diagram 类型（适用于 ≥ 60 秒视频）

**含义**：1 分钟以上的视频，必须用 GraphicComponent 至少 3 次，且每次的 `diagram` 字段不重复（除非数据本身适合相同类型）。

**16 种 diagram 任选 3 种**：`flow` / `process` / `cycle` / `cycle-arrows` / `pyramid` / `funnel` / `comparison` / `architecture` / `timeline` / `matrix` / `pie` / `donut` / `line` / `bar` / `heatmap` / `radar`

**违例示例**：
```
P2: GraphicComponent diagram=flow
P6: GraphicComponent diagram=flow
❌ 只用了 1 种 diagram，且只在 2 个区域用 Graphic
```

**修复方案**：
- P3（三大支柱）→ 把 3 张 Card 换成 GraphicComponent diagram=`pyramid`
- P4（四件事）→ 把 4 张 Card 换成 GraphicComponent diagram=`matrix` 或 `cycle`
- P5（三个边界）→ 把 3 个 Badge 换成 GraphicComponent diagram=`comparison`（左右对比"会做 vs 不会做"）
- P6 已是 flow → 改成 `process` 或保留

**短视频豁免**：
- < 30 秒：免门槛 5
- 30-60 秒：至少用 1 次 GraphicComponent

### 门槛 6：同区域同类型组件配色差异化（避免"复制粘贴感"）

**含义**：当同一区域内连续出现 ≥ 3 个同类型组件（如 3 张 Card / 3 个 Badge / 3 个 ShockNumber）时，**配色必须有至少 2 种基调**。

**违例示例**：
```
P3 三张支柱卡：
  P3-003: bg = linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))
  P3-004: bg = linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))  ← 完全一样
  P3-005: bg = linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))  ← 完全一样
  ❌ 三张卡视觉上像复制粘贴
```

**修复方案（任选一）**：

**A. 渐进色阶（推荐用于"递进/排序"型内容）**：
```
P3-003: 蓝紫色（#6366F1 → #A855F7）
P3-004: 紫红色（#A855F7 → #EC4899）
P3-005: 红橙色（#EC4899 → #F97316）
```

**B. 对比基调（推荐用于"对比/分类"型内容）**：
```
P3-003: 红色基调（"传统方案"，痛苦色）
P3-004: 绿色基调（"AI 方案"，希望色）
```

**C. 多色映射（推荐用于"多维度并列"型内容）**：
```
P4-003 写文档：蓝色 #2563EB
P4-004 查资料：紫色 #A855F7
P4-005 做分析：青色 #06B6D4
P4-006 自动化：橙色 #F59E0B
```

---

## 📊 丰富度评分（自检用）

生成完 project.json 后，LLM 可以用以下评分自检：

| 维度 | 0 分 | 5 分 | 10 分 |
|---|---|---|---|
| 组件类型多样性 | < 4 种 | 5-6 种 | ≥ 7 种 |
| 同类连续 | 出现 5+ 个连续 | 4 个连续 | ≤ 3 个连续 |
| 非文字组件 | 有区域 0 个 | 每区域至少 1 个 | 多种穿插 |
| 素材实现率 | < 50% | 50-99% | 100% |
| Graphic 多样性 | 0-1 种 | 2 种 | ≥ 3 种 |
| 同类配色差异 | 100% 同色 | 部分差异 | 渐变/对比/多色 |

**评分要求**：
- < 30 分 → 视频会很 low，必须重写
- 30-44 分 → 中等，建议优化
- ≥ 45 分 → 接近真实示例水平

---

## 💡 提升丰富度的"组合拳"案例

下面是把 P3（三大支柱）从 "low" 提升到 "good" 的对比示例：

### ❌ Low 版（当前 cv_mqmghmrd 实际生成的）

```json
"P3-002": {
  "type": "AggregateComponent",
  "children": [
    { "id": "P3-003", "type": "CardComponent", "content": { "title": "万亿级参数", ... } },
    { "id": "P3-004", "type": "CardComponent", "content": { "title": "海量训练数据", ... } },
    { "id": "P3-005", "type": "CardComponent", "content": { "title": "Transformer", ... } }
  ]
}
```
3 张同色卡片排排站，0 个非文字组件。

### ✅ Good 版（按本规则改写）

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
  "customStyle": { ... 完整 11 字段，含 primary/accent/secondary 三色 }
},
"P3-006": {
  "type": "ImageComponent",
  "content": { "image": "./assets/images/transformer-arch.png" },
  "position": { "x": 0, "y": 280, "w": 720, "h": 200 }
},
"P3-007": {
  "type": "QuoteComponent",
  "content": { "text": "注意力机制是 Transformer 真正的灵魂", "author": "Vaswani et al." }
}
```

**改进**：
- ✅ 1 个 GraphicComponent (pyramid) + 1 个 Image + 1 个 Quote = **3 种组件类型**
- ✅ pyramid 内置 3 色阶（primary/accent/secondary）→ 视觉差异天然存在
- ✅ Image 把"Transformer 架构"从抽象变具象
- ✅ Quote 给视频加了"权威感"

---

## 🚨 自检命令（强制执行）

在生成完 project.json **打包前**，LLM 必须：

1. **统计组件类型**：列出实际用了哪几种 `type` 字段
2. **逐条对照本文档 6 条门槛**，写一个简表：
   ```
   门槛 1（覆盖率 ≥ 60%）：当前 X/10 = XX% → 通过/不通过
   门槛 2（连续 ≤ 3）：最长连续 X 个 → 通过/不通过
   ...
   ```
3. **任何门槛不通过**，回到 video_design_guide.md 步骤 7 重新设计组件清单
4. **全部通过**才能调用 `package.js + upload-video.js`

---

## 与 components-catalog.md / themes-catalog.md 的关系

| 文档 | 解决的问题 |
|---|---|
| components-catalog.md | "选哪个组件" + "组件 customStyle 怎么写" |
| themes-catalog.md | "用哪个主题" + "白底/黑底配色应该怎样" |
| **visual-richness-rules.md（本文档）** | "**组件够不够丰富、配色够不够有层次、视觉够不够能打**" |

三份文档配合使用：
1. 先用 themes-catalog 选好主题（白/黑）
2. 用 components-catalog 选组件、写 customStyle
3. 用 visual-richness-rules 自检 → 不达标重写
