/**
 * 素材设置脚本
 *
 * 功能：
 *  - 复制占位素材到工作目录
 *  - 复制 BGM 到工作目录
 *  - 支持同时执行或单独执行
 *
 * 用法：node setup-assets.js <skillProjectId> [options]
 *   options:
 *     --theme=<white|black>    主题色（默认 white）
 *     --bgm=<style>            BGM 风格（如 tech-pulse，不传则不复制 BGM）
 *
 * 示例：
 *   node setup-assets.js cv_abc123 --theme=white --bgm=tech-pulse
 *   node setup-assets.js cv_abc123 --theme=black
 *   node setup-assets.js cv_abc123
 */
const path = require('path');
const { ensurePlaceholders, ensureBgm, resolveAgentWorkdir } = require('./scaffold');

function parseArgs(argv) {
  // workdir 在 parseArgs 头部已通过 resolveAgentWorkdir 解析
  // 严禁再走 process.cwd()，避免 workdir 飘到脚本运行时目录
  const workdirRoot = path.join(resolveAgentWorkdir(argv), 'canvasvideo-workdir');

  const args = {
    workdirRoot,  // 已在 parseArgs 头部通过 resolveAgentWorkdir 解析
    skillProjectId: null,
    theme: 'white',
    bgm: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--cwd=')) continue;
    if (arg.startsWith('--theme=')) {
      args.theme = arg.slice('--theme='.length);
    } else if (arg.startsWith('--bgm=')) {
      args.bgm = arg.slice('--bgm='.length);
    } else if (!args.skillProjectId && !arg.startsWith('--')) {
      args.skillProjectId = arg;
    }
  }

  return args;
}

function setupAssets(workdirRoot, skillProjectId, options = {}) {
  if (!skillProjectId) {
    throw new Error('参数错误：skillProjectId 是必填项');
  }

  const theme = options.theme || 'white';
  const bgmStyle = options.bgm || null;

  // 1. 复制占位素材
  const placeholders = ensurePlaceholders(workdirRoot, skillProjectId, theme);
  console.log(`[✓] 占位素材已复制 (${placeholders.copied.length} 个)`);

  // 2. 复制 BGM（如果指定了风格）
  if (bgmStyle) {
    const bgm = ensureBgm(workdirRoot, skillProjectId, bgmStyle);
    if (bgm.hasBgm) {
      console.log(`[✓] BGM 已复制: ${bgmStyle}`);
    } else {
      console.warn(`[W] BGM 复制失败: templates/bgm/ 下没有 ${bgmStyle} 对应的音频文件`);
    }
  }

  console.log(`[✓] 素材设置完成`);
}

// CLI 模式
if (require.main === module) {
  const args = parseArgs(process.argv);

  if (!args.skillProjectId) {
    console.error('用法: node setup-assets.js --cwd=<Agent工作目录> <skillProjectId> [options]');
    console.error('');
    console.error('必传: --cwd=<Agent工作目录的绝对路径>');
    console.error('选项:');
    console.error('  --theme=<white|black>    主题色（默认 white）');
    console.error('  --bgm=<style>            BGM 风格（如 tech-pulse）');
    console.error('');
    console.error('示例:');
    console.error('  node setup-assets.js --cwd=/path/to/agent/workspace cv_abc123 --theme=white --bgm=tech-pulse');
    console.error('  node setup-assets.js --cwd=/path/to/agent/workspace cv_abc123 --theme=black');
    process.exit(1);
  }

  try {
    setupAssets(args.workdirRoot, args.skillProjectId, {
      theme: args.theme,
      bgm: args.bgm
    });
    process.exit(0);
  } catch (err) {
    console.error('素材设置失败:', err.message);
    process.exit(1);
  }
}

module.exports = { setupAssets };
