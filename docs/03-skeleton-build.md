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

## 操作

### 第 1 步：运行自动生成脚本

```bash
node scripts/generate-skeleton.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

> **注意**：`--cwd` 必传，指向 AI 当前所在工作目录（不是 workdir 本身）。

脚本会自动完成：
1. 读取 `design-skeleton-creative.md`（或 `design-skeleton-dubbing.md`）
2. 提取 JSON 配置（按"项目配置（JSON）"标题匹配）
3. 提取区域列表表格（按表头找列名）
4. 自动计算 canvas 尺寸 = viewport × 10
5. 生成 `skeleton.json`

**脚本会自动填充的字段**：

| 字段 | 来源 | 说明 |
|------|------|------|
| name, description, theme, duration | 设计文档中的 JSON 配置 | 可选字段缺失时 fallback 到 state.json 默认值 |
| viewport | 设计文档中的 JSON 配置 | 必填 |
| canvas | 根据 viewport 自动计算 | `width = viewport.width × 10` |
| settings | 默认值 | autoPlay / loop / minScale 等 |
| audio | 设计文档中的 JSON 配置 | 创作模式：根据 `bgm` 自动生成 BGM 路径；口播模式：直接使用 `audio.path` |
| source_design_doc | 自动填充 | 如 `./design-skeleton-creative.md` |
| regions | 设计文档中的区域列表表格 | 每个区域至少包含 `name` 和 `duration` |

**口播模式额外字段**：

| 字段 | 说明 |
|------|------|
| style | 视觉风格：warm / tech / business / art |
| emotion_curve_template | 情绪曲线类型 |
| subtitle_count | SRT 字幕总条数 |
| regions[].subtitle_range | 该区域包含的字幕序号范围 |

**脚本会自动校验**：

- MD 模式 vs state.mode 不匹配 → 报错（如 state.mode=dubbing 但 MD 是 creative）
- 区域总时长 vs config.duration 不一致 → warning
- 必填字段缺失 → 报错

### 第 2 步：创建项目目录

```bash
node scripts/setup-workdir.js --cwd=<Agent工作目录的绝对路径> {skillProjectId}
```

脚本会自动创建：
- `{workdir}/{skillProjectId}/assets/images/`
- `{workdir}/{skillProjectId}/regions/`

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| skeleton.json | `{workdir}/{skillProjectId}/skeleton.json` | 骨架配置 |
| regions/ | `{workdir}/{skillProjectId}/regions/` | 区域目录 |

---

## 下一步

进入步骤4循环：每个区域执行 [步骤4：区域设计](04-region-design-creative.md) → [步骤5：合并](05-merge.md)。

> 注：skeleton.json 只包含区域的 `name` 和 `duration`，**不含** x/y 坐标（前端按网格自动计算）和 components/subtitles 内容（这些在 Step 4-5 填）。