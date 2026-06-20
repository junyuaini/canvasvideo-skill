# CanvasVideo Skill

> 通过自然语言一键生成可分享的画布视频（H5）。
> 适用于 AI Agent / Trae 等支持 Skill 协议的工具，无需手写代码。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 这是什么

**CanvasVideo Skill** 是一份给 AI Agent 安装的"技能包"。装上之后，你可以用自然语言告诉 AI：

> 帮我做一个 3 分钟的大模型科普视频，要轻松一点的风格

AI 会自动：

1. **理解你的需求**，温和追问基本信息（创作模式 or 口播模式 / 时长 / 风格）
2. **在本地生成设计文档** `design.md`，含详尽的素材准备清单
3. **多轮微调**，直到你确认满意
4. **打包并上传到云端**，给你一个可分享的视频链接
5. **后续迭代**直接在已有项目上修改，链接保持不变

---

## 安装

把本仓库克隆到你的 AI 工具的 Skill 目录下即可：

```bash
git clone git@github.com:junyuaini/canvasvideo-skill.git
```

或者直接告诉 AI：

> 请帮我安装这个 Skill：https://github.com/junyuaini/canvasvideo-skill

AI 会处理后续步骤。

---

## 使用

直接在 AI 对话里说：

```
帮我做一个关于 RAG 应用的科普视频，3 分钟，给开发者看的
```

或者：

```
我想做一个口播视频，音频在 D:/audio.mp3，字幕在 D:/sub.srt
```

AI 会按 Skill 内置的流程引导你：理解需求 → 生成本地设计 → 多轮微调 → 上传 → 给你视频链接。

### 视频迭代

视频上线后，你可以随时说：

```
把背景音乐换成 D:/new-music.mp3
第二章节改成讲混合检索
```

Skill 会直接更新已有视频，分享链接保持不变。

---

## 工作模式

| 模式 | 用户提供 | AI 负责 |
|------|---------|--------|
| **创作模式** | 主题 / 时长 / 风格等文本信息 | 自动生成解说、字幕、占位素材 |
| **口播模式** | 口播音频 + SRT 字幕 | 严格按音频/SRT 排版，自动生成其他素材 |

---

## 文件结构

```
canvasvideo-skill/
├── SKILL.md                   # Skill 主入口（AI 读这个文件理解能力）
├── README.md                  # 本文件
├── LICENSE                    # MIT
├── scripts/
│   ├── upload-video.js        # 上传脚本
│   ├── scaffold.js            # 工作目录与素材脚手架
│   ├── state.js               # 项目本地状态
│   ├── validate.js            # 校验 project.json
│   └── package.js             # 打包 zip
├── schema/
│   └── project.schema.json    # 视频项目 Schema
└── templates/
    ├── designs/               # 设计文档模板
    └── projects/              # 视频项目模板
```

---

## 参与贡献

欢迎 PR / issue。本仓库主要内容：

- `SKILL.md` — Skill 协议入口（不要改文件名）
- `scripts/` — Node.js 脚本，维持 CommonJS 写法以便老 AI 工具兼容
- `templates/` — 设计 / 视频模板，按场景命名

---

## License

[MIT](./LICENSE) © DaJiu
