# API 规则

> 服务端端点、用户体系、工作目录路径推算。

---

## R1 服务端端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /cv/api/user/register` | 注册 | 用户名+密码 → userToken |
| `POST /cv/api/user/login` | 登录 | 用户名+密码 → userToken |
| `GET /cv/api/user/me` | 查询 | userToken → 用户信息 |
| `POST /cv/api/project/upload` | 上传 | 上传 output.zip |
| `GET /cv/api/component/spec/batch?types=...` | 批量查询 | 查询组件字段规范 |
| `GET /cv/api/project/preview?token=...` | 预览 | 用 previewToken 访问 |

**严禁**：
- ❌ 查询账号调用服务端接口（只读本地 `.user.json`）

---

## R2 用户体系

| 项 | 规则 |
|----|------|
| 首次注册 | 无感完成，由 `getOrCreateUser` 自动处理 |
| userToken 存储 | 本地 `.user.json` |
| 凭证安全 | 详见 `rules/01-principles.md` §R4 |

---

## R3 工作目录路径推算

```
{workdirRoot}/
  └── {skillProjectId}/
        ├── design-skeleton-creative.md
        ├── design-skeleton-dubbing.md
        ├── design-P1.md
        ├── design-P2.md
        ├── ...
        ├── skeleton.json
        ├── regions/
        │     ├── P1.json
        │     ├── P2.json
        │     └── ...
        ├── project.json
        ├── assets/
        │     ├── images/
        │     │     └── (图片文件)
        │     ├── audio/
        │     │     └── (音频文件)
        │     └── subtitles/
        │           └── (字幕文件)
        ├── output/
        │     └── (构建产物)
        └── output.zip
```

**严禁**：
- ❌ 路径含 `..` 等穿越字符
