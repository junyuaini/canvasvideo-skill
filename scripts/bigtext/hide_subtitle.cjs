/**
 * 把 skeleton.json 的 subtitle.enabled 设为 false
 * （隐藏默认的字幕条，只保留 layer-txt 的大字层）
 *
 * pipeline 的 merge-regions 从 skeleton.json 读取 subtitle 配置，
 * 所以改 skeleton 才能持久生效。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const projectPath = process.argv[2] || path.join(__dirname, 'skeleton.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

if (project.subtitle) {
  project.subtitle.enabled = false;
  console.log(`[✓] ${projectPath} subtitle.enabled = false`);
}

fs.writeFileSync(projectPath, JSON.stringify(project, null, 2) + '\n', 'utf-8');
console.log('[✓] 已写入');