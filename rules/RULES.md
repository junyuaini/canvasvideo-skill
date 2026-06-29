# 规则总清单

> CanvasVideo Skill 所有规则的目录与速查表。
> **本文档是硬规则的单一来源。**

---

## 规则索引

| 编号 | 规则 | 适用场景 | 文档 |
|------|------|---------|------|
| R01 | 基本原则 | 所有交互 | [01-principles.md](01-principles.md) |
| R02 | 项目新建 vs 沿用 | 步骤1（init-project）决策 `--new` | [01-principles.md §R2](01-principles.md#r2-项目新建-vs-沿用) |
| R06 | 组件规则 | HtmlComponent 选型、API 调用 | [06-components.md](06-components.md) |
| R08 | API | 服务端交互 | [08-api.md](08-api.md) |
| R09 | 自检 | 本地检查（ID格式+重复） | [09-selfcheck.md](09-selfcheck.md) |
| R10 | 场景问答 | 常见场景判断标准 | [10-qa.md](10-qa.md) |

---

## 快速引用

### 设计阶段
- HtmlComponent 选型 → [06-components.md](06-components.md)

### 项目初始化
- 新建 vs 沿用决策（`--new`） → [01-principles.md §R2](01-principles.md#r2-项目新建-vs-沿用)
- 项目模式固定 dubbing（口播模式） → [06-components.md §R0](06-components.md#r0-项目级必填字段总览)
- 字幕样式必填（color/fontSize/position/weight/background/textShadow） → [06-components.md §R8](06-components.md#r8-字幕样式项目级必填)
- 字幕 validateElementDesign 必填（30-200字 + element id，强制 AI 自检） → [06-components.md §R10](06-components.md#r10-字幕-validateelementdesign-必填口播模式--强制-ai-自检)
- skillProjectId 格式约束 → [01-principles.md §R6](01-principles.md#r6-skillprojectid-规范)

### API 调用
- HtmlComponent 规范查询 → [06-components.md](06-components.md) §R1
- 服务端端点 → [08-api.md](08-api.md) §R1
- 用户体系 → [08-api.md](08-api.md) §R2

### 自检阶段
- 本地自检（ID格式+重复） → [09-selfcheck.md](09-selfcheck.md)
- 云端校验（schema+字段） → 云端 `/api/projects/validate`
