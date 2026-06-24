# 步骤3：生成骨架JSON

> 前置步骤：[步骤2：骨架设计](02-skeleton-design-creative.md)
> 下一步：[步骤4：区域设计](04-region-design-creative.md)

---

## 目标

从 design-skeleton 自动生成 skeleton.json。

---

## 输入

| 来源 | 说明 |
|------|------|
| 上一步产出 | `design-skeleton-creative.md` 或 `design-skeleton-dubbing.md` |

---

## 前置检查

生成 skeleton.json 前，必须确认：

- [ ] `design-skeleton-creative.md`（或 `design-skeleton-dubbing.md`）已存在且内容完整
- [ ] 用户已确认骨架设计（步骤2的产出）

**严禁**：未确认就生成 skeleton.json

---

## 操作

### 第 1 步：运行自动生成脚本

```bash
node scripts/generate-skeleton.js {workdir} {skillProjectId}
```

脚本会自动完成：
1. 读取 `design-skeleton-creative.md`（或 `design-skeleton-dubbing.md`）
2. 提取 JSON 配置代码块（项目基本信息）
3. 提取区域列表表格
4. 自动计算 canvas 尺寸
5. 生成 `skeleton.json`

**脚本会自动填充以下字段**：

| 字段 | 来源 | 说明 |
|------|------|------|
| name, description, theme, duration | 设计文档中的 JSON 配置 | — |
| viewport | 设计文档中的 JSON 配置 | — |
| canvas | 根据区域坐标自动计算 | — |
| settings | 默认值 | — |
| audio | 设计文档中的 JSON 配置 | 创作模式：根据 `bgm` 自动生成 BGM 路径；口播模式：直接使用 `audio.path` |
| source_design_doc | 自动填充 | 如 `./design-skeleton-creative.md` 或 `./design-skeleton-dubbing.md` |
| regions | 设计文档中的区域列表表格 | — |

**口播模式额外字段**（自动从 JSON 配置复制）：

| 字段 | 说明 |
|------|------|
| style | 视觉风格：warm / tech / business / art |
| emotion_curve_template | 情绪曲线类型 |
| subtitle_count | SRT 字幕总条数 |
| regions[].subtitle_range | 该区域包含的字幕序号范围 |

### 第 2 步：创建项目目录

```bash
node scripts/setup-workdir.js {workdir} {skillProjectId}
```

脚本会自动创建：
- `{workdir}/{skillProjectId}/assets/images/`
- `{workdir}/{skillProjectId}/regions/`

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| skeleton.json | `{workdir}/{skillProjectId}/skeleton.json` | 骨架配置（脚本自动生成） |
| regions/ | `{workdir}/{skillProjectId}/regions/` | 区域目录 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] name 不为空
- [E] duration > 0
- [E] theme 是 black 或 white
- [E] regions 数组不为空
- [E] audio 格式正确（对象格式）
- [E] source_design_doc 字段存在且不为空（记录设计文档来源）
- [W] canvas 尺寸能容纳所有区域

---

## 下一步

> ⚠️ **硬规则**：`skeleton.json` 只包含区域的位置信息（`name`/`x`/`y`）。
> 每个区域还需要单独执行 **步骤4（区域设计）** 和 **步骤5（生成区域JSON）**。
> 有多少个区域，就执行多少次步骤4-5。
>
> **严禁**：
> - ❌ 跳过区域设计，直接生成完整 components
> - ❌ 在 skeleton.json 中写入 components 或 subtitles
> - ❌ 合并多个区域到一个 design-P{n}.md

进入步骤4-5循环：
- 区域1 → [步骤4：区域设计](04-region-design-creative.md) → 步骤5：生成区域JSON
- 区域2 → [步骤4：区域设计](04-region-design-creative.md) → 步骤5：生成区域JSON
- ...（直到所有区域完成）
- 全部完成后 → [步骤6：合并](06-merge.md)
