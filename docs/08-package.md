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
node --cwd=<Agent工作目录> scripts/package.js {workdir}/{skillProjectId}
```

或：

```js
const { package } = require('./scripts/package');
const zipPath = package(
  path.join(workdirRoot, skillProjectId),
  path.join(workdirRoot, skillProjectId, 'output.zip')
);
```

### 第 2 步：检查打包结果

脚本输出会显示打包结果。检查 `output.zip` 是否已生成。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| output.zip | `{workdir}/{skillProjectId}/output.zip` | 打包文件 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] zip 文件已生成
- [E] 无打包错误
- [I] zip 大小合理（包含音频）

---

## 下一步

进入 [步骤9：上传](09-upload.md)
