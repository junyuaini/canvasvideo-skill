# 项目配置使用规范

> 项目级（project.json）字段、HtmlComponent 写法、字幕/主题/图片等公共资源使用规范。
> 改组件写法、看不懂字段、不知道该用谁，**先看本文件**。
> 
> 📌 **新约定 R12（data-cv-anim 动画模板）**：元素动画用 `data-cv-anim` 属性选择前端内置动画模板，**不要写 @keyframes / animation CSS**。R11 旧约定已废弃。

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
- background.html 必填、字符串、非空（一般是单个根 `<div>`，可嵌套 SVG/渐变/装饰）
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

> 💡 **R12 新约定下推荐省略 elementIds 字段**：详见 [§R12](06-components.md#r12-动画模板)。

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

## R12 元素动效（当前方案：禁用）

> **2026-07 临时方案**——**所有动效已禁用**。HEAD 前端只通过 `opacity` 控制显隐时机，不写 transform，不解析 keyframes，不放行 CSS 原生 `animation`。
>
> 原因：HEAD 写 `el.style.transform` 会覆盖 CSS class 的 `transform: translate(-50%, -50%)` 居中；CSS 原生 `animation` 也会覆盖居中。两层冲突导致布局错乱。
>
> **样式和布局 100% 保留**——CSS class 自身的 transform 居中、color、font-size、box-shadow 等都正常工作。
>
> **视觉效果**——元素按时出现/消失（硬切，无过渡）。没有飞入、淡入、闪烁、发光、弹跳、旋转、缩放等任何动画。

### R12.1 元素必须配合的属性

| 属性 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 元素唯一标识（`P{区域}-{编号}` 格式），HEAD 通过 id 找到 DOM |
| `data-subtitle` | ✅ | 引用字幕序号（`"3"` 或 `"1-3"`），决定元素显示的字幕时间窗 |
| `data-global` | ❌ | 设为 `"true"` 表示跟随 region 全生命周期（不绑字幕） |

**居中靠 CSS class 自身**（必须）：

```css
.main-title {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translate(-50%, -50%);  /* 必须：HEAD 不动 transform */
  font-size: 42px;
  color: white;
}
```

### R12.2 HTML 写法

```html
<!-- 时间维度：显示在第 2 句字幕期间 -->
<div id='P1-005' class='main-title' data-subtitle='2'>A股上半年收官</div>

<!-- 时间维度：显示在第 1-2 句字幕期间 -->
<div id='P1-004' class='date-badge' data-subtitle='1-2'>2024-06-30</div>

<!-- 全局元素：跟随 region 全生命周期 -->
<div id='P1-007' class='corner-tl' data-global='true'></div>
```

### R12.3 禁止写法（必须遵守）

- ❌ **不要写 `@keyframes`** —— 前端强制 `animation: none !important`，无效
- ❌ **不要写 `animation: fade-in ...` / `transition: opacity ...`** —— 全部被禁掉
- ❌ **不要写 `data-cv-anim="fade-in-up"` 等旧动画属性** —— HEAD 不解析（接口已移除）
- ❌ **不要在 elementIds.animations 的 keyframes 里写 transform** —— HEAD 不写 transform，写了也不生效
- ❌ **不要给 background.html 里的元素配 id** —— 背景元素由 CSS class 控制，HEAD 不会管它；带 id 会被强制禁动画（CSS 选择器 `[id]` 误伤）。selfcheck.js 会报错。
- ✅ **可以写**静态视觉样式：`color`、`font-size`、`box-shadow`（静态值）、`background`、`border` 等

### R12.4 背景 vs 内容 区分规则

| 维度 | background.html | content.html |
|------|-----------------|--------------|
| 元素加 `id` | ❌ **禁止**（会被禁动画） | ✅ **必须**（HEAD 管控） |
| 元素配 `data-subtitle` | ❌ 无意义（HEAD 不扫描） | ✅ 必须/可选 |
| 元素配 `data-global` | ❌ 无意义 | ✅ 可选 |
| CSS animation / @keyframes | ✅ **正常生效**（无 id 自动豁免） | ❌ 被禁（带 id） |
| 受 HEAD 时间线控制 | ❌ 否 | ✅ 是 |

### R12.7 标准 CSS 居中（W3C 规范）

> **参考**：https://developer.mozilla.org/en-US/docs/Web/CSS/transform
> https://css-tricks.com/centering-css-complete-guide/

`top: 50%; left: 50%` 只把"元素左上角"放在 50%，不是"元素中心"在 50%。

```css
/* ❌ 错误：缺 transform，居中失效 */
.box { position: absolute; top: 50%; left: 50%; }

/* ✅ 正确：加 translate(-50%, -50%) */
.box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
```

### R12.8 显隐时间与字幕的关系

- `data-subtitle="3"` → 字幕 3 的时间区间 [t3_start, t3_end]
- 元素在 `t3_start` 时刻 opacity 0→1 出现
- 元素在 `t3_end` 时刻 opacity 1→0 消失
- 切换是**硬切**（无过渡），靠 HEAD 每帧根据 currentTime 重算
- `data-global="true"` → 跟随 region 全生命周期（region 开始→结束都显示）

### R12.9 完整示例

```json
{
  "id": "P1-001",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='bg'></div>",
    "css": ".bg { position: absolute; inset: 0; background: #0a0a1a; }"
  },
  "content": {
    "html": "<div id='P1-002' class='date-badge' data-subtitle='2'>06·30</div><div id='P1-003' class='main-title' data-subtitle='2-3'>A股上半年收官</div><div id='P1-004' class='title-glow' data-subtitle='2-3'>光晕</div>",
    "css": ".date-badge { position: absolute; top: 8%; left: 50%; transform: translate(-50%, -50%); font-size: 72px; color: gold; } .main-title { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 42px; color: white; } .title-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; height: 80px; border: 2px solid gold; border-radius: 40px; }"
  }
}
```

---

## R13 校验规则

### 校验内容

| 校验项 | 错误时行为 | 说明 |
|---|---|---|
| HTML 结构合法 | 报错 | 标签闭合、id 唯一 |
| `data-subtitle` 引用字幕存在 | 报错 | 字幕 ID 必须在 subtitles 数组里 |
| `data-cv-anim` 值在白名单内 | 警告（静默忽略） | 不在白名单 = 无动画，不报错 |
| `data-cv-anim-duration` 格式合法 | 警告 | 格式：`0.3s` / `300ms` |

### AI 学习成本（仅 4 条）

1. ✅ `transform: translate(-50%, -50%)` 居中（标准 CSS）
2. ✅ 动画用 `data-cv-anim="模板名"`
3. ✅ 时间用 `data-subtitle="字幕ID"`
4. ❌ 不写 `@keyframes`
5. ❌ 不写 `animation:`

---

## R11 旧约定（已废弃）

> ⚠️ **R11 CSS keyframes 写法已废弃**——请改用 R12 的 `data-cv-anim` 动画模板。

旧约定（R11）的 `@keyframes` + `animation:` 写法前端不再支持。旧 project.json 中的 `@keyframes` 全部失效，`animation:` 全部被强制禁掉。

旧项目迁移：把 `animation: xxx` 删掉，在对应元素上加 `data-cv-anim="模板名"`。