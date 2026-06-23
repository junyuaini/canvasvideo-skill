# 步骤3：生成骨架JSON

> 前置步骤：[步骤2：骨架设计](02-skeleton-design-creative.md)
> 下一步：[步骤4：区域设计](04-region-design-creative.md)

---

## 目标

从 design-skeleton 生成 skeleton.json。

---

## 输入

| 来源 | 说明 |
|------|------|
| 上一步产出 | `design-skeleton-creative.md` 或 `design-skeleton-dubbing.md` |

---

## 操作

### 第 1 步：读取设计文档

```js
const fs = require('fs');
const path = require('path');

const designFile = isDubbingMode ? 'design-skeleton-dubbing.md' : 'design-skeleton-creative.md';
const designPath = path.join(workdirRoot, skillProjectId, designFile);
const designContent = fs.readFileSync(designPath, 'utf-8');
```

### 第 2 步：提取信息

从设计文档提取：
- 项目元信息（name, theme, duration）
- 区域划分（regions）
- 视觉策略（viewport, canvas）
- 音频配置（audio，从 state 或 design-skeleton 读取）

### 第 3 步：配置 audio

根据模式配置 audio 字段：

```jsonc
// 创作模式（BGM）
"audio": {
  "path": "./assets/placeholders/bgm/{风格}.mp3",
  "loop": true,
  "fadeIn": 1,
  "fadeOut": 2
}

// 口播模式（配音）
"audio": {
  "path": "./assets/voice.mp3"
}
```

**校验规则**：

| 项 | 规则 |
|----|------|
| 路径不存在/扩展名不支持 | 阻塞进入下一步，要求重新提供 |
| 路径含 `..` 等穿越字符 | 拒绝拷贝 |

**素材白名单（硬规则）**：
- ✅ 只允许：音频文件、字幕文件
- ❌ 严禁将 `.txt/.doc/.png/.jpg/.pdf/.mp4` 等作为创作依据
- ❌ 严禁擅自挑选素材（多个音频/SRT时必须跟用户确认）

| 场景 | audio写法 | subtitles |
|------|----------|-----------|
| 创作模式（BGM）| 对象，含 `loop: true` | ❌ 严禁有 |
| 口播模式（配音）| 字符串或对象无loop | ✅ 必须有 |

**BGM 风格匹配（创作模式）**：

| 视频主题/关键词 | 选用 BGM |
|---|---|
| AI / 编程 / 算法 / 数据 / 科技 | `tech-pulse` |
| 咖啡 / 餐饮 / 生活方式 / 温馨 | `warm-cafe` |
| 创业 / 成长 / 励志 / 教育 | `uplifting` |
| 企业 / B2B / 演示 / 商务 | `corporate` |
| 教程 / 科普 / Vlog / 轻松 | `light-pop` |
| 旅行 / 纪录片 / 大场面 | `cinematic` |
| 不明确 | `corporate`（默认） |

**用户主动拒绝BGM**：不写audio字段，视频静音播出。

### 第 4 步：生成 skeleton.json

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

### 第 5 步：创建 regions 目录

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

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] name 不为空
- [E] duration > 0
- [E] theme 是 black 或 white
- [E] regions 数组不为空
- [E] audio 格式正确（对象格式）
- [W] canvas 尺寸能容纳所有区域

---

## 下一步

进入 [步骤4：区域设计](04-region-design-creative.md)
