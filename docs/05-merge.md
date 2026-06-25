# 步骤5：合并

> 前置步骤：[步骤4：区域设计与生成JSON](04-region-design-creative.md) / [步骤4：区域设计（口播模式）](04-region-design-dubbing.md)
> 下一步：[步骤6：素材处理](06-assets.md)

---

## 目标

合并 skeleton + regions 为完整的 project.json。

---

## 输入

| 来源 | 说明 | 检查项 |
|------|------|--------|
| 骨架配置 | `skeleton.json` | 必须存在 |
| 区域配置 | `regions/P{n}.json` | 必须存在，且数量与 `skeleton.json` 中的 `regions` 数组长度一致 |
| 脚本 | `scripts/merge-regions.js` | — |
| 引用规则 | `rules/09-selfcheck.md` | — |

> ⚠️ **硬规则**：合并前必须检查 `regions/` 目录下的 JSON 文件数量是否等于 `skeleton.json` 中 `regions` 数组的长度。
> 如果不一致，必须回到步骤4-5补全缺失的区域。

---

## 操作

### 第 1 步：运行合并脚本

合并脚本会自动完成验证、合并和保存操作：

**执行命令：**

```bash
node scripts/merge-regions.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

**脚本会自动完成：**

1. **验证骨架来源** - 检查 skeleton.json 包含 `source_design_doc` 字段，且对应的设计文档文件存在
2. **合并文件** - 将 skeleton 和所有区域合并为完整的 `project.json`
3. **保留来源** - 在 project.json 中保留骨架的 `source_design_doc` 信息
4. **保存文件** - 自动生成 `project.json`

### 第 2 步：验证合并结果

检查脚本输出的合并结果：

- 组件总数 = 所有区域组件数之和
- 字幕总数 = 所有区域字幕数之和
- 所有组件 ID 唯一
- 组件按 start 时间排序
- 字幕按 start 排序

### 第 4 步：素材清单引用

把 design.md 素材清单中**所有非空状态的素材**，挂到 `ImageComponent.content.image`：

| design.md 状态 | project.json 写法 |
|---|---|
| `[已具备]` | `"image": "./assets/images/{file}"`（真实路径） |
| `[AI 自动生成 - 占位]` | Picsum URL + AggregateComponent 叠水印（详见 `templates/placeholders/README.md`） |
| `[待用户提供]` | 也用占位图，备注列写"用户提供后替换" |

**素材清单实现率必须 = 100%**。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| project.json | `{workdir}/{skillProjectId}/project.json` | 完整配置 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] project.json 是合法 JSON
- [E] 包含所有全局字段（name, theme, duration, viewport, canvas, regions, settings, audio, components, source_design_doc）
- [E] components 数组不为空
- [E] 所有组件 ID 唯一
- [W] 素材清单实现率 = 100%
- [I] 组件按 start 排序
- [I] 字幕按 start 排序

---

## 下一步

进入 [步骤6：素材处理](06-assets.md)
