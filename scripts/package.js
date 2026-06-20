/**
 * 打包 project.json 与 assets 为 zip
 * 用法：node package.js <workdir路径> <输出zip路径>
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * 打包工作目录为 zip
 * @param {string} workdir - 工作目录路径
 * @param {string} outputZip - 输出 zip 路径
 * @returns {string} zip 路径
 */
function package(workdir, outputZip) {
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

module.exports = { package };
