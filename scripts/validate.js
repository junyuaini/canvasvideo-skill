/**
 * 本地自检（B 方案 v2.0）
 *
 * 历史变更：
 *   v1.x —— 三层校验：schema 结构 + 业务规则 + selfcheck 节奏/布局
 *   v2.0 —— 单层自检：只跑 selfcheck（节奏 4 门槛 + 布局 Y 坐标）
 *
 * 为什么砍掉前两层：
 *   - schema 结构 + customStyle 字段 + audio/subtitles 共生 = 全部交给云端 /api/projects/validate（权威）
 *   - 本地保留 schema 副本会形成"前端/本地 Skill/服务端"三份同步负担
 *   - 节奏 4 门槛 / 布局 Y 坐标是云端不懂的"设计规则"，必须留在 Skill 端
 *
 * 因此本脚本不再叫"校验器"，更准确地说是"本地自检（selfcheck wrapper）"——
 *   - 通过 = 进入打 zip 步骤
 *   - 失败 = 改 project.json 重跑
 *
 * 真正阻止上传的硬错（schema/customStyle 字段缺失）由 upload-video.js 的云端 precheck 兜底。
 *
 * 用法：node validate.js --cwd=<Agent工作目录> <skillProjectId>
 *
 * 示例：
 *   node validate.js --cwd=/path/to/agent/workspace cv_abc123
 *
 * 工作目录：{Agent工作目录}/canvasvideo-workdir/{skillProjectId}/
 */
const fs = require('fs');
const path = require('path');
const { selfcheck } = require('./selfcheck');
const { resolveAgentWorkdir } = require('./scaffold');

/**
 * 验证项目的设计文档来源
 * @param {Object} project - project.json 解析后的对象
 * @param {string} workdir - 工作目录路径
 */
function validateDesignDocSources(project, workdir) {
  const errors = [];
  
  // 1. 验证骨架设计文档来源
  if (!project.source_design_doc || project.source_design_doc.trim() === '') {
    errors.push('[E] project.json 缺少骨架 source_design_doc 字段，无法追溯骨架设计文档来源');
  } else {
    // 检查骨架设计文档文件是否存在
    const skeletonDesignDocPath = path.join(workdir, project.source_design_doc);
    if (!fs.existsSync(skeletonDesignDocPath)) {
      errors.push(`[E] 骨架设计文档不存在: ${project.source_design_doc}，请确认步骤2已完成`);
    } else {
      console.log(`[✓] 骨架设计文档来源验证通过: ${project.source_design_doc}`);
    }
  }
  
  // 检查 regions 数组存在
  if (!project.regions || project.regions.length === 0) {
    errors.push('[E] project.json 缺少 regions 数组');
  }
  
  return errors;
}

/**
 * 本地自检 project.json
 * @param {Object|string} projectOrPath - 解析后的对象或文件路径
 * @param {string} workdir - 工作目录路径（用于验证设计文档来源）
 * @returns {{ valid: boolean, errors: string[], warnings: string[], mode: string }}
 */
function validate(projectOrPath, workdir) {
  let project;
  let projectFilePath;
  
  if (typeof projectOrPath === 'string') {
    try {
      projectFilePath = projectOrPath;
      project = JSON.parse(fs.readFileSync(projectOrPath, 'utf-8'));
    } catch (e) {
      throw new Error(`JSON.parse 失败: ${e.message}`);
    }
  } else {
    project = projectOrPath;
  }
  
  // 如果没有提供 workdir，尝试从 project.json 路径推断
  let workdirPath = workdir;
  if (!workdirPath && projectFilePath) {
    workdirPath = path.dirname(projectFilePath);
  }
  
  // 运行 selfcheck（节奏 4 门槛 + 布局 Y 坐标）
  const sc = selfcheck(project);
  
  // 验证设计文档来源
  let designDocErrors = [];
  if (workdirPath) {
    designDocErrors = validateDesignDocSources(project, workdirPath);
  } else {
    designDocErrors.push('[W] 未提供工作目录路径，无法验证设计文档来源');
  }
  
  const result = {
    valid: sc.errors.length === 0 && designDocErrors.filter(e => e.startsWith('[E]')).length === 0,
    errors: [...sc.errors, ...designDocErrors.filter(e => e.startsWith('[E]'))],
    warnings: [...sc.warnings, ...designDocErrors.filter(e => e.startsWith('[W]'))],
    mode: sc.mode,
  };

  return result;
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');
  let skillProjectId = null;
  for (const arg of argv) {
    if (arg.startsWith('--cwd=')) continue;
    if (!arg.startsWith('--')) {
      skillProjectId = arg;
      break;
    }
  }

  if (!skillProjectId) {
    console.error('用法: node validate.js --cwd=<Agent工作目录> <skillProjectId>');
    console.error('');
    console.error('必传: --cwd=<Agent工作目录的绝对路径>');
    console.error('');
    console.error('示例:');
    console.error('  node validate.js --cwd=/path/to/agent/workspace cv_abc123');
    process.exit(1);
  }
  
  const workdir = path.join(workdirRoot, skillProjectId);
  const projectPath = path.join(workdir, 'project.json');
  
  if (!fs.existsSync(projectPath)) {
    console.error(`错误: project.json 不存在: ${projectPath}`);
    process.exit(1);
  }

  try {
    const result = validate(projectPath, workdir);
    if (result.mode) {
      console.log(`模式: ${result.mode}`);
    }
    if (result.warnings && result.warnings.length) {
      console.log('Warnings:');
      result.warnings.forEach(w => console.log('  - ' + w));
    }
    if (result.valid) {
      console.log('✓ 本地自检通过（节奏/布局规则 + 设计文档来源）');
      console.log('  注意：schema 结构 + customStyle 字段级 校验由云端 /api/projects/validate 在上传前自动完成');
      process.exit(0);
    } else {
      console.error('✗ 本地自检未通过:');
      result.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
  } catch (err) {
    console.error('自检异常:', err.message);
    process.exit(1);
  }
}

module.exports = { validate };
