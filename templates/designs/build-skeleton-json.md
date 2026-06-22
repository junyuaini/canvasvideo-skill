# 从 design-skeleton.md 生成 skeleton.json

> 本文档是 CanvasVideo Skill 主流程中"骨架设计确认后，生成 skeleton.json"的子流程。

---

## 1. 工作位置

```
{workdirRoot}/{skillProjectId}/
├── design-skeleton.md    ← 输入：骨架设计文档
├── skeleton.json         ← ⭐ 本流程产出
└── regions/              ← 区域目录（后续生成）
```

写入路径：`{workdirRoot}/{skillProjectId}/skeleton.json`

---

## 2. 字段映射

| design-skeleton.md | skeleton.json 字段 | 说明 |
|---|---|---|
| 步骤 0：项目元信息 | `name`, `description`, `theme`, `duration` | 顶层元信息 |
| 步骤 0：音频用途 | `audio` | BGM 模式：对象格式 `{ path, loop, fadeIn, fadeOut }` |
| 步骤 4：viewport 比例 | `viewport: { width, height }` | 从主题或用户指定获取 |
| 步骤 4：区域规划表 | `regions: [{ name, x, y }]` | 每个区域的位置 |
| 步骤 4：canvas | `canvas: { width, height }` | 根据区域数计算 |
| 步骤 5：settings | `settings: { ... }` | 默认设置或用户指定 |

---

## 3. 生成步骤

### 步骤 1：提取基础信息

从 `design-skeleton.md` 提取：
- `name`：视频名称
- `description`：视频描述
- `theme`：主题（black / white）
- `duration`：总时长（秒）

### 步骤 2：生成 audio

根据音频用途：

**BGM 模式**：
```json
{
  "path": "assets/placeholders/bgm/{bgmStyle}.mp3",
  "loop": true,
  "fadeIn": 1,
  "fadeOut": 2
}
```

**配音模式**：
```json
{
  "path": "./assets/{skillProjectId}/audio.mp3",
  "loop": false
}
```

**静音模式**：不设置 `audio` 字段

### 步骤 3：生成 viewport

从主题配置获取：
```js
const themeConfig = require(`../../templates/themes/${theme}.json`);
const viewport = themeConfig.viewport;
```

或用户指定：
```json
{ "width": 1080, "height": 1920 }
```

### 步骤 4：生成 regions

从区域规划表转换：

```json
[
  { "name": "P1", "x": 120, "y": 50 },
  { "name": "P2", "x": 900, "y": 50 },
  { "name": "P3", "x": 1680, "y": 50 }
]
```

**坐标计算**：
- 每个区域宽度 = viewport.width + 间距
- x 坐标 = 前一个 x + 区域宽度
- y 坐标 = 固定值（通常 50）

### 步骤 5：生成 canvas

```js
const regionWidth = viewport.width + 120; // 含间距
const canvasWidth = regions.length * regionWidth + 120;
const canvasHeight = viewport.height + 100;
```

### 步骤 6：生成 settings

使用默认设置：
```json
{
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

---

## 4. 产出示例

```json
{
  "name": "AI时代如何学习",
  "description": "AI时代学习方式的短视频",
  "theme": "black",
  "duration": 60,
  "viewport": {
    "width": 1080,
    "height": 1920
  },
  "canvas": {
    "width": 5000,
    "height": 1300
  },
  "settings": {
    "autoPlay": false,
    "loop": false,
    "minScale": 0.01,
    "maxScale": 5,
    "ease": 0.08,
    "contentZoomRatio": 0.9,
    "preFullViewDuration": 0.4,
    "postFullViewDuration": 0.4
  },
  "audio": {
    "path": "assets/placeholders/bgm/tech-pulse.mp3",
    "loop": true,
    "fadeIn": 1,
    "fadeOut": 2
  },
  "regions": [
    { "name": "P1", "x": 120, "y": 50 },
    { "name": "P2", "x": 900, "y": 50 },
    { "name": "P3", "x": 1680, "y": 50 },
    { "name": "P4", "x": 2460, "y": 50 }
  ]
}
```

---

## 5. 自检清单

生成 `skeleton.json` 后，必须检查：

- [ ] `name` 不为空
- [ ] `duration` > 0
- [ ] `theme` 是 black 或 white
- [ ] `viewport` 有 width 和 height
- [ ] `regions` 数组不为空
- [ ] 每个 region 有 `name`, `x`, `y`
- [ ] `audio` 格式正确（对象格式）
- [ ] `canvas` 尺寸能容纳所有区域

---

## 6. 下一步

`skeleton.json` 生成后：
1. 用户确认（或直接进入分设计）
2. 按区域顺序，逐个执行 `region-design-guide.md`
3. 每个区域确认后，执行 `build-region-json.md`
