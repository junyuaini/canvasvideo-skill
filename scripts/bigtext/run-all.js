/**
 * 大字幕模式 一键入口（口播视频自动出片）
 *
 * 串起 3 个阶段：
 *   1. 步骤4：scripts/generate-skeleton.js  ←  生成 skeleton.json + regions/ 模板
 *   2. 自动填充：scripts/bigtext/generate_all.cjs  ←  蒙版 + 大字 + 描边 + 背景
 *   3. 步骤6：scripts/pipeline.js --from=merge  ←  合并 + 自检 + 打包 + 上传
 *
 * 跑完即结束，无需 AI 写 region JSON（步骤 5 被跳过）。
 *
 * 用法：
 *   node scripts/bigtext/run-all.js --cwd=<Agent工作目录> <skillProjectId> [选项]
 *
 * 示例：
 *   node scripts/bigtext/run-all.js --cwd="D:\\TRAE SOLO\\视频制作" cv_11d114_xxx \
 *     --mask-color="rgba(8,12,28,0.92)" \
 *     --color-red="#00e5ff" \
 *     --color-gold="#7c4dff" \
 *     --color-cream="#e1f5fe"
 *
 * 常用选项（透传给 generate_all.cjs）：
 *   --mask-color    蒙版色（同时作为字描边色）默认 rgba(26,18,8,1)
 *   --color-red     短词字色（1-2 字）       默认 #e85540
 *   --color-gold    中等字色（3-6 字）       默认 #e8c060
 *   --color-cream   长句字色（>6 字）        默认 #f8f1e0
 *   --font          字体栈                  默认 'Noto Serif SC', 'Songti SC', 'SimSun', serif
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const argv = process.argv.slice(2);

// 解析 --cwd=<path> 和 <skillProjectId>（与 generate-skeleton.js / pipeline.js 兼容）
let agentCwd = null;
let skillProjectId = null;
const passthroughArgs = [];

for (const arg of argv) {
  if (arg.startsWith('--cwd=')) {
    agentCwd = arg.slice('--cwd='.length);
  } else if (skillProjectId === null && !arg.startsWith('--')) {
    skillProjectId = arg;
  } else {
    passthroughArgs.push(arg);
  }
}

if (!agentCwd) {
  if (process.env.AGENT_WORKDIR) {
    agentCwd = process.env.AGENT_WORKDIR;
  } else {
    agentCwd = process.cwd();
  }
}
agentCwd = path.resolve(agentCwd);

if (!skillProjectId) {
  console.error('用法: node scripts/bigtext/run-all.js --cwd=<Agent工作目录> <skillProjectId> [选项]');
  console.error('');
  console.error('示例:');
  console.error('  node scripts/bigtext/run-all.js --cwd="D:\\\\TRAE SOLO\\\\视频制作" cv_xxx \\');
  console.error('    --mask-color="rgba(8,12,28,0.92)" \\');
  console.error('    --color-red="#00e5ff" --color-gold="#7c4dff" --color-cream="#e1f5fe"');
  process.exit(1);
}

// workdir 根目录 = <agentCwd>/canvasvideo-workdir
const workdirRoot = path.join(agentCwd, 'canvasvideo-workdir');
const projectWorkdir = path.join(workdirRoot, skillProjectId);

if (!fs.existsSync(projectWorkdir)) {
  console.error(`✗ 项目目录不存在: ${projectWorkdir}`);
  console.error('  请先跑步骤 1: node scripts/init-project.js --cwd=<dir>');
  process.exit(1);
}

// 路径：本脚本位于 scripts/bigtext/，兄弟脚本在 scripts/ 同级
const here = __dirname;
const skillRoot = path.dirname(here);   // scripts/
const generateSkeleton = path.join(skillRoot, 'generate-skeleton.js');
const pipeline = path.join(skillRoot, 'pipeline.js');
const bigtextGenerateAll = path.join(here, 'generate_all.cjs');

// 检查依赖
for (const f of [generateSkeleton, pipeline, bigtextGenerateAll]) {
  if (!fs.existsSync(f)) {
    console.error(`✗ 缺少依赖脚本: ${f}`);
    process.exit(1);
  }
}

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║        大字幕模式 · 一键出片                            ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log(`项目: ${skillProjectId}`);
console.log(`目录: ${projectWorkdir}`);
console.log('');

// === 阶段 1/3: 跑 generate-skeleton.js（步骤 4）===
console.log('▶ 1/3 生成骨架和区域 JSON ...');
const r1 = spawnSync(process.execPath, [
  generateSkeleton,
  `--cwd=${agentCwd}`,
  skillProjectId,
], { stdio: 'inherit', cwd: skillRoot });
if (r1.status !== 0) {
  console.error(`\n✗ 阶段 1 失败（exit ${r1.status}）。请检查 design-skeleton-dubbing.md 是否正确生成。`);
  process.exit(r1.status || 1);
}
console.log('✓ 阶段 1 完成\n');

// === 阶段 2/3: 跑 bigtext generate_all.cjs（自动填充 region）===
console.log('▶ 2/3 自动填充大字幕（蒙版 + 大字 + 描边 + 背景）...');
const r2 = spawnSync(process.execPath, [
  bigtextGenerateAll,
  projectWorkdir,  // 传绝对路径
  ...passthroughArgs,
], { stdio: 'inherit', cwd: here });
if (r2.status !== 0) {
  console.error(`\n✗ 阶段 2 失败（exit ${r2.status}）。`);
  process.exit(r2.status || 1);
}
console.log('✓ 阶段 2 完成\n');

// === 阶段 3/3: 跑 pipeline --from=merge（步骤 6 一键发布）===
console.log('▶ 3/3 合并 + 自检 + 打包 + 上传 ...');
const r3 = spawnSync(process.execPath, [
  pipeline,
  `--cwd=${agentCwd}`,
  skillProjectId,
  '--from=merge',
], { stdio: 'inherit', cwd: skillRoot });
if (r3.status !== 0) {
  console.error(`\n✗ 阶段 3 失败（exit ${r3.status}）。`);
  process.exit(r3.status || 1);
}

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   ✓ 大字幕模式全部完成                                ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');
console.log('预览链接见上方 pipeline 输出。');
console.log('（中间跳过步骤 5：未生成自定义 region JSON）');
