# 自检规则

> 本地自检只做三项检查，其余交给云端。

---

## 本地自检（三项）

### 1. ID 格式检查（必填）

**格式**：`P{区域编号}-{三位数字}`，如 `P1-001`、`P3-005`、`P10-001`

规则：
- ID 为必填字段，每个组件必须有 id
- `P` 后的数字必须与所在区域的 name 匹配（如区域 name 为 P1，则组件 ID 必须以 P1- 开头）
- 三位数字范围 001-999，不可省略前导零

| 正确 | 错误 | 原因 |
|------|------|------|
| P1-001 | P1-1 | 序号必须是三位数字 |
| P2-005 | P2-05 | 序号必须是三位数字 |
| P3-010 | 003 | 缺少区域前缀 |
| P10-001 | P1_001 | 分隔符必须是短横线 |

### 2. ID 唯一性检查

- 所有组件 ID 必须**全局唯一**
- 同一区域内的序号不可重复（如 P1-001 只能出现一次）

### 3. 顶级组件 regionId 检查

- 顶级组件（即 `project.components[]` 数组的直接成员）必须配置 `regionId`
- `regionId` 必须在 `project.regions[]` 中存在
- 组件 ID 的前缀必须与 `regionId` 一致（如 `regionId: "P1"` → ID 必须以 `P1-` 开头）

| 正确 | 错误 | 原因 |
|------|------|------|
| `{ id: "P1-001", regionId: "P1" }` | `{ id: "P1-001" }` | 顶级组件缺少 regionId |
| `{ id: "P1-001", regionId: "P1" }` | `{ id: "P1-001", regionId: "P2" }` | 组件 ID 前缀与 regionId 不一致 |
| `{ id: "P1-001", regionId: "P1" }` | `{ id: "P1-001", regionId: "X1" }` | regionId 不在 regions 中 |

### 4. HtmlComponent elementIds 检查

- HtmlComponent 必须配置 `content.elementIds`
- elementIds 必须是非空对象，key 为 CSS 选择器，value 为 `{ id, start, end }` 对象
- 每个元素的 `id` 必填，格式必须为 `P{区域编号}-{三位数字}`（如 `P1-002`、`P1-003`），与顶级组件 ID 规则统一，且全局唯一
- `start` 和 `end` 必填，且 `start <= end`

---

## 示例

```json
"regions": [
  { "name": "P1", "duration": 3 },
  { "name": "P2", "duration": 5 }
]

// ✅ 正确
{ "id": "P1-001", "type": "HtmlComponent", ... }
{ "id": "P1-002", "type": "HtmlComponent", ... }
{ "id": "P2-001", "type": "HtmlComponent", ... }

// ❌ 错误：区域前缀不存在
{ "id": "P3-001", ... }

// ❌ 错误：序号区域重复
{ "id": "P1-001", ... }  // 第二个 P1-001
```

---

真正的格式硬校验（schema、字段完整性）由云端 `/api/projects/validate` 在上传前完成。
