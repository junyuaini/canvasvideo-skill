# 步骤6：合并

> 前置步骤：[步骤5：生成区域JSON](05-region-build.md)
> 下一步：[步骤7：素材处理](07-assets.md)

---

## 目标

合并 skeleton + regions 为完整的 project.json。

---

## 输入

| 来源 | 说明 |
|------|------|
| 骨架配置 | `skeleton.json` |
| 区域配置 | `regions/P{n}.json` |
| 脚本 | `scripts/merge-regions.js` |
| 引用规则 | `rules/05-richness.md`、`rules/09-selfcheck.md` |

---

## 操作

### 第 1 步：运行合并脚本

**推荐：命令行调用**

```bash
node scripts/merge-regions.js {workdir}/{skillProjectId}
```

**或：代码中 require 引入**

```js
const { mergeRegions } = require('./scripts/merge-regions');
const project = mergeRegions(path.join(workdirRoot, skillProjectId));
```

> ⚠️ **注意**：`require` 路径必须是实际存在的 `.js` 文件路径。如果从 Skill 安装目录引入，路径为：
> ```js
> const { mergeRegions } = require('c:/Users/pujy/.trae-cn/skills/canvasvideo/scripts/merge-regions');
> ```

### 第 2 步：验证合并结果

检查：
- 组件总数 = 所有区域组件数之和
- 字幕总数 = 所有区域字幕数之和
- 所有组件 ID 唯一
- 组件按 start 时间排序
- 字幕按 start 排序

### 第 3 步：素材清单引用

把 design.md 素材清单中**所有非空状态的素材**，挂到 `ImageComponent.content.image`：

| design.md 状态 | project.json 写法 |
|---|---|
| `[已具备]` | `"image": "./assets/images/{file}"`（真实路径） |
| `[AI 自动生成 - 占位]` | Picsum URL + AggregateComponent 叠水印（详见 `templates/placeholders/url-factory.md`） |
| `[待用户提供]` | 也用占位图，备注列写"用户提供后替换" |

**素材清单实现率必须 = 100%**（详见 `rules/05-richness.md` §R1 门槛 4）。

### 第 4 步：视觉丰富度自检

按 `rules/05-richness.md` 检查：

| 门槛 | 检查项 |
|------|--------|
| 门槛 1 | 组件类型覆盖率 ≥ 60%（使用种类 / 10 ≥ 0.6） |
| 门槛 2 | 同一类型组件连续使用 ≤ 3 个 |
| 门槛 3 | 每个区域至少 1 个"非纯文字组件" |
| 门槛 4 | 素材清单实现率 = 100% |
| 门槛 5 | GraphicComponent 至少 3 种 diagram 类型（视频 ≥ 60s） |
| 门槛 6 | 同区域同类组件配色差异化 |

### 第 5 步：保存 project.json

```js
fs.writeFileSync(
  path.join(workdirRoot, skillProjectId, 'project.json'),
  JSON.stringify(project, null, 2)
);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| project.json | `{workdir}/{skillProjectId}/project.json` | 完整配置 |

---

## 自检

> [E] Error — 不符合将阻断 | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

- [E] project.json 是合法 JSON
- [E] 包含所有全局字段（name, theme, duration, viewport, canvas, regions, settings, audio, components）
- [E] components 数组不为空
- [E] 所有组件 ID 唯一
- [W] 素材清单实现率 = 100%
- [I] 组件按 start 排序
- [I] 字幕按 start 排序

---

## 下一步

进入 [步骤7：素材处理](07-assets.md)
