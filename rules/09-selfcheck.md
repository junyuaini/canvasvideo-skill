# 自检规则

> 本地自检做 5 项检查：ID 格式、ID 唯一性、顶级组件 regionId、时间层次约束、HtmlComponent elementIds。其余交给云端。

---

## 本地自检（5 项）

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

### 4. 时间层次约束（project → region → component → element）

**核心规则**：每一级的时间范围必须落在上一级内。

#### 4.1 层级 1 / project

- `project.duration` **必填**，且必须为有限数字（不允许 `Infinity`）
- `project.duration` 必须 > 0.1 秒
- 所有 `region.duration` **累计之和必须严格等于** `project.duration`（**不允许留白**）

#### 4.2 层级 1.5 / region

- `region.duration` 必填，有限数字，≥ 0.1 秒
- region 的隐式时间范围 = `[累加到该 region 前的 duration, 累加到该 region 后的 duration]`
- 例：3 个 region 各自 duration=3，则隐式范围分别是 `[0,3]` `[3,6]` `[6,9]`

#### 4.3 层级 2 / component

- `start` / `end` 必填，有限数字，≥ 0
- `start ≤ end`
- `start ≥ 所属 region.startTime`
- `end ≤ 所属 region.endTime`

#### 4.4 层级 3 / element（HtmlComponent 内部）

- `start` / `end` 必填，有限数字，≥ 0
- `start ≤ end`
- `start ≥ 所属 component.start`
- `end ≤ 所属 component.end`

#### 错误信息示例

```
[层级 1 / project] project.duration 必填且为有限数字（如 9），不能是 Infinity 或缺失。建议：在 project.json 顶层加 "duration": 9。
[层级 1.5 / project] regions 时长累计 (12 秒) 超过 project.duration (9 秒)，超出 3.00 秒。建议：①将 project.duration 改为 12  ②缩短部分 region。
[层级 2 / component] [P1-001] end=10 超出所属 region "P1" 结束时间 3（region 范围 [0, 3]）。建议：将 end 改为 3 或更小。
[层级 3 / element] HtmlComponent [P1-001] elementIds["#P1-002"].end=10 超出所属组件结束时间 8（组件范围 [0, 8]）。建议：将 elementIds end 改为 8 或更小。
```

> **修复指引**：错误信息按 `[层级 N / 来源] 描述 + 建议：` 格式组织，建议值直接给出，AI 可机械替换。

### 5. HtmlComponent elementIds 检查

- HtmlComponent 必须配置 `content.elementIds`
- elementIds 必须是非空对象
- elementIds 的 **key 必须是 `#ID` 形式**（如 `#P1-002`），不再支持 class/tag 等其他 CSS 选择器
- HTML 字符串里必须有对应的 `id` 属性（如 `<div id="P1-002">`）
- value 为 `{ id, start, end }` 对象，其中 `value.id` 必填且**必须等于 `key.slice(1)`**（即去掉 `#` 后的部分）
- 每个元素的 `id` 格式必须为 `P{区域编号}-{三位数字}`（如 `P1-002`、`P1-003`），与顶级组件 ID 规则统一，且全局唯一
- 元素 `id` 必须以所属区域的 `regionId` 为前缀（如区域为 P1，则 id 必须以 P1- 开头）
- `start` 和 `end` 必填（**有限**数字、非负），且 `start <= end`（**不允许 Infinity**）
- 元素时间范围必须落在所属组件时间范围内（见第 4 节）

---

## 示例

```json
"duration": 9,
"regions": [
  { "name": "P1", "duration": 3 },
  { "name": "P2", "duration": 5 }
]

// ✅ 正确
{ "id": "P1-001", "type": "HtmlComponent", "start": 0, "end": 3, ... }
{ "id": "P1-002", "type": "HtmlComponent", "start": 3, "end": 6, ... }
{ "id": "P2-001", "type": "HtmlComponent", "start": 6, "end": 9, ... }

// ❌ 错误：区域前缀不存在
{ "id": "P3-001", ... }

// ❌ 错误：序号区域重复
{ "id": "P1-001", ... }  // 第二个 P1-001

// ❌ 错误：时间超出 region
{ "id": "P1-001", "start": 0, "end": 5, "regionId": "P1" }  // P1 只有 [0, 3]
```

---

真正的格式硬校验（schema、字段完整性）由云端 `/api/projects/validate` 在上传前完成。
