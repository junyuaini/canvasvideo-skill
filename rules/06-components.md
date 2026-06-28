# 组件规则

> HtmlComponent 选型、API 调用规范、HtmlComponent 使用方法。

---

## R1 API 调用规范（建议）

> ℹ️ **说明**：推荐调用 `queryComponentSpecBatch` 接口获取最新 HtmlComponent 字段规范（避免记忆偏差）。

```js
const { queryComponentSpecBatch } = require('./scripts/query-api');

const typeVariants = [
  { type: 'HtmlComponent', variant: 'default' }
];
const { specs } = await queryComponentSpecBatch(typeVariants);
// specs['HtmlComponent.default'] → 该类型的完整字段定义
```

**降级策略**：如果 API 不可用（网络失败/5xx），可使用以下本地参考 schema（与当前 API 一致）：

```js
{
  id: 'P1-001',           // 格式: P{区域号}-{三位数字}
  type: 'HtmlComponent',
  regionId: 'P1',
  start: 0, end: 5,
  position: { x: 0, y: 0, w: 780, h: 585 },
  background: { html, css },  // 必填
  content: { html, css, elementIds }
}
```

---

## R2 顶层 HtmlComponent 规则

**重要硬规则**：
- ✅ **顶层只使用 `HtmlComponent`**
- ✅ HtmlComponent 不需要 customStyle，通过 `content.css` 控制样式
- ✅ 必须配置 position（至少包含 w 和 h）

### R2.1 顶层 HtmlComponent Schema

```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0a1530 0%, #1a1a40 50%, #0f0f2a 100%); }"
  },
  "content": {
    "html": "<div id='P1-002' class='stage'>...</div>",
    "css": ".stage { position: absolute; inset: 0; ... }",
    "elementIds": {
      "#P1-002": { "id": "P1-002", "start": 0, "end": 5 }
    }
  },
  "start": 0,
  "end": 5
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | HtmlComponent 唯一标识，格式 `P{区域号}-{三位数字}`（如 `P1-001`） |
| regionId | string | ✅ | 所属区域 ID，必须存在于 `regions[]` 中 |
| type | string | ✅ | 固定为 `"HtmlComponent"` |
| position | object | ✅ | { x, y, w, h }，区域内相对坐标 |
| content | object | ✅ | { html, css, elementIds } |
| content.html | string | ✅ | HTML 字符串，可包含任意 HTML/CSS 语法 |
| content.css | string | ✅ | CSS 字符串，自动限定在 HtmlComponent 作用域 |
| background | object | ✅ | HtmlComponent 的两个基本属性之一（另一个是 content）。{ html, css }：背景 HTML/CSS，建议 position:absolute + inset:0 填满 video-frame |
| background.html | string | ✅ | 背景 HTML 片段。一般是单个根 div |
| background.css | string | ✅ | 背景 CSS 样式 |
| content.elementIds | object | ✅ | 内部元素时间线，key 为 `#ID` 形式 |
| start | number | ✅ | 出现时间（秒） |
| end | number | ✅ | 消失时间（秒） |

### R2.2 完整示例

```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0a1530 0%, #1a1a40 50%, #0f0f2a 100%); }"
  },
  "content": {
    "html": "<div id='P1-002' class='stage'><div id='P1-003' class='title'>标题</div><div id='P1-004' class='subtitle'>副标题</div></div>",
    "css": ".stage { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } .title { font-size: 48px; font-weight: 900; color: #fff; } .subtitle { font-size: 20px; color: #ccc; }",
    "elementIds": {
      "#P1-002": { "id": "P1-002", "start": 0,   "end": 5 },
      "#P1-003": { "id": "P1-003", "start": 0.3, "end": 5 },
      "#P1-004": { "id": "P1-004", "start": 1.0, "end": 5 }
    }
  },
  "start": 0,
  "end": 5
}
```

---

## R3 HtmlComponent 必须 background（硬规则）

**所有 HtmlComponent 必须携带 background 字段**（与 content 平级），作为组件底色/氛围背景：
- ackground.html 必填、字符串、非空（一般是单个根 <div>，可嵌套 SVG/渐变/装饰）
- ackground.css 必填、字符串、非空（建议 position: absolute; inset: 0; 让背景填满 video-frame）
- 非 HtmlComponent（如 AggregateComponent）不强制
- **校验**：selfcheck.js 在本地会拦、projectValidator.collectErrors 在上传时会 400 拒绝

> 💡 为什么 background 放在组件上而不是 region 上？跟 `content` 一套写法，每个 HtmlComponent 自带底色，区域切换时由前端 `renderRegionBackground` 接管背景层，组件内部背景与组件层互不干扰。

## R4 HtmlComponent elementIds 规则

`content.elementIds` 为对象，**key 必须是 `#ID` 形式**（`#` 后跟元素 ID），value 是 `{ id, subtitles | time_range }` 对象：

**口播模式**（绑字幕）：
```json
"elementIds": {
  "#P1-002": { "id": "P1-002", "subtitles": [11, 14] },
  "#P1-003": { "id": "P1-003", "subtitles": [11] }
}
```

**创作模式**（time_range 相对 region 起点）：
```json
"elementIds": {
  "#P1-002": { "id": "P1-002", "time_range": [0, 5] },
  "#P1-003": { "id": "P1-003", "time_range": [0.3, 5] }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | ✅ | 必须是 `#ID` 形式（如 `#P1-002`） |
| id | string | ✅ | 元素唯一标识，必须等于 `key.slice(1)`；格式 `P{区域编号}-{三位数字}`，与顶层 HtmlComponent ID 同池且全局唯一 |
| subtitles | Array<number> | 口播 ✅ | 绑字幕范围（merge 查 SRT 自动算 start/end） |
| time_range | [number, number] | 创作 ✅ | 相对 region 起点的局部时间（merge 转全局 start/end） |

**merge 自动填充**（输出到 project.json 时）：
- `element.start` = subtitles 第一字幕 start 或 time_range[0] + region.startTime
- `element.end` = subtitles 最后字幕 end 或 time_range[1] + region.startTime

**优先级**：subtitles > time_range > 旧 start/end（兼容）> 报错

**关键约束**：
- ✅ HTML 字符串里必须有对应的 `id` 属性（如 `<div id="P1-002">`），否则时间线不生效
- ✅ 元素时间范围必须落在所属 HtmlComponent 时间范围内（`component.start ≤ element.start && element.end ≤ component.end`）
- ✅ `0 ≤ element.start ≤ element.end`
- ✅ 口播模式：subtitles 范围必须在所属 region 字幕范围内
- ✅ 创作模式：time_range 必须在 `[0, region.duration]` 范围内

**作用**：
1. 按 ↑ 键显示元素 ID 标签，方便定位和修改
2. 每个 HTML 子元素可独立控制出现/消失时间

---

## R5 HtmlComponent 清单

| 名称 | 类型 | 变种 | 简介 | 典型场景 |
|---------|------|------|------|---------|
| HtmlComponent | 自定义 | 1 | 通过 `content.html` + `content.css` 自由渲染任意内容 | 所有布局（自定义 / 单点聚焦 / 分栏 / 卡片 / 图形 / 金句胶囊 等） |

> **HtmlComponent 是当前唯一可用的类型**。所有视觉模式（标题 / 正文 / 卡片 / 图表 / 金句胶囊 等）都用 HTML/CSS 自写。

---

## R6 布局 → 实现建议

| 布局 | 实现方式 | 说明 |
|------|---------|------|
| 自定义布局 | HtmlComponent | HTML/CSS 完全自由，通过 elementIds 控制元素时间线 |
| 单点聚焦 | HtmlComponent | 大字金句，全屏居中 |
| 左右分栏 | HtmlComponent | CSS flex/grid 实现分栏 |
| 上下分层 | HtmlComponent | CSS flex 实现上下排列 |
| 多列并排 | HtmlComponent | CSS grid 实现多列 |
| 全屏沉浸 | HtmlComponent | 背景图+叠加标题 |
| 时间轴 | HtmlComponent | CSS 绘制时间线 |
| 卡片（图+文） | HtmlComponent | `<div class="card"><img/><p></p></div>` + CSS |
| 图形图表 | HtmlComponent | SVG / Canvas / 纯 CSS 图形 |
| 金句胶囊 | HtmlComponent | 带边框/背景的 `<div>`，CSS 动画 |

> **所有布局都用 HtmlComponent 实现**。

---

## R7 占位图使用规范

> 本节为 [templates/placeholders/README.md](../../templates/placeholders/README.md) 的具体写法补充，详细说明占位图在 HtmlComponent 中的两种接入方式。

### R7.1 Picsum 在线图（推荐，AI 自动生成场景）

**URL 范式**（必须用 seed，**严禁不写 seed**，否则每次刷新换图，元素 start/end 失去意义）：

```
https://picsum.photos/seed/{seed}/{width}/{height}
```

- `seed` 用文案/语义关键词（如 `ai-learning`、`tech-cover`），同一概念全程固定一个 seed
- `width` / `height` 与 `position.w` / `position.h` 一致

**CSS 水印**（必备，标明"AI 占位图"语义，避免被误认为真实素材）：

```html
<div id="P1-002" class="cover">
  <img class="cover__img" src="https://picsum.photos/seed/ai-learning/780/400" />
  <span class="cover__watermark">我是占位图 · 赶紧换我</span>
</div>
```

```css
.cover { position: relative; width: 780px; height: 400px; overflow: hidden; border-radius: 12px; }
.cover__img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.7); }
.cover__watermark {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  padding: 8px 16px; border-radius: 6px;
  font-size: 14px; font-weight: 600; color: #FFFFFF;
  background: rgba(0, 0, 0, 0.45);
  letter-spacing: 0.1em;
}
```

### R7.2 本地 SVG 兜底（用户未提供素材、AI 离线生成场景）

`templates/placeholders/{light|dark}/` 下 7 张标准 SVG，自带水印（与 scaffold.js 复制规则一致）：

| 用途 | hint 关键词 |
|------|------------|
| HOOK | `hook` |
| SCENE | `scene` |
| PAIN | `pain` |
| SOLVE | `solve` |
| RESULT | `result` |
| CTA | `cta` |
| 通用 | `generic` |

**HtmlComponent 中引用**（路径相对 workdir 根，由 `scripts/scaffold.js` 自动复制到 `assets/placeholders/{theme}/`）：

```html
<img id="P2-003" class="cover" src="./assets/placeholders/dark/scene.svg" />
```

> ⚠️ **路径里的 `{theme}` 必须与 skeleton.json 的 `theme` 字段一致**（`white` → `light/`、`black` → `dark/`）。Scaffold 脚本会按 theme 自动复制对应子目录。

### R7.3 状态选择规则

| 素材来源 | project.json 写法 |
|---------|-----------------|
| 用户已提供真实图 | `<img src="./assets/images/{file}">`（真实路径，无水印） |
| AI 自动生成（在线） | Picsum URL + CSS 水印（R7.1） |
| AI 自动生成（离线 / fallback） | 本地 SVG 占位图（R7.2，自带水印） |
| 待用户提供 | 用占位图，备注列写"用户提供后替换" |

**素材清单实现率必须 = 100%**——每个 `<img>` / 占位图位置必须有一种来源，不允许"裸空"。

### R7.4 校验清单

- [E] `<img>` 必须有 `id` 属性，元素 ID 出现在 `content.elementIds`
- [E] Picsum URL 必须含 `seed` 参数
- [E] 占位图必须有水印（Picsum 走 CSS 水印 / 本地 SVG 自带水印）
- [W] `<img>` 的尺寸与 `position` 协调（避免拉伸变形）
