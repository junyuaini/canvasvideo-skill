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
 */
function loadOrCreateProject(workdir) {
  const statePath = getStatePath(workdir);
  
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
 */
function saveProjectState(workdir, state) {
  const statePath = getStatePath(workdir);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * 锁定项目模式
 */
function lockMode(workdir, mode) {
  const state = loadOrCreateProject(workdir);
  state.mode = mode;
  saveProjectState(workdir, state);
  return state;
}

/**
 * 标记设计已确认
 */
function markDesignConfirmed(workdir) {
  const state = loadOrCreateProject(workdir);
  state.designConfirmed = true;
  state.designConfirmedAt = new Date().toISOString();
  saveProjectState(workdir, state);
  return state;
}

/**
 * 断言设计已确认（视频生成前必须调用）
 */
function assertDesignConfirmed(workdir) {
  const state = loadOrCreateProject(workdir);
  if (!state.designConfirmed) {
    throw new Error('设计文档尚未确认，请先查看并确认 design.md');
  }
  return state;
}

/**
 * 保存预览信息
 */
function savePreviewInfo(workdir, previewToken, previewUrl) {
  const state = loadOrCreateProject(workdir);
  state.previewToken = previewToken;
  state.previewUrl = previewUrl;
  state.updatedAt = new Date().toISOString();
  saveProjectState(workdir, state);
  return state;
}

/**
 * 获取项目状态
 */
function getProjectState(workdir) {
  return loadOrCreateProject(workdir);
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
