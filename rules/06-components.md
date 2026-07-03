# 项目配置使用规范

> 项目级（project.json）字段、HtmlComponent 写法、字幕/主题/图片等公共资源使用规范。
> 改组件写法、看不懂字段、不知道该用谁，**先看本文件**。
> 
> 📌 **新约定 R12（2026-07-更新）**：AI 写标准 CSS（`@keyframes` + `animation`），merge 严格校验（属性白名单、居中修正），前端**只通过 `opacity` 控制显隐时机**（不解析 CSS animation）。R11 旧约定已废弃，R12 旧"禁用动效"版已更新。

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

> 💡 **AI 不写 `content.elementIds`**：merge 会从 HTML 的 `class` 元素自动分配 id（从 `P{区}-100` 起），并生成 `elementIds` 字段。AI 写 class + `data-subtitle` / `data-global` 即可。

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
    "html": "<div class='stage' data-subtitle='1-5'><div class='title'>标题</div><div class='subtitle'>副标题</div></div>",
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
| end | number | 自动 | 元素结束时间（从 `data-subtitle` 解析 SRT 推算） |

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

> **2026-07 更新**：AI 写标准 CSS（`@keyframes` + `animation`），merge 严格校验（属性白名单、居中修正等）。前端**只通过 `opacity` 控制显隐时机**（不解析 CSS animation，不写 transform），所以 CSS animation **实际不生效**，但写出来 CSS 独立可预览、merge 校验通过。
>
> 旧 R12"禁用动效"版已更新。R11 旧约定已废弃。

### R12.1 元素必填属性

| 属性 | 必填 | 说明 |
|---|---|---|
| `class` | ✅ | CSS 选择器，HEAD 通过 class 找 DOM |
| `data-subtitle` | ✅ | 引用字幕序号（`"3"` / `"1-3"` / `"1,3,5"`），决定元素显示的字幕时间窗 |
| `data-global` | ❌ | 设为 `"true"` 表示跟随 region 全生命周期（不绑字幕），与 `data-subtitle` 互斥 |
| `id` | ❌ | **AI 不写**，merge 自动分配（`P{区}-100` 起按 HTML 出现顺序） |

**居中靠 CSS class 自身**（必须，否则 merge 报错）：

```css
.main-title {
  position: absolute;
  top: 58%;
  left: 50%;
  transform: translate(-50%, -50%);  /* 必须：HEAD 不写 transform */
  font-size: 42px;
  color: white;
}
```

### R12.2 HTML 写法

```html
<!-- 时间维度：显示在第 2 句字幕期间 -->
<div class='main-title' data-subtitle='2'>A股上半年收官</div>

<!-- 时间维度：显示在第 1-2 句字幕期间 -->
<div class='date-badge' data-subtitle='1-2'>2024-06-30</div>

<!-- 全局元素：跟随 region 全生命周期 -->
<div class='corner-tl' data-global='true'></div>
```

merge 后 id 注入到 HTML 标签上（merge 唯一允许的 HTML 改动）：

```html
<div id='P1-100' class='main-title' data-subtitle='2'>A股上半年收官</div>
<div id='P1-101' class='date-badge' data-subtitle='1-2'>2024-06-30</div>
<div id='P1-102' class='corner-tl' data-global='true'></div>
```

### R12.3 CSS 写法

**AI 可以写**（merge 校验通过，前端会忽略但 CSS 独立可预览）：

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
| `@keyframes` 用了非白名单属性（`width` / `height` / `font-size` 等） | 报错 |
| 居中元素（`position: absolute` + 50%）缺 `transform: translate(-50%, -50%)` | 报错 |
| `animation-delay` + `opacity: 0` 共用 | 报错 |
| timing function 不在白名单 | 报错 |

> ❌ **不要写 `data-cv-anim="fade-in-up"` 等旧动画属性** —— 已废弃（2026-07），HEAD 不解析。

### R12.4 显隐时间与字幕的关系

- `data-subtitle="3"` → 字幕 3 的时间区间 [t3_start, t3_end]
- 元素在 `t3_start` 时刻 opacity 0→1 出现
- 元素在 `t3_end` 时刻 opacity 1→0 消失
- 切换是**硬切**（无过渡），靠 HEAD 每帧根据 currentTime 重算
- `data-global="true"` → 跟随 region 全生命周期（region 开始→结束都显示）

### R12.5 背景 vs 内容 区分规则

| 维度 | background.html | content.html |
|------|-----------------|--------------|
| 元素加 `id` | ❌ **禁止**（merge 校验会报错） | ⚠️ **AI 不写**，merge 自动注入 |
| 元素配 `data-subtitle` | ❌ 无意义（merge 不扫描 background） | ✅ 推荐 |
| 元素配 `data-global` | ❌ 无意义 | ✅ 可选 |
| CSS animation / @keyframes | ✅ **正常生效**（无 id 元素前端不禁） | ⚠️ merge 校验通过但前端不解析（硬切） |
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
    "html": "<div class='date-badge' data-subtitle='2'>06·30</div><div class='main-title' data-subtitle='2-3'>A股上半年收官</div><div class='title-glow' data-subtitle='2-3'>光晕</div>",
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
| AI 写了 `id` 属性 | 报错 | merge 自动分配 |
| 顶级 class 元素无 `data-subtitle` 也无 `data-global` | 报错 | 必须显式声明时间控制 |
| background 元素带 `id` | 报错 | background 元素不许带 id |
| `@keyframes` 用了非白名单属性 | 报错 | 11 个支持属性（opacity/transform/box-shadow 等） |
| 居中元素缺 `transform: translate(-50%, -50%)` | 报错 | standard CSS 居中规范 |
| `animation-delay` + `opacity: 0` 共用 | 报错 | 期间元素会闪 |

### AI 学习成本（仅 4 条）

1. ✅ `transform: translate(-50%, -50%)` 居中（标准 CSS）
2. ✅ 元素加 class + `data-subtitle="字幕ID"` / `data-global="true"`
3. ✅ 嵌套子元素可省略（继承父元素时间）
4. ❌ 不写 `id` 属性（merge 自动分配）
5. ❌ background 元素不带 id
6. ❌ 居中元素必须配 `transform: translate(-50%, -50%)`

---

## R11 旧约定（已废弃）

> ⚠️ **R11 CSS keyframes 写法已废弃**——请改用 R12 新版（AI 写标准 CSS + merge 严格校验）。

旧 R12"data-cv-anim 模板"已废弃：HEAD 不再支持 `data-cv-anim` 接口，写了也不生效。改用标准 `@keyframes` + `animation` 写法。