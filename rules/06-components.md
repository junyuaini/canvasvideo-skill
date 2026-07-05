# 项目配置使用规范

> 项目级（project.json）字段、HtmlComponent 写法、字幕/主题/图片等公共资源使用规范。
> 改组件写法、看不懂字段、不知道该用谁，**先看本文件**。
> 
> 📌 **新约定 R12（2026-07-更新）**：AI 写标准 CSS（`@keyframes` + `animation` + `transition` + `transform` 等全部 CSS 能力），merge 只校验居中修正（R14），前端**只通过 `display` 控制显隐时机**（不解析 CSS animation，CSS 动画由浏览器原生执行）。R11 旧约定已废弃。

---

## R0 项目级必填字段总览

`project.json` 顶层有必填字段，缺任一会被 selfcheck / server validate 拒：

| 字段 | 类型 | 必填 | 来源 | 说明 |
|------|------|------|------|------|
| `name` | string | ✅ | AI 设计 / skeleton 模板 | 项目名 |
| `mode` | `"dubbing"` | ✅ | 固定 | 项目模式（口播模式），必须配置配音音频+字幕 |
| `theme` | `"black" \| "white"` | ✅ | AI 决策 | 背景主题，决定 scaffold 复制 `dark/` 还是 `light/` 占位图 |
| `viewport` | `{ width, height }` | ✅ | AI 设计 | 视口尺寸（默认 780×585） |
| `subtitle` | object（3 字段：`enabled` / `html` / `css`） | ✅ | **R8 必填** | 字幕样式，必填 |
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
  "id": "P1-099",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0a1530 0%, #1a1a40 50%, #0f0f2a 100%); }"
  },
  "content": {
    "html": "<div class='stage' data-subtitle='1-5'>...</div>",
    "css": ".stage { position: absolute; inset: 0; ... }"
  },
  "start": 0,
  "end": 5
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | HtmlComponent 唯一标识，格式 `P{区域号}-{三位数字}`（如 `P1-001` ~ `P1-099` 留给组件本身） |
| regionId | string | ✅ | 所属区域 ID，必须存在于 `regions[]` 中 |
| type | string | ✅ | 固定为 `"HtmlComponent"` |
| position | object | ✅ | { x, y, w, h }，区域内相对坐标 |
| content | object | ✅ | { html, css }（elementIds 由 merge 自动生成） |
| content.html | string | ✅ | HTML 字符串，**不带 id**，merge 自动给 class 元素分配 |
| content.css | string | ✅ | CSS 字符串，自动限定在 HtmlComponent 作用域 |
| background | object | ✅ | HtmlComponent 的两个基本属性之一（另一个是 content）。{ html, css }：背景 HTML/CSS，**元素不许带 id**，建议 position:absolute + inset:0 填满 video-frame |
| background.html | string | ✅ | 背景 HTML 片段。一般是单个根 div |
| background.css | string | ✅ | 背景 CSS 样式 |
| start | number | ✅ | 出现时间（秒） |
| end | number | ✅ | 消失时间（秒） |

> 💡 **AI 不写 `content.elementIds` 也不写 `data-global`**：merge 会从 HTML 的 `class` 元素自动分配 id（从 `P{区}-100` 起），并自动补全缺失的 `data-global="true"`。AI 只写 class + `data-subtitle` 即可（详见 §R15）。

### R2.2 完整示例

```json
{
  "id": "P1-099",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0a1530 0%, #1a1a40 50%, #0f0f2a 100%); }"
  },
  "content": {
    "html": "<div class='stage' data-subtitle='1'><div class='title'>标题</div><div class='subtitle'>副标题</div></div>",
    "css": ".stage { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } .title { font-size: 48px; font-weight: 900; color: #fff; } .subtitle { font-size: 20px; color: #ccc; }"
  },
  "start": 0,
  "end": 5
}
```

> 上面示例中，merge 会自动分配：
> - `stage` → `P1-100`（data-subtitle 1-5，start/end 从 SRT 取）
> - `title` → `P1-101`（嵌套豁免？不，title 在 stage 内，按"嵌套父是 data-subtitle → 子继承时间"规则，title 不分配 id）
> - 等等，title 在 stage（data-subtitle）内，按规则 title 嵌套豁免不分配 id
>
> 修正：上面的写法下，最终 elementIds 只有 `{"#P1-100": { id: "P1-100", start: ..., end: ... }}`（title 和 subtitle 继承 stage 的时间控制）

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

> ⚠️ **2026-07 新约定**：AI **不写** `content.elementIds` 字段，全部由 merge 自动从 HTML 的 `class` 元素生成。
>
> **自动 id 分配规则**：
> - 起始编号：`P{区域}-100`（避开顶级组件 `P{区域}-001` ~ `P{区域}-099`）
> - 分配顺序：按 HTML 中 class 元素出现顺序
> - 同 class 多个元素：每个分配不同 id（如 `P1-100, P1-101, P1-102...`）
> - 嵌套子元素豁免：父元素已声明 `data-subtitle` / `data-global` 时，子元素继承时间控制，不分配 id
> - background 元素：不参与分配（background 元素本来就不许带 id）
>
> **AI 写法**：直接写 class + `data-subtitle` / `data-global`，不写 id、不写 elementIds：
>
> ```html
> <div class='title' data-subtitle='1-5'>标题</div>
> ```
>
> merge 之后会注入 id 并生成：
>
> ```json
> "elementIds": {
>   "#P1-100": { "id": "P1-100", "start": <srt 1 start>, "end": <srt 5 end> }
> }
> ```

### R4.1 elementIds 自动生成字段

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| key | string | 自动 | `#ID` 形式，与 HTML 注入的 id 一致 |
| id | string | 自动 | 元素 id（与 key 去掉 `#` 一致） |
| start | number | 自动 | 元素起始时间（从 `data-subtitle` 解析 SRT 推算） |
| end | number | 自动 | 元素结束时间（固定为区域 endTime，新规 2026-07） |

`data-global="true"` 元素：无 start/end（前端用 region 边界兜底）。

### R4.2 校验规则

- ❌ AI 写 `id` 属性 → 报错
- ❌ AI 写 `content.elementIds` 字段 → 静默忽略（merge 会用自动生成结果覆盖）
- ❌ 顶级 class 元素无 `data-subtitle` 也无 `data-global` → 报错
- ✅ AI 写 class + `data-subtitle` / `data-global` → merge 自动分配 id

### R4.3 缺省行为

- 元素 `start` / `end` 由 `data-subtitle` 决定
- 元素时间窗 = SRT 字幕时间窗（绝对时间，前端按 SRT 同步）
- `data-global="true"` 元素 = 跟随 region 全生命周期

### R4.4 层级约束

- ✅ 元素时间 ⊂ 组件时间 ⊂ region 时间
- ✅ 所有 id（组件 + 元素）全局唯一，格式 `P{区域}-{三位数字}`
- ✅ merge 自动分配后保证唯一性

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

- [E] Picsum URL 必须含 `seed` 参数
- [E] 占位图必须有水印（CSS 水印）
- [W] `<img>` 的尺寸与 `position` 协调
- ℹ️ `<img>` 不需要 `id` 属性，merge 自动给有 class 的 `<img>` 分配；无 class 的 `<img>` 是装饰元素，merge 不动

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

## R12 元素动效（AI 写 CSS，merge 严格校验）

> **2026-07 更新**：AI 写标准 CSS（`@keyframes` + `animation` + `transition` + `transform` 等全部 CSS 能力）。前端**只通过 `display` 控制显隐时机**，CSS @keyframes / transition / animation **由浏览器原生执行**，可任意使用 transform / filter / clip-path / cubic-bezier 等全部 CSS 能力。
>
> 旧 R12"禁用动效"版已更新。R11 旧约定已废弃。

### R12.1 元素必填属性

| 属性 | 必填 | 说明 |
|---|---|---|
| `class` | ✅ | CSS 选择器，HEAD 通过 class 找 DOM |
| `data-subtitle` | ✅ | 引用字幕序号（`"3"`，单字幕 ID），决定元素起始时间；end 固定为区域 endTime |
| `data-global` | ❌ | 设为 `"true"` 表示跟随 region 全生命周期（不绑字幕），与 `data-subtitle` 互斥 |
| `id` | ❌ | **AI 不写**，merge 自动分配（`P{区}-100` 起按 HTML 出现顺序） |

**居中靠 CSS class 自身**（必须，否则 merge 报错）：

```css
.main-title {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translate(-50%, -50%);  /* 标准 CSS 居中 */
  font-size: 42px;
  color: white;
}
```

### R12.2 HTML 写法

```html
<!-- 时间维度：显示在第 2 句字幕期间 -->
<div class='main-title' data-subtitle='2'>A股上半年收官</div>

<!-- 时间维度：起始于字幕 1，结束于区域 endTime -->
<div class='date-badge' data-subtitle='1'>2024-06-30</div>

<!-- 全局元素：跟随 region 全生命周期 -->
<div class='corner-tl' data-global='true'></div>
```

merge 后 id 注入到 HTML 标签上（merge 唯一允许的 HTML 改动）：

```html
<div id='P1-100' class='main-title' data-subtitle='2'>A股上半年收官</div>
<div id='P1-101' class='date-badge' data-subtitle='1'>2024-06-30</div>
<div id='P1-102' class='corner-tl' data-global='true'></div>
```

### R12.3 CSS 写法

**AI 可以写**（merge 校验通过 + 前端浏览器原生执行，CSS animation 100% 生效）：

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.main-title {
  animation: fade-in 0.5s ease-out forwards;
}
```

**merge 校验严格化**（auto-fix → fail-fast）：

| 校验项 | 错误时行为 |
|---|---|
| 居中元素（`position: absolute` + 50%）缺 `transform: translate(-50%, -50%)` | 报错 |
| `animation-delay` + `opacity: 0` 共用 | 报错 |

> ❌ **不要写 `data-cv-anim="fade-in-up"` 等旧动画属性** —— 已废弃（2026-07），HEAD 不解析。

### R12.4 显隐时间与字幕的关系

- `data-subtitle="3"` → 元素起始时间 = 字幕 3 的 `start`；结束时间 = **区域 endTime**（新规 2026-07）
- 元素在 `t3_start` 时刻 opacity 0→1 出现
- 元素在 `region.endTime` 时刻 opacity 1→0 消失
- 切换是**硬切**（无过渡），靠 HEAD 每帧根据 currentTime 重算
- `data-global="true"` → 跟随 region 全生命周期（region 开始→结束都显示）

### R12.5 背景 vs 内容 区分规则

| 维度 | background.html | content.html |
|------|-----------------|--------------|
| 元素加 `id` | ❌ **禁止**（merge 校验会报错） | ⚠️ **AI 不写**，merge 自动注入 |
| 元素配 `data-subtitle` | ❌ 无意义（merge 不扫描 background） | ✅ 推荐 |
| 元素配 `data-global` | ❌ 无意义 | ✅ 可选 |
| CSS animation / @keyframes | ✅ **正常生效**（浏览器原生执行） | ✅ **正常生效**（浏览器原生执行） |
| 受 HEAD 时间线控制 | ❌ 否 | ✅ 是（通过 elementIds 同步） |

### R12.6 居中（W3C 规范）

> **参考**：https://developer.mozilla.org/en-US/docs/Web/CSS/transform
> https://css-tricks.com/centering-css-complete-guide/

`top: 50%; left: 50%` 只把"元素左上角"放在 50%，不是"元素中心"在 50%。

```css
/* ❌ 错误：缺 transform，居中失效（merge 报错） */
.box { position: absolute; top: 50%; left: 50%; }

/* ✅ 正确：加 translate(-50%, -50%) */
.box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
```

### R12.7 完整示例

```json
{
  "id": "P1-099",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "background": {
    "html": "<div class='bg'></div>",
    "css": ".bg { position: absolute; inset: 0; background: #0a0a1a; }"
  },
  "content": {
    "html": "<div class='date-badge' data-subtitle='2'>06·30</div><div class='main-title' data-subtitle='2'>A股上半年收官</div><div class='title-glow' data-subtitle='2'>光晕</div>",
    "css": "@keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .date-badge { position: absolute; top: 8%; left: 50%; transform: translate(-50%, -50%); font-size: 72px; color: gold; animation: fade-in 0.5s ease-out forwards; } .main-title { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 42px; color: white; animation: fade-in 0.5s ease-out forwards; } .title-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; height: 80px; border: 2px solid gold; border-radius: 40px; }"
  }
}
```

> merge 后会自动给 3 个 class 元素分配 id：`date-badge` → `P1-100`，`main-title` → `P1-101`，`title-glow` → `P1-102`。

---

## R13 校验规则

### 校验内容

| 校验项 | 错误时行为 | 说明 |
|---|---|---|
| HTML 结构合法 | 报错 | 标签闭合 |
| `data-subtitle` 引用字幕存在 | 报错 | 字幕 ID 必须在 subtitles 数组里 |
| `data-subtitle` 表达式格式合法 | 报错 | 仅接受单个字幕 ID（如 `"3"`），连续区间 / 离散段已废弃 |
| AI 写了 `id` 属性 | 报错 | merge 自动分配 |
| 顶级 class 元素无 `data-subtitle` 也无 `data-global` | 报错 | 必须显式声明时间控制 |
| background 元素带 `id` | 报错 | background 元素不许带 id |
| 居中元素缺 `transform: translate(-50%, -50%)` | 报错 | standard CSS 居中规范 |
| `animation-delay` + `opacity: 0` 共用 | 报错 | 期间元素会闪 |

### AI 学习成本（仅 4 条）

1. ✅ `transform: translate(-50%, -50%)` 居中（标准 CSS）
2. ✅ 元素加 class + `data-subtitle="字幕ID"`（**AI 只写这一个**；`data-global` 由 merge 自动补）
3. ✅ 嵌套子元素可省略（继承父元素时间）
4. ❌ 不写 `id` 属性（merge 自动分配）
5. ❌ background 元素不带 id
6. ❌ 居中元素必须配 `transform: translate(-50%, -50%)`
7. ❌ AI 不写 `data-global`（这是 merge 内部概念）

---

## R15 data-* 参数规范（AI 只写 data-subtitle）

> 🟢 **新规则（2026-07）**：AI 写组件 HTML 时**只考虑 `data-subtitle` 一个属性**。`data-global` 完全不暴露给 AI 写作流程——它是 **merge 脚本的内部机制**，自动为缺失元素补齐。

### 核心规则

| 属性 | AI 是否写 | merge 是否补 | 说明 |
|------|----------|-------------|------|
| `data-subtitle` | ✅ 必须写（如需按字幕控制） | ❌ | 绑定字幕序号区间 |
| `data-global` | ❌ **禁止写** | ✅ **自动补** | merge 兜底，AI 不需要关心 |
| 其他 `data-*` | ❌ | ❌ | 仅上面两个 |

### AI 写作心智模型（简化版）

**只问自己一个问题：**
> 这个元素要跟随**哪条字幕**出现？

**两种情况：**

| 情况 | 写法 | end 时间 |
|------|------|----------|
| 跟随某条字幕出现 | `<div class='title' data-subtitle='3'>标题</div>` | region.endTime |
| 整段 region 都在 | （**不写 data-*，merge 自动补 data-global**） | region.endTime |

### data-subtitle 取值格式

> 🟢 **新规（2026-07）**：仅支持单个字幕 ID。元素 end 固定为区域 endTime，不再用字幕 end。

| 写法 | 含义 | end 时间 | 示例 |
|------|------|----------|------|
| `"3"` | 单字幕：起始 = 字幕 3.start | region.endTime | `data-subtitle='3'` |

### ❌ AI 禁止写法

```html
<!-- ❌ 禁止：AI 写 data-global（merge 内部概念） -->
<div class='corner' data-global='true'>角标</div>

<!-- ❌ 禁止：data-subtitle 和 data-global 同时存在 -->
<div class='bad' data-subtitle='3' data-global='true'>错误</div>

<!-- ❌ 禁止：data-subtitle 引用不存在的字幕序号 -->
<div class='wrong' data-subtitle='999'>超出字幕范围</div>

<!-- ❌ 禁止：data-subtitle 格式错误（必须引号包裹完整） -->
<div class='wrong' data-subtitle=3>缺引号</div>
```

### ✅ AI 推荐写法

```html
<!-- ✅ 绑定单字幕，起始 = 字幕 2.start，结束 = 区域 endTime -->
<div class='main-title' data-subtitle='2'>A股上半年收官</div>

<!-- ✅ 绑定单字幕，起始 = 字幕 1.start，结束 = 区域 endTime -->
<div class='date-badge' data-subtitle='1'>2024-06-30</div>

<!-- ✅ 整段 region 都在（不写 data-*，merge 自动补） -->
<div class='watermark'>水印</div>

<!-- ✅ 父元素声明，子元素继承 -->
<div class='stage' data-subtitle='1'>
  <div class='title'>标题</div>          <!-- 子元素继承，无须再写 -->
  <div class='subtitle'>副标题</div>     <!-- 子元素继承，无须再写 -->
</div>
```

### merge 自动补全规则（脚本内部逻辑）

merge 在解析每个 HtmlComponent 的 `content.html` 时：

1. **扫描所有顶级 class 元素**（`<div class='xxx'>` 等）
2. **跳过 background 元素**（background 不参与时间控制）
3. 对每个元素检查：
   - 若已有 `data-subtitle` → 不处理
   - 若已有 `data-global` → 不处理
   - 若**都没有** → **自动注入 `data-global="true"`**，并 console 输出 `[AUTO] P{n}-XXX: 自动补 data-global="true"`
4. 若元素**同时含** `data-subtitle` 和 `data-global` → **报错阻断**（互斥规则保留）

### 嵌套子元素豁免

- 父元素已声明 `data-subtitle` / `data-global` 时，子元素继承时间控制
- 子元素**不需要**再写 data-*
- 子元素如果**单独**写了 `data-subtitle`（父元素没声明）→ 视为"独立的顶级元素"，按顶级规则处理

### 与 elementIds 关系

merge 在自动补完后生成的 elementIds：

```json
{
  "P1-100": { "id": "P1-100", "dataGlobal": true },
  "P1-101": { "id": "P1-101", "dataGlobal": false }
}
```

新增 `dataGlobal` 字段供前端识别（前端已有兼容逻辑，无需改动）。

### 自检 checklist

- [ ] 元素加 class
- [ ] 元素加 `data-subtitle="..."`（**不写 data-global**）
- [ ] 不写 `id` 属性（merge 自动分配）
- [ ] 不写 `data-global`（merge 自动补）
- [ ] 不在 background 元素上写 data-*

### 反例对照

```html
<!-- ❌ 反例 1：AI 写 data-global -->
<div class='corner' data-global='true'>角标</div>
<!-- ✅ 正例：什么都不写 -->
<div class='corner'>角标</div>

<!-- ❌ 反例 2：同时写两个 -->
<div class='bad' data-subtitle='3' data-global='true'>错误</div>
<!-- ✅ 正例：只写一个 -->
<div class='good' data-subtitle='3'>正确</div>

<!-- ❌ 反例 3：漏写 data-* 但也没说"想全程显示" -->
<!-- merge 会自动补 data-global，没问题，但 AI 自己要知道这是"兜底" -->
```


## R11 旧约定（已废弃）

> ⚠️ **R11 CSS keyframes 写法已废弃**——请改用 R12 新版（AI 写标准 CSS + merge 严格校验）。

旧 R12"data-cv-anim 模板"已废弃：HEAD 不再支持 `data-cv-anim` 接口，写了也不生效。改用标准 `@keyframes` + `animation` 写法。

---

## R21.5 入场动画与 opacity:0 互斥规则（强约束）

> 🔴 **血泪教训**：很多 CSS 教程教"先在选择器里写 `opacity: 0`，再用 `animation ... forwards` 让动画把它变回 1"。**实际不兼容前端 HtmlComponent 的显隐机制**——前端只用 `display` 控制元素出现/消失，不主动改 opacity。

### ❌ 禁止写法

```css
/* 选择器本体写 opacity: 0，配合 animation forwards —— 元素永远不可见 */
.fade-in {
  opacity: 0;                              /* ← 凶手 1 */
  animation: fadeIn 0.5s ease-out forwards; /* ← 凶手 2 */
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### 触发原因（浏览器行为）

前端 HtmlComponent 只通过 `display` 控制元素显隐时机（`display:none → ''` 切换）。
- 元素首次加载时位于 `display:none`，`animation` 在不可见状态下已经"演完"
- `animation-fill-mode: forwards` 让浏览器把"终态"冻结下来
- 当切到 `display:''` 让元素显示时，浏览器认为动画已结束 → **元素以冻结的 opacity:0 渲染**
- 结果：元素在页面上永远不可见（历史 P3 bug 根因）

### ✅ 正确写法：把 `opacity: 0` 移到 `@keyframes from {}` 里

```css
/* ✅ 正确：选择器本体不写 opacity:0，由 @keyframes 起始帧负责"出场前不可见" */
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

原理：浏览器在 `display:none → ''` 切换时会**重新启动** `animation`（因为上一次跑过了），新的执行周期从 `from` 开始 → 元素自然从透明渐入。

### 校验

- **merge-regions.js §6.1.6.b**：扫描每个 HtmlComponent 的 `content.css`，若任一选择器同时含 `opacity: 0` 与 `animation ... forwards`（或 `animation-fill-mode: forwards`）→ throw 阻断，列出冲突选择器
- **selfcheck.js checkR21_5EntranceAnimationOpacity**：项目级 selfcheck 兜底，错误信息一致
- 拦截方式与 R14（居中 vs 动画）一致：fail-fast，逐 region 修复

### 与 R12 的关系

| 规则 | 内容 | 是否冲突 |
|------|------|----------|
| R12.3 | AI 可写标准 CSS 动画（`@keyframes` + `animation` + `forwards`） | — |
| R21.5 | `opacity: 0` 与 `animation ... forwards` 不能写在**同一个选择器**里 | 叠加约束 |

R21.5 是 R12 的延伸：**入场动画的"初始不可见"必须靠 `@keyframes from`，不能靠选择器本体的 `opacity: 0`**。

### 自检 checklist

- [ ] 选择器本体没写 `opacity: 0`？（改成 `@keyframes from { opacity: 0 }`）
- [ ] 元素入场动画的"起手式"（透明、位移）写在 `@keyframes from {}` 里？
- [ ] `animation-fill-mode: forwards` 时，确认终态是"可见"状态？

---

## R14 居中与动画互斥规则（强约束）

> 🔴 **血泪教训**：很多教程教 `transform: translate(-50%, -50%)` 居中 + `@keyframes` 动画，**实际不兼容**。CSS Animations 规范规定：动画运行时 transform 计算值会被重置为 keyframe 起始值，**静态 `translate(-50%, -50%)` 被吞掉**——元素看起来"先居中后跑偏"。

### ❌ 禁止写法

```css
/* 居中靠 transform + 同时有 animation → 动画期间居中失效 */
.center {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);     /* ← 被 animation 吞掉 */
  animation: fadeIn 0.5s forwards;       /* ← 凶手 */
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }  /* 哪怕 keyframe 写了 transform 也无效 */
  to { opacity: 1; }
}
```

### ✅ 正确写法：三选一

#### 方案 A：text-align 三件套（推荐，最简单）

```css
.center {
  position: absolute;
  left: 0; right: 0;          /* 撑满父容器 */
  text-align: center;         /* 文字水平居中 */
  /* 完全不碰 transform，animation 怎么动都不影响 */
  animation: fadeIn 0.5s forwards;
}
@keyframes fadeIn {
  from { opacity: 0; margin-top: 20px; }  /* 用 margin-top 实现"上移渐入" */
  to { opacity: 1; margin-top: 0; }
}
```

#### 方案 B：flex 居中

```css
.center {
  position: absolute;
  left: 0; right: 0;
  display: flex;
  justify-content: center;    /* 水平居中 */
  align-items: center;        /* 垂直居中（如需要） */
}
```

#### 方案 C：margin 居中（已知元素宽度）

```css
.center {
  position: absolute;
  left: 50%;
  margin-left: -150px;        /* 元素宽度的负一半 */
  width: 300px;
}
```

### 自检 checklist

- [ ] 用了 `transform: translate(-50%, -50%)`？→ 改方案 A/B/C
- [ ] 用了 `position: absolute; left: 50%` + `transform` 居中？→ 改方案 A/B/C
- [ ] keyframe 里写了 `transform: translateX/Y/scale/rotate`？→ 改用 `margin-top/left/width/opacity` 替代

### 进阶：水平居中但垂直位置自定义

```css
/* 居中水平，垂直位置用 top 控制 */
.center {
  position: absolute;
  top: 42%; left: 0; right: 0;
  text-align: center;
}
```

### 进阶：标签/徽章（圆角胶囊）

```html
<div class="tag-wrap">
  <span class="tag-inner">老板提问</span>
</div>
```
```css
.tag-wrap {
  position: absolute; top: 26%; left: 0; right: 0;
  text-align: center;
  padding: 6px 0;
  animation: fadeInUp 0.5s forwards;
}
.tag-inner {                          /* 嵌套 span 只负责"圆角胶囊"样式，不参与居中 */
  display: inline-block;
  padding: 6px 16px;
  background: rgba(255,107,53,0.12);
  color: #ff6b35;
  border-radius: 999px;
}
```