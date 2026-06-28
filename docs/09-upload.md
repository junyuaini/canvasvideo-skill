# 步骤9：上传

> 前置步骤：[步骤8：打包](08-package.md)
> 下一步：无（完成）

---

## 目标

上传 zip 到服务器，获取预览链接。

---

## 前置检查

执行本步骤前，必须确认：

- [ ] `<skillProjectId>.zip` 已存在（Step 8 产出）
- [ ] `project.json` 已存在且校验通过（Step 7 通过）

**如果不满足**：
- 没有 zip → 回到 [步骤8：打包](08-package.md)
- project.json 校验失败 → 回到 [步骤7：校验](07-validate.md)

---

## 输入

| 来源 | 说明 |
|------|------|
| `<skillProjectId>.zip` | Step 8 打包文件 |
| 脚本 | `scripts/upload-video.js` |
| 引用规则 | `rules/08-api.md` §R3 |

---

## 操作

### 第 1 步：运行上传脚本

```bash
node scripts/upload-video.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} {zip绝对路径}
```

**参数说明**：
- `--cwd`：Agent 工作目录（必传）
- `{skillProjectId}`：项目 ID
- `{zip绝对路径}`：Step 8 产出的 zip 文件绝对路径

**示例**：

```bash
node scripts/upload-video.js --cwd=/path/to/agent/workspace cv_abc123 /path/to/workdir/cv_abc123.zip
```

**可选参数**：第一个位置参数传 `serverUrl` 可覆盖默认服务端：

```bash
node scripts/upload-video.js --cwd=/path/to/agent/workspace https://custom-server.com cv_abc123 /path/to/zip
```

脚本会自动：
1. 读取 `{workdir}/.user.json` 获取用户凭证（首次会创建账号）
2. 上传 zip 文件到服务器
3. 输出预览链接和账号信息

### 第 2 步：查看结果

脚本会自动输出（**AI 无需手写，直接复制给用户**）：

- 上传状态（成功/失败）
- 预览链接（`previewUrl`）
- 账号信息（首次创建时显示 `userToken`）
- 警告信息（如有）

---

## 产出

| 结果 | 说明 |
|------|------|
| previewUrl | 视频预览链接（线上） |
| previewToken | 预览令牌（写回本地 state.json） |
| userToken | 用户账号（首次创建时返回） |
| **state.json 闭环** | 脚本会调用 `state.js#savePreviewInfo` 把 `previewToken` / `previewUrl` / `updatedAt` 写回 `<Agent工作目录>/canvasvideo-workdir/.canvasvideo/project-state.json` |

### 本地 state.json 闭环

上传成功后，**脚本会自动更新**本地 `state.json`：

```diff
{
  "skillProjectId": "cv_a1b2c3_mqtk95pt_0b43fa53",
  "userId": "cu-xxxxxxxxxxxx",
  "mode": "creative",
  "designConfirmed": true,
+ "previewToken": "pt-xxxxxxxxxxxxxxxx",
+ "previewUrl": "https://dajiulanren.top/cv/view/pt-xxxxxxxxxxxxxxxx",
+ "updatedAt": "2026-06-28T20:31:28.000Z",
  "createdAt": "2026-06-28T18:00:00.000Z"
}
```

这三项是"上一次成功上传"的快照，供后续操作复用：
- **`previewToken`**：下次调 `/cv/api/projects/view/:previewToken` 用
- **`previewUrl`**：AI 可以直接读 state 拿上次链接给用户（不用再翻聊天记录）
- **`updatedAt`**：判断"项目是否已经上传过 / 何时上传的"

**AI 不用自己写这三项**——脚本会自动落盘。如果看到 state.json 里这三项是 `null`，说明这次上传没有走通（脚本会输出警告）。

**写失败不阻断上传**：如果本地 state.json 写失败（权限/磁盘满等），脚本会塞到 `warnings` 数组里输出，**不影响线上预览**——线上视频依然有效，只是下次读不到本地状态。

---

## 自检

> [E] Error — 不符合将阻断（脚本自动校验） | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

**脚本自动校验**（运行 `upload-video.js` 时检查）：

- 上传成功（HTTP 200/201）
- 返回 previewUrl 字段
- 账号信息写入 `{workdir}/.user.json`（首次）

**AI 写完后自查**：

无（步骤本身由脚本完成，无 AI 设计动作）。

---

## 完成

视频已生成，用户可通过 previewUrl 预览。

如需迭代，直接修改 project.json 或重新执行流程。