/**
 * 项目初始化脚本
 *
 * 功能：
 *  - 创建工作目录结构
 *  - 初始化项目状态
 *  - 保存用户配置
 *
 * 仅支持口播模式（dubbing）。
 *
 * 用法：node init-project.js [options]
 *
 * 配置方式：
 *   --config=<配置文件路径>
 *
 * 配置文件格式（JSON）：
 *   {
 *     "audioPath":  "./audio.mp3",    // 音频文件路径（相对于 workdir）
 *     "subtitlePath": "./subtitle.srt", // 字幕文件路径（相对于 workdir）
 *     "theme":      "white",          // 主题：white | black
 *     "aspect":     "4:3"             // 画幅：4:3 | 16:9
 *   }
 *
 * 项目隔离：
 *   默认情况下，若 workdirRoot 下已有 .canvasvideo/project-state.json，则沿用老项目；
 *   只有当 state.json 不存在时才会创建新项目 ID。
 *   若要强制重新创建项目（新主题 / 内容完全不同 / 隔离昨天的项目），请加 --new：
 *     node init-project.js --new --config=...
 *
 * 示例：
 *   # 新建项目
 *   node init-project.js --cwd=/path/to/agent --config=dubbing-config.json
 *
 *   # 强制重新建项目（覆盖 state.json）
 *   node init-project.js --cwd=/path/to/agent --new --config=new-topic.json
 */
const fs = require('fs');
const path = require('path');
const { ensureProjectWorkdir, resolveAgentWorkdir } = require('./scaffold');
const { loadOrCreateProject, saveProjectState } = require('./state');
const { getOrCreateUser, DEFAULT_SERVER_URL } = require('./upload-video');

/**
 * 解析命令行参数
 * @param {string[]} argv - process.argv
 * @returns {Object} { workdirRoot, mode, configFile, configJson, forceNew }
 */
function parseArgs(argv) {
  // --cwd 必传，从 argv 里解析出 Agent 工作目录，再拼 canvasvideo-workdir
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');

  const args = {
    workdirRoot,
    mode: 'dubbing',
    configFile: null,
    forceNew: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--cwd=')) continue;
    if (arg === '--new') {
      args.forceNew = true;
    } else if (arg.startsWith('--config=')) {
      args.configFile = arg.slice('--config='.length);
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
  if (!args.configFile) {
    throw new Error('缺少配置：需要 --config=<配置文件路径>');
  }
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

/**
 * 初始化项目（口播模式）
 * @param {string} workdirRoot - 工作根目录
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
async function initProject(workdirRoot, config = {}, options = {}) {
  const serverUrl = options.serverUrl || DEFAULT_SERVER_URL;
  const forceNew = options.forceNew === true;
  const mode = 'dubbing';

  // 第一步：决定新建 / 沿用，并打决策日志
  //   - state.json 不存在  → 新建（🆕）
  //   - state.json 存在    → 沿用（📌）
  //   - state.json 存在 + --new → 删除老的再新建（🔄）
  const statePath = path.join(workdirRoot, '.canvasvideo', 'project-state.json');
  const hasState = fs.existsSync(statePath);

  if (forceNew && hasState) {
    // 强制重建：备份老 ID 给日志看一眼，然后删 state.json
    let oldId = null;
    try { oldId = JSON.parse(fs.readFileSync(statePath, 'utf-8')).skillProjectId || null; } catch { /* ignore */ }
    fs.unlinkSync(statePath);
    console.log(`🔄 --new 标志 → 删除老 state.json，强制重建项目`);
    if (oldId) console.log(`   老项目: ${oldId}（已弃用）`);
  }

  const isNewProject = !fs.existsSync(statePath);

  if (!isNewProject) {
    // 沿用：先把老项目 ID 拿出来给日志看一眼
    let existingId = null;
    try { existingId = JSON.parse(fs.readFileSync(statePath, 'utf-8')).skillProjectId || null; } catch { /* ignore */ }
    console.log(`📌 state.json 已存在 → 沿用现有项目 ${existingId || '(无法读取ID)'}`);
    console.log(`   如需创建新项目（例如换了主题），请加 --new 标志`);
  } else {
    console.log(`🆕 state.json 不存在 → 创建新项目`);
  }

  // 第二步：确保用户已注册并拿到 userId（这是新格式 skillProjectId 的前置条件）
  // 仅在 state 不存在时才需要调；已有 state 直接跳过
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

  // 写入模式（口播）
  state.mode = mode;

  // 从 config 提取 theme / aspect（供后续步骤使用）
  if (config && typeof config === 'object') {
    if (config.theme) state.theme = config.theme;
    if (config.aspect) state.aspect = config.aspect;
  }

  // 口播模式：配音音频和 SRT 字幕由步骤 2（prepare-voice.js）准备
  // 参考文档：docs/02-voice-prepare.md
  state.voice = null;  // 由 prepare-voice.js 填充（含 source/audioPath/srtPath/duration/subtitleCount/voiceName）

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

  // initProject 是 async —— 因为新格式 ID 需要先联网注册账号拿到 userId
  (async () => {
    try {
      const config = loadConfig(args);
      const result = await initProject(args.workdirRoot, config, { forceNew: args.forceNew });

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
