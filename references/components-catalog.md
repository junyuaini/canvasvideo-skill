# 组件目录（CanvasVideo Skill 知识库）

> 本文档是给 LLM 看的"组件知识库"。生成 design.md 步骤 7（组件清单）和步骤 9（customStyle）前，**必须先查阅本文档**，确认每个组件的：
> 1. content 字段结构（怎么填内容）
> 2. customStyle 嵌套规则（怎么写样式）
> 3. 适用场景（什么时候选这个）
> 4. 反例场景（什么时候不要选）

---

## 总览：10 个核心组件

| 组件 | 一句话用途 | customStyle 顶层结构 |
|---|---|---|
| **TitleComponent** | 标题（H1/H2/H3） | 嵌套 `level{N}` |
| **TextComponent** | 段落正文、列表、引语、代码 | 嵌套 `{content.style}`，默认 `paragraph` |
| **ImageComponent** | 图片展示、轮播图 | 直接平铺 |
| **CardComponent** | 图文组合卡片 | 直接平铺 |
| **QuoteComponent** | 名言、证言、强调注释 | 直接平铺 |
| **BadgeComponent** | 标签、状态胶囊 | 直接平铺 |
| **CornerComponent** | 角标（HOT/NEW/VIP） | 直接平铺 |
| **ShockComponent** | 金句、关键数据、CTA 按钮 | 直接平铺 |
| **GraphicComponent** | 流程图/对比/雷达/饼图等 16 种图形 | 直接平铺 |
| **AggregateComponent** | 容器：组合多个子组件 | 不需要 customStyle |

---

## 1. TitleComponent（标题组件）

### content 字段

| key | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `text` | string | ✅ | `''` | 标题文字 |
| `level` | 1/2/3 | ❌ | `1` | 决定 customStyle 必须用 `level1/2/3` 嵌套 |
| `align` | left/center/right | ❌ | `'left'` | 文字对齐 |
| `useHtml` | boolean | ❌ | `false` | true 时 text 作为 HTML 渲染 |

### customStyle（必须嵌套）

```json
"customStyle": {
  "level1": {
    "fontSize": "60px",
    "fontWeight": "900",
    "color": "#111827",
    "lineHeight": "1.1"
  }
}
```

### 适用场景

✅ 视频开场主标题、章节标题、副标题、内容段落标题

### 反例

❌ 不要用于：
- 长段文字（用 `TextComponent`）
- 装饰性短语 / 金句（用 `ShockComponent`）
- 单字标签（用 `BadgeComponent`）

### 典型尺寸

- `fullRow: true`（独占整行）
- `position.h`：80-120px
- `start = 区域开始时间`，`end = 区域结束时间`（贯穿区域）

---

## 2. TextComponent（文本组件）

### content 字段

| key | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `text` | string | ✅ | `''` | 文字内容；`style: 'list'` 时按 `\n` 分行渲染 li |
| `style` | string | ❌ | `'paragraph'` | 决定 customStyle 嵌套键名；可选：`paragraph` / `lead` / `code` / `quote` / `list` / `small` |
| `align` | left/center/right | ❌ | `'left'` | |
| `useHtml` | boolean | ❌ | `false` | |

### customStyle（必须嵌套）

```json
"customStyle": {
  "paragraph": {
    "fontSize": "18px",
    "color": "#374151",
    "lineHeight": "1.6"
  }
}
```

> 嵌套键名要等于 `content.style`。如 `content.style: "lead"`，则 customStyle 顶层用 `"lead"`。

### 内置文本风格说明

| style | 用途 | 自动样式 |
|---|---|---|
| `paragraph` | 普通段落正文 | 标准字号 |
| `lead` | 段落首句导语 | 字号偏大 |
| `code` | 代码块 | 等宽字体 + 暗背景 |
| `quote` | 行内引用 | 自动加左侧色条 |
| `list` | 列表 | text 按 `\n` 切分为 `<li>` |
| `small` | 注释/小字 | 字号偏小 |

### 适用场景

✅ 段落说明、列表项、内联引语、代码片段

### 反例

❌ 不要用于：
- 大型引言名言（用 `QuoteComponent` 带 author）
- 单行强调标语（用 `ShockComponent`）

---

## 3. ImageComponent（图片组件）

### content 字段

| key | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `image` | string (URL) | 二选一 | — | 单图 |
| `images` | string[] | 二选一 | — | 多图（>1 张自动 3 秒轮播） |
| `caption` | string | ❌ | — | 底部黑色渐变标题 |
| `fit` | cover/contain | ❌ | `'cover'` | object-fit 模式 |
| `borderRadius` | number | ❌ | `8` | 圆角像素 |

### customStyle（直接平铺）

```json
"customStyle": {
  "borderRadius": "12px",
  "shadow": "0 4px 16px rgba(0,0,0,0.08)",
  "captionColor": "#FFFFFF",
  "captionFontSize": "14px"
}
```

**必填字段（4 个）**：`borderRadius` / `shadow` / `captionColor` / `captionFontSize`

### 适用场景

✅ 产品截图、照片墙轮播、独立大图展示

### 反例

❌ 不要用于：
- 图文结合卡片（用 `CardComponent` 的 `image-text/text-image` variant）
- 装饰性小图标（直接用 emoji 或字符）

### 注意

主体图片建议 `borderRadius: 0`（视频规则 L2 检查项）；长图高度 ≥ 400px。

---

## 4. CardComponent（卡片组件）

### content 字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | ❌ | 卡片标题 |
| `description` | string | ❌ | 卡片描述 |
| `image` | string | ❌ | 单图 |
| `images` | string[] | ❌ | gallery / double-image-title 多图 |
| `variant` | string | ❌ | 自动推断；可选：`text-only` / `image-title` / `title-image` / `image-text` / `text-image` / `overlay` / `gallery` / `double-image-title` |
| `imageWidth` | string | ❌ | 仅 image-text/text-image 生效，例 `'42%'` |
| `imageAspectRatio` | string | ❌ | 例 `'16/9'` / `'1/1'` |
| `imageShape` | square/circle | ❌ | circle 自动 999 圆角 |
| `imageFit` | cover/contain | ❌ | object-fit |

### customStyle（直接平铺）

```json
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
```

**必填字段（8 个）**：`background` / `borderRadius` / `padding` / `titleColor` / `titleFontSize` / `titleFontWeight` / `descriptionColor` / `descriptionFontSize`

### 适用场景

✅ 步骤卡（写 JSON / 填内容 / 设时间 / 点录制）、特性介绍卡、角色卡、画廊集

### 反例

❌ 不要用于：
- 单一短文本标签（用 `Badge`/`Corner`/`Shock`）
- 纯标题（用 `Title`）
- 静态长篇正文（用 `Text`）

---

## 5. QuoteComponent（引用组件）

### content 字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | ✅ | 引言文字 |
| `author` | string | ❌ | 自动加 `—` 前缀 |
| `source` | string | ❌ | 引用来源（如书名） |
| `icon` | string | ❌ | emoji 顶部图标 |

### customStyle（直接平铺）

```json
"customStyle": {
  "background": "rgba(99,102,241,0.08)",
  "borderLeft": "4px solid #6366F1",
  "borderRadius": "8px",
  "padding": "20px 24px",
  "textColor": "#111827",
  "textFontSize": "20px",
  "authorColor": "#6B7280",
  "authorFontSize": "14px",
  "iconSize": "32px"
}
```

**必填字段（9 个）**：`background` / `borderLeft` / `borderRadius` / `padding` / `textColor` / `textFontSize` / `authorColor` / `authorFontSize` / `iconSize`

### 适用场景

✅ 名言警句、用户证言、强调注释

### 反例

❌ 不要用于：
- 普通正文（用 `TextComponent` style:quote）
- 实时更新的信息流（用 Card）

---

## 6. BadgeComponent（徽章组件）

### content 字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | ✅ | 标签文字（无法自动换行，过长会截断） |
| `useHtml` | boolean | ❌ | |

### customStyle（直接平铺）

```json
"customStyle": {
  "color": "#DC2626",
  "textColor": "#FFFFFF",
  "padding": "10px 24px",
  "borderRadius": "999px",
  "fontSize": "28px",
  "fontWeight": "800",
  "shadow": "0 4px 12px rgba(220,38,38,0.4)"
}
```

**必填字段（7 个）**：`color`（背景色）/ `textColor` / `padding` / `borderRadius` / `fontSize` / `fontWeight` / `shadow`

> 注意：`color` 是 **背景色**（可以用 linear-gradient），`textColor` 才是文字色。

### 适用场景

✅ 醒目分类标签、状态、痛点关键词、解决方案关键词、CTA 小按钮

### 反例

❌ 不要用于：
- 多行长文本（无法换行）
- 主标题（用 `TitleComponent`）

### 尺寸规则（L2 检查项）

文字 > 4 字 → 宽度 ≥ 120px。

---

## 7. CornerComponent（角标组件）

### content 字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | ✅ | 短文字（HOT / NEW / VIP / 限时） |

### customStyle（直接平铺）

```json
"customStyle": {
  "color": "#FF6B6B",
  "textColor": "#FFFFFF",
  "padding": "4px 10px",
  "borderRadius": "6px",
  "fontSize": "12px",
  "fontWeight": "700"
}
```

**必填字段（6 个）**：`color` / `textColor` / `padding` / `borderRadius` / `fontSize` / `fontWeight`

### 适用场景

✅ 卡片右上角小型分类/状态角标

### 反例

❌ 不要用作主操作按钮或文本主体（无 hover、无交互）。

### 与 Badge 的区别

| 维度 | CornerComponent | BadgeComponent |
|---|---|---|
| 尺寸 | 小（10-14px 字号） | 中-大（20-32px 字号） |
| 用途 | 角标/装饰 | 标签/口号 |
| 必填字段 | 6 个（无 shadow） | 7 个（含 shadow） |

---

## 8. ShockComponent（金句胶囊组件）

### content 字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | ✅ | 金句、数字（自带脉冲动画） |

### customStyle（直接平铺）

```json
"customStyle": {
  "color": "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
  "textColor": "#FFFFFF",
  "padding": "16px 32px",
  "borderRadius": "16px",
  "fontSize": "60px",
  "fontWeight": "900",
  "border": "none",
  "shadow": "0 4px 16px rgba(37,99,235,0.3)"
}
```

**必填字段（8 个）**：`color`（背景，支持 gradient）/ `textColor` / `padding` / `borderRadius` / `fontSize` / `fontWeight` / `border` / `shadow`

### 适用场景

✅ HOOK 区开场金句、RESULT 区数据冲击（10+/20+/0/1）、CTA 按钮文字、强标语

### 反例

❌ 不要用于：
- 普通段落（用 `Text`）
- 不需要视觉冲击的次要信息

### 视觉特性

自带 `shockPulse` 脉冲动画（CSS 关键帧），所以**用得越多越乱**——一个区域建议最多 1-2 个 Shock。

---

## 9. GraphicComponent（图形/图表组件）

### content 字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `diagram` | string | ✅ | 见下方 16 种类型 |
| `title` | string | ❌ | 图形上方居中标题 |
| `items` | string[] 或 object[] | 多数 diagram 必填 | 节点/条目，例 `["发现","点击","下单"]` 或 `[{label:'A', value:30}]` |
| `center` | string | ❌ | cycle/donut 中心文字 |
| `left` / `right` | `{title, items[]}` | comparison 必填 | |
| `layers` | `Array<{title, nodes[]}>` | architecture 必填 | |
| `values` | `number[][]` | heatmap 必填 | 二维数据 |

### customStyle（直接平铺）

```json
"customStyle": {
  "background": "#F9FAFB",
  "textColor": "#111827",
  "primary": "#2563EB",
  "accent": "#F59E0B",
  "secondary": "#06B6D4",
  "lineColor": "#E5E7EB",
  "borderRadius": "16px",
  "padding": "24px",
  "titleFontSize": "24px",
  "itemFontSize": "16px",
  "shadow": "0 8px 24px rgba(0,0,0,0.06)"
}
```

**必填字段（11 个）**

### 16 种 diagram 类型选型表

| diagram | 视觉 | 选用场景 |
|---|---|---|
| `flow` / `process` | 横向流程：节点→箭头→节点 | 步骤流程、操作链 |
| `cycle` | 2×2 网格 + 中心圆 | 4 步循环、PDCA |
| `cycle-arrows` | 4 节点环绕中心，圆弧箭头 | 闭环过程、迭代 |
| `pyramid` | 倒梯形塔，多色块堆叠 | 层级关系、需求金字塔 |
| `funnel` | 漏斗，宽度递减 | 转化率、用户流失 |
| `comparison` | 左右两栏对比 | Before/After、新旧对比 |
| `architecture` | 多行分层 + 节点 chip | 系统架构、技术栈 |
| `timeline` | 横向时间线 + 编号圆点 | 历史发展、roadmap |
| `matrix` | 2×2 网格，无中心 | 4 象限分类 |
| `pie` | 饼图 + 右侧图例 | 占比、比例分布 |
| `donut` | 同 pie 但中心镂空显示 center 文字 | 含核心数字的占比 |
| `line` | SVG 折线图 + 圆点 | 趋势变化 |
| `bar` | 垂直柱状图 + 顶部数值 | 数据对比 |
| `heatmap` | 矩阵热力图（红色透明度映射） | 二维强度分布 |
| `radar` | SVG 雷达图（4 边参考多边形） | 多维能力对比 |

### 适用场景

✅ 流程、对比、循环、层级、占比、趋势等结构化关系

### 反例

❌ 不要用于：
- 纯装饰图标（用 Image 或 emoji）
- 简单标题副标题组合（用 Card）

### 优先级建议

设计时优先考虑：表格 → Graphic → AggregateComponent。如果 Graphic 的 16 种已经能表达，就不要再用 AggregateComponent 手动拼一个图。

---

## 10. AggregateComponent（聚合容器组件）

### 不接受 content / customStyle，纯结构容器

### 配置字段（顶层）

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `layout` | string | 二选一 | 关联 layouts.json 模板键，如 `"two-column"` |
| `position` | `{x,y,w,h}` | custom 模式必填 | 父容器尺寸 |
| `children` | ComponentConfig[] | ✅ | 子组件配置 |
| `useExternalPosition` | boolean | ❌ | true 时不用模板的 w/h |

### 子组件字段

| key | 类型 | 必填 | 说明 |
|---|---|---|---|
| `slot` | string | layout 模式必填 | 对应 layout 模板的 slot id（如 `"left"`/`"right"`） |
| `position` | `{x,y,w,h}` | custom 模式必填 | 子组件绝对像素坐标 |

### 两种模式

#### A. layout 模式（推荐用预设布局时）

```json
{
  "id": "P3-003",
  "type": "AggregateComponent",
  "layout": "four-column",
  "children": [
    { "id": "P3-004", "type": "CardComponent", "slot": "col1", "content": {...}, "customStyle": {...} },
    { "id": "P3-005", "type": "CardComponent", "slot": "col2", "content": {...}, "customStyle": {...} },
    { "id": "P3-006", "type": "CardComponent", "slot": "col3", "content": {...}, "customStyle": {...} },
    { "id": "P3-007", "type": "CardComponent", "slot": "col4", "content": {...}, "customStyle": {...} }
  ]
}
```

#### B. custom 模式（自定义坐标）

```json
{
  "id": "P2-002",
  "type": "AggregateComponent",
  "position": { "x": 0, "y": 0, "w": 760, "h": 320 },
  "children": [
    { "id": "P2-003", "type": "BadgeComponent", "position": { "x": 0, "y": 0, "w": 360, "h": 60 }, ... },
    { "id": "P2-004", "type": "BadgeComponent", "position": { "x": 0, "y": 80, "w": 360, "h": 60 }, ... },
    { "id": "P2-006", "type": "BadgeComponent", "position": { "x": 400, "y": 0, "w": 360, "h": 140 }, ... }
  ]
}
```

> ⚠️ video_design_guide.md 禁止事项 7：**禁止使用预设 layout 模板，必须用 custom 模式（手动配置 x/y/w/h）**。所以本 Skill 默认走 B 模式。

### 适用场景

✅ 多个内容组件需要在固定坐标系中排布（左右对比、4 列卡片、Hero+副内容）

### 反例

❌ 不要用于：
- 单组件场景（直接用对应 content 组件即可）
- 把所有内容平铺塞进一个 Aggregate（应该按区域 P1/P2/P3 拆分）

### 嵌套规则

可以嵌套 `AggregateComponent`，**最多两层**（外层→内层→最内层）。

---

## 选型决策树（场景 → 组件）

```
有大段标题文字？
  ├─ 是 → TitleComponent（注意 level1/2/3）
  └─ 否 → 继续

有段落正文？
  ├─ 是 → TextComponent
  └─ 否 → 继续

是金句、关键数字、CTA 按钮？
  ├─ 是 → ShockComponent（自带脉冲动画）
  └─ 否 → 继续

是名言、证言（带 author）？
  ├─ 是 → QuoteComponent
  └─ 否 → 继续

是图文组合卡片？
  ├─ 是 → CardComponent（注意选 variant）
  └─ 否 → 继续

是单独的图片/截图？
  ├─ 是 → ImageComponent
  └─ 否 → 继续

是流程/对比/趋势/占比图？
  ├─ 是 → GraphicComponent（选 16 种 diagram 之一）
  └─ 否 → 继续

是醒目标签/胶囊？
  ├─ 是字号 ≥ 20px → BadgeComponent
  └─ 是字号 ≤ 14px → CornerComponent

需要把多个组件放在同一坐标系排布？
  └─ AggregateComponent（custom 模式，手动 x/y/w/h）
```

---

## 字段速查（必填字段汇总，再次强调）

| 组件 | customStyle 必填字段（顺序无关） |
|---|---|
| TitleComponent | `level{N}.{ fontSize, fontWeight, color, lineHeight }` |
| TextComponent | `{content.style}.{ fontSize, color, lineHeight }` |
| ImageComponent | `borderRadius` `shadow` `captionColor` `captionFontSize` |
| CardComponent | `background` `borderRadius` `padding` `titleColor` `titleFontSize` `titleFontWeight` `descriptionColor` `descriptionFontSize` |
| QuoteComponent | `background` `borderLeft` `borderRadius` `padding` `textColor` `textFontSize` `authorColor` `authorFontSize` `iconSize` |
| BadgeComponent | `color` `textColor` `padding` `borderRadius` `fontSize` `fontWeight` `shadow` |
| CornerComponent | `color` `textColor` `padding` `borderRadius` `fontSize` `fontWeight` |
| ShockComponent | `color` `textColor` `padding` `borderRadius` `fontSize` `fontWeight` `border` `shadow` |
| GraphicComponent | `background` `textColor` `primary` `accent` `secondary` `lineColor` `borderRadius` `padding` `titleFontSize` `itemFontSize` `shadow` |
| AggregateComponent | （无） |

> **任何字段空值 / null / 空字符串都会触发运行时报错**，参考 video_design_guide.md §9.0。
