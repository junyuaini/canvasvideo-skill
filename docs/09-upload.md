# 步骤9：上传

> 前置步骤：[步骤8：打包](08-package.md)

---

## 目标

将打包好的 zip 上传到云端，获取可分享的预览链接。

---

## 输入

| 来源 | 说明 |
|------|------|
| zip 包 | `{workdir}/{skillProjectId}/{skillProjectId}.zip`（步骤8产出） |
| 脚本 | `scripts/upload-video.js` |
| 引用规则 | `rules/08-api.md` |

---

## 产出

| 结果 | 说明 |
|------|------|
| 预览链接 | `https://dajiulanren.top/cv/view/{previewToken}` |

---

## 操作

### 第 1 步：运行上传脚本

```bash
node scripts/upload-video.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

**参数说明**：
- `--cwd`：Agent 工作目录（必传，脚本从这里推断 workdir 路径）
- `{skillProjectId}`：项目 ID

**示例**：

```bash
node scripts/upload-video.js --cwd=/path/to/agent/workspace cv_abc123
```

**脚本会自动完成**：

1. **用户体系** - 自动注册或复用已有用户（无需手动注册）
2. **云端预校验** - 调用 `/cv/api/projects/validate` 检查 project.json 格式与字段完整性
3. **上传** - multipart 上传 zip 包（字段 `zip` + `meta`）
4. **返回链接** - 输出预览链接

> ℹ️ 同一 `skillProjectId` 重复上传会复用同一个 `previewToken`，预览链接保持不变，内容自动更新。

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量

**脚本自动校验**：

- zip 包存在
- 云端 `/cv/api/projects/validate` 通过（schema 结构 + customStyle 字段）
- 上传 HTTP 状态码 200

**AI 写完后自查**：

- [W] 预览链接复制给用户时确认可用（浏览器打开验证）

---

## 首次 vs 迭代

| 场景 | 行为 |
|------|------|
| **首次上传** | 自动注册用户，输出 userId + userToken，AI 必须用 ⚠️ 代码块格式告知用户保存 |
| **迭代上传** | 复用已有账号，不输出 userToken，直接返回预览链接 |