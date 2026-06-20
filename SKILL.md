---
name: "canvasvideo"
description: "通过自然语言一键生成可分享的画布视频（H5）。支持创作模式（提供主题/时长/风格）与口播模式（提供音频+SRT）。当用户说'做视频/制作视频/生成视频/做一个 H5/出一个画布视频/视频迭代/换背景音乐/改章节内容'时触发。"
---

# CanvasVideo Skill

CanvasVideo Skill 帮助用户通过自然语言创建符合 CanvasVideo 规范的视频项目，支持创作模式与口播模式。

参考设计文档：`.code/documents/CanvasVideo_代码级设计.md` v1.4

---

## 触发条件

当用户请求**制作视频 / 创建短视频 / 生成 H5 视频页面 / 出一个视频**时触发。

---

## 总体流程

```
[第零次] 安装就位（用户无感）
    ↓
[第一次] 理解需求 + 模式选择（创作 / 口播）
    ↓
[第二次] 生成本地 design.md + 素材清单
    ↓
[第三次] 多轮设计微调（loop）
    ↓ 用户确认
[第四次] 打包 zip + 首次自动后置注册 + 上传 → previewUrl
    ↓
[第五次] 用户在浏览器查看视频
    ↓
[第六次] 视频迭代（不再走设计文档）
```

平行能力：
- **[第七次] 用户主动查询账号**（自然语言指令，任意时刻可触发，只读本地）

---

## 一、第零次交互：安装与首次准备（用户无感）

用户从 AI 工具的 Skill 市场把 CanvasVideo Skill 安装下来后，**Skill 进入待命**：

- ❌ 不主动创建任何工作目录
- ❌ 不主动注册账号
- ❌ 不主动询问任何信息
- ✅ 等待用户通过自然语言触发"创建视频"或"查询账号"等意图

工作目录、`.user.json`、`.canvasvideo/` 等本地文件都在**首次需要时由内部脚本自动创建**，用户和 LLM 都不需要预先准备。

---

## 二、第一次交互：理解需求 + 模式选择

### 2.1 模式定义

| 模式 | 用户提供 | 字幕（subtitles） | AI 负责 |
|------|---------|-----------------|--------|
| **创作模式** | 主题/目标/时长等文本信息 | ❌ **不生成字幕**（无配音音频） | 自动生成画面、组件、占位素材；视频以图文为主，靠组件文字传递信息 |
| **口播模式** | 口播音频（必须） + SRT 字幕（必须） | ✅ **必须有字幕**（与 SRT 一致） | 严格按音频/SRT 排版，自动生成画面素材 |

**默认行为**：
- 创作模式：所有缺失素材都可由 AI 自动生成；**`project.json` 中不允许出现 `audio` 字段，也不允许出现 `subtitles` 数组**
- 口播模式：音频和 SRT 字幕**必须**由用户提供，不允许 AI 占位生成；`project.json` 中**必须同时**有 `audio` 字段和 `subtitles` 数组

### 2.2 追问规则

- 用户首条消息已含"模式 + 时长 + 受众"等关键信息时，**不要再问一遍**
- 关键信息缺失时，温和追问，不强制必填，不主动 timeout
- 提示用户可以"按默认创作模式继续"

### 2.2.1 ⚠️ 主题二选一（必问，不允许跳过）

**当前 v1.4 仅支持两种主题**，**严禁让用户自由发挥（如"我要橙色品牌主题""做一个粉色少女风"）**。在确认需求后，**必须**用以下话术让用户从两个固定选项中二选一：

```
当前 CanvasVideo 提供两种风格主题（仅支持这两种）：

🤍 极简白（white）
  - 白底 + 多色光晕，深字清晰
  - 适合：商务演示、产品介绍、知识科普、教学课程、案例分享
  - 我的建议默认：📖 偏向阅读/演示场景

🌌 沉浸黑（black）
  - 深紫蓝底 + 霓虹高亮，沉浸感强
  - 适合：技术分享、AI/代码、数据看板、品牌发布、潮流内容
  - 我的建议默认：💻 偏向科技/沉浸场景

请选 1 还是 2？也可以告诉我你的视频主题，我帮你推荐。
```

**主题选择决策**：

| 用户输入 | LLM 行为 |
|---|---|
| 用户说"1"/"白"/"极简白"/"用白色" | `theme: "white"` |
| 用户说"2"/"黑"/"沉浸黑"/"用黑色" | `theme: "black"` |
| 用户说"你帮我选" | 按主题决策表（详见 themes-catalog.md）自动选；告诉用户选了哪种 + 一句话理由 |
| 用户说"用我们公司的品牌色 / 橙色 / 粉色 / 蓝紫渐变" | **不要承诺定制**，引用 themes-catalog.md §"用户提出'自定义主题'时的标准回复"话术，引导用户在 white/black 内选择，再用 customStyle 体现品牌色 |
| 用户首条消息已明确说"用黑色主题 / 白色主题" | 直接采用，不再问 |

**严禁**：
- 让用户回答"你想用什么主题"这种开放式问题（容易诱导用户编一个不存在的主题名）
- 接受 `theme: "default"` / `"colorful"` / `"company-brand"` / 任意自定义名称
- 在 design.md 步骤 5 主题选择表里写"自定义"行

### 2.3 口播模式输入校验

- 必须提供 `.mp3 / .wav / .m4a` 音频和 `.srt` 字幕
- 路径不存在或扩展名不支持时**阻塞进入第二阶段**，要求用户重新提供
- 路径包含 `..` 等穿越字符时拒绝拷贝

### 2.4 ⚠️ 字幕与音频共生规则（强制）

**核心原则**：**字幕必须始终与"配音音频"共生，二者同生共死**。

> **配音音频 = 用户口播或 TTS 生成的人声讲解**，**不是**背景音乐 / BGM / 环境音。

**判定矩阵**：

| 是否有配音音频 | 是否有 SRT 字幕 | 是否允许？ | 说明 |
|------|------|------|------|
| ✅ 有 | ✅ 有 | ✅ **允许** | 标准口播模式 |
| ❌ 无 | ❌ 无 | ✅ **允许** | 标准创作模式（图文表达） |
| ✅ 有 | ❌ 无 | ❌ **不允许** | 用户提供了音频却没字幕 → 必须要求用户补 SRT，或 AI 通过 ASR 生成（暂不支持，先阻塞） |
| ❌ 无 | ✅ 有 | ❌ **绝对禁止** | 视频纯图文却挂着字幕条会非常违和；**LLM 严禁主动生成 subtitles 数组** |

**关键约束（写给 LLM）**：

1. **创作模式下严禁生成 `subtitles` 字段**：
   - 即使 LLM 觉得"加点字幕显得专业"，也**不要**写
   - 如果用户明确要求"加字幕条"，先反问："字幕应该和配音同时出现，请问您要不要提供配音音频？提供后我会按音频自动生成字幕"
   - 用户如果坚持"我不要音频，但要字幕"——这是反直觉的设计，**仍然不要生成**，并解释 1 句话原因即可

2. **只有背景音乐 ≠ 有音频**：
   - `project.json` 没有 `bgm` 字段；如果未来支持，**BGM 不触发字幕生成**
   - "音频"在本规则中**特指口播配音**（user-provided / TTS）

3. **口播模式下必须保证字幕完整覆盖音频**：
   - `subtitles` 数组的最早 `start` ≈ 0
   - `subtitles` 数组的最晚 `end` ≈ `audio` 时长（容差 ±0.5s）
   - 字幕条之间不允许大段空白（> 3s 的空白要么补字幕，要么把空白前后字幕的 end/start 拉满）

4. **字幕文本要求**：
   - 必须严格来自用户提供的 SRT，**严禁 LLM 自己改写、压缩、扩展**
   - 一条字幕 ≤ 25 个字（中文）/ 15 个词（英文）；超过会被前端截断
   - 不允许包含 emoji（部分前端字幕样式不支持）

---

## 三、第二次交互：生成本地设计文档与素材清单

LLM 调用 `scripts/scaffold.js` 的 `ensureProjectWorkdir()` 自动建目录，再写 `design.md`：

```
canvasvideo-workdir/{skillProjectId}/
├── design.md                  # 设计内容 + 素材准备清单
├── assets/
│   └── images/
└── .canvasvideo/
    └── project-state.json
```

### 3.1 ⚠️ 强制规范：必须遵循 video_design_guide.md + 查阅知识库

**`design.md` 的内容必须严格按照 [`templates/designs/video_design_guide.md`](./templates/designs/video_design_guide.md) 的"步骤 0 + 五阶段十一步 + 用户素材清单"产出**。

**生成 design.md 步骤 7（组件清单）和步骤 9（customStyle）前，LLM 必须先查阅以下知识库**：

| 文件 | 用途 | 必查时机 |
|------|------|---------|
| [`references/components-catalog.md`](./references/components-catalog.md) | 10 个组件的 content / customStyle / 适用场景 / 反例 / 选型决策树 | 步骤 7 选组件、步骤 9 写 customStyle |
| [`references/themes-catalog.md`](./references/themes-catalog.md) | 仅支持的两种主题（white/black）色板 + 选型决策 + 自定义主题应对话术 | 步骤 5 选主题、用户提自定义主题需求时 |
| [`references/visual-richness-rules.md`](./references/visual-richness-rules.md) | 6 条丰富度强制门槛 + 丰富度评分表 + 提升组合拳示例 | 步骤 11 自检（必含 L4 丰富度检查）、生成 project.json 前最后自查 |
| [`templates/projects/README.md`](./templates/projects/README.md) | 示例项目索引（按场景选 base） | 步骤 0 确定模式后 |
| [`templates/projects/示例-产品演示型-2分钟口播.json`](./templates/projects/示例-产品演示型-2分钟口播.json) | 产品/工具演示型完整样板（120s） | 用户做产品演示时参考节奏与组件搭配 |
| [`templates/projects/示例-案例分享型-1分钟口播.json`](./templates/projects/示例-案例分享型-1分钟口播.json) | 案例/故事分享型完整样板（53s） | 用户做案例分享时参考五段式叙事 |

**必查规则**：
- 如果用户没明确说做什么类型，**默认参考"案例分享型"示例**（叙事结构更通用）
- 选组件时**先翻 components-catalog.md 的"选型决策树"**，不要凭直觉
- 写 customStyle 时**先翻 components-catalog.md 的"字段速查"**，不要凭记忆

**📋 必须包含的产出**：

- 步骤 0：视频目标（项目元信息表）
- 阶段一（步骤 1-3）：文案分段、内容类型标注、风格识别 + 情绪曲线
- 阶段二（步骤 4-5）：区域规划、主题配色方案
- 阶段三（步骤 6-8）：ASCII 布局图、组件清单、节奏设计
- 阶段四（步骤 9-10）：customStyle、时间轴
- 阶段五（步骤 11）：自检报告（L0-L3 + 设计原则）
- 附加：用户素材清单（含状态标注）

**严禁**：
- 跳过任何阶段或步骤
- 一次性输出所有产出（必须按顺序逐步生成）
- 留空表格单元格
- 自检报告全部填"通过"
- 使用 theme（必须用 customStyle）
- 组件 ID 用英文单词（必须用 `{区域}-###` 格式）
- **不查 components-catalog.md 就开始写 customStyle**（很大概率会漏字段或写错嵌套）
- **跳过 L4 丰富度检查直接打包上传**（违反 visual-richness-rules.md 6 条门槛会生成 low 视频）
- **L4 检查任何一条不通过仍上传**（必须回到步骤 7-9 重新设计；重写后再次自检）

### 3.2 素材清单状态

| 状态 | 含义 |
|------|------|
| `[已具备]` | 用户已提供 |
| `[待用户提供]` | 建议用户提供以提升真实度 |
| `[AI 自动生成]` | 未提供时由 Skill 自动生成或选用占位 |

详细规则见 [`video_design_guide.md`](./templates/designs/video_design_guide.md) 的"附加产出：用户素材清单 → 状态标注规则"章节。

### 3.3 模式差异化

- **创作模式**：所有缺失素材标 `[AI 自动生成]`
- **口播模式**：音频/SRT 标 `[已具备]`（必须已提供），其它可标 `[AI 自动生成]`

### 3.4 用户已提供素材的处理

通过 `copyUserAsset()` 安全拷贝到 `assets/`，**复制不是引用**；自动检查路径穿越。

---

## 四、第三次交互：多轮设计微调（直至确认）

```
用户反馈 → Skill 改 design.md → 提示用户重查 → ...（loop）
                                                  ↓
                            用户明确"确认" → markDesignConfirmed → 进入第四次
```

- 增量修改：只改用户提到的章节，其它保持不动
- 状态联动：用户替换某项素材时，自动把状态从 `[AI 自动生成]` 改为 `[已具备]`
- 未确认前**不允许打包**：通过 `state.assertDesignConfirmed()` 拦截

---

## 五、第四次交互：打包 + 首次自动后置注册 + 上传（**核心**）

LLM 在用户确认后，调用 `uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath)`：

```js
// scripts/upload-video.js
const { uploadWithUser } = require('./upload-video');
const result = await uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath);
// result = { previewToken, previewUrl, isFirstTime, user, warnings }
```

### 5.1 内部流程（用户视角是"一个动作"）

```
1. ensureWorkdirRoot()
2. readLocalUser(workdirRoot)
   ├─ 本地存在且合法 → user, isFirstTime=false
   └─ 不存在 / 损坏 → 进入注册分支
        a. generateUserId() + generateUserToken()
        b. POST /api/users/register
        c. 409 冲突 → 重生一次再 register
        d. 写 canvasvideo-workdir/.user.json
        e. 本地写失败 → 抛错并把 userId/userToken 暴露给上层
        f. user, isFirstTime=true
3. POST /api/projects/upload (zip + skillProjectId + userId + userToken)
4. 返回 { previewToken, previewUrl, isFirstTime, user }
```

### 5.2 输出文案规则

#### 首次（`isFirstTime === true`）— ⚠️ 必须特别强调

LLM **必须**按以下格式输出，不可省略任何元素：

```
✅ 视频已上线：{previewUrl}

⚠️ 重要：本次为你创建了 CanvasVideo 账号

  userId:    {user.userId}
  userToken: {user.userToken}

📁 凭证已保存到本地：{workdirRoot}/.user.json

🔒 这是你登录视频列表页面的唯一凭证。
   - 请妥善保管，不要泄露给他人
   - 如果该文件丢失，账号将无法找回（你的视频链接仍可正常访问，但无法在网页上看到列表）
   - 如需在其他设备使用，请将 .user.json 复制过去
```

#### 非首次（`isFirstTime === false`）— 仅链接

```
✅ 视频已上线 / 已更新：{previewUrl}
```

**严禁**在非首次输出中泄露 userId / userToken。

#### 警告 (`warnings`)

`getOrCreateUser` 返回的 `warnings` 数组包含本地文件损坏等提示，LLM 应在首次告知前作为前置补充：

```
⚠️ 检测到本地账号文件存在但无法使用：xxx；已为你重新创建账号
（然后正常输出首次告知）
```

### 5.3 错误处理

| 场景 | LLM 行为 |
|------|------|
| 注册返回 409（重试后仍冲突） | 提示"账号生成异常，请稍后重试"，不走上传 |
| 注册成功但本地写失败 | 把错误信息原文给用户（已含 userId/userToken），强烈提示手动备份 |
| upload 返回 401 | 提示"账号验证失败，请检查 .user.json 是否正确" |
| upload 返回 413 | 提示具体阈值，建议压缩素材或减少时长 |
| upload 返回 5xx | 退避 1s 重试 1 次，仍失败则保留 zip 供用户重试 |
| 网络中断 | 提示"上传中断，请稍后重试"；保留本地 zip 供下次复用 |

---

## 六、第六次交互：视频迭代（不再走设计文档）

```
用户反馈视频修改意见
  ↓
LLM 直接改 project.json 或替换 assets
  ↓
validate → package → uploadWithUser
  ↓
isFirstTime 必为 false（账号已存在）→ 仅返回链接，不再提示账号
```

- 严禁在迭代时再次展示账号信息
- 严禁在视频已生成后回头修改 design.md（提示用户："如需重做设计，请创建新视频"）

---

## 七、第七次交互：用户主动查询账号（任意时刻可触发）

### 7.1 意图识别

LLM 必须识别以下泛化表达，统一走查询账号分支：

```
我的账号是什么 / 给我看一下我的 token / 我的 userId 是多少
我的 CanvasVideo 凭证 / 把账号告诉我 / 我的账号信息
我的 token / 显示账号 / 看一下账号
```

### 7.2 行为约束

- 调用 `readLocalUser(workdirRoot)`，**只读本地，绝不调用任何服务端接口**
- 查询不应触发注册（即使本地无账号也不要顺手注册）

### 7.3 输出文案

#### 本地有账号

```
你的 CanvasVideo 账号：

  userId:    {user.userId}
  userToken: {user.userToken}

📁 存放路径：{workdirRoot}/.user.json
🔒 请妥善保管，丢失无法找回
```

#### 本地无账号（文件不存在）

```
本地未找到 CanvasVideo 账号。
在你首次创作并上传视频时会自动为你创建。
```

#### 本地账号文件损坏

```
本地账号文件已损坏：{workdirRoot}/.user.json
请删除该文件后重新触发首次上传，将会重新为你创建一个新账号。
（注意：原账号关联的视频列表将无法找回）
```

**严禁打印损坏文件的原始内容**。

### 7.4 拒绝重置请求

用户说"修改我的 userToken / 重置账号 / 换一个 token" 等：

```
账号体系采用极简凭证，无重置机制。
如需更换，请删除 canvasvideo-workdir/.user.json 后重新创建视频，
但原账号关联的视频列表将无法找回（视频本身的分享链接仍可访问）。
```

---

## 八、文件结构

```
canvasvideo-skill/
├── SKILL.md                    # 本文件：Skill 主入口
├── references/                 # ⭐ 知识库（LLM 必查）
│   ├── components-catalog.md   # 10 个组件 content/customStyle/选型决策树
│   ├── themes-catalog.md       # 仅支持 white/black 两种主题 + 决策表 + 话术
│   └── visual-richness-rules.md # 6 条丰富度强制门槛 + 评分表（防止 low 视频）
├── docs/                       # （可选扩展）编排细则
│   ├── design-orchestrator.md
│   ├── video-orchestrator.md
│   ├── design-guide.md
│   └── authoring-guide.md
├── schema/
│   └── project.schema.json     # 视频项目 JSON Schema
├── templates/
│   ├── designs/                # 设计文档规范（权威）
│   │   └── video_design_guide.md  # ★ 步骤 0 + 五阶段十一步 + 状态标注
│   ├── projects/               # 视频项目模板与高质量示例
│   │   ├── README.md           # 示例索引（LLM 必查）
│   │   ├── 通用视频.json        # 最简兜底模板
│   │   ├── 示例-产品演示型-2分钟口播.json  # 产品演示样板
│   │   └── 示例-案例分享型-1分钟口播.json  # 案例叙事样板
│   └── placeholders/           # 占位素材
└── scripts/
    ├── scaffold.js             # ensureWorkdir / 写 design.md / 拷贝用户素材
    ├── state.js                # 读写 .canvasvideo/project-state.json
    ├── validate.js             # 校验 project.json
    ├── package.js              # 打包 zip
    └── upload-video.js         # ★ 用户体系 + 上传（核心）
```

工作目录（自动创建，不要求用户准备）：

```
canvasvideo-workdir/                  ← 与 canvasvideo-skill/ 同级
├── .user.json                        ← 极简两字段：{ userId, userToken }
└── {skillProjectId}/
    ├── design.md
    ├── project.json
    ├── assets/
    │   └── images/
    └── .canvasvideo/
        └── project-state.json
```

---

## 九、工作目录路径推算（LLM 视角）

LLM 读 `SKILL.md` 时持有此文件的绝对路径，由此推算：

| 项 | 计算 |
|---|---|
| Skill 目录 | SKILL.md 的父目录 |
| 工作根目录 | Skill 目录的父目录 + `canvasvideo-workdir/` |
| 项目工作目录 | 工作根目录 + `{skillProjectId}/` |

**任何首次写文件前都应调用 `ensureProjectWorkdir(workdirRoot, skillProjectId)`**，不要假设目录存在。

---

## 十、上传接口

> **服务端默认地址（v1.4 起硬编码）**：`http://8.147.60.112/cv`
> 程序化调用 / CLI 时不指定 `serverUrl` 即使用此默认值。
> 如需切换，在 [scripts/upload-video.js](./scripts/upload-video.js) 顶部修改 `DEFAULT_SERVER_URL` 常量即可，无需改其他地方。

### 10.1 视频上传

```
POST {serverUrl}/api/projects/upload
Content-Type: multipart/form-data
  - skillProjectId: String   (必填)
  - zip:            File     (必填)
  - userId:         String   (必填)  ← v1.4 起强制
  - userToken:      String   (必填)  ← v1.4 起强制
  - meta:           Object   (可选)

响应: { success, skillProjectId, previewToken, previewUrl }
```

### 10.2 用户注册

```
POST {serverUrl}/api/users/register
Content-Type: application/json
  body: { userId, userToken }

响应: { success, userId }

错误码:
  - 409 / USER_ID_CONFLICT  → Skill 端重生 userId 后重试一次
```

### 10.3 用户项目列表（前端用）

```
POST {serverUrl}/api/users/projects
Content-Type: application/json
  body: { userId, userToken }

响应: { success, projects: [{ previewToken, name, updatedAt }] }
```

---

## 十一、用户体系（API Key 模式，v1.4）

### 11.1 极简凭证

- `userId` 格式：`cu-{12位十六进制}` 例：`cu-a1b2c3d4e5f6`
- `userToken` 格式：`ut-{32位十六进制}` 例：`ut-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d`
- 无密码、无邮箱、无 displayName，无找回机制

### 11.2 服务端只存 hash

```
data/users/{userId}.json
{
  "userId": "cu-...",
  "userTokenHash": "<sha256>",
  "createdAt": "...",
  "projects": ["..."]
}
```

明文 `userToken` 仅存于用户本地 `canvasvideo-workdir/.user.json`。

### 11.3 注册时机

**仅在首次打包并即将上传那一刻自动注册**，不在：
- ❌ Skill 启动时
- ❌ 用户输入需求时
- ❌ 生成设计文档时

### 11.4 单机模式与边界

- 一台机器一份 `.user.json`，所有项目共享同一账号
- `.user.json` 丢失 = 网页登录入口无法看到列表（视频分享链接仍可访问）
- 跨设备：手动复制 `.user.json` 到目标机器
- 不支持账号合并、不支持服务端找回、不支持重置

---

## 十二、重要约束（变更不得违反）

1. **第一次交互不强行追问**：用户只需提供需求即可，其它信息可后续补充
2. **设计文档仅在本地**：不上传服务器
3. **设计确认后才上传**：`assertDesignConfirmed()` 拦截
4. **视频生成后不回设计**：所有迭代直接改 project.json
5. **固定 skillProjectId**：同一项目多次上传使用相同 ID，服务器复用 previewToken
6. **首次注册无感**：用户不需要主动注册，由 `getOrCreateUser` 自动完成
7. **首次告知必须强调**：⚠️ + 代码块 + 存放路径 + 风险提示，缺一不可
8. **非首次不再展示账号**：严禁在迭代或非首次场景输出 userToken
9. **查询账号只读本地**：绝不调用任何服务端接口
10. **不主动重置账号**：用户要重置时引导其手动删除 `.user.json`

---

## 十三、使用样例（LLM 编排参考）

### 13.1 首次创建视频

```js
// 路径推算
const skillDir = path.dirname(__filename); // canvasvideo-skill/
const workdirRoot = path.resolve(skillDir, '../canvasvideo-workdir');

// 1. 状态
const state = require('./scripts/state').loadOrCreateProject(workdir);

// 2. 写设计 + 用户确认（多轮）
require('./scripts/scaffold').writeDesignMd(workdirRoot, state.skillProjectId, designMd);

// 3. 用户确认后
require('./scripts/state').markDesignConfirmed(workdir);

// 4. 打包 + 自动注册 + 上传
const { uploadWithUser } = require('./scripts/upload-video');
const result = await uploadWithUser(SERVER_URL, workdirRoot, state.skillProjectId, zipPath);

// 5. 输出文案
if (result.warnings.length) {
  // 拼到首次告知前面
}
if (result.isFirstTime) {
  // 按 §5.2 首次模板输出 ⚠️ 强调
} else {
  // 仅输出 result.previewUrl
}
```

### 13.2 查询账号

```js
const { readLocalUser } = require('./scripts/upload-video');
const { user, error } = readLocalUser(workdirRoot);
if (user) {
  // 按 §7.3 输出账号信息
} else if (error) {
  // 文件损坏：按 §7.3 输出错误说明，不打印 raw
} else {
  // 文件不存在：按 §7.3 输出"未注册"提示
}
```
