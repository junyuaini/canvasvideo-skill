# 规则总清单

> CanvasVideo Skill 所有规则的目录与速查表。
> **本文档是硬规则的单一来源。**

---

## 规则索引

| 编号 | 规则 | 适用场景 | 文档 |
|------|------|---------|------|
| R01 | 基本原则 | 所有交互 | [01-principles.md](01-principles.md) |
| R06 | 组件 | 组件选型、API 调用 | [06-components.md](06-components.md) |
| R08 | API | 服务端交互 | [08-api.md](08-api.md) |
| R09 | 自检 | 本地检查（ID格式+重复） | [09-selfcheck.md](09-selfcheck.md) |

---

## 快速引用

### 设计阶段
- 组件选型 → [06-components.md](06-components.md)

### API 调用
- 组件规范查询 → [06-components.md](06-components.md) §R1
- 服务端端点 → [08-api.md](08-api.md) §R1
- 用户体系 → [08-api.md](08-api.md) §R2

### 自检阶段
- 本地自检（ID格式+重复） → [09-selfcheck.md](09-selfcheck.md)
- 云端校验（schema+字段） → 云端 `/api/projects/validate`
