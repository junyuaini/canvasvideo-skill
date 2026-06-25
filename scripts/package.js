/**
 * 打包 project.json 与 assets 为 zip
 * 用法：node package.js --cwd=<Agent工作目录> <skillProjectId> [输出zip路径]
 *
 * 示例：
 *   node package.js --cwd=/path/to/agent/workspace cv_abc123
 *   node package.js --cwd=/path/to/agent/workspace cv_abc123 ./output/video.zip
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { resolveAgentWorkdir } = require('./scaffold');

/**
 * 检查 project.json 中引用的资源文件是否存在
 * @param {string} workdir - 工作目录路径
 * @returns {string[]} 缺失文件列表
 */
function checkMissingAssets(workdir) {
  const missing = [];
  const projectJsonPath = path.join(workdir, 'project.json');
  
  if (!fs.existsSync(projectJsonPath)) {
    return missing;
  }
  
  try {
    const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
    
    // 检查 audio.path
    if (project.audio && project.audio.path) {
      const audioPath = path.join(workdir, project.audio.path.replace(/^\.\//, ''));
      if (!fs.existsSync(audioPath)) {
        missing.push(`audio: ${project.audio.path} (文件不存在)`);
      }
    }
    
    // 检查 components 中的图片/资源路径
    if (Array.isArray(project.components)) {
      project.components.forEach((comp, idx) => {
        if (comp.content && comp.content.image) {
          const imgPath = comp.content.image;
          // 跳过外部 URL（如 Picsum）
          if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
            return;
          }
          const localPath = path.join(workdir, imgPath.replace(/^\.\//, ''));
          if (!fs.existsSync(localPath)) {
            missing.push(`component[${idx}] image: ${imgPath}`);
          }
        }
        if (comp.content && comp.content.icon) {
          const iconPath = comp.content.icon;
          // 跳过外部 URL
          if (iconPath.startsWith('http://') || iconPath.startsWith('https://')) {
            return;
          }
          const localPath = path.join(workdir, iconPath.replace(/^\.\//, ''));
          if (!fs.existsSync(localPath)) {
            missing.push(`component[${idx}] icon: ${iconPath}`);
          }
        }
      });
    }
  } catch (e) {
    // project.json 解析失败，跳过资源检查
  }
  
  return missing;
}

/**
 * 打包工作目录为 zip
 * @param {string} workdir - 工作目录路径
 * @param {string} outputZip - 输出 zip 路径
 * @returns {string} zip 路径
 */
function package(workdir, outputZip) {
  // 先检查资源文件是否存在
  const missing = checkMissingAssets(workdir);
  if (missing.length > 0) {
    throw new Error(
      `打包失败：以下引用的资源文件不存在，请先确保文件已复制到 workdir：\n` +
      missing.map(m => `  - ${m}`).join('\n')
    );
  }
  
  const zip = new AdmZip();
  
  // 添加 project.json
  const projectJsonPath = path.join(workdir, 'project.json');
  if (!fs.existsSync(projectJsonPath)) {
    throw new Error('workdir 中缺少 project.json');
  }
  zip.addLocalFile(projectJsonPath, '');
  
  // 添加 assets 目录
  const assetsDir = path.join(workdir, 'assets');
  if (fs.existsSync(assetsDir)) {
    zip.addLocalFolder(assetsDir, 'assets');
  }
  
  // 写入 zip
  const zipDir = path.dirname(outputZip);
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
  }
  
  zip.writeZip(outputZip);
  console.log(`已打包: ${outputZip}`);
  
  return outputZip;
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');
  let skillProjectId = null;
  let outputZip = null;
  for (const arg of argv) {
    if (arg.startsWith('--cwd=')) continue;
    if (!arg.startsWith('--')) {
      if (!skillProjectId) skillProjectId = arg;
      else if (!outputZip) outputZip = arg;
    }
  }

  if (!skillProjectId) {
    console.error('用法: node package.js --cwd=<Agent工作目录> <skillProjectId> [输出zip路径]');
    console.error('');
    console.error('必传: --cwd=<Agent工作目录的绝对路径>');
    console.error('');
    console.error('示例:');
    console.error('  node package.js --cwd=/path/to/agent/workspace cv_abc123');
    console.error('  node package.js --cwd=/path/to/agent/workspace cv_abc123 ./output/video.zip');
    process.exit(1);
  }
  
  const workdir = path.join(workdirRoot, skillProjectId);
  const finalOutputZip = outputZip || path.join(workdir, `${skillProjectId}.zip`);
  
  try {
    package(workdir, finalOutputZip);
    process.exit(0);
  } catch (err) {
    console.error('打包失败:', err.message);
    process.exit(1);
  }
}

module.exports = { package, checkMissingAssets };
