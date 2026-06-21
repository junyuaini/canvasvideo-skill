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

把本仓库克隆到你的 AI 工具的 Skill 目录下：

```bash
git clone git@github.com:junyuaini/canvasvideo-skill.git
```

---

## 使用

直接在 AI 对话里说：

```
帮我做一个关于 RAG 应用的科普视频，3 分钟，给开发者看的
```

或者口播模式：

```
我想做一个口播视频，音频在 D:/audio.mp3，字幕在 D:/sub.srt
```

视频上线后随时迭代：

```
把背景音乐换成 D:/new-music.mp3
第二章节改成讲混合检索
```

链接保持不变，内容直接刷新。

---

## 工作模式

| 模式 | 用户提供 | AI 负责 |
|------|---------|--------|
| **创作模式** | 主题 / 时长 / 风格等文本信息 | 自动生成解说、字幕、占位素材、默认 BGM |
| **口播模式** | 口播音频 + SRT 字幕 | 严格按音频/SRT 排版，自动生成其他素材 |

---

## 文档结构（核心）

```
canvasvideo-skill/
├── SKILL.md                   # ⭐ 主流程文档（7 次交互编排，AI 必读）
├── README.md                  # 本文件（人类读的项目介绍）
├── LICENSE                    # MIT
├── .gitignore
│
├── references/                # 📚 规则原典（hard rule 单一来源）
│   ├── mode-rules.md          # 创作/口播模式 + 音频用法 + 字幕共生 + 默认 BGM
│   ├── themes-catalog.md      # 主题二选一：white / black + 选型 + 沟通话术
│   ├── timing-rules.md        # 节奏 4 条门槛 + settings 三参数
│   ├── layout-rules.md        # viewport/canvas/regions 公式 + 组件 Y/尺寸 + 对比度 + 多样化
│   ├── components-catalog.md  # 10 个组件选型决策树（字段走云端 API）
│   ├── visual-richness-rules.md # 丰富度 6 条门槛 + 评分 + 提升示例
│   ├── selfcheck-rules.md     # L0~L4 自检表 + 设计原则 + 丰富度评分
│   ├── principles.md          # 不打扰用户 + 不强行追问 + 凭证安全等基本原则
│   └── api-rules.md           # 服务端 API + 用户体系 + 工作目录路径推算
│
├── templates/                 # 🎨 模板（AI 生成时复制/参考）
│   ├── designs/
│   │   ├── video_design_guide.md  # design.md 步骤 0~11 子流程（被第二次交互调用）
│   │   └── build_project_json.md  # design.md → project.json 子流程（被第四次交互调用）
│   ├── projects/              # project.json 样板库
│   │   ├── README.md          # 样板选型指南
│   │   ├── 通用视频.json
│   │   ├── 示例-产品演示型-2分钟口播.json
│   │   └── 示例-案例分享型-1分钟口播.json
│   ├── placeholders/          # 占位图资源
│   │   ├── url-factory.md     # Picsum + Aggregate 水印速查
│   │   ├── light/             # 极简白主题 SVG 兜底图
│   │   └── dark/              # 沉浸黑主题 SVG 兜底图
│   └── bgm/                   # 内置 BGM
│       ├── bgm-catalog.md     # 6 首 BGM 风格匹配决策树
│       └── *.wav              # tech-pulse / warm-cafe / uplifting / corporate / light-pop / cinematic
│
└── scripts/                   # 🛠️ Node.js 工具脚本
    ├── scaffold.js            # 创建工作目录 + 拉取占位素材 + 写 design.md
    ├── state.js               # skillProjectId 管理 + 确认状态
    ├── validate.js            # 本地自检（仅节奏/布局，B 方案 v2.0 起不再做 schema 校验）
    ├── selfcheck.js           # 节奏 4 门槛 + 布局 Y 坐标
    ├── package.js             # 打包 zip 准备上传
    ├── upload-video.js        # 用户体系 + 云端 precheck + 上传
    ├── generate-bgm.js        # 生成合成 BGM（兜底）
    ├── download-incompetech.js / .ps1 # 拉取 Incompetech 真实 BGM
    └── test-*.js              # 自测脚本
```

---

## 文档分层（理解架构）

```
┌────────────────────────────────────────────────────────────┐
│ 流程文档（Workflow）                                          │
│                                                            │
│ ┌─ 主流程 ─────────────────────────────────────┐           │
│ │ SKILL.md  — 7 次交互的整体编排                 │           │
│ └────────────────────────────────────────────┘           │
│            ↓                                              │
│ ┌─ 子流程 1（第二次交互）──────────────────────┐           │
│ │ templates/designs/video_design_guide.md      │           │
│ │ design.md 步骤 0~11 子流程                     │           │
│ └────────────────────────────────────────────┘           │
│            ↓                                              │
│ ┌─ 子流程 2（第四次交互）──────────────────────┐           │
│ │ templates/designs/build_project_json.md      │           │
│ │ design.md → project.json 字段映射子流程        │           │
│ └────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘
              ↓ 引用（横切）
┌────────────────────────────────────────────────────────────┐
│ 规则原典（Rules）                                              │
│ references/*.md — 每条 hard rule 只在这里写一次                │
│ 被所有流程节点引用                                              │
└────────────────────────────────────────────────────────────┘
              ↓ 调用
┌────────────────────────────────────────────────────────────┐
│ 数据层（API + spec.json）                                      │
│ 云端 API: /cv/api/component/spec/batch                      │
│ 组件字段、默认值、写死项                                          │
└────────────────────────────────────────────────────────────┘
```

**核心思想**：
- **流程文档**回答"什么时候做什么"
- **规则原典**回答"做的时候要遵守什么"
- **数据层** API 回答"组件字段长什么样"

每一类信息只在它该在的地方维护，互相通过引用链接而不重复内容。

---

## AI 工作流速查

AI 第一次给你做视频时大致会这样走：

```
用户需求
   │
   ▼
[读 SKILL.md] ── 知道整体规则、强制门槛、API 端点
   │
   ▼
[阶段 0-2] 步骤 0~5：理解主题、规划区域、选主题
   │  ├─ 查 references/themes-catalog.md（选 white/black）
   │  └─ 查 templates/projects/README.md（选样板）
   │
   ▼
[阶段 3] 步骤 6~8：布局、选组件、节奏
   │  └─ 查 references/components-catalog.md（选型决策树）
   │
   ▼
[阶段 4] 步骤 9~10：写 customStyle + 时间轴
   │  └─ 调后端 API：POST /cv/api/component/spec/batch（拿字段规范）
   │
   ▼
[阶段 5] 步骤 11：自检
   │  └─ 查 references/visual-richness-rules.md（L4 丰富度门槛）
   │
   ▼
生成 design.md（用户确认）
   │
   ▼
生成 project.json
   │  ├─ 用 templates/placeholders/ 填占位图
   │  ├─ 创作模式：用 templates/bgm/ 默认配 BGM
   │  └─ 云端 /api/projects/validate 权威校验（schema + customStyle 字段级）
   │
   ▼
scripts/scaffold.js → scripts/validate.js（本地节奏/布局自检） → scripts/package.js → scripts/upload-video.js（含云端 precheck）
   │
   ▼
返回视频分享链接
```

---

## 哪些是给 AI 看的，哪些是给人看的？

| 类型 | 文件 | 谁在看 |
|------|------|--------|
| **协议入口** | `SKILL.md` | AI（必读，Skill 装上后会 import） |
| **项目介绍** | `README.md` | 人 |
| **AI 设计知识库** | `references/*.md` | AI（设计阶段查阅） |
| **AI 生成模板** | `templates/projects/*.json` | AI（作样板复制改写） |
| **AI 设计规范** | `templates/designs/video_design_guide.md` | AI（生成 design.md 时严格遵守） |
| **AI 资源库** | `templates/placeholders/`、`templates/bgm/` | AI（写 project.json 时直接引用） |
| **结构校验** | 云端 `/api/projects/validate` | upload-video.js Step 0 自动调用（B 方案 v2.0）|
| **执行脚本** | `scripts/*.js` | AI（工作流中调用） |
| **README** | `templates/projects/README.md`、`templates/placeholders/url-factory.md`、`templates/bgm/bgm-catalog.md` | AI（局部速查） |

---

## 字段规范来源（重要）

`SKILL.md` 不再罗列每个组件的 customStyle 字段（那部分迁移到了云端 API）。

**AI 在生成 customStyle 前必须调云端 API**：

```http
POST /cv/api/component/spec/batch
Content-Type: application/json

{ "components": [{ "type": "GraphicComponent", "variant": "comparison" }] }
```

返回 `content / color / typography / layout / effect / hardcoded` 六类字段+默认值，单次最多 20 个。

数据源：`video-maker-system/public/configs/component-spec.json`（不在 Skill 仓库里，在主仓库里）。

---

## 参与贡献

- `SKILL.md` — Skill 协议入口（**不要改文件名**）
- `scripts/` — Node.js 脚本，维持 CommonJS 写法以便老 AI 工具兼容
- `references/` / `templates/` — 改了别忘了同步 SKILL.md 里的引用

---

## License

[MIT](./LICENSE) © DaJiu
