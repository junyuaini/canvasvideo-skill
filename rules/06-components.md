# 组件规则

> 组件选型、customStyle 结构、API 调用规范。

---

## R1 API 调用规范（硬规则）

**必须先调 API 获取组件规范**：

```js
const { queryComponentSpecBatch } = require('./scripts/query-api');

// 传入 { type, variant } 列表，variant 必填
const typeVariants = [
  { type: 'TitleComponent', variant: 'level1' },
  { type: 'CardComponent', variant: 'image-text' },
  { type: 'GraphicComponent', variant: 'flow' },
  { type: 'HtmlComponent', variant: 'default' }
];
const { specs } = await queryComponentSpecBatch(typeVariants);
// specs['TitleComponent.level1'] → 该组件的完整字段定义
```

**严禁**：
- ❌ 凭记忆填写 customStyle 字段
- ❌ API 调不通时（网络失败/5xx）凭记忆硬写
- ❌ 使用未定义的 customStyle 字段

---

## R1.1 组件 ID 规则（硬规则）

- ✅ **ID 必填**：每个组件必须有 id 字段
- ✅ **格式 `Pxx-xxx`**：`P` + 区域编号 + `-` + 三位数字序号
  - 序号范围 001-999，必须补零（如 001、010、099）
- ✅ **全局唯一**：整个项目内组件 ID 不可重复
- ✅ **同区域序号不重复**：同一区域内 xxx 不可重复

| 正确示例 | 错误示例 | 原因 |
|---------|---------|------|
| P1-001 | P1-1 | 序号必须三位 |
| P2-005 | P2-05 | 序号必须三位 |
| P10-001 | 003 | 缺少区域前缀 |
| P3-010 | P1-010 | 区域不匹配（组件在 P3 区域） |

---

## R1.2 顶级组件 regionId 规则（硬规则）

- ✅ **顶级组件必须配置 regionId**：直接位于 `project.components[]` 数组中的组件必须包含 `regionId` 字段
- ✅ **regionId 格式**：`P` + 数字（如 `P1`、`P2`、`P10`）
- ✅ **regionId 必须在 regions 中存在**：`regionId` 的值必须出现在 `project.regions[]` 数组中
- ✅ **ID 前缀须与 regionId 一致**：组件 ID 的区域部分（如 `P1-001` 中的 `P1`）必须等于 `regionId`

```json
// ✅ 正确
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "HtmlComponent",
  ...
}

// ❌ 错误：缺少 regionId
{
  "id": "P1-001",
  "type": "HtmlComponent",
  ...
}

// ❌ 错误：ID 前缀与 regionId 不一致
{
  "id": "P1-001",
  "regionId": "P2",
  ...
}

// ❌ 错误：regionId 不在 regions 中
{
  "id": "P1-001",
  "regionId": "X1",
  ...
}
```

> 嵌套在 `AggregateComponent.children[]` 中的子组件不需要配置 `regionId`。

---

## R2 顶层组件规则

**重要硬规则**：
- ✅ 顶层组件只允许 **HtmlComponent** 和 **AggregateComponent**
- ✅ **优先推荐直接使用 HtmlComponent 作为顶层组件**（简洁、自由度高）
- ✅ **所有顶层组件必须配置 position**（至少包含 w 和 h）
- ✅ 顶层 HtmlComponent 不需要 customStyle，通过 content.css 控制样式
- ✅ 其他组件（TitleComponent、CardComponent 等）必须嵌套在 AggregateComponent.children 中

### R2.1 推荐方案：顶层 HtmlComponent（优先）

```json
{
  "id": "P1-001",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "content": {
    "html": "<div class='stage'>...</div>",
    "css": ".stage { position: absolute; inset: 0; ... }",
    "elementIds": {
      ".stage": { "id": "P1-001-STAGE", "start": 0, "end": 5 },
      ".title": { "id": "P1-001-TITLE", "start": 0.3, "end": 5 }
    }
  },
  "start": 0,
  "end": 5
}
```

**优势**：
- 结构扁平，无需 AggregateComponent 包裹
- HTML/CSS 完全自由，适合复杂自定义布局
- 通过 elementIds 控制内部元素的独立时间线

### R2.2 备选方案：AggregateComponent

当需要组合多个非 Html 组件时使用：

| 模式 | 简介 | 子组件需要 position？ | 推荐场景 |
|------|------|----------------------|---------|
| **free** | 自由定位模式，子组件自行管理位置和样式 | ❌ 不需要（通过 content.css 或 customStyle 控制） | HtmlComponent 自定义布局 |
| **auto** | 自动布局模式，由 flex 自动居中、排列、换行 | ❌ 不需要 | 简单布局（标题+图形、单列等），快速创建 |
| **manual** | 手动布局模式，精确控制子组件位置 | ✅ 必须 | 复杂布局、需要精确定位 |

### R2.3 AggregateComponent Schema

```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "AggregateComponent",
  "layoutMode": "free",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "children": [],
  "start": 0,
  "end": 5
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 组件唯一标识 |
| regionId | string | ✅ | 顶级组件必填，所属区域 ID |
| type | string | ✅ | 固定为 "AggregateComponent" |
| layoutMode | string | ✅ | "free"、"auto" 或 "manual" |
| position | object | ✅ | { x, y, w, h } |
| children | array | ✅ | 子组件数组 |
| start | number | ✅ | 出现时间（秒） |
| end | number | ✅ | 消失时间（秒） |

### R2.4 使用示例

**✅ 顶层 HtmlComponent（推荐，最简洁）**：
```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "content": {
    "html": "<div class='stage'><div class='title'>标题</div><div class='subtitle'>副标题</div></div>",
    "css": ".stage { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } .title { font-size: 48px; font-weight: 900; color: #fff; } .subtitle { font-size: 20px; color: #ccc; }",
    "elementIds": {
      ".stage": { "id": "P1-001-STAGE", "start": 0, "end": 5 },
      ".title": { "id": "P1-001-TITLE", "start": 0.3, "end": 5 },
      ".subtitle": { "id": "P1-001-SUB", "start": 1.0, "end": 5 }
    }
  },
  "start": 0,
  "end": 5
}
```

**✅ free 模式（子组件用 HtmlComponent 自定义布局）**：
```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "AggregateComponent",
  "layoutMode": "free",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "children": [
    {
      "id": "P1-002",
      "type": "HtmlComponent",
      "content": {
        "html": "<div class='title'>标题</div><div class='subtitle'>副标题文字</div>",
        "css": ".title { font-size: 48px; font-weight: 900; color: #fff; margin-bottom: 12px; } .subtitle { font-size: 20px; color: #ccc; }"
      },
      "start": 0,
      "end": 5
    }
  ],
  "start": 0,
  "end": 5
}
```

**✅ auto 模式（子组件无 position）**：
```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "AggregateComponent",
  "layoutMode": "auto",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "children": [
    {
      "id": "P1-002",
      "type": "TitleComponent",
      "content": { "text": "标题", "level": 1 },
      "customStyle": { "level1": { "fontSize": "48px", "color": "#FFFFFF" } },
      "start": 0,
      "end": 3
    },
    {
      "id": "P1-003",
      "type": "BadgeComponent",
      "content": { "text": "标签" },
      "customStyle": { "color": "#00B894", "textColor": "#FFFFFF" },
      "start": 1,
      "end": 3
    }
  ],
  "start": 0,
  "end": 3
}
```

**✅ manual 模式（子组件有 position）**：
```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "AggregateComponent",
  "layoutMode": "manual",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "children": [
    {
      "id": "P1-002",
      "type": "TitleComponent",
      "position": { "x": 100, "y": 100, "w": 580, "h": 80 },
      "content": { "text": "标题", "level": 1 },
      "customStyle": { "level1": { "fontSize": "48px", "color": "#FFFFFF" } },
      "start": 0,
      "end": 3
    }
  ],
  "start": 0,
  "end": 3
}
```

---

## R3 子组件清单

**总计：11 种组件类型，42 个变种**

| 序号 | 组件名称 | 类型 | 变种数 | 简介 | 典型场景 |
|------|---------|------|-------|------|---------|
| 1 | HtmlComponent | 自定义 | 1 | 自定义 HTML/CSS 组件，自由渲染任意内容 | **free 模式首选**，自定义布局、复杂排版 |
| 2 | TitleComponent | 文字 | 3 | 标题组件，分三级（level1-3） | Hook、Point、CTA |
| 3 | TextComponent | 文字 | 6 | 文本组件，支持段落/导语/代码/引用/列表/小字 | Story、Step、Summary |
| 4 | ImageComponent | 图片 | 1 | 单图/多图轮播展示（>1张自动3秒轮播） | Story、Scene、Emotion |
| 5 | CardComponent | 容器 | 7 | 卡片容器，支持多种图文布局 | List、Step、Data |
| 6 | QuoteComponent | 文字 | 1 | 名言/证言，左侧带色条 | Quote、Point |
| 7 | BadgeComponent | 文字 | 1 | 标签/胶囊，中等字号 | Data、List、CTA |
| 8 | CornerComponent | 文字 | 1 | 角标（HOT/NEW/VIP），比 Badge 字号小 | 全屏沉浸、图片叠加 |
| 9 | ShockComponent | 文字 | 1 | 金句胶囊，最醒目，自带脉冲动画 | Data、Hook、CTA |
| 10 | GraphicComponent | 图形 | 14 | 图形图表，含流程/循环/金字塔/漏斗/对比/架构/时间线/矩阵/饼图/环形图/折线图/柱状图/热力图/雷达图 | Data、Step、Timeline |
| 11 | AggregateComponent | 容器 | 3 | 聚合容器（free/auto/manual 模式），**推荐 free** | 所有布局 |

### R3.1 HtmlComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 自定义 HTML 组件，通过 content.html + content.css 渲染任意内容 |

**HtmlComponent 核心特性**：
- 不需要 customStyle（用 content.css 控制样式）
- CSS 自动限定在组件 ID 作用域内（`#${componentId}`）
- 子元素统一 `box-sizing: border-box`
- **必须配置 elementIds**，为 HTML 内部元素分配 ID 和独立时间线

**HtmlComponent elementIds 规则**（必填）：

elementIds 为对象格式，key 是 CSS 选择器，value 是 `{ id, start, end }` 对象：

```json
"elementIds": {
  ".stage": { "id": "P1-002", "start": 0, "end": 5 },
  ".title": { "id": "P1-003", "start": 0.3, "end": 5 },
  ".subtitle": { "id": "P1-004", "start": 1.0, "end": 5 }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | ✅ | CSS 选择器，如 `.title`、`#hero`、`.card` |
| id | string | ✅ | 元素唯一标识，格式必须为 `P{区域编号}-{三位数字}`（如 `P1-002`、`P1-003`），与顶级组件 ID 规则统一，且全局唯一 |
| start | number | ✅ | 元素开始显示时间（秒） |
| end | number | ✅ | 元素结束显示时间（秒） |

**作用**：
1. 按 ↑ 键显示元素 ID 标签，方便定位和修改
2. 每个 HTML 子元素可独立控制出现/消失时间
3. 不再支持字符串简写格式（如 `".xxx": "ID"`），必须使用对象格式

### R3.2 TitleComponent 变种（3个）

| 变种 | 简介 | 默认字号 |
|-----|------|---------|
| `level1` | 一级主标题，视频开场主标题、章节大标题 | 48px |
| `level2` | 二级标题，区域内子标题、副标题 | 36px |
| `level3` | 三级标题，卡片内标题、小节标题 | 24px |

### R3.3 TextComponent 变种（6个）

| 变种 | 简介 | 默认字号 |
|-----|------|---------|
| `paragraph` | 段落正文，普通描述文字 | 16px |
| `lead` | 导语，段落首句加粗，字号偏大 | 20px |
| `code` | 代码块，等宽字体+暗色背景 | 14px |
| `quote` | 行内引用，左侧带色条 | 18px |
| `list` | 列表，按 `\n` 切分为 li | 16px |
| `small` | 注释/小字 | 14px |

### R3.4 ImageComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 单图或多图轮播展示（>1张自动3秒轮播） |

### R3.5 CardComponent 变种（7个）

| 变种 | 简介 |
|-----|------|
| `text-only` | 纯文字卡片（标题+描述） |
| `image-title` | 上图下标题 |
| `title-image` | 上标题下图 |
| `image-text` | 左图右文 |
| `text-image` | 左文右图 |
| `overlay` | 图片背景+底部叠加文字（封面卡片） |
| `gallery` | 图片网格画廊（最多9张） |
| `double-image-title` | 双图+标题（上方两张图横排） |

### R3.6 QuoteComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 名言/证言，左侧带色条+引文+作者 |

### R3.7 BadgeComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 标签/胶囊，圆角背景+文字，中等字号 |

### R3.8 CornerComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 角标（HOT/NEW/VIP），比 Badge 字号小 |

### R3.9 ShockComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 金句胶囊，最醒目，自带脉冲动画，用于关键数据/CTA/口号 |

### R3.10 GraphicComponent 变种（14个）

| 变种 | 简介 |
|-----|------|
| `flow` | 横向流程图，节点→箭头→节点 |
| `cycle` | 2×2 循环网格+中心圆 |
| `cycle-arrows` | 4节点环绕中心+圆弧箭头 |
| `pyramid` | 倒梯形塔，层级关系 |
| `funnel` | 漏斗，宽度递减 |
| `comparison` | 左右两栏对比 |
| `architecture` | 多行分层+节点 chip |
| `timeline` | 横向时间线+编号圆点 |
| `matrix` | 2×2 网格，无中心 |
| `pie` | 饼图+右侧图例 |
| `donut` | 环形图（中心镂空显示数据） |
| `line` | 折线图 |
| `bar` | 垂直柱状图+顶部数值 |
| `heatmap` | 矩阵热力图（红色透明度映射） |
| `radar` | 雷达图（4边参考多边形） |

---

## R4 布局 → 组件组合建议

| 布局 | 外层组件 | 说明 |
|------|---------|------|
| 自定义布局（**推荐**） | **HtmlComponent**（顶层） | 最简洁，HTML/CSS 完全自由，通过 elementIds 控制元素时间线 |
| 多组件组合 | AggregateComponent（free） | 需组合多个非 Html 组件时使用 |
| 单点聚焦 | HtmlComponent（顶层） | 大字金句，全屏居中 |
| 左右分栏 | HtmlComponent（顶层） | CSS flex/grid 实现分栏 |
| 上下分层 | HtmlComponent（顶层） | CSS flex 实现上下排列 |
| 多列并排 | HtmlComponent（顶层） | CSS grid 实现多列 |
| 全屏沉浸 | HtmlComponent（顶层） | 背景图+叠加标题 |
| 时间轴 | HtmlComponent（顶层） | CSS 绘制时间线 |
| 极简过渡 | HtmlComponent（顶层） | 单行文字 |

> **原则**：优先使用顶层 HtmlComponent，仅在需要组合 TitleComponent/CardComponent/GraphicComponent 等非 Html 组件时才用 AggregateComponent。
