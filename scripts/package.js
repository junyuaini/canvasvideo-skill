/**
 * 打包 project.json 与 assets 为 zip
 * 用法：node package.js <workdir路径> <输出zip路径>
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

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
          const imgPath = path.join(workdir, comp.content.image.replace(/^\.\//, ''));
          if (!fs.existsSync(imgPath)) {
            missing.push(`component[${idx}] image: ${comp.content.image}`);
          }
        }
        if (comp.content && comp.content.icon) {
          const iconPath = path.join(workdir, comp.content.icon.replace(/^\.\//, ''));
          if (!fs.existsSync(iconPath)) {
            missing.push(`component[${idx}] icon: ${comp.content.icon}`);
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
  const workdir = process.argv[2];
  const outputZip = process.argv[3] || path.join(workdir, 'output.zip');
  
  if (!workdir) {
    console.error('用法: node package.js <workdir路径> [输出zip路径]');
    process.exit(1);
  }
  
  try {
    package(workdir, outputZip);
    process.exit(0);
  } catch (err) {
    console.error('打包失败:', err.message);
    process.exit(1);
  }
}

module.exports = { package, checkMissingAssets };
