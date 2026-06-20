# 占位图速查表（CanvasVideo Skill）

> 本目录提供两类占位图，供 LLM 在素材状态为 `[AI 自动生成 - 占位]` 时直接引用。
> 写 design.md 步骤 7（组件清单）和 project.json 时，**直接复制下表的 path 或 URL** 即可。

---

## ⭐ 推荐主用：本地 SVG 兜底（templates/placeholders/）

**这是默认推荐路径**：100% 离线、无外部依赖、SVG 矢量缩放清晰、体积极小、字体兼容性好。

Skill 的 `scripts/scaffold.js` 在调用 `scaffoldWorkdir({theme})` 时**自动**把对应主题的 7 张 SVG 复制到工作目录的 `assets/placeholders/{light|dark}/`。LLM 不需要手动复制，**只需要在 project.json 写出对应路径**即可。

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

### 标准 ImageComponent 写法

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

> SVG 是矢量图，建议 `borderRadius: 0`（视频规则 L2 检查项：主体图片不带圆角）。
>
> **每张 SVG 都自带水印 "※ 演示图片 请替换"**，文字位于画布**正中央**（半透明 0.45），即使图片被裁剪也能看到。文字使用 `-apple-system, Segoe UI, Roboto, PingFang SC, Microsoft YaHei` 字体栈，确保中文渲染正常。

---

## 备选：在线水印图（placehold.co，仅英文）

**何时用**：用户明确希望视频里出现英文水印 / 临时演示场景 / SVG 加载失败兜底。
**警告**：placehold.co 不支持中文字体，**URL 写中文水印会显示成方块**，所以下表统一使用英文水印。

### 极简白主题（white）速查

| 用途 | 直接复制以下 URL |
|---|---|
| HOOK 主视觉 | `https://placehold.co/1280x720/F3F4F6/6B7280/png?text=Demo+Image%5CnReplace+Me&font=lato` |
| SCENE 场景 | `https://placehold.co/1280x720/F1F5F9/64748B/png?text=Scene+Demo%5CnReplace+Me&font=lato` |
| PAIN 痛点 | `https://placehold.co/1280x720/FEF2F2/B91C1C/png?text=Pain+Demo%5CnReplace+Me&font=lato` |
| SOLVE 方案 | `https://placehold.co/1280x720/ECFDF5/065F46/png?text=Solution+Demo%5CnReplace+Me&font=lato` |
| RESULT 数据 | `https://placehold.co/1280x720/EFF6FF/1E40AF/png?text=Result+Demo%5CnReplace+Me&font=lato` |
| CTA 行动 | `https://placehold.co/1280x720/FFFBEB/92400E/png?text=CTA+Demo%5CnReplace+Me&font=lato` |
| 通用 | `https://placehold.co/1280x720/F8FAFC/475569/png?text=Demo+Image%5CnReplace+Me&font=lato` |

### 沉浸黑主题（black）速查

| 用途 | 直接复制以下 URL |
|---|---|
| HOOK 主视觉 | `https://placehold.co/1280x720/0F0F1E/CBD5E1/png?text=Demo+Image%5CnReplace+Me&font=lato` |
| SCENE 场景 | `https://placehold.co/1280x720/1A1A2E/94A3B8/png?text=Scene+Demo%5CnReplace+Me&font=lato` |
| PAIN 痛点 | `https://placehold.co/1280x720/1F0A0E/FCA5A5/png?text=Pain+Demo%5CnReplace+Me&font=lato` |
| SOLVE 方案 | `https://placehold.co/1280x720/0F1F1A/A7F3D0/png?text=Solution+Demo%5CnReplace+Me&font=lato` |
| RESULT 数据 | `https://placehold.co/1280x720/0B1628/BFDBFE/png?text=Result+Demo%5CnReplace+Me&font=lato` |
| CTA 行动 | `https://placehold.co/1280x720/1F1408/FDE68A/png?text=CTA+Demo%5CnReplace+Me&font=lato` |
| 通用 | `https://placehold.co/1280x720/0F0F1E/CBD5E1/png?text=Demo+Image%5CnReplace+Me&font=lato` |

### URL 编码说明

- `%5Cn` 在 placehold.co 表示**换行**
- `+` 表示空格
- placehold.co 内置字体（lato / inter / roboto 等）**只支持 ASCII**，**严禁写中文**（会被渲染成方块）
- 文字超过 30 个字符会被截断

---

## 决策表（LLM 应该选哪种？）

| 场景 | 选 |
|---|---|
| **默认所有视频** | **本地 SVG**（`./assets/placeholders/{theme}/{hint}.svg`） |
| 用户视频是英文内容 | placehold.co URL（英文水印更协调） |
| 内网/离线环境 | **本地 SVG** |
| 用户要求"灵活定制水印文字" | placehold.co URL（参数可自定义） |

---

## ⚠️ 严禁

- ❌ **不要在 project.json 写不存在的本地路径**（如 `./assets/images/random.png` 但实际未生成文件）
- ❌ **不要假装某张图是用户提供的真实素材**——所有占位图必须保留水印 "※ 演示图片 请替换"
- ❌ **不要修改 SVG 内的水印文字**（修改了等于欺骗用户）
- ❌ **不要混用主题**（black 主题项目用 light SVG 会显得违和）
- ❌ **placehold.co URL 严禁写中文水印**（lato/roboto 字体不含中文，会渲染成方块）

---

## 用户体验关键路径

1. 视频生成 → 用户看到水印 → 立刻知道"这是占位图"
2. 用户在分享给老板/客户前自然会想换掉
3. 用户把真实图片放到 `./assets/images/`，改 project.json 路径，重新打包上传
4. 真实图片替换占位，视频质量瞬间提升
