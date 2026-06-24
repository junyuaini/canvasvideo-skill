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
  { type: 'GraphicComponent', variant: 'flow' }
];
const { specs } = await queryComponentSpecBatch(typeVariants);
// specs['TitleComponent.level1'] → 该组件的完整字段定义
```

**严禁**：
- ❌ 凭记忆填写 customStyle 字段
- ❌ API 调不通时（网络失败/5xx）凭记忆硬写
- ❌ 使用未定义的 customStyle 字段

---

## R2 AggregateComponent 核心规则

**重要硬规则**：
- ✅ 所有视频区只能放 AggregateComponent
- ✅ 普通组件必须嵌套在 AggregateComponent.children 中
- ✅ AggregateComponent 自身需要完整 position
- ✅ AggregateComponent 不需要 customStyle

### R2.1 layoutMode 两种模式

| 模式 | 简介 | 子组件需要 position？ | 推荐场景 |
|------|------|----------------------|---------|
| **auto** | 自动布局模式，由 flex 自动居中、排列、换行 | ❌ 不需要 | 简单布局（标题+图形、单列等），快速创建 |
| **manual** | 手动布局模式，精确控制子组件位置 | ✅ 必须 | 复杂布局、需要精确定位 |

**推荐选择**：优先用 manual，除非确实不需要精准控制。

### R2.2 AggregateComponent Schema

```json
{
  "id": "P1-001",
  "type": "AggregateComponent",
  "layoutMode": "auto",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "children": [],
  "start": 0,
  "end": 5
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 组件唯一标识 |
| type | string | ✅ | 固定为 "AggregateComponent" |
| layoutMode | string | ✅ | "auto" 或 "manual" |
| position | object | ✅ | { x, y, w, h } |
| children | array | ✅ | 子组件数组 |
| start | number | ✅ | 出现时间（秒） |
| end | number | ✅ | 消失时间（秒） |

### R2.3 使用示例

**✅ auto 模式（子组件无 position）**：
```json
{
  "id": "P1-001",
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

**总计：10 种组件类型，40 个变种**

| 序号 | 组件名称 | 类型 | 变种数 | 简介 | 典型场景 |
|------|---------|------|-------|------|---------|
| 1 | TitleComponent | 文字 | 3 | 标题组件，分三级（level1-3） | Hook、Point、CTA |
| 2 | TextComponent | 文字 | 6 | 文本组件，支持段落/导语/代码/引用/列表/小字 | Story、Step、Summary |
| 3 | ImageComponent | 图片 | 1 | 单图/多图轮播展示（>1张自动3秒轮播） | Story、Scene、Emotion |
| 4 | CardComponent | 容器 | 7 | 卡片容器，支持多种图文布局 | List、Step、Data |
| 5 | QuoteComponent | 文字 | 1 | 名言/证言，左侧带色条 | Quote、Point |
| 6 | BadgeComponent | 文字 | 1 | 标签/胶囊，中等字号 | Data、List、CTA |
| 7 | CornerComponent | 文字 | 1 | 角标（HOT/NEW/VIP），比 Badge 字号小 | 全屏沉浸、图片叠加 |
| 8 | ShockComponent | 文字 | 1 | 金句胶囊，最醒目，自带脉冲动画 | Data、Hook、CTA |
| 9 | GraphicComponent | 图形 | 14 | 图形图表，含流程/循环/金字塔/漏斗/对比/架构/时间线/矩阵/饼图/环形图/折线图/柱状图/热力图/雷达图 | Data、Step、Timeline |
| 10 | AggregateComponent | 容器 | 2 | 聚合容器（auto/manual 模式），**推荐 manual** | 复杂布局、对比、多列 |

### R3.1 TitleComponent 变种（3个）

| 变种 | 简介 | 默认字号 |
|-----|------|---------|
| `level1` | 一级主标题，视频开场主标题、章节大标题 | 48px |
| `level2` | 二级标题，区域内子标题、副标题 | 36px |
| `level3` | 三级标题，卡片内标题、小节标题 | 24px |

### R3.2 TextComponent 变种（6个）

| 变种 | 简介 | 默认字号 |
|-----|------|---------|
| `paragraph` | 段落正文，普通描述文字 | 16px |
| `lead` | 导语，段落首句加粗，字号偏大 | 20px |
| `code` | 代码块，等宽字体+暗色背景 | 14px |
| `quote` | 行内引用，左侧带色条 | 18px |
| `list` | 列表，按 `\n` 切分为 li | 16px |
| `small` | 注释/小字 | 14px |

### R3.3 ImageComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 单图或多图轮播展示（>1张自动3秒轮播） |

### R3.4 CardComponent 变种（7个）

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

### R3.5 QuoteComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 名言/证言，左侧带色条+引文+作者 |

### R3.6 BadgeComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 标签/胶囊，圆角背景+文字，中等字号 |

### R3.7 CornerComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 角标（HOT/NEW/VIP），比 Badge 字号小 |

### R3.8 ShockComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 金句胶囊，最醒目，自带脉冲动画，用于关键数据/CTA/口号 |

### R3.9 GraphicComponent 变种（14个）

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

| 布局 | 外层组件 | 内部子组件组合 |
|------|---------|--------------|
| 单点聚焦 | AggregateComponent | ShockComponent（大字） |
| 左右分栏 | AggregateComponent | ImageComponent + TitleComponent + TextComponent |
| 上下分层 | AggregateComponent | TitleComponent + GraphicComponent |
| 多列并排 | AggregateComponent | 多个 CardComponent |
| 全屏沉浸 | AggregateComponent | ImageComponent（全屏背景）+ TitleComponent |
| 对比式 | AggregateComponent | 2个 AggregateComponent（左右各一个） |
| 时间轴 | AggregateComponent | GraphicComponent |
| 极简过渡 | AggregateComponent | TextComponent（单个） |
