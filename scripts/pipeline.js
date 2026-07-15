/**
 * CanvasVideo Skill — 发布流水线（pipeline）
 *
 * 将原 6-9 步串行为一个自动化入口：
 *   6 合并 + 自检   → merge-regions.js + validate.js
 *   7 素材编码     → setup-assets.js
 *   8 打包         → package.js
 *   9 上传         → upload-video.js
 *
 * 设计原则：
 *   - 不修改 4 个原脚本的逻辑，只在外部"按序串接"
 *   - 任一阶段失败立即终止 + 提示回到对应文档
 *   - 支持 --from=<merge|validate|assets|package|upload> 跳过前置阶段
 *   - 支持 --server=<url> 覆盖默认上传地址
 *
 * 用法：
 *   node pipeline.js --cwd=<Agent工作目录> <skillProjectId> [--from=<阶段>] [--server=<url>]
 *
 * 示例：
 *   node pipeline.js --cwd=/path/to/agent/workspace cv_abc123
 *   node pipeline.js --cwd=/path/to/agent/workspace cv_abc123 --from=assets
 *   node pipeline.js --cwd=/path/to/agent/workspace cv_abc123 --server=https://staging.dajiulanren.top
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { resolveAgentWorkdir } = require('./scaffold');

const STAGES = [
  { key: 'merge',    label: '6 合并 + 自检', scripts: ['merge-regions.js', 'validate.js'] },
  { key: 'assets',   label: '7 素材编码',    scripts: ['setup-assets.js'] },
  { key: 'package',  label: '8 打包',         scripts: ['package.js'] },
  { key: 'upload',   label: '9 上传',         scripts: ['upload-video.js'] }
];

const STAGE_DOC = {
  merge: 'docs/06-publish.md#合并--自检',
  validate: 'docs/06-publish.md#合并--自检',
  assets: 'docs/06-publish.md#素材编码',
  package: 'docs/06-publish.md#打包',
  upload: 'docs/06-publish.md#上传'
};

function parseArgs(argv) {
  const result = {
    agentWorkdir: null,
    skillProjectId: null,
    from: null,
    server: null
  };

  for (const arg of argv) {
    if (arg.startsWith('--cwd=')) {
      result.agentWorkdir = arg.slice('--cwd='.length);
    } else if (arg.startsWith('--from=')) {
      result.from = arg.slice('--from='.length);
    } else if (arg.startsWith('--server=')) {
      result.server = arg.slice('--server='.length);
    } else if (!arg.startsWith('--')) {
      if (!result.skillProjectId) result.skillProjectId = arg;
    }
  }

  if (!result.agentWorkdir) {
    result.agentWorkdir = resolveAgentWorkdir(argv);
  }

  return result;
}

function runStage(stage, ctx) {
  console.log('');
  console.log('━'.repeat(60));
  console.log(`▶ ${stage.label}`);
  console.log('━'.repeat(60));

  for (const scriptName of stage.scripts) {
    const scriptPath = path.join(__dirname, scriptName);
    const args = [scriptPath, `--cwd=${ctx.agentWorkdir}`, ctx.skillProjectId];

    if (scriptName === 'upload-video.js') {
      const zipPath = path.join(ctx.workdir, `${ctx.skillProjectId}.zip`);
      if (ctx.server) args.push(ctx.server);
      args.push(zipPath);
    } else if (scriptName === 'package.js') {
      args.push(path.join(ctx.workdir, `${ctx.skillProjectId}.zip`));
    }

    const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (r.status !== 0) {
      const failKey = stage.key;
      throw new Error(
        `[✗] ${stage.label} 失败于 ${scriptName}\n` +
        `  排查指引：${STAGE_DOC[failKey] || 'docs/06-publish.md'}\n` +
        `  修复后可重跑：node pipeline.js --cwd=${ctx.agentWorkdir} ${ctx.skillProjectId} --from=${failKey}`
      );
    }
  }

  console.log(`[✓] ${stage.label} 完成`);
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (!args.skillProjectId) {
    console.error('用法: node pipeline.js --cwd=<Agent工作目录> <skillProjectId> [--from=<merge|assets|package|upload>] [--server=<url>]');
    process.exit(1);
  }

  const workdirRoot = path.join(args.agentWorkdir, 'canvasvideo-workdir');
  const workdir = path.join(workdirRoot, args.skillProjectId);

  if (!fs.existsSync(workdir)) {
    console.error(`项目目录不存在: ${workdir}`);
    process.exit(1);
  }

  let fromIndex = 0;
  if (args.from) {
    fromIndex = STAGES.findIndex(s => s.key === args.from);
    if (fromIndex === -1) {
      console.error(`--from 取值必须是: ${STAGES.map(s => s.key).join(' | ')}`);
      process.exit(1);
    }
  }

  const ctx = {
    agentWorkdir: args.agentWorkdir,
    skillProjectId: args.skillProjectId,
    workdir,
    server: args.server
  };

  console.log(`[pipeline] 项目: ${args.skillProjectId}`);
  console.log(`[pipeline] 工作目录: ${workdir}`);
  if (args.from) console.log(`[pipeline] 跳过前置阶段，从 ${args.from} 开始`);

  try {
    for (let i = fromIndex; i < STAGES.length; i++) {
      runStage(STAGES[i], ctx);
    }
    console.log('');
    console.log('━'.repeat(60));
    console.log('✓ pipeline 全部完成');
    console.log('━'.repeat(60));
  } catch (e) {
    console.error('');
    console.error(e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { STAGES };
