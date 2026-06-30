# 视频骨架设计（口播模式）

---

## 1. 项目配置（JSON）

```json
{
  "name": "",
  "description": "",
  "mode": "dubbing",
  "theme": "",
  "viewport": {"width": 780, "height": 585},
  "audio": {"path": "./assets/voice/voice.mp3"},
  "style": "",
  "emotion_curve_template": "",
  "subtitle_count": ,
  "subtitle": {
    "enabled": true,
    "html": "<div class='subtitle-bar'><span class='subtitle-text'></span></div>",
    "css": ".subtitle-bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 24px; display: flex; justify-content: center; pointer-events: none; z-index: 200; }\n.subtitle-text { display: inline-block; padding: 4px 12px; border-radius: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 28px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.9); line-height: 1.4; }"
  }
}
```

---

## 2. SRT 时间轴

| 序号 | 开始 | 结束 | 时长 | 字幕内容 |
|------|------|------|------|----------|
| 1 | | | | |
| ... | ... | ... | ... | ... |

---

## 3. 区域列表

| 区域 ID | 区域名称 | 类型 | 包含字幕 | 情绪 | 内容描述 |
|------|---------|------|---------|------|----------|
| P1 | | | | | |
| ... | ... | ... | ... | ... | ... |
