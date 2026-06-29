# 项目配置使用规范

> 项目级（project.json）字段、HtmlComponent 写法、字幕/主题/图片等公共资源使用规范。
> 改组件写法、看不懂字段、不知道该用谁，**先看本文件**。

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
- background.html 必填、字符串、非空（一般是单个根 <div>，可嵌套 SVG/渐变/装饰）
- background.css 必填、字符串、非空（建议 position: absolute; inset: 0; 让背景填满 video-frame）
- 非 HtmlComponent（如 AggregateComponent）不强制
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

---

## R8 字幕样式项目级必填

**AI 必须在 init-project 的 config JSON 里提供 `subtitle` 字段，6 字段全要。字幕样式从"主题控制"改为"项目级必填"。**

### 字段结构

```json
"subtitle": {
  "color":      "#FFFFFF",                       // 文字颜色，hex 或 rgba
  "fontSize":   "36px",                           // 字号，CSS 长度
  "position":   "bottom-center",                  // 9 档：top/middle/bottom + left/center/right
  "weight":     700,                              // 字重，100-900 整百
  "background": "rgba(0,0,0,0.5)",                // 背景色，transparent/hex/rgba
  "textShadow": "0 1px 3px rgba(0,0,0,0.8)"       // 描边/阴影
}
```

### 9 档 position 枚举

```
top-left      top-center      top-right
middle-left   middle-center   middle-right
bottom-left   bottom-center   bottom-right
```

### 推荐默认值（AI 自主决定，不主动问用户）

| 风格 | color | fontSize | position | weight | background | textShadow |
|------|-------|----------|----------|--------|------------|------------|
| 暗色科技 | `#FFFFFF` | `36px` | `bottom-center` | `700` | `rgba(0,0,0,0.55)` | `0 1px 3px rgba(0,0,0,0.9)` |
| 亮色商务 | `#1a1a1a` | `34px` | `bottom-center` | `600` | `rgba(255,255,255,0.7)` | `0 1px 2px rgba(255,255,255,0.6)` |
| 暗色情绪 | `#F5E8EC` | `40px` | `middle-center` | `800` | `transparent` | `0 2px 6px rgba(0,0,0,0.95)` |
| 亮色清新 | `#2C3E50` | `32px` | `bottom-left` | `500` | `rgba(255,255,255,0.6)` | `none` |

### 决策权

- ✅ **AI 自己决定**（用户没指定时）：按上表选值
- ❌ **AI 不主动问用户**：除非用户明确说"字幕我要 XXX"

### 校验层级（3 道防线）

| 层级 | 时机 | 行为 |
|------|------|------|
| 1. `generate-skeleton.js` | 生成骨架时 | 缺 `config.subtitle` → fail-fast 抛错 + 给补字段示例 |
| 2. `selfcheck.js` | 本地校验 | 6 字段缺任一 → 输出 `[必填] project.subtitle.X 缺失`；position 不在 9 档 → `[枚举]`；weight 不在 100-900 整百 → `[范围]` |
| 3. `server validate`（ajv schema） | 上传时 | 校验失败 → 返回 400 |

### 严禁

- ❌ AI 在 config 里偷懒不写 subtitle（理由："主题应该会处理"）——主题**不**再控制字幕
- ❌ 沿用老项目时省略 subtitle（schema 不兼容，老项目上传会被拒）
- ❌ 让用户填 subtitle 字段（除非用户主动指定）
- ❌ 改主题的 `colors.subtitle` 来"曲线救国"——前端不再从 theme 读字幕样式

### 与其他规则的关系

- **R8 与骨架/沿用规则**：新建/沿用都要带 subtitle，沿用时**不能少**；强制重置（`--new`）后也必须重新带 subtitle

---

## R10 字幕 validateElementDesign 必填（口播模式 · 强制 AI 自检）

**AI 在生成区域 JSON 时，必须为每条字幕填写 `validateElementDesign` 字段，让 AI 强制自我审视"该字幕时间窗口内，画面上正在显示的元素组合起来是否构成一个完整、合理、符合字幕语义的画面"。**

> ⚠️ **本字段的语义是"分析已有画面"，不是"为字幕设计新元素"**。每条字幕对应一个时间窗口 [start, end]，AI 必须先找出"在这个时间窗口内正在显示的元素"（即 `element.start/end` 与字幕时间窗有重叠的元素），再分析这些元素组合成的画面是否完整、是否合理、是否匹配字幕语义。

### 字段位置

`project.subtitles[i].validateElementDesign`（SRT 解析时自动映射，AI 在 Step 4 区域设计时填写）

### 字段规范

| 项 | 规则 |
|----|------|
| 长度 | 30-200 字（trim 后） |
| 必含 element id | 至少 1 个 `P{n}-{nnn}` 格式（如 `P1-002`、`P3-005`），**且该 id 必须在字幕时间窗口 [subtitle.start, subtitle.end] 内正在显示**（即 element.start/end 与字幕时间窗有重叠） |
| 必含内容 | (1) 该字幕时间窗口内**正在显示**的元素清单（id + 各自的视觉功能/位置/层级）；(2) 这些元素组合成的画面是否完整 / 是否合理 / 是否与字幕语义匹配；(3) 整体评价（合理 / 不合理 + 原因） |

### 正确理解：什么是"字幕对应的元素"？

| 错误理解 ❌ | 正确理解 ✅ |
|------------|-----------|
| 把当前组件当作"字幕对应的元素"，列出该组件里所有元素 | 找出 `element.start/end` 与 `subtitle.start/end` 有重叠的元素（**只列正在显示的**） |
| 把所有元素都堆进去（不看时间窗口） | 严格按时间窗口过滤：只有该字幕说出口时画面上**正显示**的元素才算 |
| 写元素设计意图（"为字幕设计了什么"） | 写元素组合分析（"画面上正在显示的 X、Y、Z，组合成什么画面，是否合理"） |

### 正例

```json
{
  "start": 3.5,
  "end": 6.0,
  "text": "P1001 一般是主键",
  "validateElementDesign": "此时画面上正在显示 P1-002（表格容器，淡灰底 760x400 居中）、P1-003（表头行，4 列表头加粗）、P1-004（数据行 3 条，第一列'ID'为金色高亮表示主键）。这些元素组合成一张'带主键高亮的示例数据表'画面，完整呈现了字幕'P1001 一般是主键'的含义，整体合理。"
}
```

### 反例（会被 fail-fast）

- ❌ `"合理"` —— 太短且无 element id
- ❌ `"P1-001 元素布局合理，3 个元素组成"` —— P1-001 是组件不是元素；且未指明哪些元素 + 是否在该时间窗
- ❌ `"画面有 P1-002（主键高亮）、P1-005（标题），布局合理"` —— 引用了 P1-005 但 P1-005 的显示时间可能不在该字幕时间窗内
- ❌ `""` —— 空
- ❌ `"P1-002 看起来还行"` —— 含 id 但太短且无具体说明
- ❌ 复制粘贴同一条 validateElementDesign 给所有字幕 —— 失去自检意义

### 校验链路

| 校验点 | 行为 |
|--------|------|
| `selfcheck.js`（Skill 端） | ① 缺失/过短 → 输出 `[口播模式] subtitles[N].validateElementDesign ...` 错误；② 提取所有 element id 后做 3 项交叉校验：id 必须在 components 中存在、id 必须在字幕时间窗口内显示 |
| `projectValidator.js`（Server 端） | 同上 |
| `project.schema.json`（ajv） | 缺失 → 返回 400；pattern 强制 P\d+-\d{3} 格式 |

### Cross 校验伪代码（便于理解校验逻辑）

```
对每条字幕 (sub.start, sub.end)：
  提取 validateElementDesign 中所有形如 P{n}-{nnn} 的 id（去重）
  对每个引用的 id：
    在 components[].content.elementIds 中查找
    若不存在 → 错误：引用了不存在的 element
    若 element.end < sub.start 或 element.start > sub.end → 错误：该元素在该字幕时间窗内不显示
```

### 严禁

- ❌ AI 写"合理"两个字就完事 —— 字数不够且无 element id
- ❌ 把当前组件 id（P1-001）当作元素 id 写入 —— 组件是容器不是元素
- ❌ 引用不在该字幕时间窗口内的元素（用 element.start/end 与 subtitle.start/end 是否重叠来判断）
- ❌ 复制粘贴同一条 validateElementDesign 给所有字幕 —— 每条字幕时间窗不同，画面元素组合也不同
- ❌ 跳过填写（依赖 SRT 自动填充）—— SRT 是标准格式，无此字段

### 与其他规则的关系

- **R10 与 R8**：R8 控制项目级字幕样式（color/fontSize/...），R10 控制每条字幕对应的画面自检说明，两者正交
- **R10 与 R4（elementId 规则）**：R4 规定 element.start/end 必填数字+非负，R10 反向校验 validateElementDesign 引用的 element id 必须"在 subtitle 时间窗内显示"
- **R10 与 R2（组件）**：R2 的 component id（如 P1-001）是组件容器 id，**不是元素 id**；R10 引用的是 component.content.elementIds 里的元素 id（如 P1-002）
