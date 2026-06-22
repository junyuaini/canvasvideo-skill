# 步骤8：校验

> 前置步骤：[步骤7：素材处理](07-assets.md)
> 下一步：[步骤9：打包](09-package.md)

---

## 目标

校验 project.json 的完整性和正确性。

---

## 输入

| 来源 | 说明 |
|------|------|
| project.json | 完整配置 |
| 引用规则 | `references/selfcheck-rules.md` |

---

## 操作

### 第 1 步：运行校验脚本

```js
const { validate } = require('./scripts/validate');
const result = validate(project);

if (!result.valid) {
  throw new Error(`校验失败：${result.errors.join(', ')}`);
}
```

### 第 2 步：检查资源存在性

```js
const { checkMissingAssets } = require('./scripts/package');
const missing = checkMissingAssets(path.join(workdirRoot, skillProjectId));

if (missing.length > 0) {
  throw new Error(`资源缺失：${missing.join(', ')}`);
}
```

---

## 产出

| 结果 | 说明 |
|------|------|
| 通过 | 进入下一步 |
| 失败 | 返回修改 |

---

## 自检

- [ ] project.json 校验通过
- [ ] 所有资源文件存在
- [ ] 无报错信息

---

## 下一步

进入 [步骤9：打包](09-package.md)
