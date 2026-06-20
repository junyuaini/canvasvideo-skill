# 系统契约：API 与工作目录（API & Workspace Contract）

> 服务端 API 端点 + 用户体系 + Skill 工作目录路径推算规则。
> **本文档是 hard rule 单一来源**，被以下流程引用：
> - 主流程：SKILL.md 第四次交互（上传）、第七次交互（查询账号）
> - 脚本：scripts/upload-video.js、scripts/state.js、scripts/scaffold.js

---

## 1. 服务端默认地址

> **v1.4 起硬编码**：`http://8.147.60.112/cv`
> 程序化调用 / CLI 时不指定 `serverUrl` 即使用此默认值。
> 如需切换，在 [`scripts/upload-video.js`](../scripts/upload-video.js) 顶部修改 `DEFAULT_SERVER_URL` 常量即可。

---

## 2. API 端点

### 2.1 视频上传

```
POST {serverUrl}/api/projects/upload
Content-Type: multipart/form-data
  - skillProjectId: String   (必填)
  - zip:            File     (必填)
  - userId:         String   (必填)
  - userToken:      String   (必填)
  - meta:           Object   (可选)

响应: { success, skillProjectId, previewToken, previewUrl }
```

### 2.2 用户注册

```
POST {serverUrl}/api/users/register
Content-Type: application/json
  body: { userId, userToken }

响应: { success, userId }

错误:
  - 409 / USER_ID_CONFLICT  → Skill 端重生 userId 后重试一次
```

### 2.3 用户项目列表（前端用）

```
POST {serverUrl}/api/users/projects
Content-Type: application/json
  body: { userId, userToken }

响应: { success, projects: [{ previewToken, name, updatedAt }] }
```

### 2.4 组件字段规范查询

```
GET  /api/component/spec                                  → 所有组件简介
POST /api/component/spec/batch                            → 批量查字段（最多 20 个）
GET  /api/component/spec/:type/:variant                   → 单查
```

详见 [`components-catalog.md`](./components-catalog.md)。

### 2.5 健康检查

```
GET {serverUrl}/api/health
响应: { status: "ok" }
```

---

## 3. 用户体系（API Key 模式）

### 3.1 极简凭证

- `userId` 格式：`cu-{12 位十六进制}`，例：`cu-a1b2c3d4e5f6`
- `userToken` 格式：`ut-{32 位十六进制}`，例：`ut-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d`
- 无密码、无邮箱、无 displayName，无找回机制

### 3.2 服务端只存 hash

```
data/users/{userId}.json
{
  "userId": "cu-...",
  "userTokenHash": "<sha256>",
  "createdAt": "...",
  "projects": ["..."]
}
```

明文 `userToken` 仅存于用户本地 `canvasvideo-workdir/.user.json`。

### 3.3 注册时机

**仅在首次打包并即将上传那一刻自动注册**，不在：
- ❌ Skill 启动时
- ❌ 用户输入需求时
- ❌ 生成设计文档时

### 3.4 单机模式与边界

- 一台机器一份 `.user.json`，所有项目共享同一账号
- `.user.json` 丢失 = 网页登录入口无法看到列表（视频分享链接仍可访问）
- 跨设备：手动复制 `.user.json` 到目标机器
- 不支持账号合并、不支持服务端找回、不支持重置

---

## 4. 工作目录路径推算（v1.5）

### 4.1 重要变更

> **v1.5 起**：工作目录从"Skill 目录的父目录"改为 **Agent 当前工作目录（CWD）**。
> **原因**：Skill 安装目录（如 `C:\Users\xxx\.trae-cn\skills\canvasvideo\`）通常需要管理员权限，且全局共享会冲突；放到 Agent CWD 下更符合直觉，权限稳定，每个项目互不干扰。

### 4.2 路径推算优先级

| 优先级 | 路径来源 | 计算公式 |
|---|---|---|
| **第 1 优先** | **Agent 当前工作目录（CWD）** | `process.cwd() + "/canvasvideo-workdir/"` |
| 第 2 优先（兜底） | Skill 目录的父目录 | `path.dirname(SKILL.md 父目录) + "/canvasvideo-workdir/"`（只在 Agent 无法获取 CWD 时用） |

### 4.3 LLM 实现指引

```javascript
// ✅ 推荐写法（v1.5 起）
const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');

// ❌ 旧写法（v1.4 及以前），权限可能受限
const skillDir = path.dirname(__filename);
const workdirRoot = path.resolve(skillDir, '../canvasvideo-workdir');
```

**给用户的提示**（首次启动时）：
> 我会在你当前的项目目录下创建一个 `canvasvideo-workdir/` 文件夹，存放所有视频项目和登录凭证。如果不希望放在这里，请明确告诉我目标路径。

### 4.4 路径推算汇总

| 项 | 计算 |
|---|---|
| Agent 当前工作目录（CWD） | `process.cwd()` |
| 工作根目录 | **CWD + `canvasvideo-workdir/`** |
| 项目工作目录 | 工作根目录 + `{skillProjectId}/` |
| 用户凭证文件 | 工作根目录 + `.user.json` |
| 设计文档 | 项目工作目录 + `design.md` |
| 项目 JSON | 项目工作目录 + `project.json` |
| 用户素材目录 | 项目工作目录 + `assets/images/` |

**任何首次写文件前都应调用 `ensureProjectWorkdir(workdirRoot, skillProjectId)`**，不要假设目录存在。

### 4.5 工作目录结构

```
{Agent 当前工作目录}/canvasvideo-workdir/
├── .user.json                                ← 极简两字段：{ userId, userToken }
└── {skillProjectId}/
    ├── design.md
    ├── project.json
    ├── assets/
    │   └── images/
    └── .canvasvideo/
        └── project-state.json
```

---

## 5. skillProjectId 生成规则（强制）

**规则**：`skillProjectId` **必须通过 [`scripts/state.js`](../scripts/state.js) 的 `loadOrCreateProject()` 生成**，禁止 LLM 自己编造 ID。

```js
const state = require('./scripts/state').loadOrCreateProject(workdir);
// state.skillProjectId 由程序自动生成，格式：cv_{timestamp36}_{random8}
// 示例：cv_m3v9z_a1b2c3d4
```

**错误示例**（LLM 自己编造的 ID）：
```
❌ cv_20260621_couple_love     ← 模型自己写的日期+主题名
❌ cv_project_1                ← 太简单，没有随机性
❌ couple_love                 ← 缺少 cv_ 前缀
❌ cv_123456                   ← 没有 random 部分
```

**为什么强制**：
1. `state.js` 生成的 ID 包含时间戳（36 进制）+ 8 位随机十六进制，保证全局唯一
2. 同一项目多次上传必须复用相同的 `skillProjectId`，服务器才能复用 `previewToken`
3. 如果 LLM 每次自己编一个新 ID，同一项目会被当成不同项目，导致重复创建、previewToken 不固定

**自检**：生成 ID 后检查格式是否为 `cv_{7-10 位字母数字}_{8 位十六进制}`。

---

## 6. 上传流程内部细节（脚本视角）

```
uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath)
├─ 1. ensureWorkdirRoot()
├─ 2. readLocalUser(workdirRoot)
│   ├─ 本地存在且合法 → user, isFirstTime=false
│   └─ 不存在 / 损坏 → 进入注册分支
│        a. generateUserId() + generateUserToken()
│        b. POST /api/users/register
│        c. 409 冲突 → 重生一次再 register
│        d. 写 canvasvideo-workdir/.user.json
│        e. 本地写失败 → 抛错并把 userId/userToken 暴露给上层
│        f. user, isFirstTime=true
├─ 3. POST /api/projects/upload (zip + skillProjectId + userId + userToken)
└─ 4. 返回 { previewToken, previewUrl, isFirstTime, user, warnings }
```

---

## 7. 错误处理（脚本默认行为）

| 场景 | 默认行为 |
|------|---------|
| 注册返回 409（重试后仍冲突） | 抛错"账号生成异常，请稍后重试" |
| 注册成功但本地写失败 | 抛错并把 userId/userToken 写在错误信息里（让用户手动备份） |
| upload 返回 401 | 抛错"账号验证失败，请检查 .user.json 是否正确" |
| upload 返回 413 | 抛错"zip 体积超限，请压缩素材或减少时长" |
| upload 返回 5xx | 退避 1s 重试 1 次，仍失败抛错 |
| 网络中断 | 抛错"上传中断"，保留本地 zip 供下次复用 |
