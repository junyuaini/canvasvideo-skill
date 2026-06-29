/**
 * 读写 .canvasvideo/project-state.json
 * 维护 Skill 本地状态：skillProjectId、mode、designConfirmed、previewInfo
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * userId 格式正则：cu-{12位hex}（与 upload-video.js USER_ID_RE 保持一致）
 *   必须有捕获组 ()，否则 m[1] 拿不到 hex 部分
 */
const USER_ID_RE = /^cu-([0-9a-f]{12})$/;

/**
 * 从 userId 提取 6 位短哈希
 *   cu-a1b2c3d4e5f6 → a1b2c3
 *   用途：嵌入 skillProjectId，避免不同用户 ID 互相覆盖
 */
function getUserShort(userId) {
  if (typeof userId !== 'string') return null;
  const m = userId.match(USER_ID_RE);
  if (!m) return null;
  return m[1].slice(0, 6);
}

/**
 * 生成 skillProjectId
 *
 * 新格式：cv_{userShort6}_{timestamp_base36}_{random8_hex}
 *   - userShort6：取 userId 前 6 位 hex（去掉 cu- 前缀），用于区分用户
 *   - timestamp  ：13 位 base36 时间戳（毫秒），可读 + 排序友好
 *   - random8    ：8 位 hex 随机（32 bit），防止同毫秒撞车
 *
 * 示例：cv_a1b2c3_mqtk95pt_0b43fa53
 *
 * 严禁 LLM 自编 skillProjectId —— 旧格式（cv_{ts}_{rand}）已被服务端拒绝。
 *
 * @param {string} userId - cu-{12位hex} 格式的用户 ID
 * @returns {string} skillProjectId
 */
function generateSkillProjectId(userId) {
  const userShort = getUserShort(userId);
  if (!userShort) {
    throw new Error(
      'generateSkillProjectId 必须传入合法的 userId（cu-{12位hex}），' +
      '实际收到：' + JSON.stringify(userId) + '。' +
      '请先调用 upload-video.js 的 getOrCreateUser 获取 userId。'
    );
  }
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `cv_${userShort}_${timestamp}_${random}`;
}

/**
 * 获取状态文件路径
 */
function getStatePath(workdir) {
  return path.join(workdir, '.canvasvideo', 'project-state.json');
}

/**
 * 加载或创建项目状态
 * @param {string} workdirRoot - 工作根目录（即 <Agent工作目录>/canvasvideo-workdir/）
 * @param {string} [userId] - 用户 ID（cu-{12位hex}）。仅在新建 state 时必传，
 *                            已有 state 时不读这个字段（不会变更 skillProjectId）。
 * @returns {Object} { skillProjectId, mode, designConfirmed, userId, ... }
 *
 * 说明：
 *  - workdirRoot 必须是 <Agent工作目录>/canvasvideo-workdir/ 的绝对路径
 *  - 由 CLI 脚本解析 --cwd=<Agent工作目录> 后 path.join(agentWorkdir, 'canvasvideo-workdir') 得到
 *  - 不依赖 process.cwd()，避免不同 Agent/cwd 下 workdir 飘到奇怪位置
 *  - 如果 workdirRoot 下已有 .canvasvideo/project-state.json，直接读取
 *  - 如果没有，**必须**先准备好 userId（由 init-project 调 getOrCreateUser 拿到），
 *    再用 userId 调用 generateSkillProjectId 生成新 ID。
 *  - skillProjectId 格式：cv_{userShort6}_{timestamp36}_{random8}
 *    （由代码生成，严禁 LLM 自编；新格式已被服务端严格校验）
 */
function loadOrCreateProject(workdirRoot, userId) {
  const statePath = getStatePath(workdirRoot);

  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch (e) {
      throw new Error(`加载状态文件失败: ${e.message}`);
    }
  }

  // 创建新 state —— 必须有 userId 才能生成新格式 ID
  if (!userId) {
    throw new Error(
      'loadOrCreateProject 创建新 state 时必须传入 userId。\n' +
      '新格式 skillProjectId 内嵌了用户短哈希（cv_{userShort6}_{timestamp}_{random}），' +
      '没有 userId 无法生成。\n' +
      '请先调用 upload-video.js 的 getOrCreateUser 拿到 userId，再调本函数。'
    );
  }

  // 创建新状态
  const state = {
    skillProjectId: generateSkillProjectId(userId),
    userId: userId,
    mode: 'dubbing', // 固定口播模式
    designConfirmed: false,
    previewToken: null,
    previewUrl: null,
    createdAt: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  return state;
}

/**
 * 保存项目状态
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 */
function saveProjectState(workdirRoot, state) {
  const statePath = getStatePath(workdirRoot);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * 锁定项目模式
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 */
function lockMode(workdirRoot, mode) {
  const state = loadOrCreateProject(workdirRoot);
  state.mode = mode;
  saveProjectState(workdirRoot, state);
  return state;
}

/**
 * 标记设计已确认
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 */
function markDesignConfirmed(workdirRoot) {
  const state = loadOrCreateProject(workdirRoot);
  state.designConfirmed = true;
  state.designConfirmedAt = new Date().toISOString();
  saveProjectState(workdirRoot, state);
  return state;
}

/**
 * 断言设计已确认（视频生成前必须调用）
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 */
function assertDesignConfirmed(workdirRoot) {
  const state = loadOrCreateProject(workdirRoot);
  if (!state.designConfirmed) {
    throw new Error('设计文档尚未确认，请先查看并确认 design.md');
  }
  return state;
}

/**
 * 保存预览信息
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 */
function savePreviewInfo(workdirRoot, previewToken, previewUrl) {
  const state = loadOrCreateProject(workdirRoot);
  state.previewToken = previewToken;
  state.previewUrl = previewUrl;
  state.updatedAt = new Date().toISOString();
  saveProjectState(workdirRoot, state);
  return state;
}

/**
 * 获取项目状态
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 */
function getProjectState(workdirRoot) {
  return loadOrCreateProject(workdirRoot);
}

module.exports = {
  generateSkillProjectId,
  getUserShort,
  loadOrCreateProject,
  saveProjectState,
  lockMode,
  markDesignConfirmed,
  assertDesignConfirmed,
  savePreviewInfo,
  getProjectState
};
