# 占位图速查表（CanvasVideo Skill）

> 本目录提供两类占位图，供 LLM 在素材状态为 `[AI 自动生成 - 占位]` 时直接引用。
> 写 design.md 步骤 7（组件清单）和 project.json 时，**直接复制下表的 path 或 URL** 即可。

---

## ⭐ 推荐主用：Pollinations AI 生成图 + AggregateComponent 叠中文水印

**为什么用这个**：
- ✅ Pollinations AI 根据 prompt 实时生成图片，完全可控，与视频主题 100% 匹配
- ✅ 不需要 API Key，不需要注册，免费
- ✅ 我们用 AggregateComponent 把"AI 生成图"+"中文水印 ShockComponent 胶囊"组合在一起，**水印是我们自己加的**
- ✅ 视觉效果远超纯 SVG 占位（AI 生成图 vs 几何图形）

### Pollinations AI Image API（免费、免 key）

```
https://image.pollinations.ai/prompt/{URL编码的prompt}?width={w}&height={h}&nologo=true
```

- `{prompt}`：用英文描述图片内容，URL 编码（空格转 `%20`，逗号转 `%2C`）
- `width` / `height`：图片尺寸，建议 1280×720 或匹配组件尺寸
- `nologo=true`：去掉 Pollinations 水印（我们自己加中文水印）
- 每次请求根据 prompt 实时生成，首次可能 5-10 秒，CDN 缓存后更快

### Prompt 编写指南（LLM 必读）

**原则**：prompt 用英文，简洁具体，突出主体 + 场景 + 风格。

| 视频主题 | 推荐 Prompt | 生成的图 |
|---|---|---|
| 情侣/爱情 | `romantic couple walking in sunset park, soft lighting, warm colors` | 温馨浪漫 |
| 科技/AI | `futuristic AI brain network, blue neon glow, dark background, high tech` | 科技感 |
| 商务/企业 | `modern corporate office team meeting, glass building, professional` | 商务专业 |
| 教育/课程 | `student studying with books in bright library, warm light` | 学习氛围 |
| 产品/电商 | `minimal product showcase on white background, studio lighting` | 产品展示 |
| 咖啡/餐饮 | `cozy coffee shop latte art, warm wooden table, morning light` | 温馨餐饮 |
| 旅行/风景 | `beautiful mountain landscape sunrise, golden hour, dramatic sky` | 壮丽风景 |
| 医疗/健康 | `doctor with stethoscope in modern hospital, clean white, professional` | 医疗专业 |

**Prompt 公式**：
```
{主体} + {场景/动作} + {光线/氛围} + {风格修饰}
```

**示例**：
- 做"程序员高效工作"视频 → `developer working on laptop in modern office, focused, clean desk, soft natural light`
- 做"情侣甜蜜日常"视频 → `young couple cooking together in kitchen, laughing, warm home lighting, cozy`

**严禁**：
- ❌ 不要写中文 prompt（API 不支持，且 URL 编码后可能乱码）
- ❌ 不要写太长的 prompt（> 200 字符可能截断或效果下降）
- ❌ 不要写敏感/NSFW 内容（会被拒绝）

### 占位图组合标准模板（必读，必照抄）

**结构**：AggregateComponent (容器) → 内含 2 个 children：
1. 一张 ImageComponent（拉 Pollinations AI 图）
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
        "image": "https://image.pollinations.ai/prompt/romantic%20couple%20walking%20in%20sunset%20park?width=1280&height=720&nologo=true",
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
        "image": "https://image.pollinations.ai/prompt/futuristic%20AI%20brain%20network%20blue%20neon?width=1280&height=720&nologo=true",
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
- Pollinations AI 偶发不可达（网络问题）
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
| **默认所有视频** | **Pollinations AI + Aggregate 叠水印**（主题相关、完全可控）|
| Pollinations AI 测试不可达 / 超时 | **本地 SVG 兜底** |
| 用户明确拒绝远程图 | **本地 SVG 兜底** |
| 用户提供了真实素材 | 直接用 `./assets/images/{name}.png`（不需要占位） |

---

## ⚠️ 严禁

- ❌ **不要在 ImageComponent 里直接写 Pollinations AI URL 而不套 Aggregate**——这样图片会"裸奔"没有水印，用户分不清是占位还是真实素材
- ❌ **不要在用了 SVG 兜底的 ImageComponent 上再叠 Aggregate 水印**——SVG 自带水印会重复
- ❌ **不要假装某张图是用户提供的真实素材**——所有占位图必须保留水印 "※ 演示图片 请替换"
- ❌ **不要修改水印文字**（修改了等于欺骗用户）
- ❌ **不要混用主题**（black 主题项目用 light SVG / 用浅色水印胶囊会显得违和）
- ❌ **不要写中文 prompt**（API 不支持中文，URL 编码后可能乱码或效果差）
- ❌ **不要写太长的 prompt**（建议控制在 100 个英文单词以内）

---

## 用户体验关键路径

1. 视频生成 → 用户看到带"※ 演示图片 请替换"水印的 AI 生成图（与主题高度相关）
2. 用户在分享给老板/客户前自然会想换掉
3. 用户把真实图片放到 `./assets/images/`，告诉 AI "把 P3-004 替换成 my-photo.png"
4. AI 自动改 project.json + 重新打包上传
5. 真实图片替换占位，视频质量瞬间提升
