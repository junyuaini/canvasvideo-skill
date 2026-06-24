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
| 引用规则 | `rules/09-selfcheck.md` |

---

## 操作

### 第 1 步：运行校验脚本

验证脚本会自动检查设计文档来源：

**执行命令：**

```bash
node scripts/validate.js {workdir}/{skillProjectId}/project.json
```

**脚本会自动验证：**

1. **骨架设计文档** - 检查 project.json 包含 `source_design_doc` 字段，且 `./design-skeleton-xxx.md` 文件存在
2. **区域设计文档** - 检查每个区域包含 `source_design_doc` 字段，且对应的 `./design-P{n}.md` 文件存在
3. **selfcheck 规则** - 节奏 4 门槛 + 布局 Y 坐标检查

> ⚠️ **硬规则**：**严禁**跳过校验脚本。必须使用 `validate.js` 脚本验证通过后才能进入打包步骤。这是确保设计文档未被跳过的最后一道防线。

### 第 2 步：检查资源存在性

脚本会自动检查所有引用的资源文件是否存在。

---

## 产出

| 结果 | 说明 |
|------|------|
| 通过 | 进入下一步 |
| 失败 | 返回修改 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] project.json 校验通过
- [E] 所有资源文件存在
- [E] 无报错信息
- [E] 骨架 source_design_doc 字段存在且不为空
- [E] 骨架 source_design_doc 引用的设计文档文件存在
- [E] 每个区域都有 source_design_doc 字段
- [E] 每个区域的 source_design_doc 引用的设计文档文件存在

---

## 下一步

进入 [步骤9：打包](09-package.md)
