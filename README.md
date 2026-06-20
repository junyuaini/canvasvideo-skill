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

**视频生成完全在云端完成、可分享给任何人；服务端开源后再公开**。本仓库只包含 Skill 本体（即"前端编排层"），用户不需要自建服务器。

---

## 安装

把本仓库克隆到你的 AI 工具的 Skill 目录下即可。具体目录因工具而异：

```bash
git clone https://github.com/<你的用户名>/canvasvideo-skill.git
```

或者直接告诉 AI：

> 请帮我安装这个 Skill：https://github.com/<你的用户名>/canvasvideo-skill

AI 会处理后续步骤。Skill 安装后第一次使用时会自动：

- 在 Skill 同级创建 `canvasvideo-workdir/` 工作目录
- 在首次上传视频时自动注册账号（无需手动注册）
- 把账号凭证保存到 `canvasvideo-workdir/.user.json`

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

### 查询账号

任意时刻你都可以问：

```
我的账号是什么？
我的 userToken 是多少？
```

Skill 只读取本地 `.user.json` 显示给你（不调用任何服务端接口）。

---

## 用户体系（极简 API Key 模式）

- 首次上传视频时自动生成 `userId` + `userToken`，写入本地 `canvasvideo-workdir/.user.json`
- 服务端只存 `userToken` 的 SHA256 hash，明文不落服务器
- ⚠️ **`.user.json` 是你登录视频列表页面的唯一凭证，丢失不可找回**
  - 视频本身的分享链接不受影响（依然可以打开）
  - 但你将无法在视频列表网页里看到所有项目
  - **强烈建议把 `.user.json` 备份到云盘或备忘录**
- 跨设备使用：把 `.user.json` 复制到目标机器即可
- 不支持账号合并、不支持服务端找回、不支持重置

---

## 服务端配置

默认服务端地址硬编码为：

```
http://8.147.60.112/cv
```

如需切换到自部署的服务端（仅当你拿到了 CanvasVideo 服务端代码后），修改 [scripts/upload-video.js](./scripts/upload-video.js) 顶部：

```js
const DEFAULT_SERVER_URL = 'http://your-domain.com/cv';
```

---

## 文件结构

```
canvasvideo-skill/
├── SKILL.md                   # Skill 主入口（AI 读这个文件理解能力）
├── README.md                  # 本文件
├── LICENSE                    # MIT
├── scripts/
│   ├── upload-video.js        # 用户体系 + 上传（核心）
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

工作目录（首次使用时由 Skill 自动创建）：

```
canvasvideo-workdir/             ← 与 canvasvideo-skill/ 同级
├── .user.json                  ← { "userId": "cu-xxx", "userToken": "ut-xxx" }
└── {skillProjectId}/
    ├── design.md
    ├── project.json
    ├── assets/
    │   └── images/
    └── .canvasvideo/
        └── project-state.json
```

---

## 工作模式

| 模式 | 用户提供 | AI 负责 |
|------|---------|--------|
| **创作模式** | 主题 / 时长 / 风格等文本信息 | 自动生成解说、字幕、占位素材 |
| **口播模式** | 口播音频 + SRT 字幕 | 严格按音频/SRT 排版，自动生成其他素材 |

---

## 隐私与安全

- 设计文档（`design.md`）**仅保存在本地**，不上传服务器
- 用户素材（图片 / 音频 / 字幕）作为视频包的一部分上传，由服务端通过私有 `previewToken` 提供访问
- `userToken` 明文只存于本地 `.user.json`；服务端只存 SHA256 hash
- Skill 不收集任何遥测数据

---

## 常见问题

**Q：我换了一台电脑，怎么继续看我的视频列表？**
A：把旧机器上的 `canvasvideo-workdir/.user.json` 复制到新机器同位置即可。或者在视频列表网页用 userId/userToken 手动登录一次。

**Q：`.user.json` 不小心删了怎么办？**
A：原账号关联的所有视频列表无法找回，但**视频分享链接仍然可以正常打开**。下次创建新视频时，Skill 会为你重新生成一个新账号。建议先备份再删。

**Q：我能让两台电脑用同一个账号同时创作吗？**
A：可以，把同一份 `.user.json` 放到两台机器的 `canvasvideo-workdir/` 即可。但**如果同时上传同一个 `skillProjectId`，会互相覆盖**，请注意避开。

**Q：能不能把视频做成私密链接？**
A：每个视频都有唯一的、不可猜测的 `previewToken`。链接 = `https://your-domain/view/{previewToken}`，没有 token 谁都看不到。但已经分享出去的链接没办法收回。

**Q：能不能修改我的 userToken？**
A：v1.4 不支持重置。如果一定要换，删除 `.user.json` 重新创建视频会生成新账号，但**原账号关联的视频列表将无法找回**。

---

## 参与贡献

欢迎 PR / issue。本仓库主要内容：

- `SKILL.md` — Skill 协议入口（不要改文件名）
- `scripts/` — Node.js 脚本，维持 CommonJS 写法以便老 AI 工具兼容
- `templates/` — 设计 / 视频模板，按场景命名

---

## License

[MIT](./LICENSE) © CanvasVideo Contributors
