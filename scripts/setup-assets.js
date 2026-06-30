/**
 * 素材编码脚本
 *
 * 功能：将音频和图片转为 Base64，内联到 project.json
 *
 * 用法：node setup-assets.js --cwd=<Agent工作目录> <skillProjectId>
 */
const fs = require('fs');
const path = require('path');
const { resolveAgentWorkdir } = require('./scaffold');

const MIME_MAP = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function getMimeType(ext) {
  return MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

function fileToBase64(filePath) {
  const ext = path.extname(filePath);
  const mime = getMimeType(ext);
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

function parseArgs(argv) {
  const userArgs = argv.slice(2);
  const workdirRoot = path.join(resolveAgentWorkdir(userArgs), 'canvasvideo-workdir');

  const args = {
    workdirRoot,
    skillProjectId: null
  };

  for (let i = 0; i < userArgs.length; i++) {
    const arg = userArgs[i];
    if (arg.startsWith('--cwd=')) continue;
    if (!args.skillProjectId && !arg.startsWith('--')) {
      args.skillProjectId = arg;
    }
  }

  return args;
}

function encodeAssets(workdirRoot, skillProjectId) {
  if (!skillProjectId) {
    throw new Error('参数错误：skillProjectId 是必填项');
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  const statePath = path.join(workdirRoot, '.canvasvideo', 'project-state.json');
  const projectPath = path.join(workdir, 'project.json');

  if (!fs.existsSync(statePath)) {
    throw new Error('project-state.json 不存在，请先执行步骤 1');
  }

  if (!fs.existsSync(projectPath)) {
    throw new Error('project.json 不存在，请先执行步骤 6');
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const voice = state.voice;
  if (!voice) {
    throw new Error('state.voice 不存在，请先执行步骤 2');
  }

  let projectStr = fs.readFileSync(projectPath, 'utf-8');

  const audioPath = path.resolve(workdir, voice.audioPath);
  if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) {
    throw new Error(`音频文件不存在或为空: ${audioPath}`);
  }

  const audioBase64 = fileToBase64(audioPath);

  // 音频 base64：直接替换 audio 字段为数据 URI
  projectStr = projectStr.replace(/"audio"\s*:\s*"[^"]*"/, `"audio": "${audioBase64}"`);
  projectStr = projectStr.replace(/"audio"\s*:\s*\{[^}]*\}/, `"audio": "${audioBase64}"`);

  // 图片 base64：替换 <img src="./..." 为 data URI
  const imgSrcRegex = /<img([^>]+)src="(\.\/[^"]+)"/g;
  let imgMatch;
  while ((imgMatch = imgSrcRegex.exec(projectStr)) !== null) {
    const imgSrc = imgMatch[2];
    if (imgSrc.startsWith('data:') || imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
      continue;
    }
    const imgFullPath = path.resolve(workdir, imgSrc.replace(/^\.\//, ''));
    if (!fs.existsSync(imgFullPath)) {
      throw new Error(`图片文件不存在: ${imgFullPath}`);
    }
    const imgBase64 = fileToBase64(imgFullPath);
    projectStr = projectStr.replace(
      `<img${imgMatch[1]}src="${imgSrc}"`,
      `<img${imgMatch[1]}src="${imgBase64}"`
    );
  }

  fs.writeFileSync(projectPath, projectStr, 'utf-8');

  console.log(`[✓] 音频 Base64 已写入 project.json.audio (${(audioBase64.length / 1024).toFixed(1)} KB)`);
  console.log(`[✓] 素材编码完成`);
}

// CLI 模式
if (require.main === module) {
  const args = parseArgs(process.argv);

  if (!args.skillProjectId) {
    console.error('用法: node setup-assets.js --cwd=<Agent工作目录> <skillProjectId>');
    process.exit(1);
  }

  try {
    encodeAssets(args.workdirRoot, args.skillProjectId);
    process.exit(0);
  } catch (err) {
    console.error('[✗] 素材编码失败:', err.message);
    process.exit(1);
  }
}

module.exports = { encodeAssets };