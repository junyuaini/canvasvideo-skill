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

## 目录结构

```
canvasvideo-skill/
├── SKILL.md                   # ⭐ Skill 协议入口（AI 必读）
├── README.md                  # 本文件（人类读的项目介绍）
├── LICENSE                    # MIT
├── .gitignore
│
├── docs/                      # � 执行步骤（10 步流程）
│   ├── 01-init.md            # 步骤1：初始化 + 模式判定
│   ├── 02-skeleton-design.md  # 步骤2：骨架设计
│   ├── 03-skeleton-build.md  # 步骤3：骨架实现
│   ├── 04-region-design.md   # 步骤4：区域设计
│   ├── 05-region-build.md    # 步骤5：区域实现
│   ├── 06-merge.md            # 步骤6：合并
│   ├── 07-assets.md           # 步骤7：素材处理
│   ├── 08-validate.md        # 步骤8：校验
│   ├── 09-package.md          # 步骤9：打包
│   └── 10-upload.md           # 步骤10：上传
│
├── rules/                     # 📚 规则原典（hard rule 单一来源）
│   ├── RULES.md              # 规则总清单
│   ├── 01-principles.md      # 基本原则
│   ├── 02-mode.md            # 创作/口播模式 + 音频用法 + 字幕共生 + 默认 BGM
│   ├── 03-layout.md          # viewport/canvas/regions 公式 + 组件 Y/尺寸 + 对比度
│   ├── 04-timing.md          # 节奏 4 条门槛 + settings 三参数
│   ├── 05-richness.md        # 丰富度 6 条门槛 + 评分
│   ├── 06-components.md      # 10 个组件选型决策树（字段走云端 API）
│   ├── 07-theme.md           # 主题配色：white / black + 选型 + 沟通话术
│   ├── 08-api.md             # 服务端 API + 用户体系 + 工作目录路径
│   └── 09-selfcheck.md       # 自检规则
│
├── templates/                 # 🎨 模板（AI 生成时参考/复制）
│   ├── artifacts/             # 设计文档模板
│   │   ├── design-skeleton-creative.md  # 骨架设计模板（创作模式）
│   │   ├── design-skeleton-dubbing.md   # 骨架设计模板（口播模式）
│   │   └── design-region.md    # 区域设计模板
│   ├── projects/              # project.json 样板库
│   │   ├── README.md          # 样板选型指南
│   │   ├── 通用视频.json
│   │   ├── 示例-产品演示型-2分钟口播.json
│   │   ├── 示例-案例分享型-1分钟口播.json
│   │   └── 分合示例/          # skeleton + regions 分离示例
│   ├── placeholders/          # 占位图资源
│   │   ├── README.md          # 占位图速查（Picsum + Aggregate 水印）
│   │   ├── light/             # 极简白主题 SVG 兜底图
│   │   └── dark/              # 沉浸黑主题 SVG 兜底图
│   └── bgm/                   # 内置 BGM
│       ├── README.md         # BGM 风格匹配速查
│       └── *.mp3             # tech-pulse / warm-cafe / uplifting / corporate / light-pop / cinematic
│
└── scripts/                   # 🛠️ Node.js 工具脚本
    ├── scaffold.js            # 创建工作目录 + 生成 design.md
    ├── validate.js           # 本地校验入口（调用 selfcheck.js）
    ├── selfcheck.js          # 节奏/布局/丰富度自检
    ├── merge-regions.js      # 合并 skeleton + regions → project.json
    ├── query-api.js          # 封装后端 API 调用（batch spec / validate / health）
    ├── package.js            # 打包 zip 准备上传
    ├── upload-video.js       # 用户体系 + 云端 precheck + 上传
    ├── srt-parser.js         # SRT 字幕解析工具
    └── state.js              # 状态管理（skillProjectId 等）
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
│ │ docs/01-init.md ~ 10-upload.md               │           │
│ │ 步骤 1~10 执行流程                            │           │
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
[步骤 1] 初始化 + 模式判定（推断 + 确认）
   │  ├─ 查 rules/02-mode.md（选创作/口播）
   │  └─ 查 templates/projects/README.md（选样板）
   │
   ▼
[步骤 2-3] 骨架设计 + 实现
   │  └─ 查 rules/03-layout.md、rules/07-theme.md
   │
   ▼
[步骤 4-5] 区域设计 + 实现
   │  └─ 查 rules/06-components.md（选型决策树）
   │
   ▼
[步骤 6] 合并
   │  └─ scripts/merge-regions.js
   │
   ▼
[步骤 7] 素材处理
   │  ├─ 查 templates/placeholders/README.md
   │  └─ 查 templates/bgm/README.md
   │
   ▼
[步骤 8] 校验
   │  └─ scripts/selfcheck.js
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
| **执行步骤** | `docs/01-init.md` ~ `10-upload.md` | AI（按步骤执行） |
| **AI 设计知识库** | `rules/*.md` | AI（设计阶段查阅） |
| **AI 生成模板** | `templates/projects/*.json` | AI（作样板复制改写） |
| **AI 资源库** | `templates/placeholders/`、`templates/bgm/` | AI（写 project.json 时直接引用） |
| **结构校验** | 云端 `/api/projects/validate` | upload-video.js Step 0 自动调用 |
| **执行脚本** | `scripts/*.js` | AI（工作流中调用） |
| **局部速查** | `templates/projects/README.md`、`templates/placeholders/README.md`、`templates/bgm/README.md` | AI（局部速查） |

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
- `docs/` / `rules/` / `templates/` — 改了别忘了同步 SKILL.md 里的引用

---

## License

[MIT](./LICENSE) © DaJiu
