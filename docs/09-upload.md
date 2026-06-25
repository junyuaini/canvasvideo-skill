# 步骤9：上传

> 前置步骤：[步骤8：打包](08-package.md)
> 下一步：无（完成）

---

## 目标

上传 zip 到服务器，获取预览链接。

---

## 前置检查

执行本步骤前，必须确认：

- [ ] `output.zip` 已存在
- [ ] `project.json` 已存在且校验通过

**如果不满足**：
- 没有 `output.zip` → 回到 [步骤8：打包](08-package.md)
- 没有 `project.json` → 回到 [步骤5：合并](05-merge.md)

---

## 输入

| 来源 | 说明 |
|------|------|
| output.zip | 打包文件 |
| 脚本 | `scripts/upload-video.js` |
| 引用规则 | `rules/08-api.md` §R3 |

---

## 操作

### 第 1 步：运行上传脚本

```bash
node scripts/upload-video.js --cwd=<Agent工作目录的绝对路径> {workdir}/{skillProjectId}/output.zip
```

脚本会自动：
1. 读取 `{workdir}/.user.json` 获取用户凭证（首次会创建账号）
2. 上传 zip 文件到服务器
3. 返回预览链接和账号信息

### 第 2 步：查看结果

脚本输出会显示：
- 上传状态（成功/失败）
- 预览链接（`previewUrl`）
- 账号信息（首次创建时显示 `userToken`）
- 警告信息（如有）

### 第 3 步：输出操作说明

向用户展示视频的使用说明：

```markdown
✅ 视频已生成完成！
预览链接：{previewUrl}

🖼️ 替换占位图：
   1. 把图片放到项目目录的 assets/images/ 文件夹下
      （项目目录：{workdir}/{skillProjectId}/assets/images/）
   2. 告诉我："把 P3-004 替换成 my-photo.png"

🛠️ 调整组件样式：
   1. 播放视频时按 ↑ 键，显示所有组件 ID
   2. 告诉我调整需求，例如：
      - "P4-001 字体调大"
      - "P3-003 改成红色"
      - "P2-002 位置往下移"
   3. AI 直接修改 project.json 并重新打包上传

⚠️ 重要：本次为你创建了 CanvasVideo 账号（仅首次显示）
  userId:    {userId}
  userToken: {userToken}
📁 凭证已保存到本地：{workdir}/.user.json
🔒 请妥善保管，丢失无法找回

🎮 快捷键：空格=播放/暂停 · ←→=快进快退 · 双击空格=全景 · ↑↓=显示/隐藏组件 ID

📤 这条链接可以直接分享给同事、朋友、客户或社群——
   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。
```

---

## 产出

| 结果 | 说明 |
|------|------|
| previewUrl | 视频预览链接 |
| userToken | 用户账号（首次） |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] 上传成功
- [E] 返回 previewUrl
- [I] 账号已保存（首次）

---

## 完成

视频已生成，用户可通过 previewUrl 预览。

如需迭代，直接修改 project.json 或重新执行流程。
