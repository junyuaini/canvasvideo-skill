# CanvasVideo Skill — 脚本索引

## 流程脚本（按视频制作步骤排序）

| 脚本 | 步骤 | 说明 |
|------|------|------|
| `init-project.js` | 步骤 1 | 创建项目工作目录结构（state.json）|
| `scaffold.js` | 步骤 1 | 解析 Agent 工作目录，提供 `resolveAgentWorkdir` 等工具函数 |
| `setup-workdir.js` | 步骤 1 | 项目工作目录结构设置（底层）|
| `prepare-voice.js` | 步骤 2（口播）| 音频与字幕准备：用户提供 MP3+SRT 或用 TTS 生成（node-edge-tts）|
| `tts.js` | 步骤 2（口播）| 步骤 2 内部依赖：TTS 引擎（基于 node-edge-tts 调 Azure）|
| `generate-skeleton.js` | 步骤 4 | 读取 design-skeleton.md 生成 skeleton.json + regions/P{n}.json 模板 |
| `merge-regions.js` | 步骤 6 | 合并 skeleton.json + regions/*.json → project.json |
| `validate.js` | 步骤 6 | 步骤 6 本地自检入口（委托云端 schema 校验）|
| `setup-assets.js` | 步骤 6 | 复制占位素材（placeholders）到工作目录，编码音频为 Base64 |
| `package.js` | 步骤 6 | 打包 project.json + assets 为 zip |
| `pipeline.js` | 步骤 6 | 一键执行合并+自检+素材+打包+上传（CI / 自动化用）|
| `upload-video.js` | 步骤 6 | 上传 zip 到云端，支持 precheck + 进度回调 |

## 工具脚本

| 脚本 | 说明 |
|------|------|
| `selfcheck.js` | 本地自检：ID 格式、节奏检查、布局校验、subtitle/audio/subtitles 必填校验 |
| `validate-html.js` | HTML 元素校验：data-subtitle 引用合法、id 唯一、居中修正等 |
| `validate-region.js` | 区域时间范围验证：检查 HtmlComponent 时间是否在区域内 |
| `transform-html-component.js` | 转换 HTML 组件：自动分配 id、注入 data-global、补 elementIds |
| `query-api.js` | 封装所有后端 API 调用（LLM 专用，禁止手敲 curl）|
| `save-project.js` | 将修改后的 project.json 保存到工作目录 |
| `lookup-element.js` | 输入 HTML 元素 ID（如 P4-107），反查所在 region、class、subtitle |
| `srt-parser.js` | SRT 字幕解析器 → project.json subtitles 数组 |
| `state.js` | 读写 `.canvasvideo/project-state.json`，维护 skillProjectId、mode 等本地状态 |

## 内部模块（供其他脚本调用，非独立运行）

| 模块 | 说明 |
|------|------|
| `state.js` | 项目本地状态读写 |
| `scaffold.js` | `resolveAgentWorkdir()` 等工具函数 |

## 调用约定

所有脚本通过 `RunCommand` 调用，基本格式：

```
node scripts/<脚本名>.js --cwd=<Agent工作目录> [其他参数]
```

示例：
```bash
node scripts/init-project.js --cwd=d:/path/to/project --new --config=config.json
node scripts/prepare-voice.js --cwd=d:/path/to/project cv_xxx --text-file=article.txt --voice=zh-CN-YunxiNeural
node scripts/generate-skeleton.js --cwd=d:/path/to/project cv_xxx
node scripts/pipeline.js --cwd=d:/path/to/project cv_xxx  # 步骤 6 一键
```

## 与后端 schema 的关系

- **Skill 端自检**（selfcheck.js）：设计规则 + mode/audio/subtitle/subtitles 必填
- **云端校验**（/cv/api/projects/validate）：schema 约束 + 业务规则（权威）
- 后端 schema 定义在 `CanvasVideo/server/schemas/project.schema.json`，与 Skill 端副本需保持同步
