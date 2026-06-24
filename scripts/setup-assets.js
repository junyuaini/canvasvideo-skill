/**
 * 素材设置脚本
 *
 * 功能：
 *  - 复制占位素材到工作目录
 *  - 复制 BGM 到工作目录
 *  - 支持同时执行或单独执行
 *
 * 用法：node setup-assets.js <workdir> <skillProjectId> [options]
 *   options:
 *     --theme=<white|black>    主题色（默认 white）
 *     --bgm=<style>            BGM 风格（如 tech-pulse，不传则不复制 BGM）
 *
 * 示例：
 *   node setup-assets.js ./canvasvideo-workdir cv_abc123 --theme=white --bgm=tech-pulse
 *   node setup-assets.js ./canvasvideo-workdir cv_abc123 --theme=black
 *   node setup-assets.js ./canvasvideo-workdir cv_abc123
 */
const { ensurePlaceholders, ensureBgm } = require('./scaffold');

function parseArgs(argv) {
  const args = {
    workdirRoot: argv[2],
    skillProjectId: argv[3],
    theme: 'white',
    bgm: null
  };

  for (let i = 4; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--theme=')) {
      args.theme = arg.slice('--theme='.length);
    } else if (arg.startsWith('--bgm=')) {
      args.bgm = arg.slice('--bgm='.length);
    }
  }

  return args;
}

function setupAssets(workdirRoot, skillProjectId, options = {}) {
  if (!workdirRoot || !skillProjectId) {
    throw new Error('参数错误：workdir 和 skillProjectId 都是必填项');
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

  if (!args.workdirRoot || !args.skillProjectId) {
    console.error('用法: node setup-assets.js <workdir> <skillProjectId> [options]');
    console.error('');
    console.error('选项:');
    console.error('  --theme=<white|black>    主题色（默认 white）');
    console.error('  --bgm=<style>            BGM 风格（如 tech-pulse）');
    console.error('');
    console.error('示例:');
    console.error('  node setup-assets.js ./canvasvideo-workdir cv_abc123 --theme=white --bgm=tech-pulse');
    console.error('  node setup-assets.js ./canvasvideo-workdir cv_abc123 --theme=black');
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
