/**
 * 项目初始化脚本
 * 
 * 功能：
 *  - 创建工作目录结构
 *  - 初始化项目状态
 *  - 保存用户配置
 * 
 * 用法：node init-project.js <mode> [options]
 *   mode: creative | dubbing
 * 
 * 配置方式（二选一）：
 *   1. JSON 配置文件：--config=<filepath>
 *   2. JSON 字符串（不推荐，容易引号出错）：'{"content":"AI学习"}'
 * 
 * 示例：
 *   # 方式1：配置文件（推荐）
 *   node init-project.js creative --config=project-config.json
 * 
 *   # 方式2：JSON 字符串（兼容旧方式）
 *   node init-project.js creative '{"content":"AI学习","duration":15}'
 * 
 *   # 口播模式
 *   node init-project.js dubbing --config=dubbing-config.json
 */
const fs = require('fs');
const path = require('path');
const { ensureProjectWorkdir, resolveAgentWorkdir } = require('./scaffold');
const { loadOrCreateProject, saveProjectState } = require('./state');
const { getOrCreateUser, DEFAULT_SERVER_URL } = require('./upload-video');

/**
 * 解析命令行参数
 * @param {string[]} argv - process.argv
 * @returns {Object} { workdirRoot, mode, configFile, configJson }
 */
function parseArgs(argv) {
  // --cwd 必传，从 argv 里解析出 Agent 工作目录，再拼 canvasvideo-workdir
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');

  const args = {
    workdirRoot,  // 已在 parseArgs 头部通过 resolveAgentWorkdir 解析
    mode: null,   // 第一个非 -- 位置参数
    configFile: null,
    configJson: null
  };

  // 从剩余参数里找 mode 和 config
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--cwd=')) continue;
    if (arg.startsWith('--config=')) {
      args.configFile = arg.slice('--config='.length);
    } else if (!args.mode && !arg.startsWith('--')) {
      args.mode = arg;
    } else if (!args.configJson && !arg.startsWith('--')) {
      args.configJson = arg;
    }
  }

  return args;
}

/**
 * 加载配置
 * @param {Object} args - 解析后的参数
 * @returns {Object} 配置对象
 */
function loadConfig(args) {
  // 优先使用配置文件
  if (args.configFile) {
    const configPath = path.resolve(args.configFile);
    if (!fs.existsSync(configPath)) {
      throw new Error(`配置文件不存在: ${configPath}`);
    }
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      throw new Error(`配置文件解析失败: ${e.message}`);
    }
  }

  // 其次使用 JSON 字符串
  if (args.configJson) {
    try {
      return JSON.parse(args.configJson);
    } catch (e) {
      throw new Error(`JSON 参数解析失败: ${e.message}。建议改用 --config=配置文件.json 方式`);
    }
  }

  // 默认空配置
  return {};
}

/**
 * 初始化项目
 * @param {string} workdirRoot - 工作根目录
 * @param {string} mode - 'creative' | 'dubbing'
 * @param {Object} config - 用户配置
 * @param {Object} [options] - 额外参数
 * @param {string} [options.serverUrl] - 服务端 URL，默认 DEFAULT_SERVER_URL
 * @returns {Promise<Object>} { skillProjectId, workdir, state, user, isFirstTime }
 *
 * 关键变化（v2.x 起）：
 *  - 必须在创建 state 之前先调 getOrCreateUser，确保拿到 userId
 *  - 新格式 skillProjectId 内嵌 userShort6（来自 userId），需要 userId 才能生成
 *  - 这意味着 init-project 阶段就需要联网注册账号（与原来的"上传时再注册"不同）
 */
async function initProject(workdirRoot, mode, config = {}, options = {}) {
  const serverUrl = options.serverUrl || DEFAULT_SERVER_URL;

  // 第一步：确保用户已注册并拿到 userId（这是新格式 skillProjectId 的前置条件）
  // 仅在 state 不存在时才需要调；已有 state 直接跳过
  const statePath = path.join(workdirRoot, '.canvasvideo', 'project-state.json');
  const isNewProject = !fs.existsSync(statePath);

  let user = null;
  let isFirstTime = false;
  if (isNewProject) {
    const result = await getOrCreateUser(serverUrl, workdirRoot);
    user = result.user;
    isFirstTime = result.isFirstTime;
  }

  // 第二步：加载或创建 state（创建时把 userId 传进去生成新格式 ID）
  const state = loadOrCreateProject(workdirRoot, user ? user.userId : undefined);
  const skillProjectId = state.skillProjectId;
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);

  // 模式一致性检查：避免跨模式 init 导致 state 脏数据
  if (state.mode && state.mode !== mode) {
    throw new Error(`项目模式冲突：当前 state.mode=${state.mode}，本次传入 mode=${mode}。如需切换模式，请删除 workdir 目录后重新 init。`);
  }
  state.mode = mode;

  if (mode === 'creative') {
    state.content = config.content || '';
    state.duration = config.duration || 15;
    state.theme = config.theme || 'white';
    state.bgmStyle = config.bgmStyle || 'corporate';
  } else if (mode === 'dubbing') {
    // dubbing 模式不收集配置字段
    // 配音音频和 SRT 字幕由步骤 1.5（prepare-voice.js）准备
    // 参考文档：docs/01.5-voice-prepare.md
    state.voice = null;  // 由 prepare-voice.js 填充（含 source/audioPath/srtPath/duration/subtitleCount/voiceName）
  }

  // 保存状态
  saveProjectState(workdirRoot, state);

  console.log(`[✓] 项目初始化完成`);
  console.log(`  项目ID: ${skillProjectId}`);
  console.log(`  模式: ${mode}`);
  console.log(`  工作目录: ${workdir}`);
  if (isFirstTime) {
    console.log(`  ⚠️ 已为你创建 CanvasVideo 账号（userId 嵌入到了项目ID里）`);
    console.log(`  userId:    ${user.userId}`);
    console.log(`  userToken: ${user.userToken}`);
    console.log(`  凭证已保存到本地：${path.join(workdirRoot, '.user.json')}`);
  }

  return { skillProjectId, workdir, state, user, isFirstTime };
}

// CLI 模式
if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.mode) {
    console.error('用法: node init-project.js --cwd=<Agent工作目录> <mode> [options]');
    console.error('');
    console.error('--cwd=<绝对路径>   Agent 工作目录的绝对路径（必传，避免 workdir 飘到奇怪地方）');
    console.error('mode: creative | dubbing');
    console.error('');
    console.error('配置方式（二选一）:');
    console.error('  1. 配置文件（推荐）: --config=<filepath>');
    console.error('  2. JSON 字符串: \'{...}\'');
    console.error('');
    console.error('示例:');
    console.error('  node init-project.js --cwd=/path/to/agent/workspace creative --config=project-config.json');
    console.error('  node init-project.js --cwd=/path/to/agent/workspace dubbing --config=dubbing-config.json');
    process.exit(1);
  }
  
  if (!['creative', 'dubbing'].includes(args.mode)) {
    console.error(`[E] 无效的模式: ${args.mode}，必须是 creative 或 dubbing`);
    process.exit(1);
  }

  // initProject 是 async —— 因为新格式 ID 需要先联网注册账号拿到 userId
  (async () => {
    try {
      const config = loadConfig(args);
      const result = await initProject(args.workdirRoot, args.mode, config);

      // 输出结果（供后续步骤使用）
      console.log('');
      console.log('输出:');
      console.log(`  skillProjectId: ${result.skillProjectId}`);
      console.log(`  workdir: ${result.workdir}`);

      process.exit(0);
    } catch (err) {
      console.error('初始化失败:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { initProject };
