# 组件目录（CanvasVideo Skill 选型指南）

> 本文档**只负责"选型"**，不再罗列组件字段。所有字段、默认值、写死项请通过后端 API 查询：
>
> - **设计阶段**（选哪些组件）：看本文档的「场景 → 组件决策树」
> - **开发阶段**（写 JSON 字段）：调 `POST /api/component/spec/batch` 批量查
> - **微调阶段**（用户改某个字段）：调 `GET /api/component/spec/:type/:variant` 单查
>
> ⚡ **自主设计也必须调 batch API**——不放宽这条硬规则。
>
> 单一事实来源：`video-maker-system/public/configs/component-spec.json`，前端代码改动后由维护者同步更新。

---

## 总览：10 个核心组件

| 组件 | 一句话用途 |
|---|---|
| **TitleComponent** | 标题（H1/H2/H3） |
| **TextComponent** | 段落正文、列表、引语、代码 |
| **ImageComponent** | 图片展示、轮播图 |
| **CardComponent** | 图文组合卡片（8 种 variant） |
| **QuoteComponent** | 名言、证言、强调注释 |
| **BadgeComponent** | 标签、状态胶囊（中字号） |
| **CornerComponent** | 角标（HOT/NEW/VIP，小字号） |
| **ShockComponent** | 金句、关键数据、CTA 按钮（带脉冲动画） |
| **GraphicComponent** | 流程图/对比/雷达/饼图等 16 种图形 |
| **AggregateComponent** | 容器：组合多个子组件，最多嵌套 4 层 |

---

## 选型决策树（场景 → 组件）

```
有大段标题文字？
  ├─ 是 → TitleComponent（注意 level1/2/3 决定字号档位）
  └─ 否 → 继续

有段落正文？
  ├─ 是 → TextComponent（按需选 paragraph/lead/code/quote/list/small）
  └─ 否 → 继续

是金句、关键数字、CTA 按钮？
  ├─ 是 → ShockComponent（自带脉冲动画）
  └─ 否 → 继续

是名言、证言（带 author）？
  ├─ 是 → QuoteComponent
  └─ 否 → 继续

是图文组合卡片？
  ├─ 是 → CardComponent
  │       variant 选择：
  │       ├─ text-only          纯文字
  │       ├─ image-title        上图下文
  │       ├─ title-image        上文下图
  │       ├─ image-text         左图右文
  │       ├─ text-image         左文右图
  │       ├─ overlay            图片背景 + 底部叠加文字
  │       ├─ gallery            最多 9 张图网格
  │       └─ double-image-title 双图 + 标题
  └─ 否 → 继续

是单独的图片/截图？
  ├─ 是 → ImageComponent
  └─ 否 → 继续

是流程/对比/趋势/占比图？
  ├─ 是 → GraphicComponent
  │       diagram 选择：
  │       ├─ flow / process     横向流程
  │       ├─ cycle              2×2 循环 + 中心圆
  │       ├─ cycle-arrows       4 节点环绕 + 圆弧箭头
  │       ├─ pyramid            倒梯形塔
  │       ├─ funnel             漏斗
  │       ├─ comparison         左右两栏对比
  │       ├─ architecture       多行分层
  │       ├─ timeline           横向时间线
  │       ├─ matrix             2×2 象限
  │       ├─ pie / donut        饼图/环形图
  │       ├─ line               折线图
  │       ├─ bar                柱状图
  │       ├─ heatmap            热力图
  │       └─ radar              雷达图
  └─ 否 → 继续

是醒目标签/胶囊？
  ├─ 是字号 ≥ 20px → BadgeComponent
  └─ 是字号 ≤ 14px → CornerComponent

需要把多个组件放在同一坐标系排布？
  └─ AggregateComponent（custom 模式，手动 x/y/w/h）
```

---

## 组件适用场景与反例

### TitleComponent
- ✅ 视频开场主标题、章节标题、副标题
- ❌ 长段文字（用 TextComponent）、装饰性短语（用 ShockComponent）、单字标签（用 BadgeComponent）

### TextComponent
- ✅ 段落说明、列表项、内联引语、代码片段
- ❌ 大型引言名言（用 QuoteComponent 带 author）、单行强调标语（用 ShockComponent）

### ImageComponent
- ✅ 产品截图、照片墙轮播、独立大图展示
- ❌ 图文结合卡片（用 CardComponent）、装饰性小图标（直接用 emoji）
- 注意：主体图片建议 borderRadius=0（API 返回的默认值可能不同，以 API 为准）；长图高度 ≥ 400px

### CardComponent
- ✅ 步骤卡、特性介绍卡、角色卡、画廊集
- ❌ 单独图片（用 ImageComponent）、超长描述（用 TextComponent）

### QuoteComponent
- ✅ 名人名言、用户证言、强调注释
- ❌ 普通段落（用 TextComponent）、行内引语（用 TextComponent.quote style）

### BadgeComponent / CornerComponent
- ✅ 状态标签、分类标签、HOT/NEW/VIP 角标
- ❌ 大段文字、需要换行的内容（会被 ellipsis 裁切）

### ShockComponent
- ✅ 金句、关键数据展示、CTA 按钮、口号
- ❌ 长文本（会被裁切）、严肃正式场景（脉冲动画偏活泼）

### GraphicComponent
- ✅ 流程、对比、循环、层级、占比、趋势等结构化关系
- ❌ 纯装饰图标（用 Image 或 emoji）、简单标题副标题（用 Card）
- 优先级：表格 → Graphic → AggregateComponent；Graphic 16 种已能表达就别用 Aggregate 拼

### AggregateComponent
- ✅ 多个内容组件需要在固定坐标系中排布（左右对比、4 列卡片、Hero+副内容）
- ❌ 单组件场景（直接用对应组件）、所有内容都塞进一个 Aggregate（按区域 P1/P2/P3 拆分）
- **必须用 custom 模式**（手动 x/y/w/h），禁止使用预设 layout 模板
- 嵌套深度上限 4 层

---

## 通过 API 查询字段详情

### 设计阶段（可选）
拿到所有组件 + 简介：
```http
GET /cv/api/component/spec
```

返回示例：
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "total": 39,
    "categories": {
      "content": "内容字段（数据/文本）",
      "color": "颜色字段",
      "typography": "字体/字号/字重",
      "layout": "尺寸/边距/圆角/对齐",
      "effect": "阴影/边框/动画等视觉特效",
      "hardcoded": "前端代码写死，无法通过 JSON 配置修改"
    },
    "summaries": {
      "GraphicComponent.comparison": {
        "summary": "左右两栏对比。Before/After、新旧对比。",
        "configPath": "customStyle"
      }
    }
  }
}
```

### 开发阶段（必查）
写 JSON 前批量查所有用到的组件：
```http
POST /cv/api/component/spec/batch
Content-Type: application/json

{
  "components": [
    { "type": "GraphicComponent", "variant": "comparison" },
    { "type": "CardComponent", "variant": "image-text" },
    { "type": "TitleComponent", "variant": "level1" }
  ]
}
```

返回每个组件的 content / color / typography / layout / effect / hardcoded 五大类字段+默认值。
**单次最多 20 个，超过分批查。**

### 微调阶段（可选）
用户要求精调单个组件时：
```http
GET /cv/api/component/spec/GraphicComponent/comparison
```

---

## 重要提示

1. **写死项要看 hardcoded 字段**：每个组件返回结果里的 `hardcoded` 数组列出了无法通过 JSON 调整的视觉元素。如果用户要改的内容在 hardcoded 里，要明确告诉用户这个调不了。
2. **不要凭直觉编字段名**：customStyle 字段必须是 API 返回里出现过的 key，否则前端会忽略。
3. **API 永远是最新的**：本文档可能滞后于代码，**字段以 API 为准**，本文档只用来选型。

---

## ⚠️ 全局硬约束：每个组件必须有 customStyle 字段

**规则**：除 `AggregateComponent` 之外，**所有组件都必须在 project.json 里写 `customStyle` 字段**——即使该组件所有样式都用默认值，也必须写空对象 `customStyle: {}`。

**理由**：前端 [`ComponentFactory._validateCustomStyle`](file:///d:/TRAE SOLO/视频制作/video-maker-system/src/components/manager/ComponentFactory.js#L105-L111) 在组件加载时强制要求 `customStyle` 字段存在，缺失会抛出运行时错误：

```
加载项目失败: ImageComponent [P1-005] 未配置 theme，必须配置 customStyle。
```

### 正确写法

```jsonc
// ✅ 无自定义样式时写空对象（最常用）
{
  "id": "P1-005",
  "type": "ImageComponent",
  "content": { "image": "./assets/images/hook.svg", "fit": "cover" },
  "position": { "x": 20, "y": 100, "w": 740, "h": 360 },
  "customStyle": {}  // ⭐ 必须写
}

// ✅ 有自定义样式时正常填字段（字段名和值以 API 返回为准）
{
  "id": "P1-001",
  "type": "TitleComponent",
  "content": { "text": "标题", "level": 1 },
  "position": { ... },
  "customStyle": {
    // 字段名和值以 API 返回为准，禁止凭记忆编
    "<API返回的styleKey>": { "<字段>": "<值>" }
  }
}

// ✅ AggregateComponent 例外：不需要 customStyle
{
  "id": "P3-001",
  "type": "AggregateComponent",
  "position": { ... },
  "children": [ ... ]
  // 不写 customStyle 也可以
}
```

### 错误写法

```jsonc
// ❌ 漏掉 customStyle 字段
{
  "id": "P1-005",
  "type": "ImageComponent",
  "content": { "image": "..." },
  "position": { ... }
  // 缺少 customStyle → 前端加载报错
}

// ❌ customStyle 写成 null
{
  "id": "P1-005",
  "type": "ImageComponent",
  "customStyle": null  // ❌ 必须是对象，可以是空对象 {} 但不能是 null
}

// ❌ 凭记忆编字段名（必须以 API 返回为准）
{
  "id": "P1-005",
  "type": "ImageComponent",
  "customStyle": {
    "borderRadius": 12,  // ❌ 字段名可能不对，必须以 API 返回为准
    "shadow": "..."
  }
}
```

### 自动校验

本规则已经在云端 `/api/projects/validate`（由 `scripts/upload-video.js` Step 0 自动调用）中作为**业务规则强校验**——任何缺失 customStyle 或字段级缺失（如 ImageComponent 的 borderRadius）的 project.json 在上传前都会被拦截。本地 `scripts/validate.js` 仅做节奏 / 布局自检（B 方案 v2.0）。详见 [`selfcheck-rules.md`](./selfcheck-rules.md) L0 检查。
