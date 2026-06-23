# 组件规则

> 组件选型、customStyle 结构、API 调用规范。

---

## R1 API 调用规范（硬规则）

**必须先调 API 获取组件规范**：

```js
const { queryComponentSpecBatch } = require('./scripts/query-api');
const types = ['TitleComponent', 'ShockComponent', 'ImageComponent'];
const { specs } = await queryComponentSpecBatch(types);
// specs.TitleComponent → 该组件的完整字段定义
```

**严禁**：
- ❌ 凭记忆填写 customStyle 字段
- ❌ API 调不通时（网络失败/5xx）凭记忆硬写
- ❌ 使用未定义的 customStyle 字段

---

## R2 组件清单

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
| 10 | AggregateComponent | 容器 | 2 | 聚合容器（layout 模式/custom 模式），**推荐 custom** | 复杂布局、对比、多列 |

### R2.1 TitleComponent 变种（3个）

| 变种 | 简介 | 默认字号 |
|-----|------|---------|
| `level1` | 一级主标题，视频开场主标题、章节大标题 | 48px |
| `level2` | 二级标题，区域内子标题、副标题 | 36px |
| `level3` | 三级标题，卡片内标题、小节标题 | 24px |

### R2.2 TextComponent 变种（6个）

| 变种 | 简介 | 默认字号 |
|-----|------|---------|
| `paragraph` | 段落正文，普通描述文字 | 16px |
| `lead` | 导语，段落首句加粗，字号偏大 | 20px |
| `code` | 代码块，等宽字体+暗色背景 | 14px |
| `quote` | 行内引用，左侧带色条 | 18px |
| `list` | 列表，按 `\n` 切分为 li | 16px |
| `small` | 注释/小字 | 14px |

### R2.3 ImageComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 单图或多图轮播展示（>1张自动3秒轮播） |

### R2.4 CardComponent 变种（7个）

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

### R2.5 QuoteComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 名言/证言，左侧带色条+引文+作者 |

### R2.6 BadgeComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 标签/胶囊，圆角背景+文字，中等字号 |

### R2.7 CornerComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 角标（HOT/NEW/VIP），比 Badge 字号小 |

### R2.8 ShockComponent 变种（1个）

| 变种 | 简介 |
|-----|------|
| `default` | 金句胶囊，最醒目，自带脉冲动画，用于关键数据/CTA/口号 |

### R2.9 GraphicComponent 变种（14个）

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

### R2.10 AggregateComponent 变种（2个）

| 变种 | 简介 |
|-----|------|
| `layout` | 使用预设布局模板（如 two-column/four-column），**本 Skill 默认禁用** |
| `custom` | **推荐模式**，手动配置子组件 x/y/w/h |

---

## R4 组件选型速查

| 场景 | 推荐组件 | 说明 |
|------|---------|------|
| 区域主标题 | TitleComponent (level1) | 最大字号，最醒目 |
| 副标题 | TitleComponent (level2/3) | 次要层级 |
| 核心数据/金句 | ShockComponent | 字号最大，视觉冲击 |
| 正文说明 | TextComponent | 常规段落 |
| 图片/场景 | ImageComponent | 支持圆角、阴影 |
| 步骤卡片 | CardComponent | 标题+描述结构 |
| 名言引用 | QuoteComponent | 左侧装饰线 |
| 标签/分类 | BadgeComponent | 小尺寸圆角 |
| 角标/水印 | CornerComponent | 角落小标识 |
| 图表/流程 | GraphicComponent | 时间轴、流程图 |
| 复杂布局 | AggregateComponent | 组合多个子组件 |

---

## R5 布局 → 组件组合建议

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
