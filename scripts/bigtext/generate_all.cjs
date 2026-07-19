/**
 * 完整生成流程（一键跑完）
 *
 * 步骤：
 *   1. layout.cjs    → 生成蒙版（嵌套 div + mk 坐标 + mk keyframes）
 *   2. fill_txt.cjs  → 基于 mask 坐标填充 txt（坐标 + 文本 + tx keyframes）
 *   3. fit_size.cjs  → 自适应字号字色（按盒子宽高 + 字数算最佳字号）
 *   4. hide_subtitle → 关闭默认字幕条（避免遮盖大字）
 *
 * 用法：node generate_all.cjs <workdir>
 *   例：node generate_all.cjs cv_11d114_mrq3rc6y_41bbaded
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function runScript(scriptName, args) {
  console.log(`\n▶ 步骤: ${scriptName}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, scriptName), ...args], {
    stdio: 'inherit',
    cwd: __dirname,
  });
  if (r.status !== 0) {
    console.error(`✗ ${scriptName} 失败 (exit ${r.status})`);
    process.exit(r.status);
  }
}

const workdir = process.argv[2];
if (!workdir) {
  console.log('用法: node generate_all.cjs <workdir> [options]');
  console.log('  例: node generate_all.cjs cv_11d114_mrq3rc6y_41bbaded');
  console.log('  选项:');
  console.log('    --mask-color=rgba(26,18,8,1)  蒙版颜色');
  console.log('    --color-red=#e85540           短词字色（1-2 字）');
  console.log('    --color-gold=#e8c060          中等字色（3-6 字）');
  console.log('    --color-cream=#f8f1e0         长句字色（>6 字）');
  console.log('  （所有参数都是可选，不传则用默认值）');
  process.exit(1);
}

const regionsDir = path.join(workdir, 'regions');
if (!fs.existsSync(regionsDir)) {
  console.error(`✗ 工作目录缺少 regions/ 子目录: ${regionsDir}`);
  process.exit(1);
}

// 收集所有 --xxx=value 参数
const extraArgs = process.argv.slice(3);

// 步骤 1: 蒙版布局（支持 --mask-color）
runScript('layout.cjs', [regionsDir, ...extraArgs]);

// 步骤 2: 字幕文本 + 坐标（支持 --font / --mask-color）
runScript('fill_txt.cjs', [regionsDir, ...extraArgs]);

// 步骤 3: 自适应字号（支持 --color-*）
runScript('fit_size.cjs', [regionsDir, ...extraArgs]);

// 步骤 4: 关闭默认字幕条
const skeletonPath = path.join(workdir, 'skeleton.json');
if (fs.existsSync(skeletonPath)) {
  console.log(`\n▶ 步骤: hide_subtitle.cjs`);
  runScript('hide_subtitle.cjs', [skeletonPath]);
}

// 步骤 5: 加 Picsum 背景（每个 region 的 component.background）
// 3 种风格：tech / daily / general，根据 skeleton.json 的 style 字段自动选
// 用 --bg-style 参数可以强制指定
console.log(`\n▶ 步骤: add-image-bg.js`);
const bgStyleArg = extraArgs.find(a => a.startsWith('--bg-style='));
runScript('add-image-bg.js', [regionsDir, ...(bgStyleArg ? [bgStyleArg] : [])]);

console.log('\n✓ 全部完成！可以跑 pipeline.js 上传了。');
console.log(`  node pipeline.js --cwd=${path.dirname(workdir)} ${path.basename(workdir)}`);