# 视频骨架设计（口播模式）：{主题}

> 口播模式：用户提供音频 + SRT 字幕，AI 负责画面设计。
>
> ⚠️ **关键**：本文件生成后，必须执行 `scripts/generate-skeleton.js` 自动生成 `skeleton.json`，严禁手动编写 JSON。

---

## 1. 项目配置（JSON）

```json
{
  "name": "",
  "description": "",
  "mode": "dubbing",
  "viewport": {"width": 780, "height": 585},
  "audio": {"path": "./assets/voice.mp3"},
  "subtitle": {
    "color": "#FFFFFF",
    "fontSize": "36px",
    "position": "bottom-center",
    "weight": 700,
    "background": "rgba(0,0,0,0.5)",
    "textShadow": "0 1px 3px rgba(0,0,0,0.8)"
  }
}
```

**字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| name | ✅ | 视频名称 |
| description | ❌ | 视频描述 |
| mode | ✅ | 固定为 `"dubbing"`，口播模式必填 |
| theme | ❌ 可选 | 背景主题 `white` / `black` |
| duration | ❌ 可选 | 总时长（秒）⚠️ **会被自动覆盖**：实际时长 = SRT 最后一帧 end |
| viewport | ✅ | 视口尺寸，默认 `{"width":780,"height":585}` |
| audio | ✅ | 口播音频配置 `{"path": "音频文件路径"}` |
| style | ❌ 可选 | 视觉风格 `warm` / `tech` / `business` / `art` |
| emotion_curve_template | ❌ 可选 | 情绪曲线类型 |
| subtitle_count | ❌ 可选 | SRT 字幕总条数 |
| subtitle | ✅ | 字幕样式（6 字段，项目级必填，参考 rules/06-components.md §R8） |

---

## 2. SRT 时间轴

| 序号 | 开始 | 结束 | 时长 | 字幕内容 |
|------|------|------|------|----------|
| 1 | 0.000 | 3.500 | 3.5s | ... |
| 2 | 3.500 | 6.200 | 2.7s | ... |
| ... | ... | ... | ... | ... |

---

## 3. 区域列表

> 每个区域一行，脚本自动提取生成 `regions` 数组。
>
> ⚠️ **口播模式：AI 不要填"时长(秒)"列**——时长由脚本按"包含字幕"自动从 SRT 算（保留 3 位小数）。
>
> 💡 **类型 + 情绪** 合并在此表里（不再单列时间轴和情绪曲线小节），方便 AI 一次写完。

| 区域 ID | 区域名称 | 类型 | 包含字幕 | 情绪 | 内容描述 |
|------|---------|------|---------|------|----------|
| P1 | 开场引入 | Hook | 1-2 | 高 | ... |
| P2 | 核心要点 | Point | 3-4 | 中 | ... |
| ... | ... | ... | ... | ... | ... |

**说明**：
- "类型"列：`Hook` / `Question` / `Point` / `Step` / `List` / `Emotion` / `CTA` / `Story` 等
- "情绪"列：填 `高` / `中` / `低`

---

## 自检清单

脚本自动校验：
- 按 SRT 自动算每个 region.duration（`末字幕.end - 首字幕.start`，3 位小数）
- 累加总时长 = SRT 最后一帧 end

AI 写完后自查：
- 字幕文本完全来自 SRT（不要改写）
- 包含字幕号范围连续无重叠
- "时长(秒)"列不用填（脚本自动算）
- 情绪曲线有起伏

---

## 示例：30秒"AI学习指南"

### 1. 项目配置（JSON）

```json
{
  "name": "AI学习指南",
  "description": "30秒口播：AI时代如何高效学习",
  "mode": "dubbing",
  "theme": "black",
  "viewport": {"width": 780, "height": 585},
  "audio": {"path": "./assets/voice.mp3"},
  "style": "tech",
  "emotion_curve_template": "起伏型",
  "subtitle_count": 8,
  "subtitle": {
    "color": "#FFFFFF",
    "fontSize": "36px",
    "position": "bottom-center",
    "weight": 700,
    "background": "rgba(0,0,0,0.5)",
    "textShadow": "0 1px 3px rgba(0,0,0,0.8)"
  }
}
```

### 2. SRT 时间轴

| 序号 | 开始 | 结束 | 时长 | 字幕内容 |
|------|------|------|------|----------|
| 1 | 0.000 | 3.500 | 3.5s | AI时代，学习即提问 |
| 2 | 3.500 | 6.200 | 2.7s | 善用工具，持续迭代 |
| 3 | 6.200 | 9.800 | 3.6s | 四步搞定任何技能 |
| 4 | 9.800 | 13.500 | 3.7s | 第一步：明确目标 |
| 5 | 13.500 | 17.200 | 3.7s | 第二步：找到最佳实践 |
| 6 | 17.200 | 21.000 | 3.8s | 第三步：快速试错 |
| 7 | 21.000 | 25.500 | 4.5s | 第四步：迭代优化 |
| 8 | 25.500 | 29.000 | 3.5s | 评论区领取完整指南 |

### 3. 区域列表

| 区域 ID | 区域名称 | 类型 | 包含字幕 | 情绪 | 内容描述 |
|------|---------|------|---------|------|----------|
| P1 | 开场引入 | Hook | 1-2 | 高 | AI时代，学习即提问 |
| P2 | 核心方法 | Point | 3-4 | 中 | 四步搞定任何技能 |
| P3 | 操作步骤 | Step | 5-6 | 高 | 快速试错，迭代优化 |
| P4 | 行动召唤 | CTA | 7-8 | 中 | 评论区领取完整指南 |

---

## 示例：90秒"人工智能发展史"（长视频章节结构）

### 1. 项目配置（JSON）

```json
{
  "name": "人工智能发展史",
  "description": "90秒口播：AI发展历程",
  "mode": "dubbing",
  "theme": "black",
  "viewport": {"width": 780, "height": 585},
  "audio": {"path": "./assets/voice.mp3"},
  "style": "tech",
  "emotion_curve_template": "波浪型",
  "subtitle_count": 18,
  "subtitle": {
    "color": "#FFFFFF",
    "fontSize": "36px",
    "position": "bottom-center",
    "weight": 700,
    "background": "rgba(0,0,0,0.5)",
    "textShadow": "0 1px 3px rgba(0,0,0,0.8)"
  }
}
```

### 章节划分

| 章节 | 包含字幕 | 区域范围 |
|------|---------|---------|
| 章节1 | 1-8 | P1-P5 |
| 章节2 | 9-14 | P6-P8 |
| 章节3 | 15-18 | P9-P10 |

### 2. SRT 时间轴

> 长视频此处省略，AI 按 SRT 实际填充。

### 3. 区域列表

| 区域 ID | 区域名称 | 类型 | 包含字幕 | 情绪 | 内容描述 |
|------|---------|------|---------|------|----------|
| P1 | 起源 | Story | 1 | 中 | 1956年，一个夏天的会议 |
| P2 | 起点 | Story | 2-3 | 中 | 达特茅斯：十个人，两个月 |
| P3 | 寒冬 | Point | 4-5 | 低 | 第一次寒冬，专家系统辉煌 |
| P4 | 教训 | Emotion | 6 | 中 | 早期AI教会了我们什么 |
| P5 | 复兴 | Hook | 7-8 | 高 | 2012年，ImageNet改变一切 |
| P6 | 突破 | Point | 9-10 | 高 | 从实验室到 AlphaGo |
| P7 | 应用 | List | 11-12 | 中 | AI三大应用领域 |
| P8 | 现状 | Point | 13-14 | 中 | 机遇与挑战并存 |
| P9 | 预测 | Point | 15-16 | 高 | 未来五年预测 |
| P10 | 升华 | Emotion | 17-18 | 高 | 未来属于善用AI的人 |