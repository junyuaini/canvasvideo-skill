# CanvasVideo Skill

> 通过自然语言一键生成可分享的画布视频（H5)。
> 适用于 AI Agent / Trae 等支持 Skill 协议的工具，无需手写代码。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 这是什么

**CanvasVideo Skill** 是一份给 AI Agent 安装的"技能包"。装上之后，你可以用自然语言告诉 AI：

> 帮我做一个 3 分钟的大模型科普视频，要轻松一点的风格

AI 会自动：

1. **理解你的需求**，温和追问基本信息（口播模式 / 时长 / 风格）
2. **在本地生成设计文档** `design-skeleton-dubbing.md`，含详尽的素材准备清单
3. **多轮微调**，直到你确认满意
4. **打包并上传到云端**，给你一个可分享的视频链接
5. **后续迭代**直接在已有项目上修改，链接保持不变

---

## 安装

把本仓库克隆到你的 AI 工具的 Skill 目录下，然后安装依赖：

```bash
git clone git@github.com:junyuaini/canvasvideo-skill.git
cd canvasvideo-skill
npm install
```

> ℹ️ **为什么要 `npm install`**：
> - 步骤 1.5（口播模式的 TTS 合成）依赖 `node-edge-tts`
> - 步骤 8（打包）依赖 `adm-zip`
> - 其余脚本只使用 Node 内置模块，不需要任何依赖
>
> **没装 npm 会怎样**：步骤 1-7、9 都能跑（只是内置模块）；步骤 1.5（仅 TTS 模式）和步骤 8 会报 `MODULE_NOT_FOUND`。

---

## 环境要求

| 项 | 要求 | 说明 |
|---|---|---|
| **Node.js** | 16+ | 必装（步骤 1.5 用了 node-edge-tts，要求 Node 16+） |
| **npm** | 7+（随 Node 一起来） | 装一次依赖用 |
| **AI 工具** | 支持 Skill 协议 | Trae IDE / Claude Code / 其他兼容 Agent |
| **网络（首次上传）** | 可访问 `https://dajiulanren.top` | 上传 zip 到云端必需 |
| **网络（TTS 合成）** | 可访问微软 Azure 端点 | 仅步骤 1.5 用 TTS 时需要；用户素材模式不需要 |
| **网络（看视频）** | 无要求 | 预览链接可分享给任何人，对方无需任何环境 |
| **操作系统** | 跨平台 | macOS / Linux / Windows（脚本用 `path.join` 等跨平台 API） |
| **浏览器（预览）** | HTML5 Canvas + ES2020+ | Chrome 90+ / Safari 14+ / Firefox 88+ |

**不需要**：Python、Docker、GPU、**系统装 ffmpeg**（npm 自动装 22MB ffmpeg-static）。

> 💡 **依赖最小化**：整个 Skill 包只有 4 个 npm 依赖（含 ffmpeg 二进制 22MB）：
> - `adm-zip` — 打包 zip 用
> - `node-edge-tts` — TTS 合成用
> - `sharp` — 图处理 / 占位图生成用
> - `ffmpeg-static` — ffmpeg 二进制（22MB，**npm 自动装，无需系统装**）—— 用于 SRT 校准（voice-align）
>
> 其他脚本全部使用 Node.js 内置模块（`fs` / `path` / `crypto` / `https`）。

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
第二章节改成讲混合检索
```

链接保持不变，内容直接刷新。

---

## 工作模式

| 模式 | 用户提供 | AI 负责 |
|------|---------|--------|
| **口播模式** | 口播音频 + SRT 字幕 | 严格按音频/SRT 排版，自动生成其他素材 |

---

## 目录结构

```
canvasvideo-skill/
├── SKILL.md                   # ⭐ Skill 协议入口（AI 必读）
├── README.md                  # 本文件（人类读的项目介绍）
├── LICENSE                    # MIT
├── .gitignore
│
├── docs/                      # 📋 执行步骤（9 步流程）
│   ├── 01-init.md                       # 步骤1：初始化
│   ├── 02-voice-prepare.md              # 步骤2：音频与字幕准备（口播）
│   ├── 03-skeleton-design-dubbing.md    # 步骤3：骨架设计（口播）
│   ├── 04-skeleton-build.md             # 步骤4：MD → skeleton.json
│   ├── 05-region-design-dubbing.md      # 步骤5：区域设计
│   ├── 06-merge.md                      # 步骤6：合并 + 自检
│   ├── 07-assets.md                     # 步骤7：素材检查
│   ├── 08-package.md                    # 步骤8：打包 zip
│   └── 09-upload.md                     # 步骤9：上传
│
├── rules/                     # 📚 规则原典（hard rule 单一来源）
│   ├── RULES.md              # 规则总清单
│   ├── 01-principles.md      # 基本原则
│   ├── 06-components.md     # HtmlComponent 字段 + API 调用规范
│   ├── 08-api.md             # 服务端 API + 用户体系 + 工作目录路径
│   └── 09-selfcheck.md       # 本地自检规则（ID 格式 + 重复）
│
├── templates/                 # 🎨 模板（AI 生成时参考/复制）
│   ├── artifacts/             # 设计文档模板
│   │   └── design-skeleton-dubbing.md
│   ├── projects/              # project.json 样板库
│   │   ├── README.md
│   │   └── 分合示例-口播/
│   └── placeholders/          # 占位图资源
│       ├── README.md
│       ├── light/             # 极简白主题 SVG 兜底图
│       └── dark/              # 沉浸黑主题 SVG 兜底图
│
└── scripts/                   # 🛠️ Node.js 工具脚本
    ├── init-project.js      # 步骤1：初始化（生成 state.json + skillProjectId）
    ├── prepare-voice.js     # 步骤2：音频与字幕准备
    ├── tts.js               # 步骤2 内部依赖：TTS 引擎（基于 node-edge-tts）
    ├── generate-skeleton.js # 步骤4：MD → skeleton.json
    ├── merge-regions.js     # 步骤6：合并 skeleton + regions → project.json
    ├── setup-assets.js      # 步骤7：素材检查
    ├── validate.js          # 步骤7：本地校验入口
    ├── selfcheck.js         # 步骤7：自检规则（ID 格式 + 重复 + 时间轴）
    ├── package.js           # 步骤8：打包 zip
    ├── upload-video.js      # 步骤9：用户体系 + 云端 precheck + 上传
    ├── save-project.js      # 内部：写 project.json
    ├── validate-region.js   # 内部：区域时间校验
    ├── setup-workdir.js     # 内部：创建 regions/ 等目录
    ├── query-api.js         # 封装后端 API 调用（batch spec / validate / health）
    ├── srt-parser.js        # SRT 字幕解析工具
    ├── scaffold.js          # 内部：resolveAgentWorkdir 等工具
    └── state.js             # 状态管理（skillProjectId 等）
```

---

## 文档分层（理解架构）

```
┌────────────────────────────────────────────────────────────┐
│ 流程文档（Workflow）                                          │
│                                                            │
│ ┌─ 主流程 ─────────────────────────────────────┐           │
│ │ SKILL.md  — 整体编排                          │           │
│ └────────────────────────────────────────────┘           │
│            ↓                                              │
│ ┌─ 步骤文档 ──────────────────────────────────┐           │
│ │ docs/01-init.md ~ 09-upload.md               │           │
│ │ 步骤 1~9 执行流程                              │           │
│ └────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘
              ↓ 引用（横切）
┌────────────────────────────────────────────────────────────┐
│ 规则原典（Rules）                                              │
│ rules/*.md — 每条 hard rule 只在这里写一次                    │
│ 被所有流程节点引用                                              │
└────────────────────────────────────────────────────────────┘
              ↓ 调用
┌────────────────────────────────────────────────────────────┐
│ 数据层（API + spec.json）                                      │
│ 云端 API: /cv/api/component/spec/batch                      │
│  HtmlComponent 字段、默认值，写死项                                  │
└────────────────────────────────────────────────────────────┘
```

**核心思想**：
- **流程文档**回答"什么时候做什么"
- **规则原典**回答"做的时候要遵守什么"
- **数据层** API 回答"HtmlComponent 字段长什么样"

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
[步骤 1] 初始化 + 模式判定
   │
   ▼
[步骤 2] 骨架设计
   │  └─ 查 docs/02-skeleton-design-*.md
   │
   ▼
[步骤 3] 生成 skeleton.json
   │
   ▼
[步骤 4-5] 区域设计 + 实现
   │  └─ 查 docs/04-region-design-*.md、rules/06-components.md
   │
   ▼
[步骤 6] 合并
   │  └─ scripts/merge-regions.js
   │
   ▼
[步骤 7] 素材处理
   │  └─ 查 templates/placeholders/README.md
   │
   ▼
[步骤 8] 校验
   │  └─ scripts/validate.js → scripts/selfcheck.js
   │
   ▼
[步骤 9-10] 打包 + 上传
   │  └─ scripts/package.js → scripts/upload-video.js
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
| **执行步骤** | `docs/01-init.md` ~ `09-upload.md` | AI（按步骤执行） |
| **AI 设计知识库** | `rules/*.md` | AI（设计阶段查阅） |
| **AI 生成模板** | `templates/projects/*/` | AI（作样板复制改写） |
| **AI 资源库** | `templates/placeholders/README.md` | AI（写 project.json 时查阅占位图规范） |
| **结构校验** | 云端 `/api/projects/validate` | upload-video.js 自动调用 |
| **执行脚本** | `scripts/*.js` | AI（工作流中调用） |
| **局部速查** | `templates/projects/README.md`、`templates/placeholders/README.md` | AI（局部速查） |

---

## 字段规范来源（重要）

`rules/06-components.md` 不再罗列 HtmlComponent 的 customStyle 字段详情（那部分在云端 API）。

**AI 在生成 HtmlComponent 前必须调云端 API**：

```js
const { queryComponentSpecBatch } = require('./scripts/query-api');
const typeVariants = [
  { type: 'HtmlComponent', variant: 'default' }
];
const { specs } = await queryComponentSpecBatch(typeVariants);
// specs['HtmlComponent.default'] → 该类型的完整字段定义
```

数据源：`video-maker-system/public/configs/component-spec.json`（不在 Skill 仓库里，在主仓库里）。

---

## 参与贡献

- `SKILL.md` — Skill 协议入口（**不要改文件名**）
- `scripts/` — Node.js 脚本，维持 CommonJS 写法以便老 AI 工具兼容
- `docs/` / `rules/` / `templates/` — 改了别忘了同步 SKILL.md 里的引用

---

## License

[MIT](./LICENSE) © DaJiu
