# 步骤5：生成区域JSON

> 前置步骤：[步骤4：区域设计](04-region-design-creative.md)
> 下一步：[步骤6：合并](06-merge.md) 或继续下一个区域

---

## 目标

从 `design-P{n}.md` 生成 `regions/P{n}.json`。

---

## 输入

| 来源 | 说明 |
|------|------|
| 上一步产出 | `design-P{n}.md` |
| 骨架配置 | `skeleton.json`（获取 viewport、theme） |
| 引用规则 | `rules/06-components.md` |

---

## 操作

### 第 1 步：读取设计文档

```js
const designPath = path.join(workdirRoot, skillProjectId, `design-${regionName}.md`);
const designContent = fs.readFileSync(designPath, 'utf-8');
```

### 第 2 步：查询组件规范（硬规则）

**必须先调 API**：

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

> ⚠️ **严禁凭记忆填写 customStyle 字段！** 必须用 API 返回的 key。
> API 调不通时（网络失败 / 5xx）**必须停下**，不允许凭记忆硬写。
> 详见 `rules/06-components.md` §R1。

### 第 3 步：生成组件

从设计文档提取组件信息，生成 JSON：

#### 3.1 基础字段

| 字段 | 来源 | 示例 |
|------|------|------|
| `id` | 组件清单 | "P1-001" （格式：P{区域号}-{三位数字}，如 P1-001、P3-005） |
| `type` | 组件清单 | "TitleComponent" |
| `content` | 组件清单 | `{ "text": "...", "level": 1 }` |
| `position` | 组件清单 | `{ "x": 20, "y": 30, "w": 740, "h": 70 }` |
| `customStyle` | 步骤 6（API 字段） | `{ "level1": { ... } }` |
| `start` | 时间轴 | 0 |
| `end` | 时间轴 | 5 |

#### 3.2 customStyle 结构总规则

**前端 `ComponentFactory._validateCustomStyle()` 对 customStyle 的格式有严格校验**：

| 组件类型 | 顶层结构 | 必填字段 |
|------|------|------|
| **TitleComponent** | `{ "level{N}": { ... } }`，N 由 `content.level` 决定 | fontSize, fontWeight, color, lineHeight |
| **TextComponent** | `{ "{style}": { ... } }`，style 由 `content.style` 决定 | fontSize, color, lineHeight |
| **ImageComponent** | 直接平铺（无嵌套） | borderRadius, shadow, captionColor, captionFontSize |
| **CardComponent** | 直接平铺 | background, borderRadius, padding, titleColor, titleFontSize, titleFontWeight, descriptionColor, descriptionFontSize |
| **QuoteComponent** | 直接平铺 | background, borderLeft, borderRadius, padding, textColor, textFontSize, authorColor, authorFontSize, iconSize |
| **BadgeComponent** | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight, shadow |
| **CornerComponent** | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight |
| **ShockComponent** | 直接平铺 | color, textColor, padding, borderRadius, fontSize, fontWeight, border, shadow |
| **GraphicComponent** | 直接平铺 | background, textColor, primary, accent, secondary, lineColor, borderRadius, padding, titleFontSize, itemFontSize, shadow |
| **AggregateComponent** | 不需要 customStyle | — |

#### 3.3 正确写法 vs 错误写法

**✅ TitleComponent（正确，必须有 level1 嵌套层）**：
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

**✅ ShockComponent（正确，直接平铺）**：
```json
{
  "id": "P1-002",
  "type": "ShockComponent",
  "content": { "text": "让AI轻松制作视频" },
  "customStyle": {
    "color": "transparent",
    "textColor": "#FFFFFF",
    "padding": "16px 32px",
    "borderRadius": "16px",
    "fontSize": "36px",
    "fontWeight": "800",
    "border": "none",
    "shadow": "0 4px 16px rgba(37,99,235,0.3)"
  }
}
```

#### 3.4 position 坐标计算

`position` 是组件**在所属区域内的相对坐标**：

```
position: { x: <区域内左上x>, y: <区域内左上y>, w: <宽度>, h: <高度> }
```

约束：
- `w` ≤ `viewport.width - 40`
- 区域内组件 `h` 总和 + 间距 ≤ `viewport.height - 20`
- 强调类组件（Shock/Badge/CTA）单独出现时应在区域内**水平居中**
- `position.w` / `position.h` 必须**显式填写**

### 第 4 步：生成字幕（仅口播模式）

```json
[
  { "start": 0, "end": 2.5, "text": "..." }
]
```

**注意**：
- BGM 模式：subtitles 为空数组 `[]`
- 配音模式：从 SRT 或设计文档提取
- 口播模式：subtitles 必须 100% 来自用户提供的 SRT，严禁 LLM 自行生成

### 第 5 步：组装区域 JSON

```js
const regionJson = {
  regionName: regionName,
  subtitles: extractedSubtitles,
  components: extractedComponents
};

fs.writeFileSync(
  path.join(workdirRoot, skillProjectId, 'regions', `${regionName}.json`),
  JSON.stringify(regionJson, null, 2)
);
```

### 第 6 步：验证时间范围

检查组件时间是否在区域时间范围内：

```js
const regionIndex = skeleton.regions.findIndex(r => r.name === regionName);
const regionStart = calculateRegionStart(skeleton, regionIndex);
const regionEnd = calculateRegionEnd(skeleton, regionIndex);

regionJson.components.forEach(comp => {
  if (comp.start < regionStart || comp.end > regionEnd) {
    throw new Error(`${comp.id} 时间 ${comp.start}-${comp.end} 超出区域范围 ${regionStart}-${regionEnd}`);
  }
});
```

### 第 7 步：区域级校验

```js
const { validate } = require('./scripts/validate');
validate(regionJson, skeleton);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| P{n}.json | `{workdir}/{skillProjectId}/regions/P{n}.json` | 区域配置 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] regionName 与文件名一致
- [E] 每个组件有完整的字段（id, type, content, position, customStyle, start, end）
- [E] `id` 格式正确（如 P1-001）
- [E] 时间轴无重叠（同一区域组件）
- [E] 组件时间在区域时间范围内
- [W] `customStyle` 已按 API 规范填写
- [W] 字幕时间与组件内容匹配（仅配音模式）
- [I] 组件总数 ≤ 5 个
- [I] 图片路径已标注（如有 ImageComponent）

---

## 下一步

- 还有区域？→ 返回 [步骤4：区域设计](04-region-design.md)
- 全部完成？→ 进入 [步骤6：合并](06-merge.md)
