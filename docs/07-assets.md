# 步骤7：素材编码

> 前置步骤：[步骤6：合并 + 自检](06-merge.md)
> 下一步：[步骤8：打包](08-package.md)

---

## 目标

将音频和图片转为 Base64，内联到 project.json，打包时不再依赖外部素材文件。

---

## 输入

| 来源 | 说明 |
|------|------|
| 状态文件 | `state.voice` 字段（步骤 2 产物） |
| project.json | 步骤 6 产出 |

---

## 产出

| 文件 | 说明 |
|------|------|
| project.json | 在原基础上内联 `audio.base64` 和 `images` 字段 |

---

## 操作

### 第 1 步：运行素材编码脚本

```bash
node scripts/setup-assets.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

脚本会自动完成：

1. 读取 `state.voice.audioPath`，将音频文件转为 Base64，写入 `project.json` 的 `audio.base64`
2. 扫描 `project.json` 中所有 `<img src="...">` 的路径，将图片文件转为 Base64，汇总写入 `project.json` 的 `images` 字段（key 为相对 workdir 的路径，value 为 Base64）
3. 将 `<img src="...">` 中的文件路径替换为 `data:image/...;base64,xxx` 格式

### 第 2 步：确认 project.json 更新

- `project.json.audio.base64` 非空
- `project.json.images` 包含所有引用的图片
- 所有 `<img src="...">` 指向 `data:image/...;base64,xxx`

---

## 自检

> [W] Warning — 不符合可能影响质量

- [W] 音频 Base64 非空
- [W] 所有图片均已编码，未遗漏
- [W] `<img src>` 已替换为 data URL

---

## 下一步

进入 [步骤8：打包](08-package.md)