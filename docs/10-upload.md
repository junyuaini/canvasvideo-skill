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
}

console.log(`预览链接: ${result.previewUrl}`);
```

### 第 3 步：输出操作说明

向用户展示视频的使用说明：

```markdown
✅ 视频已上线：{previewUrl}
📤 这条链接可以直接分享给同事、朋友、客户或社群——
   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。

🎮 快捷键：空格=播放/暂停 · ←→=快进快退 · 双击空格=全景 · ↑↓=显示/隐藏组件 ID
🖼️ 替换占位图：把图片放到 ./assets/images/，然后让 AI "把 P3-004 替换成 my-photo.png"
🛠️ 调整组件：先按 ↑ 显示 ID，再让 AI "P4-001 再大一点 / P3-003 改成红色"
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
