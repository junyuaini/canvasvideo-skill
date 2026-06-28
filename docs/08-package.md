# 步骤8：打包

> 前置步骤：[步骤7：校验](07-validate.md)
> 下一步：[步骤9：上传](09-upload.md)

---

## 目标

将 project.json 和 assets 打包为 zip。

---

## 输入

| 来源 | 说明 |
|------|------|
| project.json | 完整配置 |
| assets/ | 素材目录 |
| 脚本 | `scripts/package.js` |

---

## 操作

### 第 1 步：运行打包脚本

```bash
node scripts/package.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

**参数说明**：
- `--cwd`：Agent 工作目录（必传，脚本从这里推断 workdir 路径）
- `{skillProjectId}`：项目 ID

**示例**：

```bash
node scripts/package.js --cwd=/path/to/agent/workspace cv_abc123
```

脚本会自动完成：
1. 检查 project.json 中引用的资源文件是否存在
2. 把 project.json + assets/ 打包为 zip
3. 输出 zip 路径

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| `<skillProjectId>.zip` | `{workdir}/{skillProjectId}/<skillProjectId>.zip` | 打包文件 |

---

## 自检

> [E] Error — 不符合将阻断（脚本自动校验） | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

**脚本自动校验**（运行 `package.js` 时检查）：

- project.json 中引用的资源文件全部存在（缺失则报错）
- zip 文件已生成
- 无打包错误

**AI 写完后自查**：

无（步骤本身由脚本完成，无 AI 设计动作）。

---

## 下一步

进入 [步骤9：上传](09-upload.md)