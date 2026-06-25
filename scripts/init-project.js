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
 * @returns {Object} { skillProjectId, workdir, state }
 */
function initProject(workdirRoot, mode, config = {}) {
  // 创建工作目录
  const state = loadOrCreateProject(workdirRoot);
  const skillProjectId = state.skillProjectId;
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  
  // 设置模式
  state.mode = mode;
  
  // 保存配置
  if (mode === 'creative') {
    state.content = config.content || '';
    state.duration = config.duration || 15;
    state.audience = config.audience || '大众用户';
    state.theme = config.theme || 'white';
    state.aspect = config.aspect || '4:3';
    state.style = config.style || 'warm';
    state.bgm = config.bgm !== false; // 默认 true
    if (state.bgm && config.bgmStyle) {
      state.bgmStyle = config.bgmStyle;
    }
  } else if (mode === 'dubbing') {
    state.audioPath = config.audioPath || '';
    state.subtitlePath = config.subtitlePath || '';
    state.theme = config.theme || 'white';
    state.aspect = config.aspect || '4:3';
  }
  
  // 保存状态
  saveProjectState(workdirRoot, state);
  
  console.log(`[✓] 项目初始化完成`);
  console.log(`  项目ID: ${skillProjectId}`);
  console.log(`  模式: ${mode}`);
  console.log(`  工作目录: ${workdir}`);
  
  return { skillProjectId, workdir, state };
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
  
  try {
    const config = loadConfig(args);
    const result = initProject(args.workdirRoot, args.mode, config);
    
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
}

module.exports = { initProject };
