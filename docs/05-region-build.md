# 步骤5：生成区域JSON

> 前置步骤：[步骤4：区域设计](04-region-design.md)
> 下一步：[步骤6：合并](06-merge.md) 或继续下一个区域

---

## 目标

从 design-P{n}.md 生成 regions/P{n}.json。

---

## 输入

| 来源 | 说明 |
|------|------|
| 上一步产出 | `design-P{n}.md` |
| 骨架配置 | `skeleton.json`（获取 viewport、theme） |
| 引用规则 | `references/components-catalog.md` |

---

## 操作

### 第 1 步：读取设计文档

```js
const designPath = path.join(workdirRoot, skillProjectId, `design-${regionName}.md`);
const designContent = fs.readFileSync(designPath, 'utf-8');
```

### 第 2 步：查询组件规范

**必须先调 API**：

```js
const { queryApi } = require('./scripts/query-api');
const specs = await queryApi.batchGetComponentSpec(['TitleComponent', 'ShockComponent']);
```

### 第 3 步：生成组件

从设计文档提取组件信息，生成 JSON：

```json
{
  "id": "P1-001",
  "type": "TitleComponent",
  "content": { "text": "...", "level": 1 },
  "position": { "x": 20, "y": 30, "w": 740, "h": 70 },
  "customStyle": { ... },
  "start": 0,
  "end": 5
}
```

### 第 4 步：生成字幕（仅配音模式）

```json
[
  { "start": 0, "end": 2.5, "text": "..." }
]
```

### 第 5 步：组装区域 JSON

```js
const regionJson = {
  regionId: regionName,
  subtitles: extractedSubtitles,
  components: extractedComponents
};

fs.writeFileSync(
  path.join(workdirRoot, skillProjectId, 'regions', `${regionName}.json`),
  JSON.stringify(regionJson, null, 2)
);
```

### 第 6 步：验证时间范围

检查组件时间是否在区域时间范围内：

```js
// 从 skeleton.json 获取区域时间范围
const regionIndex = skeleton.regions.findIndex(r => r.name === regionName);
const regionStart = calculateRegionStart(skeleton, regionIndex); // 如 10
const regionEnd = calculateRegionEnd(skeleton, regionIndex);     // 如 25

// 验证每个组件
regionJson.components.forEach(comp => {
  if (comp.start < regionStart || comp.end > regionEnd) {
    throw new Error(`${comp.id} 时间 ${comp.start}-${comp.end} 超出区域范围 ${regionStart}-${regionEnd}`);
  }
});
```

### 第 7 步：区域级校验

```js
const { validateRegion } = require('./scripts/validate');
validateRegion(regionJson, skeleton);
```

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| P{n}.json | `{workdir}/{skillProjectId}/regions/P{n}.json` | 区域配置 |

---

## 自检

- [ ] regionId 与文件名一致
- [ ] 组件总数 ≤ 5 个
- [ ] 每个组件有完整的字段
- [ ] customStyle 已按 API 规范填写
- [ ] 时间轴无重叠
- [ ] 区域校验通过

---

## 下一步

- 还有区域？→ 返回 [步骤4：区域设计](04-region-design.md)
- 全部完成？→ 进入 [步骤6：合并](06-merge.md)
