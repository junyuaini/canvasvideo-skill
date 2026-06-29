# 步骤4：区域设计与生成JSON（创作模式）

> 前置步骤：[步骤3：生成骨架JSON](03-skeleton-build.md)
> 下一步：[步骤5：合并](05-merge.md) 或继续下一个区域

---

## 目标

为骨架中的**单个区域**完成设计，并直接生成 `regions/P{n}.json`。

> ⚠️ **硬规则**：
> - 必须为骨架中的**每个区域**单独生成一份 `regions/P{n}.json`
> - 严禁跳过任何区域
> - 严禁将多个区域合并到一份JSON中

---

## 前置检查

执行本步骤前，必须确认：

- [ ] `skeleton.json` 已存在
- [ ] `skeleton.json` 中的 `regions` 数组不为空
- [ ] 当前区域的 `regions/P{n}.json` **不存在**（如存在则跳过）

**如果不满足**：回到 [步骤3：生成骨架JSON](03-skeleton-build.md)

---

## 输入

| 字段 | 来源 | 说明 |
|------|------|------|
| 区域类型 | 骨架输出 | Hook/Point/Data/Story/Step/Quote/CTA/Contrast/List/Timeline/Q&A/Scene/Emotion/Summary |
| 时间段 | 骨架输出 | 该区域的起止时间 |
| 时长 | 骨架输出 | 3-10秒 |
| 核心信息 | 骨架输出 | 一句话概括 |
| 情绪强度 | 骨架输出 | 低/中/高 |
| 区域位置 | 骨架输出 | 开头/前1/3/中段/后1/3/结尾 |
| 前区域情绪 | 骨架输出 | 低/中/高/无（首区域） |
| 全局背景 | 用户输入 | black/white |
| 风格 | 用户输入 | warm/tech/business/art |

---

## 设计步骤

### 步骤1：选择布局模式

区域类型由骨架决策树确定，区域设计以骨架输出为准，不再重新选择类型。

**基础布局**（只描述空间结构，不涉及具体元素）：

| 布局 | 空间结构 | 适用场景 |
|------|---------|---------|
| 单点聚焦 | 单一元素居中 | 金句、观点、Hook、CTA |
| 左右分栏 | 左40-50% + 右50-60% | 图文对照、对比 |
| 上下分层 | 上40% + 下60% | 标题+内容、数据展示 |
| 多列并排 | 2-3列等宽 | 列表、特征、对比 |
| 对比式 | 左右各占50%，差异明显 | 正反对比、Before/After |
| 时间轴 | 轴线+节点 | 流程、历史、步骤 |
| 问答式 | 问题区+答案区 | 设问、互动 |
| 极简过渡 | 极少元素，大量留白 | 过渡区域 |

**扩展布局**（只描述空间结构）：

| 布局 | 空间结构 | 适用场景 |
|------|---------|---------|
| 全屏沉浸 | 背景占满，文字叠加 | 氛围渲染、开场、结尾 |
| 上下分屏 | 上50% + 下50% | 对比、场景切换 |
| 中心环绕 | 中心区域+周围元素 | 核心数据、品牌展示 |
| 卡片堆叠 | 2-3张卡片层叠 | 递进关系、优先级 |
| 网格矩阵 | 2×2或3×3网格 | 多图展示、产品矩阵 |
| 对角线构图 | 元素沿对角线分布 | 动感、冲突、不稳定 |
| 留白聚焦 | 大量留白，元素极小 | 高级感、禅意、极简 |
| 图文穿插 | 文字块和图片块交错 | 长文、叙述、杂志风 |
| 瀑布流 | 从上到下依次排列 | 列表、时间线、步骤 |
| 悬浮卡片 | 卡片悬浮在背景上 | 现代感、层次感 |

**布局与区域类型匹配**：

| 区域类型 | 推荐布局 |
|---------|---------|
| Hook | 单点聚焦、全屏沉浸 |
| Point | 单点聚焦、左右分栏、留白聚焦 |
| Data | 上下分层、多列并排、中心环绕、网格矩阵 |
| Story | 左右分栏、全屏沉浸、图文穿插 |
| Step | 时间轴、瀑布流、卡片堆叠 |
| Quote | 单点聚焦、留白聚焦 |
| CTA | 单点聚焦、全屏沉浸、悬浮卡片 |
| Contrast | 对比式、上下分屏、对角线构图 |
| List | 多列并排、网格矩阵、瀑布流 |
| Timeline | 时间轴、瀑布流 |
| Q&A | 问答式、极简过渡 |
| Scene | 全屏沉浸、左右分栏 |
| Emotion | 全屏沉浸、单点聚焦、对角线构图 |
| Summary | 单点聚焦、极简过渡、留白聚焦 |

**特殊规则**：
- 过渡区域（Summary/Q&A作为章节间过渡时）：布局建议极简过渡，保持简洁
- 首区域（Hook）：建议单点聚焦或全屏沉浸，制造冲击
- 尾区域（CTA）：建议单点聚焦、全屏沉浸或悬浮卡片，简洁有力

---

### 步骤1.5：确定 HtmlComponent

**每个区域使用一个 HtmlComponent**：

| 模式 | 推荐度 | 适用场景 |
|------|--------|---------|
| **HtmlComponent** | ✅ 唯一推荐 | 所有布局 |

通过 `content.html` + `content.css` + `content.elementIds` 控制所有布局、样式和元素时间线。

**约束**：
- 必须配置 position（至少包含 w 和 h）
- 每个区域配置 1 个 HtmlComponent 即可承载该区域所有视觉内容

> 📖 详情查看 [rules/06-components.md](../rules/06-components.md)（HtmlComponent schema、elementIds 规则、API 调用规范）

#### 组件 background 字段（与 content 平级）

> **硬规则**：所有 `HtmlComponent` 都必须携带 `background` 字段（与 `content` 平级），作为组件的底色/氛围背景。这是 HtmlComponent 的两个基本属性之一（另一个是 `content`）。

**字段结构**：

```json
{
  "id": "P1-001",
  "type": "HtmlComponent",
  "regionId": "P1",
  "start": 0,
  "end": 3,
  "background": {                              // ← 与 content 平级
    "html": "<div class='region-bg'></div>",
    "css": ".region-bg { position: absolute; inset: 0; background: radial-gradient(...); }"
  },
  "content": {
    "html": "<h1>标题</h1>",
    "css": ".title { ... }",
    "elementIds": { "#P1-001": { ... } }
  }
}
```

**为什么 background 放在组件上而不是 region 上？**

| 方案 | 缺点 |
|------|------|
| `region.background` | 跟 `components` 两套字段，AI 容易写两层背景（区域背景 + 组件容器背景）→ 重复浪费 |
| **组件 background**（当前） | 跟 `content` 一套写法，每个 HtmlComponent 自带底色，区域切换时由前端 `renderRegionBackground` 接管背景层，组件内部背景与组件层互不干扰 |

**html 写法**：
- 一般一个根 `<div>`，可嵌套 SVG / 渐变 / 几何装饰

**css 写法**：
- 根容器必填 `position: absolute; inset: 0;` 让背景填满 video-frame
- 后续样式：背景色 / 渐变 / 动画 / 模糊 / 装饰图

**校验**：
- `selfcheck.js` 校验所有 `HtmlComponent` 必须有 `background.html` + `background.css`，缺一报错
- 后端 `projectValidator.collectErrors` 在上传时也会强制校验，缺 background 直接 400 拒绝
- 局部卡片背景（如金句胶囊、徽章）应放到 `content.css` 里用普通 CSS `background: ...` 实现，不要占 `component.background` 这个字段

---

### 步骤2：确定元素数量和出场节奏

**2.1 情绪决定节奏**

| 情绪 | 节奏档位 | 平均出场间隔 | 画面感受 |
|-----|---------|------------|---------|
| 低 | 留白 | ≤1.2秒 | 慢、平静、大量留白 |
| 低 | 沉浸 | ≤0.8秒 | 稍快、有层次 |
| 中 | 沉浸 | ≤0.8秒 | 中等速度、有层次 |
| 中 | 标准 | ≤0.6秒 | 正常速度、信息清晰 |
| 高 | 标准 | ≤0.6秒 | 较快、有冲击力 |
| 高 | 快闪 | ≤0.3秒 | 很快、强烈冲击 |

**选择依据**：
- 信息少、需要留白 → 留白
- 情感、氛围 → 沉浸
- 数据、介绍 → 标准
- 极强冲击、Hook → 快闪

**2.2 计算元素数量**

```
元素数量 = ceil(时长 ÷ 平均出场间隔)

出场间隔 = 元素2出场时间 - 元素1出场时间
```

**查表**：

| 时长 | 留白(1.2s) | 沉浸(0.8s) | 标准(0.6s) | 快闪(0.3s) |
|------|-----------|-----------|-----------|-----------|
| 3秒 | 3个 | 4个 | 5个 | 10个 |
| 5秒 | 4个 | 6个 | 8个 | 17个 |
| 8秒 | 7个 | 10个 | 13个 | 27个 |
| 10秒 | 8个 | 13个 | 17个 | 33个 |

**说明**：
- 平均出场间隔 = 新元素出现的平均时间间隔上限
- 实际间隔可以浮动，但平均值不能超过上限
- 画面不能静止超过平均间隔
- 验证：平均出场间隔 = 时长 ÷ 元素数量，应 ≤ 档位对应值

---

### 步骤3：确定视觉锚点并排列元素位置

**3.1 确定视觉锚点**

每个区域必须有且只有一个锚点：

| 锚点类型 | 特征 | 适用布局 |
|---------|------|---------|
| 大字锚点 | 字号最大，居中 | 单点聚焦、全屏沉浸、留白聚焦 |
| 图片锚点 | 占画面40%+ | 左右分栏、全屏沉浸、中心环绕 |
| 数据锚点 | 数字放大，占30%+ | 上下分层、中心环绕、网格矩阵 |
| 图标锚点 | 居中放大 | 多列并排、卡片堆叠、悬浮卡片 |

**规则**：
- 锚点必须0延迟出现
- 过渡区域可以没有锚点，或锚点就是唯一的文字元素
- 锚点出现后至少0.3秒再出下一个元素

**3.2 在选定布局中排列元素位置**

根据布局的空间结构，安排锚点和其他元素的位置：

**单点聚焦**：
- 锚点：画面中心偏上（避开底部字幕区）
- 辅助：锚点下方
- 装饰：背景层，透明度低

**左右分栏**：
- 图片：左侧40-50%
- 文字：右侧50-60%
- 垂直居中

**上下分层**：
- 标题/图片：上半40%
- 内容/图表：下半60%

**多列并排**：
- 每列等宽，间距均匀（列间距=列宽15-20%）
- 每列内部：图标上+标题中+正文下
- 最多3列

**对比式**：
- 左右各占50%
- 视觉差异明显（颜色/大小/样式）

**时间轴**：
- 轴线水平或垂直居中
- 节点均匀分布
- 内容在轴线两侧交替

**问答式**：
- 问题：画面上半部分，字号大
- 答案：画面下半部分，字号小
- 问题与答案间距明显

**极简过渡**：
- 单个文字或单个图标
- 画面中心或偏下
- 大量留白

**全屏沉浸**：
- 背景图/视频：占满画面
- 文字：叠加在图片上，通常在下1/3处
- 文字需加阴影或半透明底，确保可读

**上下分屏**：
- 上50%：一个主题
- 下50%：另一个主题
- 中间可用细线或渐变分隔

**中心环绕**：因篇幅有限，省略部分内容

---

### 步骤4：分配元素出场顺序和间隔

**4.1 出场顺序**

按优先级排序：

| 优先级 | 元素类型 | 说明 |
|--------|---------|------|
| 1 | 锚点 | 核心元素，0延迟出现 |
| 2 | 核心内容 | 标题、主要信息 |
| 3 | 辅助内容 | 正文、解释 |
| 4 | 装饰元素 | 图标、标签 |

**4.2 元素时间区间（time_range）**

> ⚠️ **AI 填局部时间 `time_range`，merge 自动 + region.startTime 转全局**
>
> 创作模式没有字幕锚点，AI 按内容节奏决定每个元素的时间区间。
>
> 同理，`component.start / end` 可选（不填 = 默认展示整个 region），`elementIds.start / end` 可选（不填 = 默认展示整个所属 HtmlComponent）。

**格式**：

```json
"elementIds": {
  "#P1-002": { "id": "P1-002", "time_range": [0, 3.5] }
}
```

**含义**：
- `time_range[0]` = 元素相对 region 起点的出现时间（秒，3 位小数）
- `time_range[1]` = 元素相对 region 起点的消失时间（秒，3 位小数）
- merge-regions.js 自动转全局：`element.start = region.startTime + time_range[0]`

**统一规则**：未设置 start/end 时，**默认展示整个父级时间窗口**（与背景切换规则保持一致）
- component 未设置 → 展示整个 region（start = region.startTime, end = 下一 region.startTime）
- element 未设置 → 展示整个所属 HtmlComponent（start = component.start, end = component.end）

**4.3 元素时间分配建议**

| 元素类型 | 持续时间建议 |
|---------|------------|
| 锚点（关键信息）| ≥ 2s |
| 核心内容 | ≥ 1.5s |
| 辅助内容 | ≥ 1s |
| 装饰元素 | ≥ 0.5s |
| 末元素 | 结束留 0.3-0.5s 淡出 |

**4.4 稳定期**

所有元素出场后，留稳定期：

| 档位 | 最短稳定期 |
|-----|-----------|
| 快闪 | 0.3-0.5秒 |
| 标准 | 0.5-0.8秒 |
| 沉浸 | 0.8-1.2秒 |
| 留白 | 1.0-1.5秒 |

区域结束前0.5秒开始淡出。

**说明**：
- 所有 HtmlComponent 必须通过 `content.html` + `content.css` + `content.elementIds` 描述画面内容
- `content.elementIds` 是 HtmlComponent 的**必填字段**，用于注册内部元素的 ID 和时间线

**重要硬规则**：
- ✅ 每个区域使用一个 HtmlComponent
- ✅ 所有顶层 HtmlComponent 必须配置 position（至少包含 w 和 h）
- ✅ 每个 elementIds 子项必须填 `time_range`（AI 不写 start/end 全局时间）

**元素时间轴节奏（创作模式）**：

| 项 | 创作模式 |
|----|---------|
| 末元素停留 | ≤ 1s |
| 相邻元素间隔 | ≤ 1s |
| 关键信息停留 | ≥ 2s |

**时间分配示例**（区域 0s-4s，快闪档位）：

| 元素 | time_range | 说明 |
|------|----------|------|
| 锚点（CSS 胶囊，金句风格）| `[0, 3.5]` | 关键信息，停留3.5s |
| 标题（h1，居中）| `[0.3, 2.5]` | 核心内容 |
| 描述（p，辅助说明）| `[0.6, 2.0]` | 辅助内容 |
| 标签（span，CSS 角标）| `[1.0, 2.5]` | 装饰元素 |

**严禁**：
- ❌ elementIds 不填 `time_range`（必须填，merge 自动算全局时间）
- ❌ time_range 超出所属 region 的 duration 范围
- ❌ 元素时间重叠冲突

---

### 步骤5：配色方案

**5.1 选择配色方案**

先确定背景主题和风格，再从对应方案中选择：

| 背景主题 | 风格 | 方案A | 方案B | 方案C |
|---------|------|-------|-------|-------|
| 黑底 | warm | A-热情 | B-温柔 | C-沉稳 |
| 黑底 | tech | A-冷峻 | B-荧光 | C-深蓝 |
| 黑底 | business | A-经典 | B-现代 | C-高级 |
| 黑底 | art | A-大胆 | B-清新 | C-复古 |
| 白底 | warm | A-热情 | B-温柔 | C-沉稳 |
| 白底 | tech | A-冷峻 | B-荧光 | C-深蓝 |
| 白底 | business | A-经典 | B-现代 | C-高级 |
| 白底 | art | A-大胆 | B-清新 | C-复古 |

**5.2 黑底配色详情**

| 风格 | 方案 | 强调色1 | 强调色2 | 强调色3 | 辅色 | 主色 | 氛围 |
|------|------|---------|---------|---------|------|------|------|
| warm | A-热情 | #ff6b6b | #f9ca24 | #ee5a24 | #a0a0b0 | #f0f0f5 | 热烈醒目 |
| warm | B-温柔 | #f8a5c2 | #f9ca24 | #e66767 | #b0b0c0 | #f0f0f5 | 柔和浪漫 |
| warm | C-沉稳 | #c0392b | #d35400 | #f39c12 | #9090a0 | #f0f0f5 | 厚重经典 |
| tech | A-冷峻 | #00d4ff | #2ec4b6 | #1e3799 | #a0a0b0 | #e8e8f0 | 冷静未来 |
| tech | B-荧光 | #00ff88 | #00d4ff | #ff00ff | #a0a0b0 | #e8e8f0 | 赛博前卫 |
| tech | C-深蓝 | #2980b9 | #3498db | #1abc9c | #9090a0 | #e8e8f0 | 专业可信 |
| business | A-经典 | #1e3799 | #6ab04c | #2c3e50 | #a0a0b0 | #f0f0f5 | 稳重权威 |
| business | B-现代 | #e74c3c | #3498db | #2ecc71 | #9090a0 | #f0f0f5 | 活力创新 |
| business | C-高级 | #f39c12 | #8e44ad | #2c3e50 | #b0b0c0 | #f0f0f5 | 奢华独特 |
| art | A-大胆 | #ff9f43 | #ee5a24 | #8e44ad | #a0a0b0 | #f0f0f5 | 浓烈冲击 |
| art | B-清新 | #1dd1a1 | #54a0ff | #5f27cd | #b0b0c0 | #f0f0f5 | 明快现代 |
| art | C-复古 | #d35400 | #c0392b | #8e44ad | #9090a0 | #f0f0f5 | 怀旧文艺 |

**5.3 白底配色详情**

| 风格 | 方案 | 强调色1 | 强调色2 | 强调色3 | 辅色 | 主色 | 氛围 |
|------|------|---------|---------|---------|------|------|------|
| warm | A-热情 | #e55039 | #f39c12 | #d35400 | #6b6b7b | #1a1a2e | 明亮活泼 |
| warm | B-温柔 | #e66767 | #f9ca24 | #f8a5c2 | #8b8b9b | #2d2d3a | 清新温暖 |
| warm | C-沉稳 | #c0392b | #a04000 | #b9770e | #7b7b8b | #1a1a2e | 厚重内敛 |
| tech | A-冷峻 | #2980b9 | #1abc9c | #1e3799 | #6b6b7b | #1a1a2e | 冷静专业 |
| tech | B-荧光 | #00b894 | #0984e3 | #6c5ce7 | #7b7b8b | #2d2d3a | 现代前卫 |
| tech | C-深蓝 | #2471a3 | #2e86c1 | #17a589 | #6b6b7b | #1a1a2e | 稳重科技 |
| business | A-经典 | #1e3799 | #27ae60 | #2c3e50 | #6b6b7b | #1a1a2e | 权威可信 |
| business | B-现代 | #c0392b | #2980b9 | #27ae60 | #7b7b8b | #2d2d3a | 创新突破 |
| business | C-高级 | #d4ac0d | #7d3c98 | #2c3e50 | #8b8b9b | #1a1a2e | 奢华品味 |
| art | A-大胆 | #e67e22 | #d35400 | #7d3c98 | #6b6b7b | #1a1a2e | 浓烈先锋 |
| art | B-清新 | #1abc9c | #3498db | #9b59b6 | #7b7b8b | #2d2d3a | 明快艺术 |
| art | C-复古 | #a04000 | #922b21 | #76448a | #8b8b9b | #1a1a2e | 怀旧沉淀 |

**5.4 配色规则**

- 每区域最多4色（背景+主色+辅色+强调色）
- 强调色每区域只用1次
- 相邻区域强调色可以不同，但要从同一方案的3个强调色中选
- 文字对比度>4.5:1
- 黑底主色用微暖白#f0f0f5或微蓝白#e8e8f0，不用纯白
- 白底主色用深蓝黑#1a1a2e或深灰黑#2d2d3a，不用纯黑

---

### 步骤6：图片策略

| 图片类型 | 位置 | 大小 | 样式 |
|---------|------|------|------|
| 氛围图 | 背景层 | 60-80% | 透明度20-40%，模糊 |
| 主体图 | 中心或一侧 | 30-50% | 圆形或圆角矩形裁切 |
| 图标 | 标题旁或顶部 | 40-80px | 原色或强调色 |
| 数据图 | 下半部分 | 50-70% | 简洁，无多余装饰 |
| 全屏背景 | 占满画面 | 100% | 暗化/模糊处理，确保文字可读 |
| 悬浮背景 | 占满画面 | 100% | 正常显示，卡片遮挡部分 |

**规则**：
- 图片风格要和全局风格一致（warm用暖调真实图，tech用冷调抽象图）
- 过渡区域尽量不用图，或用极简图标
- 全屏沉浸布局的图片必须暗化或加蒙版，确保文字可读
- 图片出现时间可以和锚点同步，或延迟0.3秒

---

### 步骤7：生成区域JSON

> ⚠️ **注意**：此步骤由大模型自行编写代码/逻辑生成 JSON，没有自动化脚本。

**输入**：
- 骨架配置：`skeleton.json`（获取 viewport、theme）
- 引用规则：`rules/06-components.md`

#### 第 1 步：查询 HtmlComponent 规范（建议）

> ℹ️ **说明**：推荐调用 `queryComponentSpecBatch` 接口获取最新 HtmlComponent 字段规范（避免记忆偏差）。详见 `rules/06-components.md` §R1。
>
> ```js
> typeVariants = [
>   { type: 'HtmlComponent', variant: 'default' }
> ]
> ```
>
> **降级策略**：如果 API 不可用（网络失败 / 5xx），可使用以下参考 schema（与当前 API 一致，详见 docs/06-components.md）：
>
> ```js
> {
>   id: 'P1-001',           // 格式: P{区域号}-{三位数字}
>   type: 'HtmlComponent',
>   regionId: 'P1',
>   start: 0, end: 5,
>   position: { x: 0, y: 0, w: 780, h: 585 },
>   background: { html, css },  // 必填
>   content: { html, css, elementIds }
> }
> ```

#### 第 2 步：生成 HtmlComponent

根据前面步骤中的设计，结合 API 返回的 HtmlComponent 规范，生成 HtmlComponent JSON。

**基础字段**：

| 字段 | 来源 | 示例 |
|------|------|------|
| `id` | 元素清单 | "P1-001" （格式：P{区域号}-{三位数字}，如 P1-001、P3-005） |
| `type` | 固定值 | `"HtmlComponent"` |
| `content` | 元素清单 | `{ "html": "...", "css": "...", "elementIds": {...} }` |
| `position` | 元素清单 | `{ "x": 0, "y": 0, "w": 780, "h": 585 }` |
| `time_range` | 元素清单 | `[0, 3.5]`（创作模式：相对 region 起点的局部时间，merge 自动转全局） |

**HtmlComponent 核心规则**

- 必须配置 position（至少包含 w 和 h）
- 必须填 `time_range`（创作模式，merge 自动算全局）
- 不需要 customStyle，通过 content.css 控制样式

**HtmlComponent 示例**：
```json
{
  "id": "P1-001",
  "regionId": "P1",
  "type": "HtmlComponent",
  "position": { "x": 0, "y": 0, "w": 780, "h": 585 },
  "time_range": [0, 4],
  "content": {
    "html": "<div id='P1-002' class='card'>\n  <h2 class='title'>标题</h2>\n  <span class='badge'>徽章</span>\n</div>",
    "css": ".card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } .title { font-size: 48px; font-weight: 900; color: #FFFFFF; } .badge { background: #00B894; color: #FFFFFF; padding: 12px 24px; border-radius: 999px; font-size: 20px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,184,148,0.3); }",
    "elementIds": {
      "#P1-002": { "id": "P1-002", "time_range": [0, 3.5] }
    }
  }
}
```

**position 坐标计算**

`position` 是 HtmlComponent**在所属区域内的相对坐标**：

```
position: { x: <区域内左上x>, y: <区域内左上y>, w: <宽度>, h: <高度> }
```

约束：
- `w` ≤ `viewport.width - 40`
- 区域内 HtmlComponent `h` 总和 + 间距 ≤ `viewport.height - 20`
- 强调类元素（CSS 金句胶囊 / 角标 / CTA 样式）单独出现时应在区域内**水平居中**
- `position.w` / `position.h` 必须**显式填写**

#### 第 3 步：生成字幕（仅口播模式）

```json
[
  { "start": 0, "end": 2.5, "text": "..." }
]
```

**注意**：
- BGM 模式：subtitles 为空数组 `[]`
- 配音模式：从 SRT 或设计文档提取
- 口播模式：subtitles 必须 100% 来自用户提供的 SRT，严禁 LLM 自行生成

#### 第 4 步：保存区域 JSON

将提取的信息保存为区域 JSON 文件：

**文件路径**：`{workdir}/{skillProjectId}/regions/{regionName}.json`

**JSON 结构**：

```json
{
  "regionName": "P1",
  "subtitles": [...],
  "components": [...]
}
```

#### 第 5 步：区域级校验

```bash
node scripts/validate-region.js --cwd=<Agent工作目录的绝对路径> {skillProjectId} {regionName}
```

脚本会自动检查：
1. elementIds 子项必须填 `time_range`（AI 不写 start/end）
2. time_range 必须在 region duration 范围内
3. merge 后元素 ⊂ 组件 = 区域（嵌套关系校验）
4. HtmlComponent 含 `background` 字段

---

## 产出

| 文件 | 路径 | 说明 |
|------|------|------|
| P{n}.json | `{workdir}/{skillProjectId}/regions/P{n}.json` | 区域配置 |

---

## 自检

> [E] Error — 不符合将阻断（脚本自动校验） | [W] Warning — 不符合可能影响质量 | [I] Info — 建议，非强制

**脚本自动校验**（merge 阶段 + selfcheck 自动校验）：

- elementIds 子项如填了 `time_range` 必须在 region duration 范围内
- merge 后元素 ⊂ 组件 = 区域（嵌套关系校验）
- HtmlComponent 含 `background` 字段（与 `content` 平级）

**AI 写完后自查**：

- [E] 每个元素有完整的字段（id, type, content, position, time_range, background）
- [E] `id` 格式正确（如 `P1-001`：`P{区域号}-{三位数字}`）
- [W] 有唯一视觉锚点（过渡区域除外）
- [W] 文字对比度符合 WCAG AA（≥ 4.5:1）
- [W] `content.css` 已填写
- [I] 出场顺序由主到次
- [I] 相邻元素间隔平均值 ≤ 档位上限
- [I] 有稳定期
- [I] 配色不超过4色
- [I] 图片有裁切/透明度处理
- [I] 图片风格与全局风格一致
- [I] 元素总数符合档位表
- [I] 图片路径已标注

---

## 下一步

- 还有区域？→ 返回 [步骤4：区域设计与生成JSON](04-region-design-creative.md)
- 全部完成？→ 进入 [步骤5：合并](05-merge.md)
