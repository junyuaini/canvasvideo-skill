# 步骤7：素材处理

> 前置步骤：[步骤6：合并](06-merge.md)
> 下一步：[步骤8：校验](08-validate.md)

---

## 目标

复制占位素材和 BGM 到工作目录。

---

## 输入

| 来源 | 说明 |
|------|------|
| project.json | 获取 theme、audio |
| 引用规则 | — |

---

## 操作

### 第 1 步：运行素材设置脚本

```bash
node scripts/setup-assets.js {workdir} {skillProjectId} --theme={white|black} --bgm={bgmStyle}
```

**参数说明**：
- `--theme`：主题色（`white` 或 `black`，默认 `white`）
- `--bgm`：BGM 风格（如 `tech-pulse`，不传则不复制 BGM）

**示例**：

```bash
# 复制占位素材 + BGM
node scripts/setup-assets.js ./canvasvideo-workdir cv_abc123 --theme=white --bgm=tech-pulse

# 仅复制占位素材（无 BGM）
node scripts/setup-assets.js ./canvasvideo-workdir cv_abc123 --theme=black
```

脚本会自动完成：
1. 将占位 SVG 复制到 `{workdir}/{skillProjectId}/assets/placeholders/{theme}/`
2. 将 BGM 复制到 `{workdir}/{skillProjectId}/assets/placeholders/bgm/`

**⚠️ 必须先复制 BGM 文件到 workdir，再更新 project.json 的 audio.path**

### 第 2 步：保存更新后的 project.json

如果修改了 project.json（如更新 audio.path），直接保存即可：

```bash
node scripts/save-project.js {workdir} {skillProjectId}
```

> 注：如果没有修改 project.json，可跳过此步。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| placeholders/ | `{workdir}/{skillProjectId}/assets/placeholders/` | 占位素材 |
| bgm/ | `{workdir}/{skillProjectId}/assets/placeholders/bgm/` | BGM 文件 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] 占位素材已复制
- [E] BGM 文件已复制（BGM 模式）
- [E] audio.path 指向正确的文件
- [E] 文件存在性检查通过

---

## 下一步

进入 [步骤8：校验](08-validate.md)
