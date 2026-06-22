# 步骤10：上传

> 前置步骤：[步骤9：打包](09-package.md)
> 下一步：无（完成）

---

## 目标

上传 zip 到服务器，获取预览链接。

---

## 输入

| 来源 | 说明 |
|------|------|
| output.zip | 打包文件 |
| 脚本 | `scripts/upload-video.js` |
| 引用规则 | `references/api-rules.md` §6 |

---

## 操作

### 第 1 步：运行上传脚本

```js
const { uploadWithUser } = require('./scripts/upload-video');
const result = await uploadWithUser(SERVER_URL, workdirRoot, skillProjectId, zipPath, {
  projectJsonPath: path.join(workdirRoot, skillProjectId, 'project.json'),
});
```

### 第 2 步：输出结果

```js
if (result.warnings.length) {
  console.warn('Warnings:', result.warnings);
}

if (result.isFirstTime) {
  // 首次：输出完整账号信息
  console.log(`⚠️ 账号已创建`);
  console.log(`userToken: ${result.userToken}`);
  console.log(`请保存到: {workdir}/.user.json`);
} else {
  // 非首次：仅输出链接
  console.log(`预览链接: ${result.previewUrl}`);
}
```

---

## 产出

| 结果 | 说明 |
|------|------|
| previewUrl | 视频预览链接 |
| userToken | 用户账号（首次） |

---

## 自检

- [ ] 上传成功
- [ ] 返回 previewUrl
- [ ] 账号已保存（首次）

---

## 完成

视频已生成，用户可通过 previewUrl 预览。

如需迭代，直接修改 project.json 或重新执行流程。
