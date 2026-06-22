# 从 design-P{n}.md 生成 regions/P{n}.json

> 本文档是 CanvasVideo Skill 主流程中"区域设计确认后，生成区域 JSON"的子流程。

---

## 1. 工作位置

```
{workdirRoot}/{skillProjectId}/
├── design-P{n}.md        ← 输入：区域设计文档
├── skeleton.json         ← 参考：骨架配置
├── regions/
│   └── P{n}.json         ← ⭐ 本流程产出
└── assets/
    └── images/
```

写入路径：`{workdirRoot}/{skillProjectId}/regions/P{n}.json`

---

## 2. 字段映射

| design-P{n}.md | regions/P{n}.json 字段 | 说明 |
|---|---|---|
| regionId | `regionId` | 区域标识（如 "P1"） |
| 步骤 8：字幕时间轴 | `subtitles: [{ start, end, text }]` | 区域字幕 |
| 步骤 4-5：组件清单 | `components: [...]` | 区域组件 |
| 步骤 6：customStyle | `components[].customStyle` | 组件样式 |
| 步骤 8：时间轴 | `components[].start/end` | 组件时间 |

---

## 3. 生成步骤

### 步骤 1：提取 regionId

从文件名或设计文档提取：
```json
{ "regionId": "P1" }
```

### 步骤 2：生成 subtitles（仅配音模式）

从设计文档的字幕时间轴转换：

```json
[
  { "start": 0, "end": 2.5, "text": "AI时代，学习即提问" },
  { "start": 2.5, "end": 5, "text": "善用工具，持续迭代" }
]
```

**注意**：
- BGM 模式：subtitles 为空数组 `[]`
- 配音模式：从 SRT 或设计文档提取

### 步骤 3：生成 components

从组件清单转换，每个组件需要：

#### 3.1 基础字段

| 字段 | 来源 | 示例 |
|------|------|------|
| `id` | 组件清单 | "P1-001" |
| `type` | 组件清单 | "TitleComponent" |
| `content` | 组件清单 | `{ "text": "...", "level": 1 }` |
| `position` | 组件清单 | `{ "x": 20, "y": 30, "w": 740, "h": 70 }` |
| `customStyle` | 步骤 6 | `{ "level1": { ... } }` |
| `start` | 时间轴 | 0 |
| `end` | 时间轴 | 5 |

#### 3.2 必须先调 API

```js
// 必须先调 API 获取组件规范
const { queryApi } = require('./scripts/query-api');
const specs = await queryApi.batchGetComponentSpec(['TitleComponent', 'ShockComponent']);
```

**严禁凭记忆填写 customStyle 字段！**

#### 3.3 组件示例

```json
{
  "id": "P1-001",
  "type": "TitleComponent",
  "content": {
    "text": "AI时代，学习即提问",
    "level": 1,
    "align": "center"
  },
  "position": {
    "x": 20,
    "y": 30,
    "w": 740,
    "h": 70
  },
  "customStyle": {
    "level1": {
      "fontSize": "48px",
      "fontWeight": "900",
      "color": "#FFFFFF",
      "lineHeight": "1.1"
    }
  },
  "start": 0,
  "end": 5
}
```

### 步骤 4：验证时间范围

检查组件时间是否在区域时间范围内：

```js
// 从 skeleton.json 获取区域时间范围
const skeleton = require('./skeleton.json');
const regionIndex = 0; // P1 的索引
const regionStart = 0; // 或从骨架计算
const regionEnd = 10;  // P1 的结束时间

// 验证每个组件
components.forEach(comp => {
  if (comp.start < regionStart || comp.end > regionEnd) {
    console.warn(`警告: ${comp.id} 时间超出区域范围`);
  }
});
```

---

## 4. 产出示例

```json
{
  "regionId": "P1",
  "subtitles": [
    {
      "start": 0,
      "end": 2.5,
      "text": "AI时代，学习即提问"
    },
    {
      "start": 2.5,
      "end": 5,
      "text": "善用工具，持续迭代"
    }
  ],
  "components": [
    {
      "id": "P1-001",
      "type": "TitleComponent",
      "content": {
        "text": "AI时代，学习即提问",
        "level": 1,
        "align": "center"
      },
      "position": {
        "x": 20,
        "y": 30,
        "w": 740,
        "h": 70
      },
      "customStyle": {
        "level1": {
          "fontSize": "48px",
          "fontWeight": "900",
          "color": "#FFFFFF",
          "lineHeight": "1.1"
        }
      },
      "start": 0,
      "end": 5
    },
    {
      "id": "P1-002",
      "type": "ShockComponent",
      "content": {
        "text": "善用工具，持续迭代"
      },
      "position": {
        "x": 120,
        "y": 120,
        "w": 540,
        "h": 80
      },
      "customStyle": {
        "color": "linear-gradient(135deg, #06B6D4 0%, #A855F7 100%)",
        "textColor": "#FFFFFF",
        "padding": "16px 32px",
        "borderRadius": "16px",
        "fontSize": "36px",
        "fontWeight": "800",
        "border": "none",
        "shadow": "0 4px 16px rgba(6,182,212,0.3)"
      },
      "start": 1.5,
      "end": 5
    }
  ]
}
```

---

## 5. 自检清单

生成 `regions/P{n}.json` 后，必须检查：

- [ ] `regionId` 与文件名一致
- [ ] 组件总数 ≤ 5 个
- [ ] 每个组件有 `id`, `type`, `content`, `position`, `customStyle`, `start`, `end`
- [ ] `id` 格式正确（如 P1-001）
- [ ] `customStyle` 字段已按 API 规范填写
- [ ] 时间轴无重叠（同一区域组件）
- [ ] 字幕时间与组件内容匹配（仅配音模式）
- [ ] 图片路径已标注（如有 ImageComponent）

---

## 6. 下一步

`regions/P{n}.json` 生成后：
1. 用户确认
2. 继续生成下一个区域（P{n+1}.json）
3. 全部区域完成后，执行 `merge-regions.md`
