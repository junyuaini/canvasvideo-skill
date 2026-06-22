# 合并 regions 为 project.json

> 本文档是 CanvasVideo Skill 主流程中"所有区域 JSON 生成后，合并为完整 project.json"的子流程。

---

## 1. 工作位置

```
{workdirRoot}/{skillProjectId}/
├── skeleton.json         ← 输入：骨架配置
├── regions/
│   ├── P1.json           ← 输入：区域1
│   ├── P2.json           ← 输入：区域2
│   └── ...               ← 输入：其他区域
└── project.json          ← ⭐ 本流程产出
```

---

## 2. 合并命令

```bash
node scripts/merge-regions.js {workdirRoot}/{skillProjectId}
```

或指定输出路径：
```bash
node scripts/merge-regions.js {workdirRoot}/{skillProjectId} {workdirRoot}/{skillProjectId}/project.json
```

---

## 3. 合并逻辑

### 步骤 1：读取骨架

从 `skeleton.json` 获取全局配置：
- `name`, `description`, `theme`, `duration`
- `viewport`, `canvas`, `settings`
- `audio`, `regions`

### 步骤 2：遍历区域

按 `skeleton.json` 中 `regions` 的顺序，读取 `regions/P{n}.json`：

```js
for (const region of skeleton.regions) {
  const regionData = require(`./regions/${region.name}.json`);
  
  // 合并组件
  project.components.push(...regionData.components);
  
  // 合并字幕
  project.subtitles.push(...regionData.subtitles);
}
```

### 步骤 3：排序

按 `start` 时间排序：

```js
project.components.sort((a, b) => a.start - b.start);
project.subtitles.sort((a, b) => a.start - b.start);
```

### 步骤 4：验证

检查合并后的完整性：

| 检查项 | 说明 |
|--------|------|
| 组件总数 | 等于所有区域组件数之和 |
| 字幕总数 | 等于所有区域字幕数之和 |
| ID 唯一性 | 所有组件 ID 不重复 |
| 时间连续性 | 组件时间覆盖整个视频时长 |

---

## 4. 产出示例

```json
{
  "name": "AI时代如何学习",
  "description": "AI时代学习方式的短视频",
  "theme": "black",
  "duration": 60,
  "viewport": { "width": 1080, "height": 1920 },
  "canvas": { "width": 5000, "height": 1300 },
  "settings": { ... },
  "audio": { "path": "...", "loop": true, "fadeIn": 1, "fadeOut": 2 },
  "regions": [
    { "name": "P1", "x": 120, "y": 50 },
    { "name": "P2", "x": 900, "y": 50 },
    { "name": "P3", "x": 1680, "y": 50 },
    { "name": "P4", "x": 2460, "y": 50 }
  ],
  "components": [
    // P1 的组件
    { "id": "P1-001", "type": "TitleComponent", ... },
    { "id": "P1-002", "type": "ShockComponent", ... },
    // P2 的组件
    { "id": "P2-001", "type": "BadgeComponent", ... },
    { "id": "P2-002", "type": "ImageComponent", ... },
    // ... 其他区域组件
  ],
  "subtitles": [
    // P1 的字幕
    { "start": 0, "end": 2.5, "text": "..." },
    // P2 的字幕
    { "start": 2.5, "end": 5, "text": "..." },
    // ... 其他区域字幕
  ]
}
```

---

## 5. 自检清单

合并完成后，必须检查：

- [ ] `project.json` 是合法 JSON
- [ ] 包含所有全局字段（name, theme, duration, viewport, canvas, settings, audio, regions）
- [ ] `components` 数组不为空
- [ ] 所有组件 ID 唯一
- [ ] 组件按 `start` 时间排序
- [ ] 字幕按 `start` 时间排序（仅配音模式）
- [ ] 总时长与 `duration` 一致

---

## 6. 下一步

`project.json` 生成后：
1. 运行 `scripts/validate.js` 做本地校验
2. 运行 `scripts/package.js` 打包为 zip
3. 运行 `scripts/upload-video.js` 上传
