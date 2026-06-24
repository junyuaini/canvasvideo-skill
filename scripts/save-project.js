/**
 * 保存 project.json 脚本
 *
 * 功能：将修改后的 project.json 保存到工作目录
 *
 * 用法：node save-project.js [skillProjectId]
 *
 * 项目ID来源：从 .canvasvideo/state.json 读取（如果未传入参数）
 *
 * 示例：
 *   node save-project.js cv_abc123
 */
const fs = require('fs');
const path = require('path');
const { getCurrentProjectId } = require('./state');
const { ensureProjectWorkdir } = require('./scaffold');

function saveProject(workdirRoot, skillProjectId) {
  if (!skillProjectId) {
    throw new Error('参数错误：skillProjectId 是必填项');
  }

  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  const projectPath = path.join(workdir, 'project.json');

  if (!fs.existsSync(projectPath)) {
    throw new Error(`project.json 不存在: ${projectPath}`);
  }

  // 读取当前 project.json（验证格式）
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

  // 保存（格式化）
  fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));

  console.log(`[✓] project.json 已保存: ${projectPath}`);
}

// CLI 模式
if (require.main === module) {
  const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');
  const skillProjectId = process.argv[2] || getCurrentProjectId(workdirRoot);

  if (!skillProjectId) {
    console.error('用法: node save-project.js [skillProjectId]');
    console.error('');
    console.error('示例:');
    console.error('  node save-project.js cv_abc123');
    process.exit(1);
  }

  try {
    saveProject(workdirRoot, skillProjectId);
    process.exit(0);
  } catch (err) {
    console.error('保存失败:', err.message);
    process.exit(1);
  }
}

module.exports = { saveProject };
