# 步骤6：发布（合并 + 自检 → 素材 → 打包 → 上传）

> 前置步骤：[步骤5：区域设计与生成JSON（口播模式）](05-region-design-dubbing.md) + [步骤2：音频与字幕准备（仅口播模式）](02-voice-prepare.md)
>
> 本步骤是**最后一步**，执行完即获得可分享的预览链接。

---

## 目标

将 skeleton + regions 合并为 project.json，自检通过后将音频/图片内联，打包 zip，上传云端返回预览链接。

整个过程由 `scripts/pipeline.js` 一个脚本完成，AI 只需**一条命令**。

---

## 一键执行

```bash
node scripts/pipeline.js --cwd=<Agent工作目录的绝对路径> <skillProjectId>
```

脚本内部按以下顺序串接 4 个阶段，任一阶段失败立即终止并提示修复点：

| 子阶段 | 操作 | 内部脚本 | 失败时回到 |
|---|---|---|---|
| 6.1 合并 + 自检 | skeleton + regions → project.json + 本地自检 | `merge-regions.js` + `validate.js` | 改 regions/P{n}.json，重跑 |
| 6.2 素材编码 | 音频/图片转 Base64 内联到 project.json | `setup-assets.js` | 检查 state.voice + 图片路径 |
| 6.3 打包 | project.json → `<skillProjectId>.zip` | `package.js` | 检查 audio.base64 |
| 6.4 上传 | zip → 云端 → 预览链接 | `upload-video.js` | 检查网络/账号 |

---

## 高级参数

```bash
# 跳过前置阶段（如只重跑上传）
node scripts/pipeline.js --cwd=<Agent工作目录> <skillProjectId> --from=upload

# 指定服务地址（默认 https://dajiulanren.top）
node scripts/pipeline.js --cwd=<Agent工作目录> <skillProjectId> --server=https://staging.dajiulanren.top
```

`--from` 取值：`merge` | `assets` | `package` | `upload`

---

## 产出

| 文件 / 结果 | 路径 | 说明 |
|---|---|---|
| `project.json` | `{workdir}/{skillProjectId}/project.json` | 完整配置（含内联素材） |
| `<skillProjectId>.zip` | `{workdir}/{skillProjectId}/<skillProjectId>.zip` | 打包文件 |
| 预览链接 | `https://dajiulanren.top/cv/view/{previewToken}` | **最终交付** |

---

## 子阶段详解

### 合并 + 自检

合并脚本会自动完成：

1. **验证骨架来源** — 检查 `skeleton.json` 包含 `source_design_doc` 字段，且对应的设计文档文件存在
2. **合并文件** — 将 skeleton 和所有区域合并为完整的 `project.json`
3. **保留来源** — 在 `project.json` 中保留骨架的 `source_design_doc` 信息
4. **自动注入** — 给 HTML class 元素分配 id、生成 `elementIds`、按 SRT 推算 start/end

**合并后必须立刻自检**（脚本自动调用 `validate.js`）：

1. **HtmlComponent 总数** = 所有区域 HtmlComponent 数之和
2. **字幕总数** = 所有区域字幕数之和
3. **所有 HtmlComponent ID 唯一**
4. **HtmlComponent / 字幕按 start 排序**
5. **selfcheck 规则** — 节奏档位门槛 + 布局 Y 坐标检查

> ℹ️ 本步骤只跑本地自检。schema 结构 / customStyle 字段等强校验由云端 `upload-video.js` 的 precheck 兜底。

#### AI 写完后自查

- [W] 素材清单实现率 = 100%（指所有素材都被挂到 HtmlComponent 上）
- [E] AI 不写 id、不写 elementIds、不写 start/end（merge 自动处理）

#### 时间字段自动填充

| 字段 | 来源 |
|---|---|
| `region.startTime / endTime` | 从 SRT 字幕范围取（merge 自动写入） |
| `component.start / end` | subtitles（查 SRT）/ 旧 start/end / 缺省=region 起止 |
| `elementIds[].start` | data-subtitle 查 SRT 推算；data-global 不写 |
| `elementIds[].end` | 不注入，前端推算 |
| HTML 元素 `id` 属性 | merge 自动给 class 元素分配（AI 不写） |

---

### 素材编码

将音频和图片转为 Base64，内联到 project.json，打包时不再依赖外部素材文件。

脚本自动完成：

1. 读取 `state.voice.audioPath`，将音频文件转为 Base64，写入 `project.json.audio`
2. 扫描 `project.json` 中所有 `<img src="...">` 的路径，将图片文件转为 Base64，汇总写入
3. 将 `<img src="...">` 替换为 `data:image/...;base64,xxx` 格式

**自检**：

- [W] 音频 Base64 非空
- [W] 所有图片均已编码，未遗漏
- [W] `<img src>` 已替换为 data URL

---

### 打包

将 project.json 打包为 zip。

**自检**（脚本自动校验）：

- [E] project.json 中 `audio` 是有效 data URI
- [E] zip 文件已生成
- [E] 无打包错误

---

### 上传

将打包好的 zip 上传到云端，获取可分享的预览链接。

脚本自动完成：

1. **用户体系** — 自动注册或复用已有用户（无需手动注册）
2. **云端预校验** — 调用 `/cv/api/projects/validate` 检查 project.json 格式与字段完整性
3. **上传** — multipart 上传 zip 包
4. **返回链接** — 输出预览链接

> ℹ️ 同一 `skillProjectId` 重复上传会复用同一个 `previewToken`，预览链接保持不变，内容自动更新。

**自检**（脚本自动校验）：

- [E] zip 包存在
- [E] 云端 `/cv/api/projects/validate` 通过
- [E] 上传 HTTP 状态码 200

**AI 写完后自查**：

- [W] 预览链接复制给用户时确认可用（浏览器打开验证）

#### 首次 vs 迭代

| 场景 | 行为 |
|---|---|
| **首次上传** | 自动注册用户，输出 userId + userToken，AI 必须用 ⚠️ 代码块格式告知用户保存 |
| **迭代上传** | 复用已有账号，不输出 userToken，直接返回预览链接 |

---

## 下一步

无 — 本步骤为流程终点。

迭代修改时，直接修改骨架设计文档 / regions/P{n}.json，然后重跑：

```bash
node scripts/pipeline.js --cwd=<Agent工作目录> <skillProjectId>
```
