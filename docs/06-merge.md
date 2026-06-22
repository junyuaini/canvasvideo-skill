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

---

## 操作

### 第 1 步：运行合并脚本

```bash
node scripts/merge-regions.js {workdir}/{skillProjectId}
```

或：

```js
const { mergeRegions } = require('./scripts/merge-regions');
const project = mergeRegions(path.join(workdirRoot, skillProjectId));
```

### 第 2 步：验证合并结果

检查：
- 组件总数 = 所有区域组件数之和
- 字幕总数 = 所有区域字幕数之和
- 所有组件 ID 唯一
- 组件按 start 时间排序

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| project.json | `{workdir}/{skillProjectId}/project.json` | 完整配置 |

---

## 自检

- [ ] project.json 是合法 JSON
- [ ] 包含所有全局字段
- [ ] components 数组不为空
- [ ] 所有组件 ID 唯一
- [ ] 组件按 start 排序
- [ ] 字幕按 start 排序

---

## 下一步

进入 [步骤7：素材处理](07-assets.md)
