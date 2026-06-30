/**
 * 打包 project.json 为 zip
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

function package(workdir, outputZip) {
  const projectJsonPath = path.join(workdir, 'project.json');

  if (!fs.existsSync(projectJsonPath)) {
    throw new Error('workdir 中缺少 project.json');
  }

  const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));

  const audioStr = typeof project.audio === 'string' ? project.audio : (project.audio && project.audio.base64);
  if (!audioStr || !audioStr.startsWith('data:')) {
    throw new Error('project.json.audio 不是有效的数据 URI，请先执行步骤 7 素材编码');
  }

  const zip = new AdmZip();
  zip.addLocalFile(projectJsonPath, '');

  const zipDir = path.dirname(outputZip);
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
  }

  zip.writeZip(outputZip);
  console.log(`[✓] 已打包: ${outputZip}`);

  return outputZip;
}

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
    process.exit(1);
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  const finalOutputZip = outputZip || path.join(workdir, `${skillProjectId}.zip`);

  try {
    package(workdir, finalOutputZip);
    process.exit(0);
  } catch (err) {
    console.error('[✗] 打包失败:', err.message);
    process.exit(1);
  }
}

module.exports = { package };