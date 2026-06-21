# 从 design.md 生成 project.json（子流程）

> 本文档是 **CanvasVideo Skill 主流程"第四次交互"中"打包前生成 project.json"那一步的子流程**。
>
> **两条路径都用本子流程**：
> - **协作设计**：用户在第三次交互确认 design.md 后，LLM 按本文档翻译成 `project.json`
> - **自主设计**：design.md 由 LLM 自我确认后，按本文档翻译成 `project.json`
>
> ⚠️ **不论哪条路径，本文档的所有硬规则一概不放宽**：§3.1 batch 查 API、§4 11 步翻译、§6 三层自检、§8 严禁清单 全部生效。

---

## 1. 工作位置

```
{workdirRoot}/{skillProjectId}/
├── design.md          ← [协作设计 + 自主设计] 第二次交互产物（你已经写好）
├── project.json       ← ⭐ 本子流程产出（写到这里，两条路径都一样）
└── assets/
    └── images/
```

写入路径：`{workdirRoot}/{skillProjectId}/project.json`（与 design.md 同目录）

写文件方式：用 `JSON.stringify(project, null, 2)` 保存，必须是合法 JSON。

---

## 2. 总览：design.md ↔ project.json 字段映射

| design.md 来源 | project.json 字段 | 说明 |
|---|---|---|
| 步骤 0：项目元信息表 | `name`、`description`、`theme`、`duration` | 顶层元信息 |
| 步骤 0：音频用途 | `audio`、`subtitles` | 详见 [`../../references/mode-rules.md`](../../references/mode-rules.md) §3 |
| 步骤 4：viewport 比例 | `viewport: { width, height }` | 详见 [`../../references/layout-rules.md`](../../references/layout-rules.md) §1.1 |
| 步骤 4：区域规划表 | `regions: [{ name, x, y }]` | 详见 layout-rules.md §1.2 |
| 步骤 4：canvas | `canvas: { width, height }` | 详见 layout-rules.md §1.3 |
| 步骤 4：settings | `settings: { contentZoomRatio, preFullViewDuration, postFullViewDuration, ... }` | 详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) §settings |
| 步骤 6-9-10：组件清单 + 布局 + 样式 + 时间轴 | `components: [...]` | 见下方 §3 |
| 用户素材清单 | 各 `ImageComponent.content.image` | 详见 [`../../references/visual-richness-rules.md`](../../references/visual-richness-rules.md) 门槛 4 |

---

## 3. components[] 的组合规则（核心）

`components` 数组的每一项都需要**从 design.md 的 4 处汇总**：

| design.md 来源 | project.json 字段 | 来自步骤 |
|---|---|---|
| 组件 ID（如 `P3-002`） | `id` | 步骤 7 |
| 组件类型 + variant | `type` + `content.variant` 或 `content.style` 等 | 步骤 7 |
| 内容字段（标题文字、items 等） | `content.{...}` | 步骤 7 |
| 区域 x/y/w/h | `position: { x, y, w, h }` | 步骤 6 |
| `fullRow`（标题独占整行） | `fullRow: true` | 步骤 7 |
| customStyle | **`customStyle: {...}`（⚠️ 必填，非 Aggregate 组件即使无样式也要写 `{}`）** | 步骤 9（**API 查字段**） |
| 出场时间 | `start` / `end` | 步骤 10 |
| 子组件（AggregateComponent） | `children: [...]` | 步骤 7 |

> ⚠️ **硬约束**：除 `AggregateComponent` 之外，**所有组件必须有 `customStyle` 字段**。如果该组件用默认样式无需自定义，**也必须显式写 `"customStyle": {}` 空对象**，否则前端加载报错"未配置 theme，必须配置 customStyle"。详见 [`../../references/components-catalog.md`](../../references/components-catalog.md) §"全局硬约束"。

### 3.1 组件字段必查 API（硬规则）

写 `customStyle` 之前，LLM **必须**先批量调云端 API 拿组件的字段规范。

> **[硬规则] 未调用 batch API 直接写 customStyle = 违规。**
> 即使 catalog 里见过示例、即使模板里见过写法，也必须重新查 API。API 返回的字段定义是唯一权威来源。
> API 调不通时（网络失败 / 5xx）**必须停下**，不允许凭记忆硬写。等服务恢复后重查。

```js
const { queryComponentSpecBatch } = require('../../scripts/query-api');

const types = ['GraphicComponent', 'CardComponent'];
const { specs } = await queryComponentSpecBatch(types);
// specs.GraphicComponent → 该组件的完整字段定义
// specs.CardComponent    → 该组件的完整字段定义
```

> ⚠️ **严禁用 curl 调 API**——必须通过 `scripts/query-api.js` 调用，curl 会触发 Windows 网络安全弹窗打断用户。
>
> 详见 [`../../references/components-catalog.md`](../../references/components-catalog.md) §"通过 API 查询字段详情"。

**严禁**：凭直觉编 customStyle 字段名，必须用 API 返回的 key。

### 3.2 position 坐标计算

`position` 是组件**在所属区域内的相对坐标**（不是 canvas 全局坐标）：

```
position: { x: <区域内左上x>, y: <区域内左上y>, w: <宽度>, h: <高度> }
```

约束：
- `y` 必须在区域内严格递增（详见 [`../../references/layout-rules.md`](../../references/layout-rules.md) §2）
- `w` ≤ `viewport.width - 40`，且**不能远大于内容实际宽度**（防空荡，详见 layout-rules.md §3.2/3.5）
- 区域内组件 `h` 总和 + 间距 ≤ `viewport.height - 20`
- 强调类组件（Shock/Badge/CTA）单独出现时应在区域内**水平居中**（详见 layout-rules.md §3.6）
- `position.w` / `position.h` 必须**显式填写**，不能省略

### 3.3 time 计算

`start` / `end` 是**视频全局秒数**，不是区域内相对时间：

```
组件 start = 区域 start + 区域内出场偏移
组件 end   = 所属区域的 end（或下一个组件出场前）
```

详见 [`../../references/timing-rules.md`](../../references/timing-rules.md) 节奏 4 条门槛。

---

## 4. 翻译流程（11 步顺序）

### 步骤 A：顶层字段

```jsonc
{
  "name": "<步骤 0 主题>",
  "description": "<步骤 0 简短描述>",
  "theme": "white|black",         // 步骤 0 选定的主题
  "duration": <步骤 0 总时长（秒）>,
  "audio": { ... } | "...",       // 详见 mode-rules.md §2/3
  "subtitles": [...] | 不填,      // 配音用法必填，BGM/静音禁填。详见下方 §2.1 SRT 转换规则
  ...
}
```

### 步骤 A+：SRT 转换规则（口播模式专用，硬规则）

> **口播模式的 subtitles 数组必须 100% 来自用户提供的 SRT 文件，严禁 LLM 自行生成、修改、调整。**

**转换流程**：
1. **读取 SRT 文件**：用 `fs.readFileSync(srtPath, 'utf-8')` 读取用户提供的 `.srt` 文件内容
2. **逐条解析**：按 SRT 标准格式解析（序号 → 时间轴 → 文本）
3. **原样转换**：每条字幕直接映射为 project.json 的 `subtitles` 数组元素，**文本和时间戳都不动**

**project.json 的 subtitles 数组格式**：

```jsonc
"subtitles": [
  {
    "start": 0.000,      // SRT 开始时间 → 秒（如 00:00:00,000 → 0.0）
    "end": 5.200,        // SRT 结束时间 → 秒（如 00:00:05,200 → 5.2）
    "text": "这是第一句字幕"   // SRT 文本原文，100% 不动
  },
  {
    "start": 5.200,
    "end": 10.500,
    "text": "这是第二句字幕"
  }
]
```

**严禁**：
- ❌ **LLM 自己写 subtitles 数组**（必须读取用户 SRT 文件）
- ❌ **改动 SRT 文本内容**（哪怕是一个字、一个标点）
- ❌ **调整时间戳**（start/end 必须和 SRT 完全一致）
- ❌ **合并或拆分 SRT 条目**（SRT 有几条，subtitles 就有几条，一一对应）
- ❌ **漏掉 SRT 中的任何一条字幕**

**时间戳转换公式**：
- `00:01:23,456` → `1 * 60 + 23 + 456/1000 = 83.456` 秒
- 保留 3 位小数精度

---

### 步骤 B：viewport / canvas / regions / settings

按 `layout-rules.md` §1 的公式直接计算：

```jsonc
"viewport": { "width": 780, "height": 585 },  // 默认 4:3
"regions": [
  { "name": "P1", "x": 120,  "y": 50  },
  { "name": "P2", "x": 900,  "y": 50  },
  ...
],
"canvas": { "width": 3300, "height": 1285 },
"settings": {
  "autoPlay": false,
  "loop": false,
  "minScale": 0.01,
  "maxScale": 5,
  "ease": 0.08,
  "contentZoomRatio": 0.9,
  "preFullViewDuration": 0.4,
  "postFullViewDuration": 0.4
}
```

### 步骤 C：批量查组件 API（硬规则）

把 design.md 步骤 7 列出的所有 `type + variant` 组合去重，一次性调 API：

```js
const { queryComponentSpecBatch } = require('../../scripts/query-api');

const types = uniqueByTypeVariant(组件清单);  // 最多 20 个一批
const { specs } = await queryComponentSpecBatch(types);
```

把返回的 `content / color / typography / layout / effect / hardcoded` 缓存到本地变量备用。

> **[硬规则] 此步骤不可跳过。** 即使 design.md 步骤 7 里已经写了组件示例，也必须重新查 API。API 返回的字段定义是唯一权威来源。API 失败时直接停下，不允许凭记忆硬写。

### 步骤 D：按区域逐个生成 components

对 design.md 的每个区域：

```js
for (let region of design.regions) {
  for (let comp of region.组件清单) {
    project.components.push({
      id: comp.id,
      type: comp.type,
      fullRow: comp.fullRow || undefined,
      content: comp.content,                  // 从步骤 7
      position: comp.position,                 // 从步骤 6
      customStyle: comp.customStyle,           // 从步骤 9（只用 API 字段）
      start: comp.start,                       // 从步骤 10
      end: comp.end,                           // 从步骤 10
      children: comp.children || undefined     // AggregateComponent
    });
  }
}
```

### 步骤 E：素材清单引用

把 design.md 素材清单中**所有非空状态的素材**，挂到 `ImageComponent.content.image`：

| design.md 状态 | project.json 写法 |
|---|---|
| `[已具备]` | `"image": "./assets/images/{file}"`（真实路径） |
| `[AI 自动生成 - 占位]` | Picsum URL + AggregateComponent 叠水印（详见 visual-richness-rules.md 门槛 4） |
| `[待用户提供]` | 也用占位图，备注列写"用户提供后替换" |

**素材清单实现率必须 = 100%**（详见 visual-richness-rules.md 门槛 4）。

### 步骤 F：本地自检（必须）

写完后立即调 `scripts/validate.js` 做本地自检（仅节奏 / 布局 / 时间轴，B 方案 v2.0）：

```js
const { validate } = require('./scripts/validate');
const result = validate(projectJsonPath);
if (!result.valid) {
  // 列出 result.errors 并修复，不能进入打包
}
```

自检失败 → 回到 §4 修复对应字段；通过 → 保存到 `{workdirRoot}/{skillProjectId}/project.json`。

> **注意**：schema 结构、customStyle 字段级、audio/subtitles 共生 等"硬错"由云端 `/api/projects/validate` 在 `upload-video.js` 的 Step 0 自动权威校验，本地 validate.js 不再做这些检查。打包前的本地自检只保证"节奏 / 布局 / 时间轴"等设计规则正确。

---

## 5. 完整示例（一个 P1 区域）

### 5.1 design.md 节选

**步骤 7 组件清单（P1）**：

| ID | 类型 | 内容 |
|---|---|---|
| P1-001 | TitleComponent | text="AI 让一切变简单" |
| P1-002 | TextComponent | text="从 30 分钟到 30 秒" |
| P1-003 | ImageComponent | image="hook.svg" |

**步骤 6 布局（P1）**：

| ID | x | y | w | h |
|---|---|---|---|---|
| P1-001 | 20 | 30 | 740 | 70 |
| P1-002 | 20 | 115 | 740 | 50 |
| P1-003 | 20 | 180 | 740 | 360 |

**步骤 9 customStyle（P1，部分）**：

```jsonc
"P1-001.customStyle": {
  "level1": { "color": "#111827", "fontSize": "48px", "fontWeight": "900" }
}
```

**步骤 10 时间轴（P1）**：

| ID | start | end |
|---|---|---|
| P1-001 | 0 | 8 |
| P1-002 | 1.5 | 8 |
| P1-003 | 6 | 8 |

### 5.2 翻译成 project.json 节选

```jsonc
{
  "components": [
    {
      "id": "P1-001",
      "type": "TitleComponent",
      "fullRow": true,
      "content": { "text": "AI 让一切变简单", "level": 1 },
      "position": { "x": 20, "y": 30, "w": 740, "h": 70 },
      "customStyle": {
        "level1": { "color": "#111827", "fontSize": "48px", "fontWeight": "900" }
      },
      "start": 0,
      "end": 8
    },
    {
      "id": "P1-002",
      "type": "TextComponent",
      "content": { "text": "从 30 分钟到 30 秒", "style": "paragraph" },
      "position": { "x": 20, "y": 115, "w": 740, "h": 50 },
      "customStyle": {
        "paragraph": { "color": "#374151", "fontSize": "20px" }
      },
      "start": 1.5,
      "end": 8
    },
    {
      "id": "P1-003",
      "type": "ImageComponent",
      "content": {
        "image": "./assets/placeholders/light/hook.svg",
        "fit": "cover",
        "borderRadius": 0
      },
      "position": { "x": 20, "y": 180, "w": 740, "h": 360 },
      "start": 6,
      "end": 8
    }
  ]
}
```

---

## 6. 自检（必须）

生成 project.json 后必须通过：

1. **scripts/validate.js**：本地节奏 / 布局 / 时间轴自检（B 方案 v2.0 后只保留这一层）
2. **selfcheck-rules.md L0~L4**：人工自检填进 design.md 步骤 11
3. **云端 `/api/projects/validate`**：由 `upload-video.js` 在打包后、上传前自动调用，做 schema 结构 + customStyle 字段级 + audio/subtitles 共生 等权威校验（不可跳过）

只有三步都通过才能进入第四次交互的打包+上传环节。

---

## 7. 与其他文档的关系

| 文档 | 在本子流程中的作用 |
|---|---|
| [`./video_design_guide.md`](./video_design_guide.md) | 上一步骤：写 design.md 的子流程 |
| [`../../references/mode-rules.md`](../../references/mode-rules.md) | audio/subtitles 字段写法 |
| [`../../references/themes-catalog.md`](../../references/themes-catalog.md) | theme 字段值 |
| [`../../references/layout-rules.md`](../../references/layout-rules.md) | viewport/canvas/regions 公式 + position 约束 |
| [`../../references/timing-rules.md`](../../references/timing-rules.md) | settings 参数 + start/end 节奏门槛 |
| [`../../references/components-catalog.md`](../../references/components-catalog.md) | 组件字段 API |
| [`../../references/visual-richness-rules.md`](../../references/visual-richness-rules.md) | 素材清单实现率门槛 |
| [`../../references/selfcheck-rules.md`](../../references/selfcheck-rules.md) | 生成后自检 |
| [`../../references/api-rules.md`](../../references/api-rules.md) | 工作目录路径 + 上传接口 |

---

## 8. 严禁清单

- ❌ 跳过 §3.1 的 batch API 调用直接编 customStyle 字段名（API 调不通时也不允许凭记忆硬写）
- ❌ **非 AggregateComponent 组件漏写 customStyle 字段**（即使无样式也要写空对象 `{}`，详见 §3）
- ❌ position 用全局 canvas 坐标（必须是区域内相对坐标）
- ❌ start/end 用区域内相对时间（必须是视频全局秒数）
- ❌ 漏掉 `viewport` / `canvas` / `regions` / `settings` 任一字段
- ❌ 创作模式写 `subtitles` / `audio` 用法判定错误（详见 mode-rules.md §3）
- ❌ 素材清单里有 N 个素材但 project.json 引用 ≠ N
- ❌ 跳过 validate.js（本地自检）或绕过 upload-video.js 的云端 precheck 直接打包上传
- ❌ project.json 写到 design.md 旁边以外的位置
