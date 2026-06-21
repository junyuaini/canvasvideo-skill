/**
 * 读写 .canvasvideo/project-state.json
 * 维护 Skill 本地状态：skillProjectId、mode、designConfirmed、previewInfo
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 生成 skillProjectId
 * 格式：cv_{timestamp}_{random8}
 */
function generateSkillProjectId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `cv_${timestamp}_${random}`;
}

/**
 * 获取状态文件路径
 */
function getStatePath(workdir) {
  return path.join(workdir, '.canvasvideo', 'project-state.json');
}

/**
 * 加载或创建项目状态
 * @param {string} workdirRoot - 工作根目录（canvasvideo-workdir/）
 * @returns {Object} { skillProjectId, mode, designConfirmed, ... }
 *
 * 说明：
 *  - 如果 workdirRoot 下已有 .canvasvideo/project-state.json，直接读取
 *  - 如果没有，生成新的 skillProjectId，并在 workdirRoot 下创建状态文件
 *  - skillProjectId 格式：cv_{timestamp36}_{random8}（由代码生成，严禁 LLM 自编）
 */
function loadOrCreateProject(workdirRoot) {
  const statePath = getStatePath(workdirRoot);

  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }

  // 创建新状态
  const state = {
    skillProjectId: generateSkillProjectId(),
    mode: 'creation', // 'creation' | 'narration'
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
  loadOrCreateProject,
  saveProjectState,
  lockMode,
  markDesignConfirmed,
  assertDesignConfirmed,
  savePreviewInfo,
  getProjectState
};
