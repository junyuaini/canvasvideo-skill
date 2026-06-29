# 步骤7：校验

> 前置步骤：[步骤6：素材处理](06-assets.md)
> 下一步：[步骤8：打包](08-package.md)

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

```bash
node scripts/validate.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

**脚本会自动验证**：

1. **骨架设计文档** - 检查 project.json 包含 `source_design_doc` 字段，且对应的设计文档文件存在
2. **selfcheck 规则** - 节奏档位门槛 + 布局 Y 坐标检查 + HtmlComponent 字段完整性

> ℹ️ 本脚本只跑本地自检（selfcheck wrapper）。schema 结构 / customStyle 字段等强校验由云端 `upload-video.js` 的 precheck 兜底。

---

## 产出

| 结果 | 说明 |
|------|------|
| 通过 | 进入下一步 |
| 失败 | 修复 project.json 后重跑 |

---

## 自检

> [E] Error — 不符合将阻断（脚本自动校验） | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

**脚本自动校验**（运行 `validate.js` 时检查）：

- project.json 是合法 JSON
- 包含所有全局字段（name, theme, duration, viewport, canvas, regions, settings, audio, components, source_design_doc）
- 所有 HtmlComponent ID 唯一
- 元素时间轴无重叠
- 元素时间在区域时间范围内
- **嵌套关系校验**：merge 后 `element ⊂ component = region`（项目级一致性）
- **口播模式**：region.startTime/endTime 必须从 SRT 字幕范围取，component/element 时间由 `subtitles` 查 SRT 算
- **口播模式**：component/element 时间由 `subtitles` 查 SRT 算
- 骨架 source_design_doc 字段存在且不为空
- 骨架 source_design_doc 引用的设计文档文件存在

**AI 写完后自查**：

无（步骤本身由脚本完成，无 AI 设计动作）。

---

## 下一步

进入 [步骤8：打包](08-package.md)