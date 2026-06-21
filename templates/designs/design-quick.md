# 快速模式设计文档模板（design-quick.md）

> 这是 CanvasVideo Skill **路径 B 快速模式**的设计文档模板。
>
> **关键约定**：
> - 一次性输出，**不要求用户确认**，生成后直接进入打包上传
> - **不能省略**：5 块结构都必须填，留空 = 跳过思考脚手架 = 出来的视频空洞
> - **必查规则保持不变**：[`components-catalog.md`](../../references/components-catalog.md) 选型决策、[`timing-rules.md`](../../references/timing-rules.md) 节奏门槛、[`layout-rules.md`](../../references/layout-rules.md) 布局公式
> - **后续写 project.json 时仍必须按 [`build_project_json.md`](./build_project_json.md) 流程走**——包括 batch 查 API、本地 selfcheck、云端 precheck（快速模式不放宽任何质量底线）

---

## 模板（LLM 按下面 5 块填即可）

```markdown
# {项目名}（快速模式）

> ⚡ 快速模式产出 — 跳过用户确认环节，由 LLM 直接生成 project.json 并上传

## 1. 基础设定

- 时长：{N} 秒
- 模式：{创作 / 口播}
- 主题：{white / black}（默认 black 沉浸黑）
- 总区域数：{N}（按 timing-rules.md 节奏门槛推算）
- 视频比例：4:3（780×585）
- BGM：{自动配 / 用户拒绝 / 口播模式不用}

## 2. 区域划分（核心：每区域一句话核心信息）

| 区域 | 时长 | 核心信息（一句话） |
|---|---|---|
| P1 | 0~3s | hook：钩子文案，吸引看下去 |
| P2 | 3~7s | 问题陈述：场景痛点 |
| ... | ... | ... |

> 节奏曲线参考 timing-rules.md §1：单区域 ≤ 15s（创作模式），密度 ≥ 0.6 组件/秒。

## 3. 主视觉决策（每区域选 1 个主组件，**必查 components-catalog.md**）

| 区域 | 主组件类型 | 选型理由（参考 catalog 决策树） |
|---|---|---|
| P1 | ShockComponent | hook 段需要冲击力 |
| P2 | CardComponent | 多步骤场景用 |
| ... | ... | ... |

> 主视觉之外的辅助组件（Badge / Corner / Text）在写 project.json 时再决定，不必在此列。

## 4. 节奏曲线（一句话描述情绪走向）

情绪走向：{高 → 高 → 中 → 中低 → 高}（避免单调，避免全部一个调）

## 5. 自检清单（写完 project.json 后**回来勾选**）

- [ ] 所有区域 ≤ 15s（创作模式）/ 与 SRT 完全对齐（口播模式）
- [ ] 每个非 AggregateComponent 都有 customStyle 字段（不论填了什么）
- [ ] 每个 customStyle 字段都来自 `POST /api/component/spec/batch` 返回结果（**禁止凭记忆编**）
- [ ] 主图组件 y 坐标在区域内递增
- [ ] 本地 validate.js 自检通过（节奏 / 布局）
- [ ] 云端 /api/projects/validate precheck 通过（schema / customStyle 字段级）
```

---

## 与标准模式 design.md 的关键差异

| 维度 | 标准 design.md（video_design_guide.md） | 快速 design-quick.md |
|---|---|---|
| **结构** | 11 个步骤、五阶段 | 5 块结构 |
| **长度** | 通常 800-1500 行 | < 50 行 |
| **产出方式** | 按步骤逐步输出 | 一次性输出 |
| **用户确认** | 必须确认才进入打包 | 不需确认，直接进入打包 |
| **可调可控** | 强（每步都可回滚微调） | 弱（生成后只能局部编辑 project.json） |
| **思考深度** | 区域 + 节奏 + 视觉 + 风险 + 自检 + 受众 + 风格 + 素材 | 区域 + 节奏 + 主视觉 + 自检 |
| **适用场景** | 正式发布、品牌项目、长视频 | demo、试错、短视频、一次性预览 |

---

## 快速模式产出后的局部编辑

用户拿到快速模式视频后，常见反馈：

> "把 P3-004 的图改成 ./assets/images/my-photo.png"
> "P1-002 文字改成 'AI 让一切变简单'"
> "P4-001 背景再深一点"

**处理方式**（同标准模式）：
- 直接修改 `{workdirRoot}/{skillProjectId}/project.json` 的对应字段
- 修改后重新打包上传（previewToken 不变，URL 保持稳定）
- **不重做 design-quick.md**

**严禁**：
- ❌ 用户局部编辑后回头去补做完整的 design.md（这违反路径选择契约）
- ❌ 用户说"想要完整设计文档"时偷偷复用本次的 design-quick.md → 必须重新走标准流程从头来

---

## 写完后的下一步

`design-quick.md` 写完即视为"设计已确认"，LLM 立即：

1. 调 `state.markDesignConfirmed()` 标记设计已确认
2. 进入 [`build_project_json.md`](./build_project_json.md) 子流程写 project.json
3. **批量调 `POST /api/component/spec/batch` 查所有用到的组件字段**（这是硬规则，快速模式不放宽）
4. 写完 project.json → `validate.js` 本地自检 → `uploadWithUser`（含云端 precheck）→ 返回 previewToken
5. 输出文案前缀加 `⚡ 快速模式产出` 标记（详见 SKILL.md §五 输出文案）
