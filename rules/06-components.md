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

## R3 组件详解

### 3.1 TitleComponent（标题组件）

**功能**：主标题、层级标题，支持多级标题（level1-level4）

**适用场景**：
- 区域主标题（level1，最大字号）
- 副标题（level2）
- 小节标题（level3/4）

**特点**：
- 必须有 level 嵌套层
- level1 字号最大，最醒目
- 支持 fontSize、fontWeight、color、lineHeight

**示例**：
```json
{
  "id": "P1-001",
  "type": "TitleComponent",
  "position": { "x": 100, "y": 50, "w": 560, "h": 80 },
  "content": { "text": "AI时代如何学习", "level": 1 },
  "customStyle": {
    "level1": {
      "fontSize": "48px",
      "fontWeight": "900",
      "color": "#111827",
      "lineHeight": "1.2"
    }
  }
}
```

**常见错误**：
```json
// ❌ 错误：缺少 level1 嵌套层
{
  "customStyle": {
    "fontSize": "48px",
    "fontWeight": "900",
    "color": "#111827"
  }
}
```

---

### 3.2 TextComponent（正文组件）

**功能**：正文、说明文字、段落内容

**适用场景**：
- 详细说明
- 补充信息
- 描述性文字

**特点**：
- 支持多种样式（normal、bold、italic等）
- 字号小于 TitleComponent
- 支持多行文本

**示例**：
```json
{
  "id": "P2-002",
  "type": "TextComponent",
  "position": { "x": 100, "y": 150, "w": 560, "h": 100 },
  "content": { "text": "善用工具，持续迭代，四步搞定任何技能", "style": "normal" },
  "customStyle": {
    "normal": {
      "fontSize": "18px",
      "color": "#6B7280",
      "lineHeight": "1.6"
    }
  }
}
```

---

### 3.3 ShockComponent（冲击组件）

**功能**：核心数据、金句、大字号强调，视觉冲击力强

**适用场景**：
- 数字放大（"300%"、"4步"）
- 金句强调（"AI正在改变一切"）
- 核心观点突出

**特点**：
- 字号最大，通常占画面30%+
- 支持背景色、边框、阴影
- 可配合渐变背景

**示例**：
```json
{
  "id": "P2-001",
  "type": "ShockComponent",
  "position": { "x": 200, "y": 100, "w": 360, "h": 200 },
  "content": { "text": "4步搞定" },
  "customStyle": {
    "color": "#00D4FF",
    "textColor": "#FFFFFF",
    "fontSize": "72px",
    "fontWeight": "900",
    "padding": "20px 40px",
    "borderRadius": "16px",
    "background": "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
    "shadow": "0 8px 32px rgba(0,0,0,0.3)"
  }
}
```

---

### 3.4 ImageComponent（图片组件）

**功能**：图片展示、场景图、图标、产品截图

**适用场景**：
- 场景插画
- 产品界面截图
- 图标、Logo
- 背景图（全屏沉浸）

**特点**：
- 支持圆角、阴影
- 支持图片裁切（cover/contain）
- 支持图片说明文字

**示例**：
```json
{
  "id": "P3-001",
  "type": "ImageComponent",
  "position": { "x": 0, "y": 0, "w": 380, "h": 480 },
  "content": {
    "image": "https://picsum.photos/seed/tech-ai/800/600",
    "fit": "cover",
    "borderRadius": 12
  },
  "customStyle": {
    "borderRadius": "12px",
    "shadow": "0 4px 16px rgba(0,0,0,0.15)"
  }
}
```

**占位图方案**：
- 使用 Picsum URL：`https://picsum.photos/seed/{seed}/{width}/{height}`
- Seed 命名：`{领域}-{场景}`，如 `tech-ai`、`business-team`
- 必须套 AggregateComponent 叠水印（见 R6）

---

### 3.5 CardComponent（卡片组件）

**功能**：结构化信息卡片，包含标题和描述

**适用场景**：
- 步骤卡片（第1步、第2步）
- 特征列表
- 产品特点

**特点**：
- 有背景色、圆角、内边距
- 包含 title 和 description
- 适合并排展示

**示例**：
```json
{
  "id": "P3-001",
  "type": "CardComponent",
  "position": { "x": 100, "y": 100, "w": 200, "h": 280 },
  "content": {
    "title": "第一步",
    "description": "明确目标：知道自己要学什么"
  },
  "customStyle": {
    "background": "#1E293B",
    "borderRadius": "16px",
    "padding": "24px",
    "titleColor": "#FFFFFF",
    "titleFontSize": "24px",
    "titleFontWeight": "700",
    "descriptionColor": "#94A3B8",
    "descriptionFontSize": "16px"
  }
}
```

---

### 3.6 QuoteComponent（引用组件）

**功能**：名言、证言、引用块

**适用场景**：
- 名人名言
- 用户证言
- 权威引用

**特点**：
- 左侧有装饰线（borderLeft）
- 包含引用文字和作者
- 有背景色和圆角

**示例**：
```json
{
  "id": "P4-001",
  "type": "QuoteComponent",
  "position": { "x": 100, "y": 100, "w": 560, "h": 200 },
  "content": {
    "text": "未来属于善用AI的人",
    "author": "—— 某科技领袖"
  },
  "customStyle": {
    "background": "#F8FAFC",
    "borderLeft": "4px solid #3B82F6",
    "borderRadius": "8px",
    "padding": "24px",
    "textColor": "#1E293B",
    "textFontSize": "24px",
    "authorColor": "#64748B",
    "authorFontSize": "16px",
    "iconSize": "32px"
  }
}
```

---

### 3.7 BadgeComponent（标签组件）

**功能**：标签、分类、角标、状态标识

**适用场景**：
- 分类标签（"AI工具"、"教程"）
- 状态标识（"NEW"、"HOT"）
- 步骤编号

**特点**：
- 小尺寸、圆角
- 有背景色和文字色
- 可配阴影

**示例**：
```json
{
  "id": "P2-003",
  "type": "BadgeComponent",
  "position": { "x": 100, "y": 280, "w": 120, "h": 40 },
  "content": { "text": "AI生成" },
  "customStyle": {
    "color": "#3B82F6",
    "textColor": "#FFFFFF",
    "fontSize": "14px",
    "fontWeight": "600",
    "padding": "8px 16px",
    "borderRadius": "999px",
    "shadow": "0 2px 8px rgba(59,130,246,0.3)"
  }
}
```

---

### 3.8 CornerComponent（角标组件）

**功能**：角标、水印、小标识

**适用场景**：
- 图片角标（"NEW"）
- 水印文字
- 小标识

**特点**：
- 尺寸小
- 通常放在角落
- 简洁

**示例**：
```json
{
  "id": "P3-002",
  "type": "CornerComponent",
  "position": { "x": 320, "y": 20, "w": 60, "h": 28 },
  "content": { "text": "NEW" },
  "customStyle": {
    "color": "#EF4444",
    "textColor": "#FFFFFF",
    "fontSize": "12px",
    "fontWeight": "700",
    "padding": "4px 8px",
    "borderRadius": "4px"
  }
}
```

---

### 3.9 GraphicComponent（图形组件）

**功能**：图表、流程图、时间轴、示意图

**适用场景**：
- 数据图表
- 流程步骤
- 时间线
- 架构图

**特点**：
- 支持多种图形类型
- 有主色、辅色、强调色
- 支持线条、节点

**示例**：
```json
{
  "id": "P3-001",
  "type": "GraphicComponent",
  "position": { "x": 50, "y": 100, "w": 660, "h": 300 },
  "content": {
    "type": "timeline",
    "title": "AI发展历程",
    "items": [
      { "label": "1956", "text": "达特茅斯会议" },
      { "label": "2012", "text": "深度学习突破" },
      { "label": "2024", "text": "大模型爆发" }
    ]
  },
  "customStyle": {
    "background": "transparent",
    "textColor": "#1E293B",
    "primary": "#3B82F6",
    "accent": "#F59E0B",
    "secondary": "#10B981",
    "lineColor": "#CBD5E1",
    "borderRadius": "12px",
    "padding": "24px",
    "titleFontSize": "24px",
    "itemFontSize": "16px",
    "shadow": "0 4px 16px rgba(0,0,0,0.1)"
  }
}
```

---

### 3.10 AggregateComponent（聚合组件）

**功能**：组合多个子组件，实现复杂布局

**适用场景**：
- 左右分栏（左图右文）
- 多列并排
- 全屏沉浸（背景图+文字叠加）
- 对比式（Before/After）
- 占位图包装

**特点**：
- 本身不需要 customStyle（或只设 background/padding）
- children 数组包含多个子组件
- 每个子组件都是独立组件，必须包含完整字段

**子组件必填字段**：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识（如 `P3-PLACEHOLDER-001-img`） |
| `type` | 组件类型 |
| `position` | `{ x, y, w, h }` |
| `content` | 内容对象 |
| `customStyle` | 样式对象（可为 `{}`，但不能省略） |

**示例1：左右分栏（左图右文）**：
```json
{
  "id": "P3-001",
  "type": "AggregateComponent",
  "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
  "content": {},
  "customStyle": { "background": "transparent", "padding": "0" },
  "children": [
    {
      "id": "P3-001-img",
      "type": "ImageComponent",
      "position": { "x": 0, "y": 0, "w": 380, "h": 480 },
      "content": { "image": "https://picsum.photos/seed/tech-ai/800/600", "fit": "cover" },
      "customStyle": { "borderRadius": "12px" }
    },
    {
      "id": "P3-001-title",
      "type": "TitleComponent",
      "position": { "x": 420, "y": 100, "w": 300, "h": 60 },
      "content": { "text": "AI改变一切", "level": 1 },
      "customStyle": {
        "level1": { "fontSize": "36px", "fontWeight": "900", "color": "#111827" }
      }
    },
    {
      "id": "P3-001-text",
      "type": "TextComponent",
      "position": { "x": 420, "y": 180, "w": 300, "h": 100 },
      "content": { "text": "从编程到设计，AI正在重塑每个行业", "style": "normal" },
      "customStyle": {
        "normal": { "fontSize": "16px", "color": "#6B7280", "lineHeight": "1.6" }
      }
    }
  ]
}
```

**示例2：占位图包装（Picsum + 水印）**：
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
        "shadow": "0 4px 16px rgba(0,0,0,0.25)"
      }
    }
  ]
}
```

**严禁**：
- ❌ 子组件省略 `id`
- ❌ 子组件省略 `position`
- ❌ 子组件省略 `customStyle`
- ❌ ImageComponent 直接写 Picsum URL 而不套 Aggregate
- ❌ 同一视频内不同区域用相同 seed

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
