# Agent 执行流程时序图

## 参与角色
- **User**: 用户
- **Agent**: LLM (大模型)
- **SKILL.md**: Skill 规则文档
- **state.js**: 状态机脚本 (`scripts/state.js`)
- **plan-executor.js**: 计划执行器 (`scripts/plan-executor.js`)
- **scaffold.js**: 脚手架脚本 (`scripts/scaffold.js`)
- **validate.js**: 校验脚本 (`scripts/validate.js`)
- **upload-video.js**: 上传脚本 (`scripts/upload-video.js`)
- **plan-state.json**: 状态持久化文件 (`.canvasvideo/plan-state.json`)

## 时序图

```
User          Agent           SKILL.md        state.js    plan-executor.js   scaffold.js    validate.js    upload-video.js   plan-state.json
|               |                  |               |              |                 |               |                |                  |
|---"做个视频"-->|                  |               |              |                 |               |                |                  |
|               |---读取规则------>|               |              |                 |               |                |                  |
|               |<--返回流程-------|               |              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 1: 理解需求 + 制定待办 ===            |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: loadOrCreateProject()-->|             |                 |               |                |                  |
|               |                               |---生成 skillProjectId           |               |                |                  |
|               |                               |---写入 plan-state.json          |               |                |                  |
|               |                               | (status: init)                  |               |                |                  |
|               |<--返回项目ID-------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: advanceStep('scaffold')>|            |                 |               |                |                  |
|               |                               |---更新状态--->|                |               |                |                  |
|               |                               |              | (status: scaffold)               |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 2: 生成待办清单 =========|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: setPlan(planArray)----->|            |                 |               |                |                  |
|               |                               |---写入 plan-state.json          |               |                |                  |
|               |                               | (plan: [...])                   |               |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---"待办清单如下，请确认..."---->|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|---"确认"------>|                                |              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 3: 执行 scaffold =======|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: assertStep('scaffold')-->|           |                 |               |                |                  |
|               |                               |---读取状态--->|                |               |                |                  |
|               |                               |<--状态匹配----|                |               |                |                  |
|               |<--检查通过---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: scaffold(projectConfig)->|            |                 |               |                |                  |
|               |                               |-------------调用--------------->|               |                |                  |
|               |                               |              |                 |---创建工作目录 |                |                  |
|               |                               |              |                 |---生成 project.json 骨架       |                  |
|               |                               |              |                 |---写入文件     |                |                  |
|               |                               |<------------返回----------------|               |                |                  |
|               |<--返回结果---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: advanceStep('design')-->|           |                 |               |                |                  |
|               |                               |---更新状态--->|                |               |                |                  |
|               |                               |              | (status: design)                 |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 4: 生成 design.md ======|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: assertStep('design')---->|           |                 |               |                |                  |
|               |                               |---读取状态--->|                |               |                |                  |
|               |                               |<--状态匹配----|                |               |                |                  |
|               |<--检查通过---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---"design.md 如下，请确认..."-->|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|---"确认"------>|                                |              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: advanceStep('design_confirmed')-->   |                 |               |                |                  |
|               |                               |---更新状态--->|                |               |                |                  |
|               |                               |              | (status: design_confirmed)       |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 5: 生成 project.json ===|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: assertStep('design_confirmed')-->    |                 |               |                |                  |
|               |                               |---读取状态--->|                |               |                |                  |
|               |                               |<--状态匹配----|                |               |                |                  |
|               |<--检查通过---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---"正在生成 project.json..." --->|            |                 |               |                |                  |
|               | (Agent 调用 build_project_json.md 规则生成 JSON)                 |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: advanceStep('project_json')-->|      |                 |               |                |                  |
|               |                               |---更新状态--->|                |               |                |                  |
|               |                               |              | (status: project_json)           |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 6: 校验 =================|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: assertStep('project_json')-->|       |                 |               |                |                  |
|               |                               |---读取状态--->|                |               |                |                  |
|               |                               |<--状态匹配----|                |               |                |                  |
|               |<--检查通过---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: validate(projectDir)---->|           |                 |               |                |                  |
|               |                               |-------------调用------------------------------->|                |                  |
|               |                               |              |                 |               |---selfcheck-----|                  |
|               |                               |              |                 |               |---云端 precheck-|                  |
|               |                               |              |                 |               |---丰富度评分----|                  |
|               |                               |<------------返回-------------------------------|                |                  |
|               |<--返回校验结果-----------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: advanceStep('validated')-->|         |                 |               |                |                  |
|               |                               |---更新状态--->|                |               |                |                  |
|               |                               |              | (status: validated)              |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== Step 7: 打包上传 =============|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: assertStep('validated')-->|          |                 |               |                |                  |
|               |                               |---读取状态--->|                |               |                |                  |
|               |                               |<--状态匹配----|                |               |                |                  |
|               |<--检查通过---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: upload(projectDir)------>|           |                 |               |                |                  |
|               |                               |-------------------------------------------------------------调用->|                  |
|               |                               |              |                 |               |                |---打包 zip       |
|               |                               |              |                 |               |                |---上传服务器     |
|               |                               |              |                 |               |                |---返回 URL       |
|               |                               |<-----------------------------------------------------------返回---|                  |
|               |<--返回分享链接-----------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---调用: advanceStep('uploaded')-->|         |                 |               |                |                  |
|               |                               |---更新状态--->|                |               |                |                  |
|               |                               |              | (status: uploaded)               |                |                  |
|               |<--确认成功---------------------|              |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |=== 完成 ========================|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|               |---"视频已生成，链接是..." ------>|             |                 |               |                |                  |
|               |                                |              |                 |               |                |                  |
|---"收到"------>|                                |              |                 |               |                |                  |
```

## 关键调用说明

### 1. state.js 核心函数

```javascript
// Agent 调用方式（通过 node 命令或 require）
const { loadOrCreateProject, assertStep, advanceStep } = require('./scripts/state.js');

// 加载或创建项目（返回 skillProjectId）
const projectId = loadOrCreateProject(workdirRoot);

// 检查当前是否处于指定步骤，不是则抛错
assertStep('design');  // 如果当前是 scaffold，抛错

// 推进到下一步
advanceStep('design_confirmed');  // 更新 plan-state.json
```

### 2. plan-executor.js 核心函数

```javascript
const PlanExecutor = require('./scripts/plan-executor.js');

// 创建执行器实例
const executor = new PlanExecutor(workdirRoot);

// 设置计划清单
executor.setPlan([
  { step: 'scaffold', desc: '创建项目骨架' },
  { step: 'design', desc: '生成设计文档' },
  { step: 'design_confirmed', desc: '确认设计文档' },
  { step: 'project_json', desc: '生成项目JSON' },
  { step: 'validated', desc: '校验通过' },
  { step: 'uploaded', desc: '上传完成' }
]);

// 执行下一步
const result = executor.executeNext(projectConfig);
// 自动检查当前状态、执行对应操作、推进状态
```

### 3. 各脚本职责

| 脚本 | 职责 | 状态检查 |
|------|------|----------|
| `scaffold.js` | 创建工作目录、生成 project.json 骨架 | `assertStep('scaffold')` |
| `validate.js` | selfcheck + 云端 precheck + 丰富度评分 | `assertStep('project_json')` |
| `upload-video.js` | 打包 zip、上传服务器、返回 URL | `assertStep('validated')` |

## 状态流转图

```
init → scaffold → design → design_confirmed → project_json → validated → uploaded
       ↑          ↑            ↑                ↑             ↑            ↑
    (制定待办) (生成design) (用户确认)       (生成JSON)    (校验通过)   (上传完成)
```

## 错误拦截示例

### 场景：Agent 想跳过 design 直接生成 JSON

```
Agent: 调用 assertStep('project_json')
       ↓
state.js: 读取 plan-state.json，当前状态 = 'scaffold'
       ↓
state.js: 抛出错误 ❌
       "当前状态为 scaffold，必须先执行 design 才能执行 project_json"
       ↓
Agent: 收到错误，被迫回去执行 design 步骤
```

### 场景：Agent 想自己确认 design.md

```
Agent: 调用 advanceStep('design_confirmed')
       ↓
state.js: 更新状态为 design_confirmed
       ↓
User: 实际上还没确认 design.md
       ↓
User: 发现 Agent 擅自推进，纠正并回退状态
       （或：plan-executor.js 在 executeNext 时检查用户输入）
```

## 文件持久化

```
.canvasvideo/
└── plan-state.json          # 状态机持久化文件

{
  "skillProjectId": "cv_m3v9z_a1b2c3d4",
  "currentStep": "design_confirmed",
  "plan": [
    { "step": "scaffold", "desc": "创建项目骨架", "completed": true },
    { "step": "design", "desc": "生成设计文档", "completed": true },
    { "step": "design_confirmed", "desc": "确认设计文档", "completed": true },
    { "step": "project_json", "desc": "生成项目JSON", "completed": false }
  ],
  "createdAt": "2026-06-22T10:00:00Z",
  "updatedAt": "2026-06-22T10:15:00Z"
}
```
