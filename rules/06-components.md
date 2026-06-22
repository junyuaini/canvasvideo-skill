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

## R6 占位图规则

### 推荐方案：Picsum + Aggregate 叠水印

```json
{
  "type": "AggregateComponent",
  "children": [
    {
      "type": "ImageComponent",
      "content": {
        "image": "https://picsum.photos/seed/{seed}/1280/720",
        "fit": "cover",
        "borderRadius": 12
      }
    },
    {
      "type": "ShockComponent",
      "content": { "text": "※ 演示图片 请替换" }
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
