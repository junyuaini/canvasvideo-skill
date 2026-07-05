# 步骤3：骨架设计（口播模式）

> 前置步骤：[步骤1：初始化](01-init.md) + [步骤2：音频与字幕准备](02-voice-prepare.md)
> 下一步：[步骤4：生成骨架JSON](04-skeleton-build.md)

---

## 目标

基于用户提供的音频+SRT字幕，设计视频整体结构：语义分段、区域划分、情绪分配。

> ⚠️ **核心原则**：字幕是系统自动显示的前提条件，画面是字幕的**视觉翻译**，不是重复。画面设计在区域设计阶段完成。

---

## 输入

| 来源 | 说明 |
|------|------|
| 用户输入 | 音频文件 + SRT字幕文件（由 [步骤 2](02-voice-prepare.md) 复制到 `assets/voice/voice.mp3` 和 `assets/subtitles/subtitle.srt`） |
| 状态文件 | `state.voice` 字段（由 prepare-voice.js 写入，含 audioPath/srtPath/duration/subtitleCount） |

> 💡 **步骤 2 是口播模式的硬性前置**：未跑 prepare-voice.js 就跑步骤 3，状态文件 `state.voice` 为空，步骤 4 生成 skeleton.json 时会直接报错（详见 [generate-skeleton.js:252](file:///D:/TRAE%20SOLO/%E8%A7%86%E9%A2%91%E5%88%B6%E4%BD%9C/CanvasVideo-All/canvasvideo-skill/scripts/generate-skeleton.js#L252)）。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| design-skeleton-dubbing.md | `{workdir}/{skillProjectId}/design-skeleton-dubbing.md` | 口播模式骨架设计文档 |

---

## 前置概念（设计前需了解）

### 1. 风格定义

| 风格 | 对外名称 | 适用内容 | 视觉特征 |
|------|---------|---------|---------|
| warm | 温情风 | 情感、故事、生活 | 暖色调、柔和 |
| tech | 科技风 | 数据、产品、未来 | 冷色调、几何 |
| business | 商务风 | 商业、职场、专业 | 深蓝/灰色、稳重 |
| art | 艺术风 | 创意、文化、美学 | 大胆配色、设计感 |

### 2. 区域类型

| 类型 | 功能 | 适用场景 | 建议时长 |
|------|------|---------|---------|
| Hook | 开头抓眼 | 任何视频开头 | 2-3 秒 |
| Point | 核心观点 | 观点文、结论段 | 3-5 秒 |
| Data | 数字统计 | 报告、论证 | 4-6 秒 |
| Story | 场景案例 | 故事文、情感文 | 5-8 秒 |
| Step | 方法流程 | 教程文、指南 | 5-8 秒 |
| Quote | 引用证言 | 增强可信度 | 3-5 秒 |
| CTA | 结尾引导 | 任何视频结尾 | 3-5 秒 |
| Contrast | 对比反差 | 论证、说服 | 4-6 秒 |
| List | 列举清单 | 盘点、推荐 | 5-8 秒 |
| Timeline | 时间线 | 历史、回顾 | 5-10 秒 |
| Q&A | 问答设问 | 科普、解惑 | 3-5 秒 |
| Scene | 场景还原 | 故事、沉浸 | 5-8 秒 |
| Emotion | 情绪渲染 | 情感、共鸣 | 3-5 秒 |
| Summary | 总结归纳 | 中段或结尾 | 3-5 秒 |

### 3. 情绪强度

| 强度 | 含义 | 画面特征 |
|-----|------|---------|
| 低 | 平静、克制、留白 | 元素少、节奏慢、颜色淡 |
| 中 | 正常叙述、信息传递 | 元素适中、节奏平稳 |
| 高 | 冲击、高潮、强调 | 元素多、节奏快、颜色饱和 |

---

## 设计步骤

### 步骤1：确定风格和背景

| 输入 | 说明 | 默认值 |
|------|------|--------|
| 风格 | warm/tech/business/art | warm |
| 背景 | black/white | black |

**风格选择依据**：
- 内容偏向情感、故事、生活 → warm
- 内容偏向数据、产品、技术 → tech
- 内容偏向商业、职场、专业 → business
- 内容偏向创意、文化、美学 → art

**背景选择依据**：
- 用户未指定时，默认 white
- 商务、教学、科普、案例、产品演示 → white
- 代码、AI、技术、数据看板、品牌发布 → black

**严禁**：
- ❌ 使用非 white/black 的主题
- ❌ 同一项目混用 white/black

---

### 步骤2：SRT 时间轴总览

> 字幕文件已由步骤 2 复制到 `assets/subtitles/subtitle.srt`，AI 直接读 `state.voice.srtPath` 路径即可。

| 序号 | 开始 | 结束 | 时长 | 字幕内容 |
|------|------|------|------|----------|
| 1 | 0.000 | 3.500 | 3.5s | ... |
| 2 | 3.500 | 6.200 | 2.7s | ... |
| ... | ... | ... | ... | ... |

**总时长**：{state.voice.duration} 秒
**字幕条数**：{state.voice.subtitleCount} 条

---

### 步骤3：推断区域数

| 总时长 | 建议区域数 | 情绪曲线建议 |
|--------|-----------|------------|
| 10-15 秒 | 2-3 个 | 起伏型 |
| 15-30 秒 | 3-4 个 | 起伏型 |
| 30-60 秒 | 4-5 个 | 起伏型 |
| 60-90 秒 | 5-7 个 | 波浪型 |
| 90-120 秒 | 7-9 个 | 波浪型 |
| 120-180 秒 | 9-12 个 | 波浪型 |
| 180-300 秒 | 12-15 个 | 波浪型+分段高潮 |
| 300秒+ | 15-20 个 | 波浪型+章节结构 |

总时长以音频/SRT为准，按上表推断区域数。

---

### 步骤4：选择情绪曲线模板

| 模板 | 曲线 | 适合场景 |
|------|------|---------|
| 起伏型 | 中→高→中→高→中 | 大多数短视频 |
| 渐进型 | 低→中→高→更高→中 | 发布会、演讲 |
| 悬念型 | 高→低→中→高→低 | 悬疑、反转 |
| 对比型 | 中→高→低→高→中 | 对比论证 |
| 波浪型 | 中→高→中→高→低→中→高→中 | 60秒以上长视频 |

**选择原则**：
- 60秒以下：优先起伏型
- 60-90秒：优先波浪型
- 90秒以上：波浪型+章节结构

---

### 步骤5：语义分段并确定区域类型

**拆分原则**：
- 按语义自然分段，不是按句数硬切
- 一段一区域，每段3-8秒
- 语义边界信号：话题转换 / 逻辑转折 / 步骤递进 / 情绪变化

**常见区域类型**：

| 类型 | 适用场景 | 建议时长 |
|------|---------|---------|
| Hook | 视频开头抓眼 | 2-3 秒 |
| Point | 核心观点、结论 | 3-5 秒 |
| Step | 方法流程、步骤 | 5-8 秒 |
| CTA | 结尾引导行动 | 3-5 秒 |
| Emotion | 情绪渲染、共鸣 | 3-5 秒 |
| Story | 故事场景 | 5-8 秒 |

**开头必须是 Hook，结尾建议 CTA 或 Emotion**。

**边界处理**：
- 时长超过8秒 → 拆两个区域
- 时长不足3秒 → 与相邻区域合并

---

### 步骤6：生成并保存设计文档

按上述设计步骤完成后，将结果填入模板 `templates/artifacts/design-skeleton-dubbing.md`，保存到：
`{workdir}/{skillProjectId}/design-skeleton-dubbing.md`

**模板结构（3 个表格）**：

1. **项目配置（JSON）** — 视频基本信息
2. **SRT 时间轴** — 字幕原文（来自步骤 2 产物）
3. **区域列表** — 含"区域 ID / 区域名称(4-12字) / 类型 / 包含字幕 / 情绪 / 内容描述"6 列

**项目配置（JSON）字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| name | ✅ | 视频名称 |
| description | ❌ | 视频描述 |
| mode | ✅ | 固定为 `"dubbing"` |
| theme | ❌ | 背景主题 `white`（默认）/ `black` |
| duration | ❌ | 总时长（会被 SRT 最后一帧 end 自动覆盖） |
| viewport | ✅ | 视口尺寸，默认 `{"width":780,"height":585}` |
| audio | ✅ | 音频路径 `{"path": "./assets/voice/voice.mp3"}` |
| style | ❌ | 视觉风格 `warm`（默认）/ `tech` / `business` / `art` |
| emotion_curve_template | ❌ | 情绪曲线模板 |
| subtitle_count | ❌ | 字幕总条数 |
| subtitle | ✅ | **必填**，字幕样式。3 字段：`enabled`(boolean) / `html`(string, **必须含 `.subtitle-text`**) / `css`(string)。参考 [rules/06-components.md §R8](rules/06-components.md#r8-字幕样式项目级必填) |

> ⚠️ **区域名称 4-12 字**：名称仅统计非空格字符，必须为 4-12 个字符。不符合则 generate-skeleton.js 报错。
> 💡 **`audio.path` 会被自动覆盖**——步骤 4 跑 generate-skeleton.js 时，会用 `state.voice.audioPath` 强制覆盖。
> 💡 **"时长(秒)"列不填**——由脚本按"包含字幕"自动从 SRT 算（保留 3 位小数）。

**`subtitle` 默认模板**（直接复制到项目配置 JSON 里）：

```json
"subtitle": {
  "enabled": true,
  "html": "<div class='subtitle-bar'><span class='subtitle-text'></span></div>",
  "css": ".subtitle-bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 24px; display: flex; justify-content: center; pointer-events: none; z-index: 200; }\n.subtitle-text { display: inline-block; padding: 4px 12px; border-radius: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 28px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.9); line-height: 1.4; }"
}
```

- ❌ 不要写 `color / fontSize / position / fontWeight / lineHeight / background` 这些老版本字段（已废弃，前端不读取）
- ❌ 不要省略 `subtitle`（server schema 会拒）
- ❌ HTML 里必须有 `<span class='subtitle-text'></span>`，否则前端写入文字失败

---

## 自检

**脚本自动校验**（generate-skeleton.js 执行时）：
- 口播模式"包含字幕"列可省略"时长(秒)"列，由脚本按 SRT 自动算

**AI 写完后自查**：
- [E] 每个区域名称为 4-12 个字符（不含空格）
- [I] 情绪曲线有起伏
- [I] 字幕文本完全来自 SRT（AI 不要改写）
- [I] "包含字幕"列的范围必须连续无重叠（例：P1:1-6, P2:7-8, P3:9-17）

---

## 下一步

等待用户确认后 → [步骤4：生成骨架JSON](04-skeleton-build.md)

> **TTS 生成模式需同时确认音频和字幕**：若步骤 2 使用 TTS 生成配音，骨架设计文档生成后需将音频文件路径和字幕内容一并发给用户确认，用户确认后再进入步骤 4。用户未确认前不得自动推进。