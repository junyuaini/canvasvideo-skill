# API 规则

> 服务端端点、用户体系、工作目录路径推算。

---

## R1 服务端端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /cv/api/users/register` | 注册 | 用户ID+userToken 双向校验（v1.4 起改为先本地预生成） |
| `POST /cv/api/users/projects` | 查询项目列表 | 按 userId 返回 previewToken 列表 |
| `POST /cv/api/projects/upload` | 上传 | 上传 `<skillProjectId>.zip`（**skillProjectId 必须符合新格式，见 R4**） |
| `POST /cv/api/projects/validate` | 预校验 | 不落盘，仅校验 project.json 业务规则 |
| `GET  /cv/api/projects/view/:previewToken` | 预览 | 用 previewToken 访问 |

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
        ├── design-skeleton-dubbing.md
        ├── ...
        ├── skeleton.json
        ├── regions/
        │     ├── P1.json
        │     ├── P2.json
        │     └── ...
        ├── project.json
        ├── assets/
        │     ├── images/                  # 用户图片
        │     └── placeholders/            # 占位素材
        │           ├── {theme}/           # 主题占位 SVG（white → light/, black → dark/）
        │           └── bgm/               # BGM 文件
        ├── output/
        │     └── (构建产物)
        └── <skillProjectId>.zip
```

**严禁**：
- ❌ 路径含 `..` 等穿越字符

---

## R4 skillProjectId 格式（服务端严格校验）

**唯一允许的格式**：`cv_{userShort6}_{timestamp_base36}_{random8_hex}`

| 段 | 内容 | 来源 |
|----|------|------|
| 前缀 | `cv_` | 固定 |
| 第 2 段 | `userShort6`（6 位小写 hex） | userId 前 6 位 |
| 第 3 段 | `timestamp`（13 位 base36） | `Date.now().toString(36)` |
| 第 4 段 | `random8`（8 位小写 hex） | `crypto.randomBytes(4).toString('hex')` |

**正则在服务端 `utils/validators.js` 的 `SKILL_PROJECT_ID_RE`**： `/^cv_[a-z0-9]{6}_[a-z0-9]+_[a-z0-9]+$/`

**严禁**：
- ❌ 任何不符合上述 4 段格式的 ID（包括旧格式 `cv_{ts}_{rand}`、`cv_xxx_yyy` 等）—— 会被服务端 400 拒绝
- ❌ LLM 自编 ID —— 必须由 `state.js#generateSkillProjectId(userId)` 生成

详见 `rules/01-principles.md` §R6。
