# 步骤3：生成骨架JSON

> 前置步骤：[步骤2：骨架设计](02-skeleton-design.md)
> 下一步：[步骤4：区域设计](04-region-design.md)

---

## 目标

从 design-skeleton.md 生成 skeleton.json。

---

## 输入

| 来源 | 说明 |
|------|------|
| 上一步产出 | `design-skeleton.md` |
| 引用规则 | `rules/03-layout.md`、`rules/02-mode.md` |

---

## 操作

### 第 1 步：读取设计文档

```js
const fs = require('fs');
const path = require('path');

const designPath = path.join(workdirRoot, skillProjectId, 'design-skeleton.md');
const designContent = fs.readFileSync(designPath, 'utf-8');
```

### 第 2 步：提取信息

从设计文档提取：
- 项目元信息（name, theme, duration）
- 区域划分（regions）
- 视觉策略（viewport, canvas, audio）

### 第 3 步：生成 skeleton.json

```js
const skeleton = {
  name: extractedName,
  description: extractedDescription,
  theme: extractedTheme,
  duration: extractedDuration,
  viewport: extractedViewport,
  canvas: extractedCanvas,
  settings: {
    autoPlay: false,
    loop: false,
    minScale: 0.01,
    maxScale: 5,
    ease: 0.08,
    contentZoomRatio: 0.9,
    preFullViewDuration: 0.4,
    postFullViewDuration: 0.4
  },
  audio: extractedAudio,
  regions: extractedRegions
};

fs.writeFileSync(
  path.join(workdirRoot, skillProjectId, 'skeleton.json'),
  JSON.stringify(skeleton, null, 2)
);
```

### 第 4 步：创建 regions 目录

```js
const regionsDir = path.join(workdirRoot, skillProjectId, 'regions');
if (!fs.existsSync(regionsDir)) {
  fs.mkdirSync(regionsDir, { recursive: true });
}
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| skeleton.json | `{workdir}/{skillProjectId}/skeleton.json` | 骨架配置 |
| regions/ | `{workdir}/{skillProjectId}/regions/` | 区域目录 |

---

## 自检

- [ ] name 不为空
- [ ] duration > 0
- [ ] theme 是 black 或 white
- [ ] regions 数组不为空
- [ ] audio 格式正确（对象格式）
- [ ] canvas 尺寸能容纳所有区域

---

## 下一步

进入 [步骤4：区域设计](04-region-design.md)
