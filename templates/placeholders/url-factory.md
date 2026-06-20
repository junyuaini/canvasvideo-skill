# 占位图速查表（CanvasVideo Skill）

> 本目录提供两类占位图，供 LLM 在素材状态为 `[AI 自动生成 - 占位]` 时直接引用。
> 写 design.md 步骤 7（组件清单）和 project.json 时，**直接复制下表的 path 或 URL** 即可。

---

## ⭐ 推荐主用：Unsplash 图床 + AggregateComponent 叠中文水印

**为什么用这个**：
- ✅ Unsplash 提供数百万张高质量真实摄影图，按关键词智能匹配主题
- ✅ 我们用 AggregateComponent 把"干净的图床图"+"中文水印 ShockComponent 胶囊"组合在一起，**水印是我们自己加的，不依赖图床字体**
- ✅ 视觉效果远超纯 SVG 占位（真实摄影 vs 几何图形）

### Unsplash Source API（免费、免 key）

```
https://source.unsplash.com/1280x720/?{keyword1},{keyword2}
```

- 多个关键词用 `,` 分隔，按 AND 匹配
- 每次请求随机返回一张相关图片（同一 URL 不同时刻可能不同）
- 不计入流量、不限速、不需要注册

### 关键词速查表（按场景选）

| 用途 | 推荐关键词 | URL 示例 |
|---|---|---|
| HOOK 主视觉 | `abstract,light,gradient` | `https://source.unsplash.com/1280x720/?abstract,light,gradient` |
| SCENE 场景 | `office,workspace` 或 `team,meeting` | `https://source.unsplash.com/1280x720/?office,workspace` |
| PAIN 痛点 | `frustration,problem` 或 `chaos,clutter` | `https://source.unsplash.com/1280x720/?frustration,problem` |
| SOLVE 方案 | `solution,success,team` | `https://source.unsplash.com/1280x720/?solution,success,team` |
| RESULT 数据 | `chart,growth,data` 或 `analytics,dashboard` | `https://source.unsplash.com/1280x720/?chart,growth,data` |
| CTA 行动 | `startup,launch,success` | `https://source.unsplash.com/1280x720/?startup,launch,success` |
| 通用 | `business,workspace` | `https://source.unsplash.com/1280x720/?business,workspace` |
| AI / 科技 | `ai,technology,futuristic` | `https://source.unsplash.com/1280x720/?ai,technology,futuristic` |
| 咖啡 / 餐饮 | `coffee,latte,cafe` | `https://source.unsplash.com/1280x720/?coffee,latte,cafe` |
| 旅行 / 风景 | `travel,landscape,nature` | `https://source.unsplash.com/1280x720/?travel,landscape,nature` |
| 教育 / 课程 | `education,books,study` | `https://source.unsplash.com/1280x720/?education,books,study` |
| 产品 / 电商 | `product,minimal,studio` | `https://source.unsplash.com/1280x720/?product,minimal,studio` |

> **关键词组合技巧**：根据视频实际主题动态组合关键词，比"抄表"更精准。例如做"程序员高效写文档" → `?developer,documentation,laptop`。

### 占位图组合标准模板（必读，必照抄）

**结构**：AggregateComponent (容器) → 内含 2 个 children：
1. 一张 ImageComponent（拉 Unsplash 图）
2. 一个 ShockComponent（胶囊水印"※ 演示图片 请替换"，浮在图正中央）

#### 极简白主题模板

```json
{
  "id": "P3-PLACEHOLDER-001",
  "type": "AggregateComponent",
  "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
  "content": {},
  "customStyle": { "background": "transparent", "padding": "0", "border": "none" },
  "children": [
    {
      "id": "P3-PLACEHOLDER-001-img",
      "type": "ImageComponent",
      "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
      "content": {
        "image": "https://source.unsplash.com/1280x720/?ai,technology,futuristic",
        "fit": "cover",
        "borderRadius": 12
      },
      "customStyle": {}
    },
    {
      "id": "P3-PLACEHOLDER-001-watermark",
      "type": "ShockComponent",
      "position": { "x": 180, "y": 200, "w": 400, "h": 80 },
      "content": { "text": "※ 演示图片 请替换" },
      "customStyle": {
        "background": "rgba(15,23,42,0.55)",
        "color": "#FFFFFF",
        "fontSize": "28px",
        "fontWeight": "700",
        "padding": "14px 28px",
        "borderRadius": "999px",
        "border": "none",
        "shadow": "0 4px 16px rgba(0,0,0,0.25)",
        "letterSpacing": "2px"
      }
    }
  ]
}
```

#### 沉浸黑主题模板

```json
{
  "id": "P3-PLACEHOLDER-001",
  "type": "AggregateComponent",
  "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
  "content": {},
  "customStyle": { "background": "transparent", "padding": "0", "border": "none" },
  "children": [
    {
      "id": "P3-PLACEHOLDER-001-img",
      "type": "ImageComponent",
      "position": { "x": 0, "y": 0, "w": 760, "h": 480 },
      "content": {
        "image": "https://source.unsplash.com/1280x720/?ai,technology,futuristic",
        "fit": "cover",
        "borderRadius": 12
      },
      "customStyle": {}
    },
    {
      "id": "P3-PLACEHOLDER-001-watermark",
      "type": "ShockComponent",
      "position": { "x": 180, "y": 200, "w": 400, "h": 80 },
      "content": { "text": "※ 演示图片 请替换" },
      "customStyle": {
        "background": "rgba(255,255,255,0.15)",
        "color": "#F8FAFC",
        "fontSize": "28px",
        "fontWeight": "700",
        "padding": "14px 28px",
        "borderRadius": "999px",
        "border": "1px solid rgba(255,255,255,0.25)",
        "shadow": "0 4px 16px rgba(0,0,0,0.4)",
        "letterSpacing": "2px"
      }
    }
  ]
}
```

> **水印位置说明**：胶囊位于图片正中央偏上一点（`y: 200`），既显眼又不破坏主体画面。
> **胶囊样式**：白主题黑底白字、黑主题白半透明底白字，都是半透明胶囊感（`borderRadius: 999px`）+ 阴影提升浮起感。

---

## 备选：本地 SVG 兜底（templates/placeholders/）

**何时用**：
- 用户内网部署 / 无外网访问
- Unsplash 图床偶发不可达
- 用户明确拒绝远程图

Skill 的 `scripts/scaffold.js` 在调用 `scaffoldWorkdir({theme})` 时会自动复制 7 张 SVG 到工作目录的 `assets/placeholders/{light|dark}/`。每张 SVG 已自带中央水印"※ 演示图片 请替换"，无需再叠 Aggregate。

### SVG 占位文件清单

| 用途 | 极简白路径 | 沉浸黑路径 |
|---|---|---|
| HOOK 主视觉 | `./assets/placeholders/light/hook.svg` | `./assets/placeholders/dark/hook.svg` |
| SCENE 场景 | `./assets/placeholders/light/scene.svg` | `./assets/placeholders/dark/scene.svg` |
| PAIN 痛点 | `./assets/placeholders/light/pain.svg` | `./assets/placeholders/dark/pain.svg` |
| SOLVE 方案 | `./assets/placeholders/light/solve.svg` | `./assets/placeholders/dark/solve.svg` |
| RESULT 数据 | `./assets/placeholders/light/result.svg` | `./assets/placeholders/dark/result.svg` |
| CTA 行动 | `./assets/placeholders/light/cta.svg` | `./assets/placeholders/dark/cta.svg` |
| 通用 | `./assets/placeholders/light/generic.svg` | `./assets/placeholders/dark/generic.svg` |

### SVG 兜底标准用法（不需要 Aggregate）

```json
{
  "type": "ImageComponent",
  "content": {
    "image": "./assets/placeholders/light/hook.svg",
    "fit": "cover",
    "borderRadius": 0
  }
}
```

> SVG 自带水印，**不要再叠 ShockComponent，否则会双水印**。

---

## ⭐ 决策表（LLM 应该选哪种？）

| 场景 | 选 |
|---|---|
| **默认所有视频** | **Unsplash + Aggregate 叠水印**（视觉好、主题相关） |
| 用户明确说"内网/无外网" | **本地 SVG 兜底** |
| Unsplash 测试不可达 | **本地 SVG 兜底** |
| 用户提供了真实素材 | 直接用 `./assets/images/{name}.png`（不需要占位） |

---

## ⚠️ 严禁

- ❌ **不要在 ImageComponent 里直接写 Unsplash URL 而不套 Aggregate**——这样图片会"裸奔"没有水印，用户分不清是占位还是真实素材
- ❌ **不要在用了 SVG 兜底的 ImageComponent 上再叠 Aggregate 水印**——SVG 自带水印会重复
- ❌ **不要假装某张图是用户提供的真实素材**——所有占位图必须保留水印 "※ 演示图片 请替换"
- ❌ **不要修改水印文字**（修改了等于欺骗用户）
- ❌ **不要混用主题**（black 主题项目用 light SVG / 用浅色水印胶囊会显得违和）
- ❌ **不要在 Unsplash URL 里写中文水印参数**（不支持，且我们改用 ShockComponent 自己加水印就不需要）

---

## 用户体验关键路径

1. 视频生成 → 用户看到带"※ 演示图片 请替换"水印的高质量摄影图
2. 用户在分享给老板/客户前自然会想换掉
3. 用户把真实图片放到 `./assets/images/`，告诉 AI "把 P3-004 替换成 my-photo.png"
4. AI 自动改 project.json + 重新打包上传
5. 真实图片替换占位，视频质量瞬间提升
