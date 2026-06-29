# 步骤5：合并

> 前置步骤：[步骤4：区域设计与生成JSON（口播模式）](04-region-design-dubbing.md)
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

> ℹ️ **运行时检查**：`merge-regions.js` 会自动检查所有 region JSON 是否齐全。缺失会直接报错，提示回到 Step 4 补全。

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

- HtmlComponent 总数 = 所有区域 HtmlComponent 数之和
- 字幕总数 = 所有区域字幕数之和
- 所有 HtmlComponent ID 唯一
- HtmlComponent 按 start 时间排序
- 字幕按 start 排序

### 第 4 步：素材清单引用

把 `design-skeleton-dubbing.md` 素材清单中**所有非空状态的素材**，挂到 HtmlComponent 的 `<img>` 上：

| design-skeleton 状态 | project.json 写法 |
|---|---|
| `[已具备]` | `<img src="./assets/images/{file}">`（真实路径） |
| `[AI 自动生成 - 占位]` | Picsum URL + CSS 叠水印（详见 `templates/placeholders/README.md`） |
| `[待用户提供]` | 也用占位图，备注列写"用户提供后替换" |

**素材清单实现率必须 = 100%**。

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| project.json | `{workdir}/{skillProjectId}/project.json` | 完整配置 |

---

## 自检

> [E] Error — 不符合将阻断（脚本自动校验） | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

**脚本自动校验**：

- `merge-regions.js` 检查所有 region JSON 是否齐全（缺失即报错）
- `merge-regions.js` 检查骨架设计文档存在性
- `selfcheck.js` 检查所有全局字段齐全（name, theme, duration, viewport, canvas, regions, settings, audio, components, source_design_doc）
- `selfcheck.js` 检查所有 HtmlComponent ID 唯一
- `merge-regions.js` 自动按 start 排序 HtmlComponent 和字幕

### 时间字段自动填充（新）

| 字段 | 来源 | 说明 |
|------|------|------|
| `region.startTime / endTime` | 从 SRT 字幕范围取 | merge 自动写入 |
| `component.start / end` | subtitles（查 SRT）/ 旧 start/end / 缺省=region 起止 | merge 自动写入 |
| `elementIds[].start / end` | 同上 | merge 自动写入 |

**优先级**：subtitles > 旧 start/end > fallback to region

**缺省规则**：所有时间字段都可省略不填
- 组件 start/end 未填 → 展示整个 region（与背景切换规则保持一致）
- 元素 start/end 未填 → 展示整个所属 HtmlComponent
- 前端会在 createMany 之前再补一次作为兜底（即使 merge 没跑过）

**AI 写完后自查**：

- [W] 素材清单实现率 = 100%（指所有素材都被挂到 HtmlComponent 上）

---

## 下一步

进入 [步骤6：素材处理](06-assets.md)
