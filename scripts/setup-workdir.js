/**
 * 项目工作目录设置脚本
 * 
 * 功能：自动创建项目工作目录结构
 * 
 * 用法：node setup-workdir.js <workdir> <skillProjectId>
 * 
 * 示例：
 *   node setup-workdir.js ./canvasvideo-workdir cv_abc123
 */
const { ensureProjectWorkdir } = require('./scaffold');

function setupWorkdir(workdirRoot, skillProjectId) {
  if (!workdirRoot || !skillProjectId) {
    throw new Error('参数错误：workdir 和 skillProjectId 都是必填项');
  }
  
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  
  console.log(`[✓] 工作目录已创建`);
  console.log(`  路径: ${workdir}`);
  console.log(`  子目录: assets/, assets/images/, regions/`);
  
  return workdir;
}

// CLI 模式
if (require.main === module) {
  const workdirRoot = process.argv[2];
  const skillProjectId = process.argv[3];
  
  if (!workdirRoot || !skillProjectId) {
    console.error('用法: node setup-workdir.js <workdir> <skillProjectId>');
    console.error('');
    console.error('示例:');
    console.error('  node setup-workdir.js ./canvasvideo-workdir cv_abc123');
    process.exit(1);
  }
  
  try {
    setupWorkdir(workdirRoot, skillProjectId);
    process.exit(0);
  } catch (err) {
    console.error('创建失败:', err.message);
    process.exit(1);
  }
}

module.exports = { setupWorkdir };
