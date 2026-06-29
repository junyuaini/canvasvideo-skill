# 项目模板索引

> 本目录是 LLM 生成 project.json 时的"参考样板库"。
> **分合示例-口播**覆盖口播模式的完整工作流。

---

## 分合示例-口播/（口播模式 · 演示 SRT 字幕 + 配音）

- **场景**：用户提供音频 + SRT 字幕，AI 按节奏排版画面
- **特点**：
  - 有配音音频：`audio.path` + `loop: false`
  - `subtitles` 必填，每行 100% 来自 SRT
  - 画面元素 start/end 必须覆盖对应字幕时间段（画面是字幕的视觉翻译）
- **包含**：
  - `skeleton.json` — 骨架，定义全局元信息（theme/viewport/audio）和 regions 时长分配
  - `regions/P1.json` — 单个区域的 components，由该区域单独设计
  - `regions/P2.json` — 同上
  - `merged.json` — 由 `node scripts/merge-regions.js` 合并产物

每个区域一个 HtmlComponent。HTML/CSS 用 absolute 定位还原原 position 坐标，元素时间线通过 `content.elementIds` 控制。

---

## ⚠️ 使用注意

1. **示例只是参考样板，不要直接复制粘贴**：HtmlComponent ID（如 P1-001）、元素 ID（如 P1-002）、文案、时间轴必须根据用户实际需求重新生成
2. **assets 路径必须改**：`assets/placeholders/voiceover/*.mp3` → 实际配音路径
3. **time/duration 必须改**：示例的时长是固定的，新项目按用户的视频长度调整
4. **theme 通常保留 white**：除非用户明确要求黑色/深色调
5. **口播模式 subtitles 必填**，且 100% 来自用户 SRT，严禁 LLM 自行生成或改写
