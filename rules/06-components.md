# 组件规则

> 组件选型、customStyle 结构、API 调用规范。

---

## R1 组件数量限制

| 组件类型 | 每区域上限 |
|----------|-----------|
| TitleComponent | 1 |
| TextComponent | 2 |
| ShockComponent | 1 |
| BadgeComponent | 2 |
| ImageComponent | 1 |
| CardComponent | 2 |
| GraphicComponent | 1 |
| QuoteComponent | 1 |
| AggregateComponent | — |
| **总计** | **≤ 5** |

---

## R2 组件选型决策树

### 基础场景

| 场景 | 推荐组件 |
|------|---------|
| 主标题 | TitleComponent |
| 核心数据/金句 | ShockComponent |
| 结构化信息 | CardComponent |
| 图表/流程 | GraphicComponent |
| 名言/证言 | QuoteComponent |
| 标签/分类 | BadgeComponent |
| 角标/水印 | CornerComponent |
| 占位图包装 | AggregateComponent (Image + Shock) |

### 按内容类型推荐（口播模式画面设计）

| 内容类型 | 字幕示例 | 画面设计方向 | 推荐组件组合 |
|---------|---------|-------------|-------------|
| 痛点/问题 | "样式翻车了" | 场景图、对比图（Before） | ImageComponent + BadgeComponent |
| 数据/金句 | "4步搞定" | 大字号数字 + 渐变背景 | ShockComponent（单独） |
| 步骤/流程 | "第1步：输入主题" | 步骤卡片、流程图 | CardComponent / GraphicComponent |
| 产品展示 | "AI自动生成PPT" | 产品界面截图 + 标签 | ImageComponent + BadgeComponent |
| 结论/号召 | "评论区领取" | 醒目按钮、大标题 | TitleComponent + ShockComponent |
| 场景描述 | "想象一下" | 相关场景插画 | ImageComponent（单独） |
| HOOK/开场 | "AI时代如何学习" | 大标题 + 品牌色背景 | TitleComponent + ShockComponent |
| CTA/结尾 | "关注获取更多信息" | 二维码、引导图 | ImageComponent + TitleComponent |

---

## R3 API 调用规范（硬规则）

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

## R4 customStyle 结构总规则

| 组件类型 | 顶层结构 | 必填字段 |
|------|------|------|
| TitleComponent | `{ "level{N}": { ... } }` | fontSize, fontWeight, color, lineHeight |
| TextComponent | `{ "{style}": { ... } }` | fontSize, color, lineHeight |
| ImageComponent | 直接平铺 | borderRadius, shadow, captionColor, captionFontSize |
| CardComponent | 直接平铺 | background, borderRadius, padding, titleColor, titleFontSize, titleFontWeight, descriptionColor, descriptionFontSize |
| QuoteComponent | 直接平铺 | background, borderLeft, borderRadius, padding, textColor, textFontSize, authorColor, authorFontSize, iconSize |
| BadgeComponent | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight, shadow |
| CornerComponent | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight |
| ShockComponent | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight, border, shadow |
| GraphicComponent | 直接平铺 | background, textColor, primary, accent, secondary, lineColor, borderRadius, padding, titleFontSize, itemFontSize, shadow |
| AggregateComponent | 不需要 customStyle | — |

---

## R5 正确 vs 错误写法

**✅ TitleComponent（必须有 level1 嵌套层）**：
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

---

## R6 AggregateComponent 规则

### 子组件必填字段

AggregateComponent 的 `children` 数组中，**每个子组件都是独立组件**，必须包含完整字段：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识（如 `P3-PLACEHOLDER-001-img`） |
| `type` | 组件类型 |
| `position` | `{ x, y, w, h }` |
| `content` | 内容对象 |
| `customStyle` | 样式对象（可为 `{}`，但不能省略） |

**严禁**：
- ❌ 子组件省略 `id`
- ❌ 子组件省略 `position`
- ❌ 子组件省略 `customStyle`

### 占位图方案：Picsum + Aggregate 叠水印

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
        "image": "https://picsum.photos/seed/{seed}/1280/720",
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

**Seed 命名**：`{领域}-{场景}`，英文，如 `tech-ai`、`couple-love`。

### 备选：本地 SVG 兜底

Picsum 不可达时，用 `./assets/placeholders/{light|dark}/{用途}.svg`。

SVG 自带水印，**不要**再叠 ShockComponent。

### 严禁

- ❌ ImageComponent 直接写 Picsum URL 而不套 Aggregate
- ❌ SVG 兜底时再叠 Aggregate 水印（会双水印）
- ❌ 同一视频内不同区域用相同 seed
