/**
 * 脚本 2: fill_txt.js
 * 基于 layout.js 生成的 mask 布局，**复制 mask 坐标**给同位置的 tx，
 * 然后给 tx 配字色、字号、keyframe。
 *
 * 输入：layout.js 生成的 regions/P*.json（含 _layout.leaves 数据）
 * 输出：同 region JSON，content.html/css 填充完整 layer-txt
 *
 * 关键原则：
 *   - tx 的 top/left/width/height 严格复制对应 mk（位置 1:1 对应，不可能错位）
 *   - 字号字色按字数查表
 *   - tx keyframes 按字幕时间算（不复用 mask keyframes）
 *
 * 用法：node fill_txt.js [path]
 *   默认处理 regions/ 目录下所有 P*.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ==================== 字号字色配置 ====================
const COLOR_RED = '#e85540';
const COLOR_GOLD = '#e8c060';
const COLOR_CREAM = '#f8f1e0';

// 字号档位（按字数）
const FONT_SIZE_TABLE = [
  [2, 140, COLOR_RED],     // 1-2 字
  [4, 110, COLOR_GOLD],    // 3-4 字
  [6, 75, COLOR_GOLD],     // 5-6 字
  [10, 60, COLOR_CREAM],   // 7-10 字
  [999, 50, COLOR_CREAM],  // 11+ 字（50px，参考 P1 手写调优值）
];

const DEFAULT_FONT_FAMILY = "'Noto Serif SC', 'Songti SC', 'SimSun', serif";
const DEFAULT_MASK_COLOR = 'rgba(26,18,8,1)';

// 将 maskColor 转换成 hex 形式（环境对 rgba() 描边渲染不稳定）
// 支持：rgba(r,g,b,a) / rgba(r,g,b) / rgb(r,g,b) / #rrggbb / 颜色名
function maskColorToHex(input) {
  if (!input) return '#000000';
  const s = String(input).trim().toLowerCase();
  // 已经是 hex
  if (/^#[0-9a-f]{3,8}$/.test(s)) {
    // 8 位 hex → 转 6 位（丢 alpha）
    if (s.length === 9) return s.substring(0, 7);
    // 4 位 hex → 转 3 位
    if (s.length === 5) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return s;
  }
  // rgba / rgb 解析
  const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const r = parseInt(m[1]).toString(16).padStart(2, '0');
    const g = parseInt(m[2]).toString(16).padStart(2, '0');
    const b = parseInt(m[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  // 命名色兜底（red / blue 等）→ 用 CSS 解析
  // 先偷懒：只支持红/黑/白
  if (s === 'red') return '#ff0000';
  if (s === 'black') return '#000000';
  if (s === 'white') return '#ffffff';
  return s;  // 无法识别就原样返回
}

function getFontSizeColor(text) {
  for (const [maxChars, size, color] of FONT_SIZE_TABLE) {
    if (text.length <= maxChars) return [size, color];
  }
  return [50, COLOR_CREAM];
}

// ==================== HTML/CSS 生成 ====================
function buildTxtHtml(leaves, subtitles) {
  const parts = ["<div class='layer-txt'>"];
  leaves.forEach((leaf, i) => {
    parts.push(`<div class='tx tx-${i+1}'>${subtitles[i].text}</div>`);
  });
  parts.push("</div>");
  return parts.join('');
}

function buildTxtCss(leaves, subtitles, duration, regionStartTime, fontFamily, maskColor) {
  const css = [];

  // 1. layer-txt 定位
  css.push('.layer-txt { position: absolute; inset: 0; z-index: 2; pointer-events: none; }');

  // 2. tx 公共样式（关键：不要写 opacity / animation forwards / visibility）
  // 文字描边：text-shadow 4 方向 1px 实心投影，兼容性最好（手机 WebView 也正常）
  // 颜色 = 蒙版色（转 hex 后用），蒙版在场时描边同色看不到（设计目的）
  // 不再用 -webkit-text-stroke：手机浏览器渲染会乱
  const strokeColor = maskColorToHex(maskColor);
  css.push(`.tx { position: absolute; display: flex; justify-content: center; align-items: center; text-align: center; font-family: ${fontFamily}; font-weight: 800; line-height: 1.15; letter-spacing: 0.05em; box-sizing: border-box; padding: 8px; text-shadow: -1px -1px 0 ${strokeColor}, 1px -1px 0 ${strokeColor}, -1px 1px 0 ${strokeColor}, 1px 1px 0 ${strokeColor}; animation-duration: ${duration}s; animation-fill-mode: forwards; animation-timing-function: linear; }`);

  // 3. tx-N 位置（严格复制 mk 坐标）+ 字号字色 + animation-name
  leaves.forEach((leaf, i) => {
    const [size, color] = getFontSizeColor(subtitles[i].text);
    css.push(`.tx-${i+1} { top: ${leaf.top}px; left: ${leaf.left}px; width: ${leaf.width}px; height: ${leaf.height}px; color: ${color}; font-size: ${size}px; animation-name: tx-${i+1}; }`);
  });

  // 4. tx keyframes（sub.start/end 是全局时间戳，需要换算成相对 region 的百分比）
  const TX_FADE_IN_PCT = 0.5;
  const TX_FADE_OUT_PCT = 0.1;
  subtitles.forEach((sub, i) => {
    // 关键：换算成相对 region 的时间
    const relStart = sub.start - regionStartTime;
    const relEnd = sub.end - regionStartTime;
    const startPct = Math.max(0, relStart / duration * 100);
    const endPct = Math.max(0, relEnd / duration * 100);
    const inPct = startPct + TX_FADE_IN_PCT;
    const outPct = Math.min(endPct + TX_FADE_OUT_PCT, 100);
    const isLast = i === subtitles.length - 1;

    if (isLast) {
      css.push(`@keyframes tx-${i+1} { 0% { opacity: 0; } ${startPct.toFixed(2)}% { opacity: 0; } ${inPct.toFixed(2)}% { opacity: 1; } 99.99% { opacity: 1; } 100% { opacity: 1; } }`);
    } else {
      css.push(`@keyframes tx-${i+1} { 0% { opacity: 0; } ${startPct.toFixed(2)}% { opacity: 0; } ${inPct.toFixed(2)}% { opacity: 1; } ${endPct.toFixed(2)}% { opacity: 1; } ${outPct.toFixed(2)}% { opacity: 0; } 100% { opacity: 0; } }`);
    }
  });

  return css;
}

// ==================== 主流程 ====================
function fillTxt(regionJson, options = {}) {
  const fontFamily = options.fontFamily || DEFAULT_FONT_FAMILY;
  const maskColor = options.maskColor || DEFAULT_MASK_COLOR;
  const duration = regionJson.duration;
  const subtitles = regionJson.subtitles;
  const leaves = regionJson._layout && regionJson._layout.leaves;

  if (!leaves) {
    throw new Error(`${regionJson.id}: _layout.leaves 不存在！请先跑 layout.js`);
  }
  if (leaves.length !== subtitles.length) {
    throw new Error(`${regionJson.id}: leaves 数 (${leaves.length}) 与字幕数 (${subtitles.length}) 不匹配！`);
  }

  // 1. 生成 txt HTML（替换 layer-txt 占位）
  const txtHtml = buildTxtHtml(leaves, subtitles);

  // 2. 替换 mask HTML 里的 layer-txt 占位
  const oldHtml = regionJson.components[0].content.html;
  const newHtml = oldHtml.replace(
    /<div class='layer-txt'><div class='tx-placeholder'>待 fill_txt\.js 填充<\/div><\/div>/,
    txtHtml
  );
  regionJson.components[0].content.html = newHtml;

  // 3. 追加 txt CSS 到现有 mask CSS
  const txtCss = buildTxtCss(leaves, subtitles, duration, regionJson.startTime, fontFamily, maskColor);
  regionJson.components[0].content.css += '\n' + txtCss.join('\n');

  // 4. 清理临时字段
  delete regionJson._layout;

  return regionJson;
}

function main() {
  const args = process.argv.slice(2);
  const options = { fontFamily: DEFAULT_FONT_FAMILY, maskColor: DEFAULT_MASK_COLOR };
  let target = null;
  for (const arg of args) {
    if (arg.startsWith('--font=')) {
      options.fontFamily = arg.slice('--font='.length);
    } else if (arg.startsWith('--mask-color=')) {
      options.maskColor = arg.slice('--mask-color='.length);
    } else if (!arg.startsWith('--')) {
      target = arg;
    }
  }
  if (!target) {
    console.log('用法: node fill_txt.cjs [path] [--font=...] [--mask-color=...]');
    console.log('  默认: node fill_txt.cjs regions/');
    console.log('  参数: --font=\'Kaiti SC\', \'STKaiti\', \'KaiTi\', \'楷体\', serif');
    console.log('        --mask-color=rgba(26,18,8,1)');
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
    console.log(`填充 ${region.id}: ${region.subtitles.length} 字幕 (font=${options.fontFamily})`);
    const newRegion = fillTxt(region, options);
    fs.writeFileSync(f, JSON.stringify(newRegion, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ 已写入 ${f}`);
  }
}

if (require.main === module) main();

module.exports = { fillTxt, buildTxtHtml, buildTxtCss, getFontSizeColor };