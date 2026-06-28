# 步骤1：初始化

> 前置步骤：无（用户首次提出需求）
> 下一步：[步骤2：骨架设计](02-skeleton-design-creative.md)（创作模式）或 [02-skeleton-design-dubbing.md](02-skeleton-design-dubbing.md)（口播模式）

---

## 目标

初始化工作目录 → 确认模式 → 收集必要信息。

---

## 两种模式

| 模式 | 用户提供 | 字幕 | AI负责 |
|------|---------|------|--------|
| 创作模式 | 主题/时长/受众等文本 | ❌ 不生成 | 自动生成画面、HtmlComponent、占位素材；配BGM |
| 口播模式 | 音频(.mp3/.wav/.m4a) + SRT字幕 | ✅ 必须有 | 严格按音频/SRT排版 |

---

## 操作

### 步骤1：确认模式

**AI 自动推断**：

| 推断条件 | 推断结果 |
|---------|---------|
| 用户提供 `.mp3/.wav/.m4a/.srt` 路径 | 口播模式 |
| 其他所有情况 | 创作模式 |

**用 AskUserQuestion 告知用户推断结果，确认是否正确**：

- 说明两种模式区别：
  - **创作模式**：AI 自动生成画面、动画、BGM，适合没有现成录音的情况
  - **口播模式**：您提供音频+字幕，AI 按音频节奏排版画面，适合有现成录音的情况
- 让用户确认模式或切换

**严禁**：让用户回答"你想用什么模式"这种开放式问题。

---

### 步骤2：收集信息

根据确认后的模式，收集对应字段。**已获取的字段不再重复索要**。

#### 创作模式

| 字段名 | 描述 | 是否必填 | 规则/默认值 |
|--------|------|---------|------------|
| `content` | 视频内容/主题 | **必填** | 描述视频要讲什么 |
| `duration` | 预计时长（秒） | 非必填 | 默认 `15`，建议给用户选项如 `15s/30s/60s/90s` |

**向用户确认**（只问 content/duration）：
```
已获取您的内容：{简要复述}
- 时长：{用户选的秒数}秒
如无需调整，直接回复"可以"即可。
```

> 其它字段（theme/BGM 等）在 Step 2 设计文档的 MD 模板中填写，或省略（使用默认值）。

#### 口播模式

> 口播模式 init-project 不收集任何配置字段（音频/字幕/style 等全部在 Step 2 MD 模板中写）。

**向用户确认**：
```
已选择口播模式。请提供：
- 音频文件路径（如 ./voice.mp3）
- SRT 字幕路径（如 ./subtitle.srt）
后续在 Step 2 设计文档中写入。
```

---

### 步骤2.6：字幕样式（必填）

**无论创作模式还是口播模式，都必须配置字幕样式**。字幕样式从"主题控制"改为"项目级必填"——主题不再控制颜色/字号/位置，由项目自身决定。

AI 必须根据内容风格自己决定填什么值（用户不参与这个决策）。典型场景的推荐值：

| 场景 | color | fontSize | position | weight | background | textShadow |
|------|-------|----------|----------|--------|------------|------------|
| 浅色背景 | `#1A1A1A` | `36px` | `bottom-center` | `700` | `transparent` | `0 1px 2px rgba(255,255,255,0.8)` |
| 深色背景 | `#FFFFFF` | `36px` | `bottom-center` | `700` | `rgba(0,0,0,0.5)` | `0 1px 3px rgba(0,0,0,0.8)` |
| 高对比（科普） | `#FFFFFF` | `40px` | `bottom-center` | `800` | `rgba(0,0,0,0.7)` | `0 2px 4px rgba(0,0,0,0.9)` |
| 顶部标题 | `#1A1A1A` | `48px` | `top-center` | `700` | `transparent` | `none` |

**位置 9 档**：`top-left / top-center / top-right / middle-left / middle-center / middle-right / bottom-left / bottom-center / bottom-right`

**字段约束**（schema 强校验，缺失或格式错会被服务端拒绝）：

```json
"subtitle": {
  "color": "#FFFFFF",                                  // hex 或 rgba
  "fontSize": "36px",                                  // CSS 长度（px/rem/em）
  "position": "bottom-center",                         // 9 档之一
  "weight": 700,                                       // 100-900 整百
  "background": "rgba(0,0,0,0.5)",                     // transparent / hex / rgba
  "textShadow": "0 1px 3px rgba(0,0,0,0.8)"            // CSS text-shadow，空字符串表示无
}
```

**何时 AI 必须决定**：

- ✅ **AI 必须自己决定**：用户没指定字幕样式时
- ❌ **AI 不能问用户**：除非用户主动说"字幕我要 XXX"——否则不要打断用户流程

**校验失败会怎样**：

- `generate-skeleton.js`：缺 `config.subtitle` → fail-fast 抛错并给出补字段示例
- `selfcheck.js`：6 字段缺任意一个 → 输出 `[必填] project.subtitle.X 缺失`
- `server validate`：上传时 schema 拒绝，返回 400

---

### 步骤2.5：判断新建 vs 沿用

**这一步是 init-project 跑之前必须做的决策**，对应 [rules/01-principles.md §R2](rules/01-principles.md#r2-项目新建-vs-沿用)。

先看 `<Agent工作目录>/canvasvideo-workdir/.canvasvideo/project-state.json` 是否存在：

| state.json | 用户意图 | AI 决策 | 命令 |
|------------|---------|---------|------|
| 不存在 | 任何意图 | **新建项目**（不用加 `--new`，默认行为就是新建） | 普通命令 |
| 存在 | **新主题 / 新内容** | **新建项目** | 命令加 `--new` |
| 存在 | **修改当前项目** | **沿用项目** | 普通命令（不加 `--new`） |
| 存在 | **意图模糊** | **停下来澄清** | 不调脚本，先问用户 |

**关键词快速判断**（仅作辅助，必须结合上下文）：

- 新建：`"做个新的"`、`"再做个"`、`"下一个"`、`"换个主题"`、`"今天录了个音频"`、`"新的视频"`
- 沿用：`"改一下"`、`"调整"`、`"换个颜色"`、`"加个结尾"`、`"缩短一点"`、`"第三段重做"`
- 模糊：`"帮我处理一下视频"`、`"接着搞"`、`"继续"`——**必须问用户**

**严禁**：AI 自己猜"应该是要新建"或"应该是要沿用"——猜错了会覆盖昨天的项目。

**脚本报错回看**：如果脚本输出 `📌 沿用现有项目 cv_xxx` 但用户语义明显是新建，立刻停下来提示：
```
⚠️ 检测到 workdir 已有项目 cv_xxx，但本次意图像是新主题。
   要新建项目请加 --new 标志（会删除老项目 cv_xxx）。
   要继续沿用请回复"沿用"。
```

---

### 步骤3：初始化项目

运行初始化脚本：

**方式1：配置文件（推荐，避免引号问题）**

先创建配置文件：

```bash
# 创作模式 - 新建项目（推荐，状态文件不存在时默认就是新建）
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> creative --config=project-config.json

# 创作模式 - 强制新建项目（已有项目时加 --new，会删除老 state.json）
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> creative --new --config=project-config.json

# 创作模式 - 沿用现有项目（修改/迭代当前视频）
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> creative --config=project-config.json

# 口播模式 - 新建项目
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> dubbing --config=dubbing-config.json

# 口播模式 - 强制新建项目
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> dubbing --new --config=dubbing-config.json
```

**方式2：JSON 字符串（兼容旧方式）**

```bash
# 创作模式 - 新建
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> creative '{"content":"视频主题","duration":15}'

# 创作模式 - 强制新建
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> creative --new '{"content":"新主题","duration":15}'

# 口播模式
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> dubbing '{"audioPath":"./audio.mp3","subtitlePath":"./subtitle.srt","theme":"white","aspect":"4:3"}'
```

**`--new` 标志说明**：

- **作用**：删除 `<Agent工作目录>/canvasvideo-workdir/.canvasvideo/project-state.json`，强制生成新的 `skillProjectId`
- **何时用**：用户语义是"新主题 / 新内容 / 新视频"，且 workdir 下已有项目
- **何时不用**：用户是修改当前项目；或 state.json 本来就不存在
- **决策参考**：[rules/01-principles.md §R2](rules/01-principles.md#r2-项目新建-vs-沿用)

脚本会输出三选一日志，AI 必须**原样转发给用户**：

```
# 沿用现有项目
📌 state.json 已存在 → 沿用现有项目 cv_a1b2c3_mqtk95pt_0b43fa53
   如需创建新项目（例如换了主题），请加 --new 标志

# 新建项目
🆕 state.json 不存在 → 创建新项目

# 强制重建
🔄 --new 标志 → 删除老 state.json，强制重建项目
   老项目: cv_a1b2c3_mqtk95pt_0b43afa2（已弃用）
🆕 state.json 不存在 → 创建新项目
```

> **说明**：
> - `<Agent工作目录的绝对路径>` 必须传 AI 当前所在工作目录的绝对路径
> - workdir 固定 = `<Agent工作目录>/canvasvideo-workdir/`
> - 不要传相对路径，不要用 `.` 或 `..`
> - **首次执行需要联网**：脚本会先调用 `getOrCreateUser` 远程注册账号（无感），拿到 `userId` 后再用其短哈希生成新格式 `skillProjectId`

脚本会自动完成：
1. **远程注册/读取账号**（仅首次需联网，本地有 `.user.json` 则跳过）
2. 用 userId 的短哈希生成 `skillProjectId`（新格式：`cv_{userShort6}_{timestamp}_{random8}`，如 `cv_a1b2c3_mqtk95pt_0b43fa53`）
3. 创建工作目录结构
4. 保存项目配置到 `state.json`（含 `userId`）
5. 输出项目ID、工作目录路径，**首次创建会同时输出 userId/userToken**

> 注意：脚本输出的 `skillProjectId` 需要记录，后续步骤会用到。**严禁 LLM 自编或硬编码 skillProjectId**——详见 [rules/01-principles.md §R6](../rules/01-principles.md#r6-skillprojectid-规范)。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目目录 | `{workdir}/{skillProjectId}/` | 工作目录 |
| state.json | `{workdir}/.canvasvideo/state.json` | 项目状态 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] 模式已确定（创作/口播）
- [E] 必填信息已获取（content 或 audio+subtitle）
- [E] 工作目录已创建
- [E] skillProjectId 已生成
