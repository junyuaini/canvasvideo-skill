# 项目配置使用规范

> 项目级（project.json）字段、HtmlComponent 写法、字幕/主题/图片等公共资源使用规范。
> 改组件写法、看不懂字段、不知道该用谁，**先看本文件**。
> 
> 📌 **新约定 R11（CSS keyframes + data-subtitle）**：元素动画推荐用 §R11 的写法（详见末尾章节）。R11 下 `elementIds` 字段可选，由 HTML id 自动生成。

---

## R0 项目级必填字段总览

`project.json` 顶层有必填字段，缺任一会被 selfcheck / server validate 拒：

| 字段 | 类型 | 必填 | 来源 | 说明 |
|------|------|------|------|------|
| `name` | string | ✅ | AI 设计 / skeleton 模板 | 项目名 |
| `mode` | `"dubbing"` | ✅ | 固定 | 项目模式（口播模式），必须配置配音音频+字幕 |
| `theme` | `"black" \| "white"` | ✅ | AI 决策 | 背景主题，决定 scaffold 复制 `dark/` 还是 `light/` 占位图 |
| `viewport` | `{ width, height }` | ✅ | AI 设计 | 视口尺寸（默认 780×585） |
| `subtitle` | object（6 字段） | ✅ | **R8 必填** | 字幕样式，必填 |
| `regions[]` | array | ✅ | 步骤 4 产出 | 区域列表 |
| `assets` | object | ✅ | 步骤 6 产出 | 素材清单（voice / subtitles / placeholders / images） |
| `audio` | object | ✅ | 步骤 1.5 产出 | 口播音频配置（口播模式必填） |
| `subtitles[]` | array | ✅ | SRT 解析 | 字幕内容数组（口播模式必填） |

> 老项目若缺 `subtitle`，**schema 不兼容**，上传会被拒。沿用口播项目时也不能少。

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
| content.elementIds | object | ✅ | 内部元素时间线。**禁止手写**，固定写 `{}`，merge 时自动从 HTML 的 `id` 属性生成完整对象 |
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
    "html": "<div id='P1-bg' class='region-bg' data-global='true'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0a1530 0%, #1a1a40 50%, #0f0f2a 100%); }"
  },
  "content": {
    "html": "<div id='P1-002' class='stage'><div id='P1-003' class='title' data-subtitle='1-5'>标题</div><div id='P1-004' class='subtitle' data-subtitle='1-5'>副标题</div></div>",
    "css": ".stage { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } .title { font-size: 48px; font-weight: 900; color: #fff; } .subtitle { font-size: 20px; color: #ccc; }",
    "elementIds": {}
  },
  "start": 0,
  "end": 5
}
```

---

## R3 HtmlComponent 必须 background（硬规则）

**所有 HtmlComponent 必须携带 background 字段**（与 content 平级），作为组件底色/氛围背景：
- background.html 必填、字符串、非空（一般是单个根 <div>，可嵌套 SVG/渐变/装饰）
- background.css 必填、字符串、非空（建议 position: absolute; inset: 0; 让背景填满 video-frame）
- background 必填
- **校验**：selfcheck.js 在本地会拦、projectValidator.collectErrors 在上传时会 400 拒绝

> 💡 为什么 background 放在组件上而不是 region 上？跟 `content` 一套写法，每个 HtmlComponent 自带底色，区域切换时由前端 `renderRegionBackground` 接管背景层，组件内部背景与组件层互不干扰。

---

## R4 HtmlComponent elementIds 规则

`content.elementIds` 为对象，**key 必须是 `#ID` 形式**（`#` 后跟元素 ID），value 是 `{ id, subtitles }` 对象：

```json
"elementIds": {
  "#P1-002": { "id": "P1-002", "subtitles": [11, 14] },
  "#P1-003": { "id": "P1-003", "subtitles": [11] }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | ✅ | 必须是 `#ID` 形式（如 `#P1-002`） |
| id | string | ✅ | 元素唯一标识，必须等于 `key.slice(1)`；格式 `P{区域编号}-{三位数字}`，与顶层 HtmlComponent ID 同池且全局唯一 |
| subtitles | Array<number> | 推荐 | 绑字幕范围（merge 查 SRT 自动算 start/end）。不填 = 展示整个所属 HtmlComponent |

**merge 自动填充**（输出到 project.json 时）：
- `element.start` = subtitles 第一字幕 start
- `element.end` = subtitles 最后字幕 end

> 💡 **R11 新约定下推荐省略 elementIds 字段**：详见 [§R11](06-components.md#r11-元素动画新约定css-keyframes--data-subtitle)。

**优先级**：subtitles > 旧 start/end（兼容）> fallback to parent

> 未填时一律 fallback 到父级时间窗口（与背景切换规则保持一致），不报错。

**缺省行为**（与背景切换规则保持一致）：
- `component.start` 未填 = `region.startTime`
- `component.end` 未填 = 下一 `region.startTime`（最后 region = `project.duration`）
- `element.start` 未填 = `component.start`
- `element.end` 未填 = `component.end`

**关键约束**：
- ✅ HTML 字符串里必须有对应的 `id` 属性（如 `<div id="P1-002">`），否则时间线不生效
- ✅ 元素时间范围（已设置时）必须落在所属 HtmlComponent 时间范围内（`component.start ≤ element.start && element.end ≤ component.end`）
- ✅ `0 ≤ element.start ≤ element.end`（已设置时）
- ✅ subtitles 范围必须在所属 region 字幕范围内
- ❌ `component.start / end` 和 `element.start / end` **可不填**，不填时由前端/merge 自动从父级时间窗口推算（与背景切换规则保持一致）

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

### R7.1 Picsum 在线图

**URL 范式**（必须用 seed，**严禁不写 seed**）：

```
https://picsum.photos/seed/{seed}/{width}/{height}
```

- `seed` 用文案/语义关键词，同一概念全程固定一个 seed
- `width` / `height` 与 `position.w` / `position.h` 一致

**CSS 水印**（必备）：

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

### R7.2 状态选择规则

| 素材来源 | project.json 写法 |
|---------|-----------------|
| 用户已提供真实图 | `<img src="./assets/images/{file}">`（真实路径，无水印） |
| AI 自动生成 | Picsum URL + CSS 水印（R7.1） |
| 待用户提供 | Picsum + CSS 水印，备注列写"用户提供后替换" |

**素材清单实现率必须 = 100%**——每个 `<img>` 必须有一种来源，不允许"裸空"。

### R7.3 校验清单

- [E] `<img>` 必须有 `id` 属性
- [E] Picsum URL 必须含 `seed` 参数
- [E] 占位图必须有水印（CSS 水印）
- [W] `<img>` 的尺寸与 `position` 协调

---

## R8 字幕渲染配置

`project.subtitle` 控制字幕开关和自定义渲染。字幕内容（时间轴）来自 `subtitles` 数组；字幕 UI 由本节字段决定。

### 字段结构

```json
"subtitle": {
  "enabled": true,
  "html": "<div class='subtitle-bar'><span class='subtitle-text'></span></div>",
  "css": ".subtitle-bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 24px; display: flex; justify-content: center; pointer-events: none; z-index: 200; }\n.subtitle-text { display: inline-block; padding: 4px 12px; border-radius: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 28px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.9); line-height: 1.4; }"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `enabled` | 否 | 字幕开关，默认 `true`。设为 `false` 前端不渲染字幕。 |
| `html` | 否 | 字幕容器 HTML 片段，前端注入到视口。**必须包含 `.subtitle-text` 元素**，供文字写入。 |
| `css` | 否 | 字幕 CSS，注入到页面 `<head>`。 |

### 默认行为

- `enabled` 不写默认 `true`
- `html` / `css` 不写：前端不注入，字幕不显示
- `enabled: false`：完全禁用字幕（前端不渲染）

### HTML 约定

- 必须有 `.subtitle-text` 元素，AI 写文案时不关心其内容（由前端自动写入当前时间对应的字幕文本）
- 容器用绝对定位包裹，覆盖整个视口
- `pointer-events: none` 确保字幕层不阻挡交互

### CSS 约定

- 定位写 `position: absolute; left: 0; right: 0;` 以覆盖视口
- `z-index` 足够高（如 200）确保字幕在最上层
- `.subtitle-text` 控制文字样式（字号/颜色/背景等）

### 决策权

- ✅ **AI 自己决定**（用户没指定时）：按默认模板生成
- ❌ **AI 不主动问用户**：除非用户明确说"字幕样式要 XXX"

### 校验

| 层级 | 时机 | 行为 |
|------|------|------|
| `selfcheck.js` | 本地校验 | `subtitle` 整体可选，不校验内部字段 |
| `server validate`（ajv schema） | 上传时 | 校验 `subtitle` 结构合法（enabled 为 boolean，html/css 为 string） |

---

## R11 元素动画新约定（CSS keyframes + data-subtitle / data-global）

> **新约定（强制）**：AI 不再手填 `elementIds`，改用 CSS keyframes + `data-subtitle` / `data-global` 控制元素出现时机和动画效果。`content.elementIds` 固定写 `{}`，merge 时由 `transformHtmlComponent` 自动从 HTML 的 `id` 属性生成。

### R11.1 核心原则

| 维度 | 旧约定（R4） | 新约定（R11） |
|------|-------------|---------------|
| 时间字段 | `elementIds["#X"].start/end` 数字 | `data-subtitle="3"` 字幕 ID 或 `data-global="true"` |
| 出现/消失 | JS `display: none/block` 闪现 | CSS `animation` 自带过渡 |
| AI 要学什么 | 嵌套对象 + 时间数学 | 写 HTML 标签 + CSS keyframes |

### R11.2 HTML 写法（四种）

```html
<!-- 1. 区域全局（装饰/背景）：跟随 region 全生命周期，前端用 region 边界兜底 -->
<div id='P1-016' class='corner-deco' data-global='true'></div>

<!-- 2. 单条字幕：出现=字幕3.start，消失=字幕3.end -->
<div id='P1-001-title' class='title' data-subtitle='3'>标题</div>

<!-- 3. 范围字幕：出现=字幕3.start，消失=字幕5.end -->
<div id='P1-001-title' class='title' data-subtitle='3-5'>标题</div>

<!-- 4. 多选字幕（断续）：字幕3段显示，字幕4段隐藏，字幕5段再显示 -->
<div id='P1-001-badge' class='badge' data-subtitle='3,5'>徽章</div>
```

### R11.3 省略规则（merge 脚本自动生效）

| 条件 | 结果 |
|------|------|
| 元素首字幕 == region 首字幕 | 自动**省略** start |
| 元素末字幕 == region 末字幕 | 自动**省略** end |
| 两者都成立 | 只写 id，无 start/end（等同于 data-global 效果） |

### R11.4 两步校验（merge 脚本 6.3 节自动执行）

**第一步：有 class 必有 id**
- 有 `class` 属性的元素必须也有 `id`
- SVG 内部图形原子豁免：`circle/path/line/rect/polygon/polyline/ellipse/g/text/tspan/use/image/defs/linearGradient/radialGradient/stop/animate/animateTransform/animateMotion`
- **`background.html` 中的元素也适用此规则**：即使背景元素不需要动画，也必须写 `id` 和归属属性

**第二步：有 id 必有归属属性**
- 有 `id` 的元素必须写 `data-subtitle` 或 `data-global="true"`（二选一，互斥）
- **背景元素统一用 `data-global="true"`**：背景层跟随 region 全生命周期

```html
<!-- 错：class 无 id -->
<div class='clock-num'>12</div>

<!-- 错：id 无归属属性 -->
<div id='P1-002'>元素</div>

<!-- 错：同时写了两个归属属性（互斥） -->
<div id='P1-002' class='card' data-subtitle='5' data-global='true'>元素</div>
```

### R11.5 CSS 动画写法

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.title {
  animation: fade-in 0.5s ease-out forwards;
}
```

**关键约束**：
- ✅ 必须用 `forwards` — 否则动画跑完元素回到初始态（opacity: 0）不可见
- ✅ delay 不需要写 — merge 脚本自动根据 `data-subtitle` 注入 `animation-delay`
- ✅ duration 写元素本身 — 0.3s~0.8s 是常见值
- ❌ CSS 用 id 选择器 — 受 @scope 影响会失效，用 class

### R11.6 elementIds 字段

- **禁止手写 elementIds**：固定写 `"elementIds": {}`，merge 时由 `transformHtmlComponent` 自动从 HTML 的 `id` 属性生成
- 旧 elementIds（带 start/end 数字）**仍兼容**，前端自动降级到 `_legacyUpdateElementVisibility`

### R11.7 与旧约定的兼容

| 旧项目状态 | 前端行为 |
|-----------|---------|
| elementIds 缺失 + HTML 有 id + data-subtitle | 新约定：CSS animation 播放，时间由 data-subtitle 驱动 |
| elementIds 缺失 + HTML 有 id + data-global | 新约定：CSS animation 播放，时间跟随 region 全生命周期 |
| elementIds 缺失 + HTML 无 id | 全部元素都显示，无动画 |
| elementIds 有 start/end + HTML 有 id | 优先 CSS animation（新） |
| elementIds 有 start/end + HTML 无 id | 旧约定：JS display 控制 |

### R11.8 完整示例

```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: #0a0a0f; }"
  },
  "content": {
    "html": "<div id='P1-002' class='frame' data-subtitle='3-5'><div class='frame-title'>核心观点</div></div><div id='P1-003' class='title' data-subtitle='3'>Skill 是什么</div><div id='P1-004' class='desc' data-subtitle='4'>它的核心定义与作用</div><div id='P1-005' class='badge' data-subtitle='5'>重要</div>",
    "css": "@keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes slide-in { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } } @keyframes scale-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } } .region-bg { animation: fade-in 0.5s ease-out forwards; } .frame { animation: fade-in 0.5s ease-out forwards; } .title { animation: fade-in 0.5s ease-out forwards; } .desc { animation: slide-in 0.4s ease-out forwards; } .badge { animation: scale-pop 0.4s ease-out forwards; }"
  }
}
```

### R11.9 校验规则

selfcheck 会校验：
1. 每个有 `id` 的元素必须格式 `P{数字}-{三位数字}`
2. `data-subtitle` 引用的字幕 ID 必须存在
3. `data-subtitle` 多选/范围必须合法
4. CSS 中引用的 keyframes 必须有 `@keyframes` 定义
5. `animation` 简写建议带 `forwards`
6. 两步校验：有 class 必有 id；有 id 必有 data-subtitle 或 data-global（merge 脚本自动执行）
