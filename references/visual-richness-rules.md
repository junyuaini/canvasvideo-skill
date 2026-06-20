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
- **创作模式下区域 25s 但所有组件挤在前 5s，后 20s 画面静止**——观感像幻灯片，不像视频

**根本原因**：LLM 倾向于"安全选择"——只用最熟的 2-3 个组件、所有配色用同一套渐变、避免使用"我不熟的"图形。
本规则的目标就是**强制把丰富度顶上来**，让生成的视频接近真实示例项目的质感。

---

## 🚧 7 条强制门槛（任何一条不通过都要重写）

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

**含义**：design.md "用户素材清单"里**任何标记为非空状态（`[已具备]` / `[AI 自动生成 - 占位]` / `[待用户提供]`）的素材**，**必须在 project.json 里有对应的 ImageComponent 引用**。

**违例示例**：
```
design.md 素材清单：
  1. AI 大脑光效图 [AI 自动生成 - 占位] - 用于 P1
  2. 办公场景图 [待用户提供] - 用于 P4

project.json：
  ❌ 0 个 ImageComponent → 7 个素材全都没引用
```

**修复方案**：

#### A. `[AI 自动生成 - 占位]` 的素材 → 引用占位图

详见 [`../templates/placeholders/url-factory.md`](../templates/placeholders/url-factory.md)。**默认使用 Pollinations AI 生成图 + Aggregate 叠中文水印**：

**方式 1（推荐 / 默认）：Pollinations AI 生成图 + AggregateComponent 叠水印**

视觉效果最好、主题最匹配：根据英文 prompt 实时生成 AI 图片 + 自加中文胶囊水印"※ 演示图片 请替换"。

Prompt 公式：`{主体} + {场景/动作} + {光线/氛围} + {风格修饰}`（英文，控制在 100 词以内）

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
        "image": "https://image.pollinations.ai/prompt/futuristic%20AI%20brain%20network%20blue%20neon?width=1280&height=720&nologo=true",
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

**方式 2（备选 / 离线兜底）：本地 SVG**

Pollinations AI 不可达 / 超时 / 用户拒绝远程图时使用。SVG 自带水印，**不要再叠 Aggregate**。

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

> Skill 的 `scripts/scaffold.js` 在调用 `scaffoldWorkdir({theme})` 时会自动复制 7 张 SVG 到工作目录的 `assets/placeholders/{light|dark}/`，所以 LLM **直接写本地路径就行，不用担心文件不存在**。
>
> 完整决策表 + 主题适配胶囊样式见 [`url-factory.md`](../templates/placeholders/url-factory.md)。

#### B. `[待用户提供]` 的素材 → 也用占位图，提示用户后续替换

LLM 不能凭空假设用户已提供，**仍然先用占位图**，但在 design.md 备注列写"用户提供后替换为真实素材"。

#### C. `[已具备]` 的素材 → 用 `copyUserAsset()` 拷贝后的真实路径

例：`./assets/images/logo.png`

**特殊豁免**：
- 用户明确说"不要图片，纯文字风格"时可以跳过门槛 4，但 design.md 素材清单也要清空
- "占位素材已自动生成"是合法做法——**所有占位图都自带"※ 演示图片 请替换"水印**，用户看到后会主动替换

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

### 门槛 7：动态密度（防止画面静止）⭐ 最容易踩坑

**含义**：视频是动态艺术，**画面不能长时间停在一个静止帧**。LLM 在创作模式下经常把所有组件挤在区域开头几秒，剩下十几秒画面死寂——必须强制规避。

#### 7.1 末组件停留上限：每个区域 ≤ 2 秒

**规则**：每个区域内"最后一个组件 start"到"区域结束（下一区域第一个 start，或 duration）"的间隔**必须 ≤ 2 秒**。

**真实示例数据**：示例-案例分享型-1分钟口播.json 实测——10 个区域中 7 个 ≤ 2 秒、最大 2.8 秒、中位数 1.8 秒。

**违例示例**：
```
P3 区：start=24, end=36, duration=12s
  P3-001 标题  start=24
  P3-002 卡片  start=26
  P3-003 卡片  start=27
  ❌ 最后一个 start=27, 区域 end=36，静止 9 秒——观感死寂
```

**修复方案（任选）**：
- A. 把区域拆短：`P3 改为 24-30s`，下一区域提前到 30s
- B. 在尾段加收尾组件（ImageComponent / GraphicComponent / ShockComponent / Quote），让 start ≥ end - 2s
- C. 把已有组件出场时间往后挪，让最后一个 start 接近 end - 2s

#### 7.2 组件出场最大间隔 ≤ 3 秒

**规则**：同一区域内任意两个相邻组件（按 start 排序）的 start 时差**必须 ≤ 3 秒**。

**违例示例**：
```
P2 区：标题 start=12, 卡片 start=18 → 间隔 6s ❌
```

**修复方案**：在中间补一个过渡组件（如 BadgeComponent / ImageComponent / 副标题 TextComponent）。

#### 7.3 区域时长上限 ≤ 15 秒（仅创作模式）

**规则**：创作模式下任何单一区域 `duration ≤ 15 秒`。超出必须拆分为更短区域。

**为什么**：创作模式没有 SRT 钉时间，LLM 倾向把 60s 视频均分成 5×12s 这种"舒服"整数，但单一区域 15s 以上很难填满紧凑节奏，必然出现长静止。

**口播模式豁免**：口播模式由 SRT 决定区域时长，不受此约束（但仍受 7.1/7.2 约束）。

**推荐区域数**：
- 30s 视频：≥ 3 个区域
- 60s 视频：≥ 6 个区域
- 120s 视频：≥ 10 个区域
- 180s 视频：≥ 14 个区域

#### 7.4 创作模式平均出场密度 ≥ 0.6 个/秒

**规则**：创作模式下，`组件总数 / 视频总时长 ≥ 0.6`。

**真实示例参考**：案例分享型 ≈ 0.87，产品演示型同量级。

**违例示例**：
```
60s 视频，组件总数 = 18 → 密度 = 0.3 ❌（低于 0.6）
```

**修复方案**：增加 ImageComponent / GraphicComponent / 子组件，或缩短视频时长。

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
| **动态密度（末组件停留 + 出场间隔 + 区域时长）** | 有区域静止 ≥ 5s | 有区域静止 2-5s | 全部 ≤ 2s |

**评分要求（满分 70）**：
- < 35 分 → 视频会很 low，**必须重写**
- 35-52 分 → 中等，**建议优化**
- ≥ 53 分 → 接近真实示例水平，**可以打包上传**

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
2. **逐条对照本文档 7 条门槛**，写一个简表：
   ```
   门槛 1（覆盖率 ≥ 60%）：当前 X/10 = XX% → 通过/不通过
   门槛 2（连续 ≤ 3）：最长连续 X 个 → 通过/不通过
   门槛 3（每区域 ≥ 1 非文字）：缺失区域 [...] → 通过/不通过
   门槛 4（素材实现率 100%）：清单 X 个/引用 Y 个 → 通过/不通过
   门槛 5（Graphic ≥ 3 种 diagram）：用了 [...] = N 种 → 通过/不通过
   门槛 6（同类配色差异）：基调 X 种 → 通过/不通过
   门槛 7.1（末组件停留 ≤ 2s）：各区域末组件→区域 end 间隔 [P1=1.2, P2=1.8, ...] → 通过/不通过
   门槛 7.2（出场间隔 ≤ 3s）：最大间隔 X 秒（在 PX 区） → 通过/不通过
   门槛 7.3（创作模式区域 ≤ 15s）：最长区域 X 秒（在 PX） → 通过/不通过
   门槛 7.4（创作模式密度 ≥ 0.6/s）：组件 X 个 / 时长 Ys = Z → 通过/不通过
   ```
3. **任何门槛不通过**，回到 video_design_guide.md 步骤 7-10 重新设计
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
