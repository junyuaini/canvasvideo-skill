# 步骤1：初始化

> 前置步骤：无（用户首次提出需求）
> 下一步：[步骤2：音频与字幕准备](02-voice-prepare.md)

---

## 目标

初始化工作目录，收集项目配置。

> 注：用户提供音频 + SRT 字幕，AI 按音频节奏排版画面。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目目录 | `{workdir}/{skillProjectId}/` | 工作目录 |
| state.json | `{workdir}/.canvasvideo/state.json` | 项目状态 |

---

## 操作

### 第 1 步：收集配置

从用户意图中提取配置字段：

```json
{
  "audioPath":    "./audio.mp3",
  "subtitlePath": "./subtitle.srt",
  "theme":        "white",
  "aspect":       "4:3"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `audioPath` | 是 | 音频文件路径（相对于 workdir） |
| `subtitlePath` | 是 | 字幕文件路径（相对于 workdir） |
| `theme` | 否 | 主题：`white`（默认）\| `black` |
| `aspect` | 否 | 画幅：`4:3`（默认）\| `16:9` |

**AI 从用户意图中提取或推断**（示例）：

```
用户："帮我做个视频，音频在 D:/voice.mp3，字幕在 D:/sub.srt，主题黑底"
→ audioPath: "D:/voice.mp3" → 转换相对路径（复制到 workdir 后用相对路径）
→ subtitlePath: "D:/sub.srt"
→ theme: "black"
→ aspect: 默认 "4:3"
```

用户未指定的字段：AI 按默认值填写（`theme: "white"`, `aspect: "4:3"`）。

### 第 2 步：新建配置文件

把上一步收集的配置写入 JSON 文件（如 `dubbing-config.json`），供 init-project.js 读取。

### 第 3 步：判断新建 vs 沿用

**这一步是 init-project 跑之前必须做的决策**，对应 [rules/01-principles.md §R2](rules/01-principles.md#r2-项目新建-vs-沿用)。

先看 `<Agent工作目录>/canvasvideo-workdir/.canvasvideo/project-state.json` 是否存在：

| state.json | 用户意图 | AI 决策 | 命令 |
|------------|---------|---------|------|
| 不存在 | 任何意图 | **新建项目**（默认行为） | 普通命令 |
| 存在 | **新主题 / 新内容** | **新建项目** | 命令加 `--new` |
| 存在 | **修改当前项目** | **沿用项目** | 普通命令 |
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

### 第 4 步：运行初始化脚本

**配置文件**

先创建配置文件，再运行脚本：

```bash
# 新建项目
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> --config=dubbing-config.json

# 强制新建项目（已有项目时加 --new，会删除老 state.json）
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> --new --config=dubbing-config.json

# 沿用现有项目（修改/迭代当前视频）
node scripts/init-project.js --cwd=<Agent工作目录的绝对路径> --config=dubbing-config.json
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
4. 从 config 提取 `theme` / `aspect` 写入 state
5. 保存项目配置到 `state.json`
6. 输出项目ID、工作目录路径，**首次创建会同时输出 userId/userToken**

> 注意：脚本输出的 `skillProjectId` 需要记录，后续步骤会用到。**严禁 LLM 自编或硬编码 skillProjectId**——详见 [rules/01-principles.md §R6](../rules/01-principles.md#r6-skillprojectid-规范)。

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] 配置文件已创建（audioPath + subtitlePath + theme + aspect）
- [E] 工作目录已创建
- [E] skillProjectId 已生成
- [E] state.theme 和 state.aspect 已写入