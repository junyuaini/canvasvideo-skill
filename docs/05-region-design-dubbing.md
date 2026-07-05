# 步骤5：区域设计与生成JSON（口播模式）

> 前置步骤：[步骤4：生成骨架JSON](04-skeleton-build.md)
> 下一步：[步骤6：合并 + 自检](06-merge.md)

---

## 目标

基于 skeleton.json 中的区域配置，为每个区域编写 HtmlComponent JSON。AI **只写标准 H5+CSS**（class + data-subtitle），所有 id、data-global 缺失补全、校验由 merge 脚本自动处理。

> **核心原则**：AI 不再写 `id`、`start`、`end`、`elementIds` 等任何前端协议字段。AI 只描述"元素长什么样、什么时候出现"，其他由程序完成。

---

## 输入

| 来源 | 说明 |
|------|------|
| 骨架配置 | `skeleton.json`（由 [步骤4](04-skeleton-build.md) 产出，含 regions 数组） |
| 区域模板 | `regions/P{n}.json`（由步骤4同时生成，含 region 基本信息和 component 基本框架，背景/内容 HTML/CSS 为空） |

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| `regions/P{n}.json` | `{workdir}/{skillProjectId}/regions/P{n}.json` | 每个区域一个 JSON 文件 |

---

## 元素出现时机

### 三种写法

```html
<!-- 1. 全局装饰：跟随 region 全生命周期 -->
<div class='corner-deco' data-global='true'></div>

<!-- 2. 单条字幕（新规 2026-07）：出现=字幕3.start，消失=region.endTime -->
<div class='title' data-subtitle='3'>标题</div>
```

### 解析规则

| 写法 | 含义 |
|------|------|
| `data-global='true'` | 跟随 region 全生命周期，前端用 region 边界兜底 |
| `data-subtitle='3'` | 出现=字幕3.start，消失=**region.endTime**（新规 2026-07：结束时间固定为区域结束） |

---

## ⚠️ id 自动分配机制（新约定）

**AI 不写 id 属性**。所有带 class 的元素，merge 脚本会自动分配 id：

- **起始编号**：`P{区域}-100`（避开顶级组件 `P{区域}-001` ~ `P{区域}-099`）
- **分配顺序**：按 HTML 中出现顺序依次递增
- **同 class 多个元素**：每个实例分配不同 id（`P1-100, P1-101, P1-102...`）
- **嵌套子元素豁免**：父元素已声明 `data-subtitle` / `data-global` 时，子元素不分配 id（继承父元素时间控制）

### 错例（AI 写 id → merge 报错）

```html
<!-- ❌ AI 写了 id，会被 merge 拒绝 -->
<div id='P1-100' class='title' data-subtitle='3'>标题</div>
```

### 正例

```html
<!-- ✅ AI 不写 id，由 merge 自动分配 -->
<div class='title' data-subtitle='3'>标题</div>
```

---

## ⚠️ 校验规则（merge 严格化）

merge 脚本校验 **content.html**，违反会直接报错：

### 1. AI 不许写 id

```html
<!-- ❌ -->
<div id='P1-100' class='title' data-subtitle='3'>标题</div>
```

### 2. 元素时间控制的三种写法

AI 写元素时间控制有 **3 种方式**（择一即可）：

| 方式 | 写法 | 用途 |
|------|------|------|
| 跟随单字幕 | `data-subtitle='3'` | 起始=字幕3.start，结束=region.endTime |
| 留空由 merge 补 | `<div class='deco'></div>` | 整段 region 显示（merge 自动补 `data-global="true"`） |
| 嵌套继承 | `<div class='card' data-subtitle='1'><span class='card-icon'>🌙</span></div>` | 子元素继承父元素时间 |

**注意**：
- AI **不要**显式写 `data-global="true"`——这是 merge 内部概念（详见 [rules/06-components.md §R15](rules/06-components.md#r15-data--参数规范ai-只写-data-subtitle)）
- 整段显示的装饰元素（背景/水印/底图/分割线）直接**留空**，merge 会自动补

```html
<!-- ✅ AI 只写 data-subtitle，装饰元素留空 -->
<div class='title' data-subtitle='3'>标题</div>
<div class='subtitle' data-subtitle='3'>副标题</div>
<div class='deco-line'></div>  <!-- 留空，merge 自动补 data-global -->
```

**嵌套子元素豁免**：嵌套在已声明 `data-subtitle` / `data-global` 的父 class 元素内时，子元素可省略（继承父元素时间控制）：

```html
<!-- ✅ 父已声明 data-subtitle，子元素豁免 -->
<div class='card' data-subtitle='1'>
  <span class='card-icon'>🌙</span>
  <span class='card-text'>文字</span>
</div>
```

### 3. background.html 元素不许带 id

```html
<!-- ❌ 背景元素带 id -->
<div id='P1-bg' class='region-bg'></div>

<!-- ✅ 背景元素只靠 class，merge 不注入 id -->
<div class='region-bg'></div>
```

### 4. data-subtitle / data-global 互斥

```html
<!-- ❌ 同时存在 -->
<div class='card' data-subtitle='5' data-global='true'>...</div>
```

### 5. 居中必须配 `translate(-50%, -50%)`

`position: absolute` + 含 50% 定位时，**必须**配 `transform: translate(-50%, -50%)` 居中修正：

```css
/* ❌ 缺居中修正 */
.centered { position: absolute; top: 50%; left: 50%; }

/* ✅ */
.centered { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
```

> merge 不再自动修这些错误，**写错直接报错**。

---

## CSS 动画写法

### 关键帧定义

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-pop {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
```

### 应用动画

```css
.title {
  animation: fade-in 0.5s ease-out forwards;
}

.badge {
  animation: scale-pop 0.4s ease-out forwards;
}
```

**注意**：

- 前端只通过 `display` 控制显隐时机，CSS `@keyframes` / `transition` / `animation` **由浏览器原生执行**，可任意使用 transform / filter / clip-path / cubic-bezier 等全部 CSS 能力
- `forwards` 等关键字会正常生效

---

## 完整示例

```json
{
  "id": "P1-099",
  "type": "HtmlComponent",
  "regionId": "P1",
  "background": {
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e, #16213e); }"
  },
  "content": {
    "html": "<div class='corner-deco' data-global='true'></div><div class='frame' data-subtitle='3'><div class='frame-title'>核心观点</div></div><div class='title' data-subtitle='3'>Skill 是什么</div><div class='desc' data-subtitle='4'>它的核心定义与作用</div><div class='badge' data-subtitle='5'>重要</div>",
    "css": "@keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .frame { animation: fade-in 0.5s ease-out forwards; } .title { animation: fade-in 0.5s ease-out forwards; } .desc { animation: fade-in 0.4s ease-out forwards; } .badge { animation: fade-in 0.4s ease-out forwards; }"
  }
}
```

> 上面例子中，merge 会自动为以下 5 个 class 元素分配 id（按出现顺序）：
> - `corner-deco` → `P1-100`（data-global，无 start/end）
> - `frame` → `P1-101`（data-subtitle 3，start=字幕3.start, end=region.endTime）
> - `frame-title` → 不分配（嵌套在 frame 内，豁免）
> - `title` → `P1-102`（data-subtitle 3）
> - `desc` → `P1-103`（data-subtitle 4）
> - `badge` → `P1-104`（data-subtitle 5）

---

## AI 不需要做的事

- ❌ 写 `id` 属性（merge 自动分配）
- ❌ 写 `start` / `end` 数字
- ❌ 写 `elementIds` 字段
- ❌ 写 `background` 的 id 或 data-global
- ❌ 写 `animation-delay` 时间
- ❌ 写 `animations` manifest

## AI 需要做的事

- ✅ 直接在模板 `regions/P{n}.json` 上填写，不新建文件
- ✅ 给 background 写 HTML/CSS（普通 HTML，不要带 id）
- ✅ 给 content 写 HTML，元素加 class + `data-subtitle` / `data-global`（不要写 id）
- ✅ 写标准 CSS（`@keyframes` + `animation` + `transition` + `transform` 等全部 CSS 能力）
- ✅ 居中元素必须配 `transform: translate(-50%, -50%)`

---

## 常见错误

### 1. AI 写了 id

```html
<!-- ❌ -->
<div id='P1-100' class='title' data-subtitle='3'>标题</div>

<!-- ✅ 删掉 id，由 merge 自动分配 -->
<div class='title' data-subtitle='3'>标题</div>
```

### 2. 顶级 class 元素无时间控制

```html
<!-- ❌ 顶级元素，既无 data-subtitle 也无 data-global -->
<div class='label'>文字</div>

<!-- ✅ -->
<div class='label' data-subtitle='1'>文字</div>
```

### 3. data-subtitle 字幕 ID 越界

```html
<!-- ❌ SRT 只有 20 条字幕 -->
<div data-subtitle='25'>元素</div>

<!-- ✅ -->
<div data-subtitle='15'>元素</div>
```

### 4. keyframe 用了不支持的属性

```css
/* ❌ width 不可插值 */
@keyframes bad {
  from { width: 0; }
  to { width: 100%; }
}

/* ✅ 改用 transform: scaleX */
@keyframes good {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### 5. 居中缺 `translate(-50%, -50%)`

```css
/* ❌ 元素左上角在 50% 处，不是中心 */
.centered { position: absolute; top: 50%; left: 50%; }

/* ✅ */
.centered { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
```

### 6. 入场动画错误写法（R21.5）

```css
/* ❌ 选择器写 opacity:0 + animation forwards（display:none → '' 切换后元素永远不可见）*/
.fade-in {
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

/* ✅ 把 opacity:0 挪到 @keyframes from 里 */
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### 7. background 元素带 id

```html
<!-- ❌ -->
<div id='P1-bg' class='region-bg'></div>

<!-- ✅ 背景元素只靠 class -->
<div class='region-bg'></div>
```

---

## 校验规则总览

selfcheck + merge 会校验：

1. AI 不许手写 id
2. 顶级 class 元素必须声明 data-subtitle 或 data-global
3. background.html 元素不许带 id
4. data-subtitle / data-global 互斥
5. data-subtitle 表达式格式合法（仅 `"3"` 单字幕，连续区间 / 离散段已废弃）
6. data-subtitle 引用的字幕 ID 必须存在
7. 居中元素必须配 `transform: translate(-50%, -50%)`
8. 元素 id 全局唯一（merge 自动分配后保证）
9. elementId ⊂ 组件 ⊂ region 层级合法
10. **R21.5**：CSS 选择器不能同时含 `opacity: 0` 与 `animation ... forwards`（入场动画"起手式"必须写在 `@keyframes from {}` 里）

---

## 下一步

进入 [步骤6：合并 + 自检](06-merge.md)
