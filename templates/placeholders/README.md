# 占位图目录

提供两类占位图资源。

## Picsum 在线图（推荐）

通过 API 获取，需用 AggregateComponent 叠水印。

```
https://picsum.photos/seed/{seed}/{width}/{height}
```

详见 `rules/06-components.md` §R6。

## 本地 SVG 兜底

`light/` 和 `dark/` 目录下各 7 张 SVG，自带水印。

| 用途 | 极简白 | 沉浸黑 |
|------|--------|--------|
| HOOK | `light/hook.svg` | `dark/hook.svg` |
| SCENE | `light/scene.svg` | `dark/scene.svg` |
| PAIN | `light/pain.svg` | `dark/pain.svg` |
| SOLVE | `light/solve.svg` | `dark/solve.svg` |
| RESULT | `light/result.svg` | `dark/result.svg` |
| CTA | `light/cta.svg` | `dark/cta.svg` |
| 通用 | `light/generic.svg` | `dark/generic.svg` |

由 `scripts/scaffold.js` 自动复制到工作目录。
