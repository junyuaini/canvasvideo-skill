# 步骤9：打包

> 前置步骤：[步骤8：校验](08-validate.md)
> 下一步：[步骤10：上传](10-upload.md)

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
node scripts/package.js {workdir}/{skillProjectId}
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

```js
const fs = require('fs');
if (!fs.existsSync(zipPath)) {
  throw new Error('打包失败：zip 文件未生成');
}
console.log(`打包完成: ${zipPath}`);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| output.zip | `{workdir}/{skillProjectId}/output.zip` | 打包文件 |

---

## 自检

- [E] zip 文件已生成
- [I] zip 大小合理（包含音频）
- [E] 无打包错误

---

## 下一步

进入 [步骤10：上传](10-upload.md)
