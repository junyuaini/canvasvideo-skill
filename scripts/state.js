/**
 * 读写 .canvasvideo/project-state.json
 * 维护 Skill 本地状态：skillProjectId、mode、designConfirmed、previewInfo、step
 *
 * 状态机（step 流转）：
 *   init → design → design_confirmed → project_json → validated → packaged → uploaded
 *
 * 每个关键函数执行前会检查 step，不满足前置条件则报错阻止执行。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 状态机步骤定义
 */
const STEPS = [
  'init',              // 初始化完成（工作目录、skillProjectId 已创建）
  'design',            // design.md 已生成
  'design_confirmed',  // design.md 已确认（用户确认）
  'project_json',      // project.json 已生成
  'validated',         // 本地自检 + 云端预校验通过
  'packaged',          // zip 已打包
  'uploaded'           // 已上传，获得 previewToken
];

/**
 * 步骤流转关系：当前步骤 → 允许的下一步
 */
const STEP_TRANSITIONS = {
  init: ['design'],
  design: ['design_confirmed'],
  design_confirmed: ['project_json'],
  project_json: ['validated'],
  validated: ['packaged'],
  packaged: ['uploaded'],
  uploaded: [] // 终态
};

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
 * @returns {Object} { skillProjectId, mode, designConfirmed, step, ... }
 *
 * 说明：
 *  - 如果 workdirRoot 下已有 .canvasvideo/project-state.json，直接读取
 *  - 如果没有，生成新的 skillProjectId，并在 workdirRoot 下创建状态文件
 *  - skillProjectId 格式：cv_{timestamp36}_{random8}（由代码生成，严禁 LLM 自编）
 *  - step 默认 'init'，表示初始化完成
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
    step: 'init', // 状态机当前步骤
    createdAt: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  return state;
}

/**
 * 校验步骤流转是否合法
 * @param {string} currentStep - 当前步骤
 * @param {string} targetStep - 目标步骤
 * @returns {boolean}
 */
function isValidTransition(currentStep, targetStep) {
  const allowed = STEP_TRANSITIONS[currentStep] || [];
  return allowed.includes(targetStep);
}

/**
 * 推进到下一步（带校验）
 * @param {string} workdirRoot - 工作根目录
 * @param {string} nextStep - 目标步骤
 * @throws {Error} 如果流转不合法
 */
function advanceStep(workdirRoot, nextStep) {
  const state = loadOrCreateProject(workdirRoot);
  const currentStep = state.step || 'init';

  if (!isValidTransition(currentStep, nextStep)) {
    throw new Error(
      `状态机错误：不能从 "${currentStep}" 直接跳到 "${nextStep}"。\n` +
      `允许的下一步：${(STEP_TRANSITIONS[currentStep] || []).join(', ') || '无（已是终态）'}`
    );
  }

  state.step = nextStep;
  state.updatedAt = new Date().toISOString();
  saveProjectState(workdirRoot, state);
  return state;
}

/**
 * 断言当前步骤（函数执行前调用）
 * @param {string} workdirRoot - 工作根目录
 * @param {string} requiredStep - 要求的步骤
 * @throws {Error} 如果当前步骤不匹配
 */
function assertStep(workdirRoot, requiredStep) {
  const state = loadOrCreateProject(workdirRoot);
  const currentStep = state.step || 'init';

  if (currentStep !== requiredStep) {
    throw new Error(
      `步骤校验失败：当前步骤是 "${currentStep}"，但此函数要求步骤为 "${requiredStep}"。\n` +
      `请先完成前置步骤。`
    );
  }
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
  getProjectState,
  // 状态机相关
  STEPS,
  STEP_TRANSITIONS,
  isValidTransition,
  advanceStep,
  assertStep
};
