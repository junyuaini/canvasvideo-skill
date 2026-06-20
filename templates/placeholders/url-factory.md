# 占位图速查表（CanvasVideo Skill）

> 本目录提供两类占位图，供 LLM 在素材状态为 `[AI 自动生成 - 占位]` 时直接引用。
> 写 design.md 步骤 7（组件清单）和 project.json 时，**直接复制下表的 path 或 URL** 即可。

---

## ⭐ 推荐主用：Picsum 随机图 + AggregateComponent 叠中文水印

**为什么用这个**：
- ✅ Picsum（`picsum.photos`）免费、免 key、不限速、长期稳定
- ✅ 通过 `seed` 参数固定图片，同一主题每次返回相同图，不同主题返回不同图
- ✅ 我们用 AggregateComponent 把"随机图"+"中文水印 ShockComponent 胶囊"组合在一起，**水印是我们自己加的**
- ✅ 视觉效果远超纯 SVG 占位（真实摄影图 vs 几何图形）

### Picsum Photos API（免费、免 key、稳定）

```
https://picsum.photos/seed/{seed}/{width}/{height}
```

- `{seed}`：任意字符串，相同 seed 永远返回相同图片。建议用主题英文关键词，如 `couple-love`、`tech-ai`、`corporate-team`
- `{width}` / `{height}`：图片尺寸，建议 1280×720 或匹配组件尺寸
- 可加 `?grayscale` 转黑白，`?blur=2` 加模糊（不建议，会降低观感）

### Seed 命名指南（LLM 必读）

**原则**：seed 用英文主题词，简洁、有意义，同一视频内相同主题用相同 seed。

| 视频主题 | 推荐 Seed | 说明 |
|---|---|---|
| 情侣/爱情 | `couple-love` | 温馨浪漫场景 |
| 科技/AI | `tech-ai` | 科技感、未来感 |
| 商务/企业 | `corporate-team` | 商务办公、团队协作 |
| 教育/课程 | `education-study` | 学习、读书、课堂 |
| 产品/电商 | `product-showcase` | 产品展示、静物 |
| 咖啡/餐饮 | `cafe-coffee` | 咖啡、餐饮、美食 |
| 旅行/风景 | `travel-landscape` | 风景、旅行、自然 |
| 医疗/健康 | `medical-health` | 医疗、健康、运动 |
| 金融/数据 | `finance-data` | 金融、数据、图表 |
| 建筑/空间 | `architecture-space` | 建筑、室内设计 |

**Seed 公式**：
```
{领域}-{场景}
```

**示例**：
- 做"程序员高效工作"视频 → `developer-work`
- 做"情侣甜蜜日常"视频 → `couple-daily`
- 做"企业年度总结"视频 → `corporate-summary`

**严禁**：
- ❌ 不要写中文 seed（Picsum 支持，但统一用英文更规范）
- ❌ 不要写太长的 seed（> 30 字符无意义）
- ❌ 同一视频内不同区域不要用完全相同的 seed（至少加一个序号区分，如 `couple-love-1`、`couple-love-2`）

### 占位图组合标准模板（必读，必照抄）

**结构**：AggregateComponent (容器) → 内含 2 个 children：
1. 一张 ImageComponent（拉 Picsum 图）
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
        "image": "https://picsum.photos/seed/couple-love/1280/720",
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
        "image": "https://picsum.photos/seed/tech-ai/1280/720",
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
- Picsum 偶发不可达（网络问题）
- 用户明确拒绝远程图
- 生成超时（> 15 秒）

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
| **默认所有视频** | **Picsum + Aggregate 叠水印**（稳定、快速、真实摄影图）|
| Picsum 测试不可达 / 超时 | **本地 SVG 兜底** |
| 用户明确拒绝远程图 | **本地 SVG 兜底** |
| 用户提供了真实素材 | 直接用 `./assets/images/{name}.png`（不需要占位） |

---

## ⚠️ 严禁

- ❌ **不要在 ImageComponent 里直接写 Picsum URL 而不套 Aggregate**——这样图片会"裸奔"没有水印，用户分不清是占位还是真实素材
- ❌ **不要在用了 SVG 兜底的 ImageComponent 上再叠 Aggregate 水印**——SVG 自带水印会重复
- ❌ **不要假装某张图是用户提供的真实素材**——所有占位图必须保留水印 "※ 演示图片 请替换"
- ❌ **不要修改水印文字**（修改了等于欺骗用户）
- ❌ **不要混用主题**（black 主题项目用 light SVG / 用浅色水印胶囊会显得违和）
- ❌ **同一视频内不同区域不要用完全相同的 seed**（至少加序号区分，如 `couple-love-1`、`couple-love-2`）

---

## 用户体验关键路径

1. 视频生成 → 用户看到带"※ 演示图片 请替换"水印的 Picsum 随机图（与主题 seed 对应）
2. 用户在分享给老板/客户前自然会想换掉
3. 用户把真实图片放到 `./assets/images/`，告诉 AI "把 P3-004 替换成 my-photo.png"
4. AI 自动改 project.json + 重新打包上传
5. 真实图片替换占位，视频质量瞬间提升
