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
| 引用规则 | `rules/02-mode.md` §R4 |

---

## 操作

### 第 1 步：复制占位素材

```js
const { ensurePlaceholders } = require('./scripts/scaffold');
ensurePlaceholders(workdirRoot, skillProjectId, project.theme);
```

### 第 2 步：复制 BGM（BGM 模式）

```js
const { ensureBgm } = require('./scripts/scaffold');
const bgm = ensureBgm(workdirRoot, skillProjectId, project.bgmStyle);

if (bgm.hasBgm) {
  project.audio = { path: bgm.copied[0], loop: true, fadeIn: 1, fadeOut: 2 };
} else if (project.bgmStyle) {
  throw new Error(`BGM 复制失败：templates/bgm/ 下没有 ${project.bgmStyle} 对应的 mp3 文件`);
}
```

**⚠️ 必须先复制 BGM 文件到 workdir，再写 project.json 的 audio.path**

### 第 3 步：保存更新后的 project.json

```js
fs.writeFileSync(
  path.join(workdirRoot, skillProjectId, 'project.json'),
  JSON.stringify(project, null, 2)
);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| placeholders/ | `{workdir}/{skillProjectId}/assets/placeholders/` | 占位素材 |
| bgm/ | `{workdir}/{skillProjectId}/assets/placeholders/bgm/` | BGM 文件 |

---

## 自检

- [E] 占位素材已复制
- [E] BGM 文件已复制（BGM 模式）
- [E] audio.path 指向正确的文件
- [E] 文件存在性检查通过

---

## 下一步

进入 [步骤8：校验](08-validate.md)
