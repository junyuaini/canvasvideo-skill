# 区域设计（口播模式）

> **核心原则**：AI 不再手填时间数字，所有元素出现/消失/动画由 **CSS keyframes** 决定，时间由 `data-subtitle` 或 `data-global` 自动从 SRT 推算。

---

## 与旧约定的区别

| 维度 | 旧约定 | 新约定 |
|------|--------|--------|
| 时间字段 | `elementIds["#X"].start/end` 手动数字 | `data-subtitle="3"` 字幕 ID 或 `data-global="true"` |
| 出现/消失 | JS `display: none/block` 闪现 | CSS `animation` 自带过渡 |
| AI 要学什么 | 嵌套对象 + 时间数学 | 写 HTML 标签 + CSS keyframes |

---

## 元素出现时机

### 四种写法

```html
<!-- 1. 区域全局（装饰/背景元素）：跟随 region 全生命周期，前端用 region 边界兜底 -->
<div id='P1-016' class='corner-deco' data-global='true'></div>

<!-- 2. 单条字幕：出现=字幕3.start，消失=字幕3.end -->
<div id='P1-001-title' class='title' data-subtitle='3'>标题</div>

<!-- 3. 范围字幕：出现=字幕3.start，消失=字幕5.end -->
<div id='P1-001-title' class='title' data-subtitle='3-5'>标题</div>

<!-- 4. 多选字幕（断续）：字幕3段显示，字幕4段隐藏，字幕5段再显示 -->
<div id='P1-001-badge' class='badge' data-subtitle='3,5'>徽章</div>
```

### 解析规则

| 写法 | 含义 | elementIds 结果 |
|------|------|----------------|
| `data-global='true'` | 跟随 region 全生命周期 | 无 start/end（前端用 region 边界兜底） |
| `data-subtitle='3'` | 出现=字幕3.start，消失=字幕3.end | 写 start/end；若字幕=region 首字幕，省略 start；若字幕=region 末字幕，省略 end |
| `data-subtitle='3-5'` | 出现=字幕3.start，消失=字幕5.end | 同上规则 |
| `data-subtitle='3,5'` | 元素在 字幕3 和 字幕5 段时间窗分别显示（断续） | 写 start/end |

### 省略规则

当元素的字幕首/末与 region 字幕首/末重合时，merge 脚本会自动省略 start/end：

- 元素首字幕 == region 首字幕 → **省略** start
- 元素末字幕 == region 末字幕 → **省略** end
- 两者都成立 → 只写 id，无 start/end（等同于 data-global 效果）

---

## 两步校验（merge 脚本自动执行）

merge 脚本 6.3 节会自动校验 html：

**第一步：有 class 必有 id**
- 有 `class` 属性的元素必须也有 `id`（SVG 内部图形原子 `circle/path/line/rect/polygon/polyline/ellipse/g/text/tspan/use/image/defs/linearGradient/radialGradient/stop/animate/animateTransform/animateMotion` 豁免）

**第二步：有 id 必有归属属性**
- 有 `id` 的元素必须写 `data-subtitle` 或 `data-global="true"`（二选一，互斥）

```html
<!-- 错：class 无 id -->
<div class='clock-num'>12</div>

<!-- 错：id 无归属属性 -->
<div id='P1-002'>元素</div>

<!-- 对：专属元素绑定字幕 -->
<div id='P1-001-title' class='title' data-subtitle='3'>标题</div>

<!-- 对：装饰/背景元素用全局 -->
<div id='P1-016' class='corner-deco' data-global='true'></div>
```

---

## CSS 动画写法

### 关键帧定义

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scale-pop {
  from { opacity: 0; transform: scale(0.8); }
  50% { transform: scale(1.05); }
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

**关键点**：

1. **必须用 `forwards`** — 动画跑完元素停在最终态，否则会回到初始态（opacity: 0）不可见
2. **delay 不需要写** — merge 脚本会自动根据 `data-subtitle` 注入 `animation-delay`
3. **duration 写元素本身** — 0.3s~0.8s 是常见值

### 进阶：自定义 transition

```css
/* 多段动画 */
.badge {
  animation: fade-in 0.5s ease-out forwards, bounce 0.3s ease-out 0.5s;
}

/* 弹性缓动 */
.elastic {
  animation: scale-pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}
```

---

## 完整示例

```json
{
  "id": "P1-001",
  "type": "HtmlComponent",
  "regionId": "P1",
  "content": {
    "html": "<div id='P1-016' class='corner-deco' data-global='true'></div><div id='P1-001-frame' class='frame' data-subtitle='3-5'><div class='frame-title'>核心观点</div></div><div id='P1-001-title' class='title' data-subtitle='3'>Skill 是什么</div><div id='P1-001-desc' class='desc' data-subtitle='4'>它的核心定义与作用</div><div id='P1-001-badge' class='badge' data-subtitle='5'>重要</div>",
    "css": "@keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes slide-in { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } } @keyframes scale-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } } .corner-deco { animation: fade-in 0.5s ease-out forwards; } .frame { animation: fade-in 0.5s ease-out forwards; } .title { animation: fade-in 0.5s ease-out forwards; } .desc { animation: slide-in 0.4s ease-out forwards; } .badge { animation: scale-pop 0.4s ease-out forwards; }"
  }
}
```

---

## AI 不需要做的事

- ❌ 写 `start` / `end` 数字
- ❌ 算 `animation-delay` 时间
- ❌ 写 `elementIds` 字段（merge 脚本会从 HTML 自动生成）
- ❌ 维护时间数学

## AI 需要做的事

- ✅ 给元素写 `id`（格式：`P{区域编号}-{三位数字}`，如 `P1-001`）
- ✅ 给元素写 `data-subtitle` 或 `data-global="true"`（二选一）
- ✅ 写 CSS keyframes（标准 CSS 动画）
- ✅ 给元素 class，用 class 应用 animation
- ✅ 两步校验：有 class 必有 id，有 id 必有归属

---

## 常见错误

### 1. 忘记 `forwards`

```css
/* 错：动画跑完元素回到 opacity: 0 */
.title { animation: fade-in 0.5s ease-out; }

/* 对 */
.title { animation: fade-in 0.5s ease-out forwards; }
```

### 2. 元素 id 重复

```html
<!-- 错 -->
<div id='P1-002'>标题</div>
<div id='P1-002'>描述</div>

<!-- 对：必须用 P{区域编号}-{三位数字} 格式 -->
<div id='P1-002'>标题</div>
<div id='P1-003'>描述</div>
```

### 3. data-subtitle 字幕 ID 越界

```html
<!-- 错：SRT 只有 20 条字幕 -->
<div data-subtitle='25'>元素</div>

<!-- 对 -->
<div data-subtitle='15'>元素</div>
```

### 4. CSS 用 id 选择器（影响 @scope）

```css
/* 错：受 @scope 影响，可能失效 */
#P1-001-title { animation: ...; }

/* 对：用 class 选择器 */
.title { animation: ...; }
```

### 5. 有 id 但无归属属性

```html
<!-- 错：id 既没有 data-subtitle 也没有 data-global -->
<div id='P1-005'>元素</div>

<!-- 对 -->
<div id='P1-005' class='card' data-subtitle='5'>元素</div>
```

### 6. 同时写了 data-subtitle 和 data-global

```html
<!-- 错：互斥，不能同时存在 -->
<div id='P1-005' class='card' data-subtitle='5' data-global='true'>元素</div>

<!-- 对 -->
<div id='P1-005' class='card' data-subtitle='5'>元素</div>
```

---

## 校验规则

selfcheck 会校验：

1. 每个有 `id` 的元素必须格式 `P{数字}-{三位数字}`
2. `data-subtitle` 引用的字幕 ID 必须存在
3. `data-subtitle` 多选/范围必须合法
4. CSS 中引用的 keyframes 必须有 `@keyframes` 定义
5. `animation` 简写建议带 `forwards`