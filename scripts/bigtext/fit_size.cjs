/**
 * 脚本 3: fit_size.cjs
 * 基于 layout.cjs 的 mask 布局（已通过 fill_txt.cjs 复制给 tx），动态调整 tx 的 font-size 和 color，
 * 让字在每个盒子里**视觉上最适合**（不撑爆、不溢出、不小于可读尺寸）。
 *
 * 算法：
 *   - 单字 / 短词（≤4 字）：优先大字号，暖红/暖金色
 *   - 长句（>4 字）：按盒子宽高自适应字号，米白色
 *   - 字号上限 = box.height（防溢出）
 *   - 字号下限 = 30px（可读性）
 *
 * 用法：node fit_size.cjs [path]
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
// 字色（默认暖红/暖金/米白）。可通过 --tx-color-N=#xxxxxx 参数覆盖
const DEFAULT_COLOR_RED = '#e85540';
const DEFAULT_COLOR_GOLD = '#e8c060';
const DEFAULT_COLOR_CREAM = '#f8f1e0';

const FONT_SIZE_MAX = 200;
const FONT_SIZE_MIN = 30;

// 汉字宽度估算系数（font-size × 系数 = 字符宽度 px）
const CHAR_WIDTH_RATIO = 0.95;
// 行高系数
const LINE_HEIGHT_RATIO = 1.15;

// 字号上限：按字数 + 盒子宽高自动算
function calcFitFontSize(text, boxWidth, boxHeight) {
  const len = text.length;
  if (len === 0) return 50;

  // 估算单行容纳字数（按字数自适应）
  // 短词（≤2字）：垂直占用 1 行，最大字号 = box.height 的 90%
  // 中等（3-6字）：1-2 行
  // 长句（>6 字）：2-3 行

  let maxLines;
  let charsPerLine;
  const aspectRatio = boxWidth / boxHeight;

  if (len <= 2) {
    // 短词：垂直摆 1 字占满高度
    maxLines = 1;
    charsPerLine = len;
  } else if (len <= 6) {
    // 中等：1-2 行
    maxLines = aspectRatio > 1.5 ? 2 : 1;
    charsPerLine = Math.ceil(len / maxLines);
  } else if (len <= 12) {
    // 中长句：2-3 行
    maxLines = aspectRatio > 2 ? 2 : 3;
    charsPerLine = Math.ceil(len / maxLines);
  } else {
    // 长句：3-4 行
    maxLines = aspectRatio > 2.5 ? 3 : 4;
    charsPerLine = Math.ceil(len / maxLines);
  }

  // 由 charsPerLine 推字号
  const fontByWidth = (boxWidth * 0.9) / (charsPerLine * CHAR_WIDTH_RATIO);
  const fontByHeight = (boxHeight * 0.85) / (maxLines * LINE_HEIGHT_RATIO);
  const fontSize = Math.min(fontByWidth, fontByHeight, boxHeight * 0.95);

  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.floor(fontSize)));
}

function getAutoColor(text, boxWidth, boxHeight, colorTable) {
  colorTable = colorTable || { red: DEFAULT_COLOR_RED, gold: DEFAULT_COLOR_GOLD, cream: DEFAULT_COLOR_CREAM };
  const len = text.length;
  if (len <= 2) return colorTable.red;
  if (len <= 4) return colorTable.gold;
  if (len <= 6) return colorTable.gold;
  return colorTable.cream;
}

// ==================== 主流程 ====================
function fitSize(regionJson, options) {
  options = options || {};
  const colorTable = {
    red: options.colorRed || DEFAULT_COLOR_RED,
    gold: options.colorGold || DEFAULT_COLOR_GOLD,
    cream: options.colorCream || DEFAULT_COLOR_CREAM,
  };

  const css = regionJson.components[0].content.css;
  const subs = regionJson.subtitles;

  // 1. 提取每个 tx 的 box 坐标（从 .tx-N 规则）
  const txRegex = /\.tx-(\d+)\s*\{([^}]+)\}/g;
  const newRules = [];
  let m;

  while ((m = txRegex.exec(css)) !== null) {
    const idx = parseInt(m[1]);
    const body = m[2];
    const top = parseFloat((body.match(/top:\s*([\d.]+)px/) || [])[1] || 0);
    const left = parseFloat((body.match(/left:\s*([\d.]+)px/) || [])[1] || 0);
    const width = parseFloat((body.match(/width:\s*([\d.]+)px/) || [])[1] || 0);
    const height = parseFloat((body.match(/height:\s*([\d.]+)px/) || [])[1] || 0);

    const sub = subs[idx - 1];
    if (!sub) continue;

    const fontSize = calcFitFontSize(sub.text, width, height);
    const color = getAutoColor(sub.text, width, height, colorTable);

    let newBody = body
      .replace(/font-size:\s*[\d.]+px/g, `font-size: ${fontSize}px`)
      .replace(/color:\s*#[0-9a-fA-F]+/g, `color: ${color}`);

    newRules.push({ idx, oldBody: body, newBody });
  }

  // 2. 替换 css 中的 .tx-N 规则（用正则捕获组替换，避免字符串字面差异）
  let newCss = css;
  for (const r of newRules) {
    const regex = new RegExp(`(\\.tx-${r.idx}\\s*\\{)[^}]+(\\})`, 'g');
    newCss = newCss.replace(regex, `$1 ${r.newBody} $2`);
  }

  regionJson.components[0].content.css = newCss;
  return regionJson;
}

function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const options = {};
  let target = null;
  for (const arg of args) {
    if (arg.startsWith('--color-red=')) options.colorRed = arg.split('=')[1];
    else if (arg.startsWith('--color-gold=')) options.colorGold = arg.split('=')[1];
    else if (arg.startsWith('--color-cream=')) options.colorCream = arg.split('=')[1];
    else if (!arg.startsWith('--')) target = arg;
  }

  if (!target) {
    console.log('用法: node fit_size.cjs [path] [--color-red=#xxx --color-gold=#xxx --color-cream=#xxx]');
    console.log('  默认: node fit_size.cjs regions/');
    console.log('  参数: --color-red=#e85540  短词字色（1-2 字）');
    console.log('  参数: --color-gold=#e8c060  中等字色（3-6 字）');
    console.log('  参数: --color-cream=#f8f1e0  长句字色（>6 字）');
    process.exit(1);
  }

  let files;
  if (fs.statSync(target).isDirectory()) {
    files = fs.readdirSync(target).filter(f => /^P\d+\.json$/.test(f)).map(f => path.join(target, f)).sort();
  } else {
    files = [target];
  }

  for (const f of files) {
    const region = JSON.parse(fs.readFileSync(f, 'utf-8'));
    console.log(`自适应 ${region.id}: ${region.subtitles.length} 字幕`);
    fitSize(region, options);
    fs.writeFileSync(f, JSON.stringify(region, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ 已写入 ${f}`);
  }
}

if (require.main === module) main();

module.exports = { calcFitFontSize, getAutoColor, fitSize };