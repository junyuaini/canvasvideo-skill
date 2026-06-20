# 占位图速查表（CanvasVideo Skill）

> 本目录提供两类占位图，供 LLM 在素材状态为 `[AI 自动生成]` 时直接引用。
> 写 design.md 步骤 7（组件清单）和 project.json 时，**直接复制下表的 path 或 URL** 即可。

---

## ☁️ 路径 A：在线水印图（placehold.co）— 推荐主用

**优势**：动态生成、文字可定制、不占 zip 体积。
**劣势**：依赖 placehold.co 在线服务（历史可用性 99.9%，但断网会失败）。

### 极简白主题（white）速查

| 用途 | 直接复制以下 URL |
|---|---|
| HOOK 主视觉 | `https://placehold.co/1280x720/F3F4F6/6B7280/png?text=演示图%5Cn请自行替换&font=lato` |
| SCENE 场景 | `https://placehold.co/1280x720/F1F5F9/64748B/png?text=场景演示图%5Cn请自行替换&font=lato` |
| PAIN 痛点 | `https://placehold.co/1280x720/FEF2F2/B91C1C/png?text=痛点演示图%5Cn请自行替换&font=lato` |
| SOLVE 方案 | `https://placehold.co/1280x720/ECFDF5/065F46/png?text=方案演示图%5Cn请自行替换&font=lato` |
| RESULT 数据 | `https://placehold.co/1280x720/EFF6FF/1E40AF/png?text=数据演示图%5Cn请自行替换&font=lato` |
| CTA 行动 | `https://placehold.co/1280x720/FFFBEB/92400E/png?text=行动演示图%5Cn请自行替换&font=lato` |
| 通用 | `https://placehold.co/1280x720/F8FAFC/475569/png?text=演示图片%5Cn请自行替换&font=lato` |

### 沉浸黑主题（black）速查

| 用途 | 直接复制以下 URL |
|---|---|
| HOOK 主视觉 | `https://placehold.co/1280x720/0F0F1E/CBD5E1/png?text=演示图%5Cn请自行替换&font=lato` |
| SCENE 场景 | `https://placehold.co/1280x720/1A1A2E/94A3B8/png?text=场景演示图%5Cn请自行替换&font=lato` |
| PAIN 痛点 | `https://placehold.co/1280x720/1F0A0E/FCA5A5/png?text=痛点演示图%5Cn请自行替换&font=lato` |
| SOLVE 方案 | `https://placehold.co/1280x720/0F1F1A/A7F3D0/png?text=方案演示图%5Cn请自行替换&font=lato` |
| RESULT 数据 | `https://placehold.co/1280x720/0B1628/BFDBFE/png?text=数据演示图%5Cn请自行替换&font=lato` |
| CTA 行动 | `https://placehold.co/1280x720/1F1408/FDE68A/png?text=行动演示图%5Cn请自行替换&font=lato` |
| 通用 | `https://placehold.co/1280x720/0F0F1E/CBD5E1/png?text=演示图片%5Cn请自行替换&font=lato` |

### URL 编码说明

- `%5Cn` 在 placehold.co 表示**换行**
- 中文字符**不需要再做 URL encode**，placehold.co 直接支持
- 文字超过 30 个字会被截断

---

## 📁 路径 C：本地 SVG 兜底（templates/placeholders/）— 离线必备

**优势**：100% 离线、无外部依赖、SVG 矢量缩放清晰、体积极小。
**劣势**：风格固定（但可视化已经做得相对美观）。

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

> Skill 的 `scripts/scaffold.js` 会在执行 `scaffoldWorkdir()` 时**自动**把对应主题的 SVG 复制到工作目录的 `assets/placeholders/{theme}/` 下。
> LLM 不需要手动复制，**只需要在 project.json 写出对应路径**即可。

---

## ⭐ 推荐使用策略（双层兜底）

### LLM 在 design.md 步骤 7（组件清单）时

写素材清单时，**两条路径都列出来**，并在状态列说明：

```
| 序号 | 素材类型 | 素材描述 | 用于区域 | 路径 | 状态 |
|------|---------|---------|---------|------|------|
| 1 | 图片 | 主视觉演示 | P1 | (在线) https://placehold.co/1280x720/F3F4F6/6B7280/png?text=演示图%5Cn请自行替换&font=lato (离线) ./assets/placeholders/light/hook.svg | [AI 自动生成 - 占位] |
```

### LLM 在 project.json 写 ImageComponent 时

**首选在线 URL**（视觉效果更好、文字可定制）：
```json
{
  "type": "ImageComponent",
  "content": {
    "image": "https://placehold.co/1280x720/F3F4F6/6B7280/png?text=演示图%5Cn请自行替换&font=lato",
    "fit": "cover",
    "borderRadius": 12
  }
}
```

**备选本地 SVG**（要求强离线、内网部署、placehold.co 不可达时）：
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

---

## ⚠️ 严禁

- ❌ **不要在 project.json 写不存在的本地路径**（如 `./assets/images/random.png` 但实际未生成文件）
- ❌ **不要假装某张图是用户提供的真实素材**——所有占位图必须保留水印 "📷 演示图片 · 请自行替换"
- ❌ **不要修改 SVG 内的水印文字**（修改了等于欺骗用户）
- ❌ **不要混用主题**（black 主题项目用 light SVG 会显得违和）

---

## 用户体验关键路径

1. 视频生成 → 用户看到水印 → 立刻知道"这是占位图"
2. 用户在分享给老板/客户前自然会想换掉
3. 用户把真实图片放到 `./assets/images/`，改 project.json 路径，重新打包上传
4. 真实图片替换占位，视频质量瞬间提升
