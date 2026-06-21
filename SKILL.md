---
name: "canvasvideo"
description: "通过自然语言一键生成可分享的画布视频（H5）。支持创作模式（提供主题/时长/风格）与口播模式（提供音频+SRT）。当用户说'做视频/制作视频/生成视频/做一个 H5/出一个画布视频/视频迭代/换背景音乐/改章节内容'时触发。"
---

# CanvasVideo Skill（主流程文档）

> 本文档是 CanvasVideo Skill 的**主流程编排**：定义了 7 次交互的整体顺序、每次交互的目标和边界，以及每次交互需要引用哪些规则文件。
>
> **本文档不写具体规则**，所有 hard rule（模式、节奏、布局、自检、丰富度等）都在 [`references/`](./references/) 单独维护，避免规则散落和重复。

---

## 触发条件

当用户请求**制作视频 / 创建短视频 / 生成 H5 视频页面 / 出一个视频**时触发。

---

## 总体流程（7 次交互）

```
[第零次] 安装就位（用户无感）
    ↓
[第一次] 理解需求 + 路径选择（标准 / 快速）+ 模式选择（创作 / 口播）
    ↓
    ├─ [路径 A：标准] [第二次] 生成完整 design.md → [第三次] 多轮微调 → 用户确认 → [第四次] 打包上传
    │                  （子流程 → video_design_guide.md，含 11 个步骤）
    │
    └─ [路径 B：快速] [第二次] 生成精简 design-quick.md（**不要求用户确认**）→ 直接 [第四次] 打包上传
                       （子流程 → design-quick.md，单文件 < 50 行）
    ↓
[第五次] 用户在浏览器查看视频
    ↓
[第六次] 视频迭代（局部编辑：直接改 project.json，不重走 design.md）
    ↓
   ⚠️ 已经走"快速"的项目不支持"补做标准 design.md"。想要标准产物 = 重新走标准流程从头来。
      但局部编辑（"把第 N 段改成 X"）任何路径都支持。
```

**平行能力**：
- **[第七次] 用户主动查询账号**（自然语言指令，任意时刻可触发，只读本地）

---

## 规则索引（必读）

每次交互引用的规则文件如下，**LLM 在执行对应交互前必须先查阅**：

| 规则文件 | 内容 | 引用方 |
|---------|------|--------|
| [`references/mode-rules.md`](./references/mode-rules.md) | 创作/口播两模式 + 音频用法判定 + 字幕共生 + BGM 默认 | 第一次、第二次、第四次 validate |
| [`references/themes-catalog.md`](./references/themes-catalog.md) | 主题二选一（white/black）+ 选型决策 + 自定义话术 | 第一次（主题二选一）、子流程步骤 5 |
| [`references/timing-rules.md`](./references/timing-rules.md) | 节奏 4 条门槛 + settings 参数 | 子流程步骤 8/10、自检 |
| [`references/layout-rules.md`](./references/layout-rules.md) | viewport/canvas/regions 公式 + 组件 Y/尺寸 + 对比度 + 布局多样化 | 子流程步骤 4/6/9、自检 |
| [`references/components-catalog.md`](./references/components-catalog.md) | 10 个组件选型决策树 + 占位图策略 + 组件字段 API | 子流程步骤 7/9 |
| [`references/visual-richness-rules.md`](./references/visual-richness-rules.md) | 丰富度 6 条门槛 + 评分 + 提升示例 | 子流程步骤 7/11、自检 |
| [`references/selfcheck-rules.md`](./references/selfcheck-rules.md) | L0~L4 自检表 + 评分 | 子流程步骤 11、第四次打包前 |
| [`references/principles.md`](./references/principles.md) | 不打扰用户、第一次不强行追问、默认值合理 | 全流程 |
| [`references/api-rules.md`](./references/api-rules.md) | 服务端 API + 用户体系 + 工作目录路径推算 | 第四次、第七次、所有脚本 |

**子流程**：
- [`templates/designs/video_design_guide.md`](./templates/designs/video_design_guide.md) —— design.md 步骤 0~11 子流程（被第二次交互**路径 A 标准**调用）
- [`templates/designs/design-quick.md`](./templates/designs/design-quick.md) —— 精简版设计文档模板（被第二次交互**路径 B 快速**调用，50 行内一次性产出）
- [`templates/designs/build_project_json.md`](./templates/designs/build_project_json.md) —— design.md → project.json 子流程（被第四次交互调用，两条路径都用）

---

## 一、第零次交互：安装与首次准备（用户无感）

用户从 AI 工具的 Skill 市场把 CanvasVideo Skill 安装下来后，**Skill 进入待命**：

- ❌ 不主动创建任何工作目录
- ❌ 不主动注册账号
- ❌ 不主动询问任何信息
- ✅ 等待用户通过自然语言触发"创建视频"或"查询账号"等意图

工作目录、`.user.json`、`.canvasvideo/` 等本地文件都在**首次需要时由内部脚本自动创建**（详见 [`api-rules.md` §4](./references/api-rules.md)）。

---

## 二、第一次交互：理解需求 + 路径选择 + 模式选择

### 目标
- 选定**路径**（标准设计 / 快速模式）
- 选定**模式**（创作 / 口播）
- 根据模式收集差异化必要信息（创作=时长+受众；口播=音频+字幕）

### 必查规则
- [`mode-rules.md`](./references/mode-rules.md) §1（模式定义）、§3（字幕共生）、§4（创作模式默认 BGM）
- [`themes-catalog.md`](./references/themes-catalog.md)（主题非必问，默认 black；用户主动指明再切）
- [`principles.md`](./references/principles.md) §2（必问 vs 可默认 清单）

### 路径选择（新增，必问）

第一次反问时，**必须明示两条路径**让用户选：

```
你想走哪条路径？

A. 标准设计流程（推荐用于正式发布）
   生成完整 design.md → 你确认 → 打包上传
   优点：思考充分、可调可控；缺点：耗时较长

B. 快速模式（适合 demo / 试错 / 短视频 / 一次性预览）
   生成精简 design-quick.md（不需你确认）→ 直接打包上传
   优点：极速；缺点：跳过用户确认，细节由 LLM 主导
```

**路径选择的严格规则**：
- 用户明示"快速 / 简单 / demo / 试一下 / 随便做个" 等关键字 → 仍要给两条路径选项确认，**不要悄悄替用户决定**
- 用户没回路径 → 默认 **A 标准**（保守、可控）
- 用户选 B 快速后：跳过第三次交互（用户确认环节），第二次直接生成 design-quick.md 后**自动进入第四次**

### ⚠️ 必问清单（按路径 + 模式区分必问项）

用户首条消息只给了"做一个 XX 视频"这样的方向时，**严禁立即开始生成 design.md**。
按下面的三步走流程用 **AskUserQuestion 工具** 一次性补齐必要信息。

#### 第一步：先确定模式（创作 / 口播）

| 字段 | 询问理由 | 自动判定（免问） |
|------|---------|----------------|
| **模式**（创作 / 口播） | 决定是否需要 SRT、是否生成字幕、节奏门槛 | 用户消息含 `.mp3/.wav/.m4a/.srt` 路径或显式说"配音/口播/SRT" → 自动判定为口播；否则按"创作模式"询问确认 |

#### 第二步：路径选择 + 按模式收集差异化必要信息（合并问，1 次完成）

**快速模式必问项压缩到 1 次反问**（合并路径选择 + 必问字段）：

```
反问示例（创作模式 + 用户没明示路径）：

我帮你做这个视频，简单确认下：
1. 路径：A 标准设计（生成完整 design.md + 你确认） / B 快速模式（直接生成）
2. 时长：5 / 15 / 30 / 60 秒
3. 主题：极简白 / 沉浸黑

不回我就用默认：A 标准 + 15 秒 + 沉浸黑 + 大众受众。
```

**标准模式（路径 A）创作模式必问 2 项**：

| 字段 | 询问理由 | 默认值兜底（用户拒答时） |
|------|---------|-----------------------|
| **视频时长** | 决定区域数、节奏密度、推荐区域数 | 60 秒 |
| **目标受众** | 决定文案口吻、专业度、参考示例风格 | 大众用户 |

**快速模式（路径 B）创作模式必问 1 项**（受众默认大众）：

| 字段 | 询问理由 | 默认值兜底（用户拒答时） |
|------|---------|-----------------------|
| **视频时长** | 决定区域数、节奏密度 | **15 秒**（快速模式专属默认值） |

**口播模式必问 2 项**（不论标准还是快速）：

| 字段 | 询问理由 | 备注 |
|------|---------|------|
| **音频路径**（`.mp3 / .wav / .m4a`） | 决定时长、字幕排版的锚点 | 路径不存在或扩展名不支持 → 阻塞，要求重新提供 |
| **SRT 字幕路径**（`.srt`） | 决定区域切分与字幕内容 | 路径不存在 → 阻塞 |

#### 全部非必问（用默认值兜底）

| 字段 | 标准模式默认 | 快速模式默认 |
|------|---------|---------|
| **路径** | `A 标准` | （用户必须显式选 B 才走快速） |
| **主题**（white / black） | `black`（沉浸黑） | `black`（沉浸黑） |
| **视频比例** | 4:3（780×585） | 4:3（780×585） |
| **风格调性** | 跟随主题与受众自动匹配 | 跟随主题自动匹配 |
| **BGM**（创作模式） | 默认配 BGM | 默认配 BGM |
| **视频类型** | 案例分享型（叙事结构通用） | 案例分享型 |
| **目标受众** | 必问 | **大众用户**（快速模式不问） |

**询问方式**：使用 AskUserQuestion 工具，把**路径选择 + 模式判定 + 必问字段**一次性问完（**最多 3 个并列问题**），不要逐个追问。

### 执行要点
- 用户首条消息已含模式判定信息（含 `.srt` / `.mp3` 路径 → 口播；明示"创作模式" → 创作）→ **不再追问模式**
- 用户首条消息已含路径关键字（"快速/简单/demo/试一下"）→ 仍要展示两条路径让用户最终确认
- 创作模式：首条已含路径 + 时长 + 受众 → 不再追问；缺哪问哪
- 口播模式：首条已含路径 + 音频 + SRT 路径 → 不再追问；缺哪问哪
- 用户在补充消息中明确说"按默认来 / 你看着办 / 随便"时，使用默认值兜底继续
- **主题非必问**（默认 black 沉浸黑），不要强制二选一
- 口播模式必须校验 `.mp3/.wav/.m4a + .srt` 文件存在
- 创作模式**默认配 BGM**（除非用户主动拒绝）
- **路径选择确定后必须把 `path` 字段（`'standard'` 或 `'quick'`）写到 `project-state.json`**，后续脚本会读

### 严禁
- ❌ 用户只说了"做一个 XX 视频"就直接进入第二次交互生成 design.md
- ❌ 强行追问主题 / 受众（创作模式才问受众；主题永远不问；快速模式连受众都不问）
- ❌ 用 5 条以上消息逐条追问（必须 AskUserQuestion 一次性问完）
- ❌ 口播模式音频/SRT 路径缺失却开始生成
- ❌ **快速模式跳过 batch 查 API、validate.js 自检、云端 precheck（这三条硬规则不放宽）**
- ❌ **用户已选快速模式后又给他生成完整 design.md（违反路径选择）**
- ❌ **用户已选标准模式后又跳过用户确认（违反路径选择）**

---

## 三、第二次交互：生成本地 design.md + 素材清单

### 目标
- 在本地 `{workdirRoot}/{skillProjectId}/design.md` 写出**设计文档**
- 同时产出"用户素材清单"（含状态标注）

### 子流程分支（按路径选择）

**[路径 A 标准]**：[`templates/designs/video_design_guide.md`](./templates/designs/video_design_guide.md) —— 详细规定 design.md 的"步骤 0 + 五阶段十一步 + 用户素材清单"产出格式。LLM 必须按子流程的 11 个步骤**逐步输出，不能跳步、不能一次性输出全部**。生成后进入第三次交互等用户确认。

**[路径 B 快速]**：[`templates/designs/design-quick.md`](./templates/designs/design-quick.md) —— 精简版（50 行内），单文件，5 块结构（基础设定 / 区域划分 / 主视觉决策 / 节奏曲线 / 自检清单）。**一次性输出**即可，**不要求用户确认**，生成后**自动跳过第三次交互**直接进入第四次。

### 工作目录
- 调用 `scripts/scaffold.js` 的 `ensureProjectWorkdir()` 自动建目录（路径推算详见 [`api-rules.md` §4](./references/api-rules.md)）
- 调用 `scripts/state.js` 的 `loadOrCreateProject()` 生成 `skillProjectId`（**严禁 LLM 自己编 ID**，详见 [`api-rules.md` §5](./references/api-rules.md)）

### 必查规则
- **路径 A**：所有 references/ 规则（子流程会逐步引用）
- **路径 B**：references/components-catalog.md（选型决策）+ references/timing-rules.md（节奏门槛）+ references/layout-rules.md（布局公式），其它规则在写 project.json 时按需查

### 严禁
- ❌ 跳过子流程任何步骤
- ❌ 一次性输出所有产出（路径 A 必须按步骤逐步生成；路径 B 才允许一次性输出）
- ❌ 留空表格单元格 / 自检全部填"通过"
- ❌ 使用 `theme` 之外的全局主题机制（必须用 customStyle）
- ❌ 组件 ID 用英文单词（必须用 `{区域}-###` 格式）
- ❌ **路径 B 快速模式跳过 design-quick.md 直接写 project.json**（精简版仍是必要的思考脚手架）

---

## 四、第三次交互：多轮设计微调（直至确认）

> ⚠️ **路径 B 快速模式跳过本节**——design-quick.md 生成后自动进入第四次，不等用户确认。
> 本节只对路径 A 标准模式生效。

```
用户反馈 → Skill 改 design.md → 提示用户重查 → ...（loop）
                                                  ↓
                            用户明确"确认" → markDesignConfirmed → 进入第四次
```

### 执行要点
- **增量修改**：只改用户提到的章节，其它保持不动
- **状态联动**：用户替换某项素材时，自动把状态从 `[AI 自动生成]` 改为 `[已具备]`
- **未确认前不允许打包**：通过 `state.assertDesignConfirmed()` 拦截
- **路径 B 快速模式下** LLM 在生成 design-quick.md 后**立即调用** `state.markDesignConfirmed()` 自我标记为已确认，无需用户介入（这是路径 B 的核心简化）

---

## 五、第四次交互：打包 + 首次自动后置注册 + 上传（核心）

### 目标
- 把工作目录打包成 zip
- 首次上传时自动注册用户、本地保存凭证
- 把 zip 上传到服务器，拿到 `previewUrl`

### 前置子流程：design.md → project.json

⚠️ **进入打包前，LLM 必须先把已确认的 `design.md` 翻译成 `project.json`**——这是单独的子流程，规则统一在：

**[`templates/designs/build_project_json.md`](./templates/designs/build_project_json.md)** —— design.md 各章节如何映射到 project.json 字段、组件字段 API 调用、本地校验流程。

写入位置：`{workdirRoot}/{skillProjectId}/project.json`（与 design.md 同目录）。

写完后必须通过 `scripts/validate.js` 做本地自检（节奏 / 布局规则），通过后才能进入打包步骤。schema 结构 + customStyle 字段级 + audio/subtitles 共生 由云端 `/api/projects/validate` 在 `uploadWithUser` Step 0 自动权威校验。

> **[硬规则] 写 components[] 之前必须先调 `POST /api/component/spec/batch`**：把 design.md 里所有用到的组件类型一次性查全，按 API 返回的字段填 customStyle。**禁止凭记忆、凭模板猜测填字段**。API 调不通时直接停下，不允许凭记忆硬写。

### 调用方式

```js
const { uploadWithUser } = require('./scripts/upload-video');
const path = require('path');

const projectJsonPath = path.join(workdirRoot, skillProjectId, 'project.json');
const result = await uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath, {
  projectJsonPath, // 强烈推荐：先调云端 /api/projects/validate 预校验，避免浏览器渲染期才发现 customStyle 字段缺失
});
// result = { previewToken, previewUrl, isFirstTime, user, warnings }
// 若云端预校验未通过，会抛 { code: 'PRECHECK_FAILED', errors: [...] }，逐条修复 project.json 后重试
```

### 内部流程

详见 [`api-rules.md` §6](./references/api-rules.md)（uploadWithUser 6 步内部流程）。

### 输出文案（**协议级，必须严格遵守**）

#### 路径 B 快速模式专属前缀（路径 A 不加）

如果本次走的是**路径 B 快速模式**，输出文案的**最开头**必须加这一段：

```
⚡ 快速模式产出 — 已跳过完整设计文档环节
   • 想完善设计：发"按标准流程重做"重新走一遍（不复用本次产物）
   • 想局部调整：直接说"把 P3-004 的图改成 ..."，我会改 project.json 不重做
```

然后才接首次/非首次的标准文案。

#### 首次（`isFirstTime === true`）— ⚠️ 必须特别强调

LLM **必须**按以下格式输出，不可省略任何元素：

```
✅ 视频已上线：{previewUrl}

📤 这条链接可以直接分享给同事、朋友、客户或社群——
   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。

🎮 播放页快捷键（先点开链接试试）：
   • 空格         播放 / 暂停
   • ← / →        快退 / 快进
   • 双击空格     全景 / 退出全景
   • ↑ / ↓        显示 / 隐藏组件 ID

🖼️ 想换掉占位图（带"※ 演示图片 请替换"水印的）？
   1. 把你的真实图片放到工作目录的 ./assets/images/ 下
   2. 然后告诉我："把 P3-004 的图片替换成 ./assets/images/my-photo.png"
   3. 我会自动改 project.json 并重新打包上传，链接保持不变

🛠️ 想调整视频里某个组件的样式？
   1. 在播放页按 ↑ 显示组件 ID
   2. 找到要改的组件 ID（如 P4-001、P3-003）
   3. 告诉我具体怎么改，常见说法举例：
      • "P4-001 再大一点"
      • "P3-003 改成红色"
      • "P2-002 文字太长了，缩短一点"
      • "P5-003 按钮换成绿色，圆角再大一点"
      • "P1-002 副标题加粗"
      • "P6 区域多停 2 秒"
      • "把 P3-004 移到右边"

⚠️ 重要：本次为你创建了 CanvasVideo 账号

  userId:    {user.userId}
  userToken: {user.userToken}

📁 凭证已保存到本地：{workdirRoot}/.user.json

🔒 这是你登录视频列表页面的唯一凭证。
   - 请妥善保管，不要泄露给他人
   - 如果该文件丢失，账号将无法找回（你的视频链接仍可正常访问，但无法在网页上看到列表）
   - 如需在其他设备使用，请将 .user.json 复制过去
```

#### 非首次（`isFirstTime === false`）— 仅链接 + 操作引导

```
✅ 视频已上线 / 已更新：{previewUrl}

📤 链接可以直接分享给同事、朋友、客户或社群——
   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。

🎮 快捷键：空格=播放/暂停 · ←→=快进快退 · 双击空格=全景 · ↑↓=显示/隐藏组件 ID

🖼️ 替换占位图：把图片放到 ./assets/images/，然后说"把 P3-004 替换成 my-photo.png"
🛠️ 调整组件：先按 ↑ 显示 ID，再说"P4-001 再大一点 / P3-003 改成红色"
```

**严禁**在非首次输出中泄露 userId / userToken。

#### 警告 (`warnings`)

`getOrCreateUser` 返回的 `warnings` 数组包含本地文件损坏等提示，LLM 应在首次告知前作为前置补充：

```
⚠️ 检测到本地账号文件存在但无法使用：xxx；已为你重新创建账号
（然后正常输出首次告知）
```

### 错误处理

详见 [`api-rules.md` §7](./references/api-rules.md)。

### 必查规则
- 打包前必须通过 [`selfcheck-rules.md`](./references/selfcheck-rules.md) L0/L4 全部检查
- [`api-rules.md`](./references/api-rules.md)（接口契约）

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

### 严禁
- ❌ 在迭代时再次展示账号信息
- ❌ 在视频已生成后回头修改 design.md（提示用户："如需重做设计，请创建新视频"）

---

## 七、第七次交互：用户主动查询账号（任意时刻可触发）

### 意图识别

LLM 必须识别以下泛化表达，统一走查询账号分支：

```
我的账号是什么 / 给我看一下我的 token / 我的 userId 是多少
我的 CanvasVideo 凭证 / 把账号告诉我 / 我的账号信息
我的 token / 显示账号 / 看一下账号
```

### 行为约束

- 调用 `readLocalUser(workdirRoot)`，**只读本地，绝不调用任何服务端接口**
- 查询不应触发注册（即使本地无账号也不要顺手注册）

### 输出文案（协议级）

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

### 拒绝重置请求

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
├── SKILL.md                    # 本文件：主流程文档
├── README.md                   # 人类阅读的项目介绍
├── references/                 # ⭐ 规则原典（hard rule 单一来源）
│   ├── mode-rules.md           # 创作/口播模式 + 音频用法 + 字幕共生
│   ├── themes-catalog.md       # 主题二选一 white/black
│   ├── timing-rules.md         # 节奏 4 条门槛 + settings
│   ├── layout-rules.md         # viewport/canvas/regions + 组件 Y/尺寸 + 对比度
│   ├── components-catalog.md   # 10 个组件选型决策树（字段走 API）
│   ├── visual-richness-rules.md # 丰富度 6 条门槛
│   ├── selfcheck-rules.md      # L0~L4 自检表
│   ├── principles.md           # 不打扰用户等基本原则
│   └── api-rules.md            # 服务端 API + 用户体系 + 工作目录
├── templates/
│   ├── designs/                # 子流程
│   │   ├── video_design_guide.md  # design.md 步骤 0~11 子流程
│   │   └── build_project_json.md  # design.md → project.json 子流程
│   ├── projects/               # 项目样板
│   │   ├── README.md           # 样板索引
│   │   ├── 通用视频.json
│   │   ├── 示例-产品演示型-2分钟口播.json
│   │   └── 示例-案例分享型-1分钟口播.json
│   ├── placeholders/           # 占位图素材
│   │   ├── url-factory.md
│   │   ├── light/              # 极简白主题 SVG
│   │   └── dark/               # 沉浸黑主题 SVG
│   └── bgm/                    # BGM 库
│       ├── bgm-catalog.md
│       └── *.mp3
└── scripts/
    ├── scaffold.js             # 创建工作目录 + 写 design.md + 拷贝素材
    ├── state.js                # skillProjectId 管理 + 确认状态
    ├── validate.js             # 本地自检（仅节奏/布局，schema/字段交云端权威校验）
    ├── selfcheck.js            # 节奏 4 门槛 + 布局 Y 坐标检查
    ├── package.js              # 打包 zip
    └── upload-video.js         # 用户体系 + 云端 precheck + 上传
```

工作目录详见 [`api-rules.md` §4](./references/api-rules.md)。

---

## 九、重要约束（不得违反）

1. **第一次交互按模式区分必问**（详见 [`principles.md`](./references/principles.md) §2）：
   - 先确定模式（创作 / 口播；含 `.srt/.mp3` 路径可自动判定）
   - 创作模式必问：**视频时长 + 目标受众**
   - 口播模式必问：**音频路径 + SRT 字幕路径**
   - 主题、风格、BGM、视频比例等**全部非必问**（用默认值兜底）
2. **设计文档仅在本地**：不上传服务器
3. **设计确认后才上传**：`assertDesignConfirmed()` 拦截
4. **视频生成后不回设计**：所有迭代直接改 project.json
5. **固定 skillProjectId**：同一项目多次上传使用相同 ID，服务器复用 previewToken
6. **首次注册无感**：用户不需要主动注册，由 `getOrCreateUser` 自动完成
7. **首次告知必须强调**：⚠️ + 代码块 + 存放路径 + 风险提示，缺一不可
8. **非首次不再展示账号**：严禁在迭代或非首次场景输出 userToken
9. **查询账号只读本地**：绝不调用任何服务端接口
10. **不主动重置账号**：用户要重置时引导其手动删除 `.user.json`
11. **不打扰用户**：详见 [`principles.md`](./references/principles.md) §1（不主动删文件、不二次确认）

---

## 十、使用样例（LLM 编排参考）

### 首次创建视频

```js
const path = require('path');

// 1. 工作目录（详见 api-rules.md §4）
const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');

// 2. 项目状态（详见 api-rules.md §5）
const state = require('./scripts/state').loadOrCreateProject(workdirRoot);

// 3. 生成 design.md（子流程详见 templates/designs/video_design_guide.md）
require('./scripts/scaffold').writeDesignMd(workdirRoot, state.skillProjectId, designMd);

// 4. 用户确认
require('./scripts/state').markDesignConfirmed(workdirRoot);

// 5. 占位素材 + BGM（详见 mode-rules.md §4）
const { ensurePlaceholders, ensureBgm } = require('./scripts/scaffold');
ensurePlaceholders(workdirRoot, state.skillProjectId, project.theme);
const bgm = ensureBgm(workdirRoot, state.skillProjectId, project.bgmStyle);
if (bgm.hasBgm) {
  project.audio = { path: bgm.copied[0], loop: true, fadeIn: 1, fadeOut: 2 };
}

// 6. 校验（详见 selfcheck-rules.md）
require('./scripts/validate').validate(project);

// 7. 打包 + 上传（详见 api-rules.md §6）
const { uploadWithUser } = require('./scripts/upload-video');
const result = await uploadWithUser(SERVER_URL, workdirRoot, state.skillProjectId, zipPath, {
  projectJsonPath: path.join(workdirRoot, state.skillProjectId, 'project.json'),
});

// 8. 输出文案（按本文档 §5）
if (result.warnings.length) { /* 前置 warnings */ }
if (result.isFirstTime) {
  // 按 §5 首次模板输出 ⚠️ 强调
} else {
  // 仅输出 result.previewUrl
}
```

### 查询账号（第七次交互）

```js
const { readLocalUser } = require('./scripts/upload-video');
const { user, error } = readLocalUser(workdirRoot);
if (user) {
  // 按 §7 输出账号信息
} else if (error) {
  // 文件损坏：按 §7 输出错误说明，不打印 raw
} else {
  // 文件不存在：按 §7 输出"未注册"提示
}
```
