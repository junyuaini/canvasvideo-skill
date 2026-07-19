/**
 * 脚本 1: layout.js
 * 只生成 MASK 部分（嵌套 box + leaf + mk 坐标 + mk keyframes）
 * 不生成 txt，txt 部分交给 fill_txt.js
 *
 * 输入：regions/P*.json（skill 骨架生成的带占位 JSON）
 * 输出：同结构 region JSON，content.html/css 包含 layer-mask 部分（layer-txt 为空占位）
 *
 * 用法：node layout.js [path]
 *   默认处理 regions/ 目录下所有 P*.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ==================== 常量配置 ====================
// 画布尺寸：默认 780×1040（3:4），但 layout.cjs 会从 region.position.w/h 自动读取
const CANVAS_W = 780;
const CANVAS_H = 1040;
const MASK_BLEED = 80;       // 蒙版出血 80px

// 蒙版颜色（默认黑色）。可通过 --mask-color=#xxxxxx 参数覆盖
const DEFAULT_MASK_COLOR = 'rgba(26, 18, 8, 1)';
const MASK_DELAY_PCT = 21;   // 蒙版擦除延迟 21%（≈ 9.525s × 21% ≈ 2s）

// ==================== 嵌套切分算法 ====================
function computeLayout(N, W, H) {
  W = W || CANVAS_W;
  H = H || CANVAS_H;
  const layout = { W, H };

  layout.splitTop = 0.6;
  const topH = Math.floor(H * 0.6);
  const botH = H - topH;

  // 上下半分配：bot 区固定放最后几条（核心字幕放视觉中心）
  let botN;
  if (N <= 4) botN = 0;
  else if (N <= 14) botN = 3;
  else botN = Math.min(6, Math.ceil(N / 5));
  const topN = N - botN;

  // 上半内部分配
  let bTlN, bTrDirect, bTrInner, innerRows;
  if (topN <= 2) {
    bTlN = topN; bTrDirect = 0; bTrInner = 0; innerRows = [0, 0];
  } else if (topN <= 4) {
    bTlN = 2; bTrDirect = topN - 2; bTrInner = 0; innerRows = [0, 0];
  } else {
    bTlN = 2;
    bTrDirect = 2;
    bTrInner = topN - 2 - 2;
    if (bTrInner >= 4) {
      innerRows = [Math.ceil(bTrInner / 2), Math.floor(bTrInner / 2)];
    } else if (bTrInner >= 1) {
      innerRows = [bTrInner, 0];
    } else {
      innerRows = [0, 0];
    }
  }

  layout.top = {
    h: topH,
    tlW: Math.floor(W * (1/3)),
    trW: W - Math.floor(W * (1/3)),
    tlSubs: bTlN,
    trSubs: bTrDirect + bTrInner,
    trDirectSubs: bTrDirect,
    trInnerSubs: bTrInner,
    trInnerRows: innerRows,
  };

  let bBlN, bBrN;
  if (botN <= 0) { bBlN = 0; bBrN = 0; }
  else if (botN <= 3) { bBlN = botN - 1; bBrN = 1; }
  else { bBlN = Math.ceil(botN / 2); bBrN = botN - bBlN; }

  layout.bot = {
    h: botH,
    blW: Math.floor(W * 0.55),
    brW: W - Math.floor(W * 0.55),
    blSubs: bBlN,
    brSubs: bBrN,
  };

  return layout;
}

function computeLeaves(layout) {
  const leaves = [];
  const top = layout.top;
  const bot = layout.bot;

  // 1. b-tl
  if (top.tlSubs > 0) {
    const leafH = Math.floor(top.h / top.tlSubs);
    for (let i = 0; i < top.tlSubs; i++) {
      leaves.push({ box: 'b-tl', index: i + 1, top: i * leafH, left: 0, width: top.tlW, height: leafH });
    }
  }

  // 2. b-tr 直接（启用 inner 时只占顶部 40%，动态）
  let directTotalH = 0;
  if (top.trDirectSubs > 0) {
    if (top.trInnerSubs > 0) {
      // b-tr-direct 占顶部 40%（原来写死 250px 对 624 约 40%）
      directTotalH = Math.floor(top.h * 0.4);
      const leafH = Math.floor(directTotalH / top.trDirectSubs);
      for (let i = 0; i < top.trDirectSubs; i++) {
        leaves.push({ box: 'b-tr', index: i + 1, top: i * leafH, left: top.tlW, width: top.trW, height: leafH });
      }
    } else {
      const leafH = Math.floor(top.h / top.trDirectSubs);
      for (let i = 0; i < top.trDirectSubs; i++) {
        leaves.push({ box: 'b-tr', index: i + 1, top: i * leafH, left: top.tlW, width: top.trW, height: leafH });
      }
    }
  }

  // 3 + 4. b-tr-inner
  if (top.trInnerSubs > 0) {
    const innerTop = directTotalH;
    const innerH = top.h - directTotalH;
    const isSingleRow = top.trInnerRows[1] === 0;
    const triilW = isSingleRow ? top.trW : Math.floor(top.trW * 0.55);
    const triirW = isSingleRow ? 0 : top.trW - triilW;
    const rows = top.trInnerRows;
    if (rows[0] > 0) {
      const triilRowH = Math.floor(innerH / rows[0]);
      for (let i = 0; i < rows[0]; i++) {
        leaves.push({ box: 'b-triil', index: i + 1, top: innerTop + i * triilRowH, left: top.tlW, width: triilW, height: triilRowH });
      }
    }
    if (rows.length > 1 && rows[1] > 0) {
      const triirRowH = Math.floor(innerH / rows[1]);
      for (let i = 0; i < rows[1]; i++) {
        leaves.push({ box: 'b-triir', index: i + 1, top: innerTop + i * triirRowH, left: top.tlW + triilW, width: triirW, height: triirRowH });
      }
    }
  }

  // 5. b-bl
  if (bot.blSubs > 0) {
    const leafH = Math.floor(bot.h / bot.blSubs);
    for (let i = 0; i < bot.blSubs; i++) {
      leaves.push({ box: 'b-bl', index: i + 1, top: top.h + i * leafH, left: 0, width: bot.blW, height: leafH });
    }
  }

  // 6. b-br
  if (bot.brSubs > 0) {
    const leafH = Math.floor(bot.h / bot.brSubs);
    for (let i = 0; i < bot.brSubs; i++) {
      leaves.push({ box: 'b-br', index: i + 1, top: top.h + i * leafH, left: bot.blW, width: bot.brW, height: leafH });
    }
  }

  return leaves;
}

// ==================== HTML/CSS 生成（只 MASK） ====================
function buildMaskHtml(leaves) {
  const groups = {};
  leaves.forEach((leaf, i) => {
    if (!groups[leaf.box]) groups[leaf.box] = [];
    groups[leaf.box].push(i + 1);
  });

  const renderLeaves = (boxName) => {
    if (!groups[boxName]) return '';
    return groups[boxName].map(idx => `<div class='leaf'><div class='mask mk-${idx}'></div></div>`).join('');
  };
  const renderInner = () => {
    if (!groups['b-triil'] && !groups['b-triir']) return '';
    const parts = [];
    if (groups['b-triil']) parts.push(`<div class='box b-triil'>${renderLeaves('b-triil')}</div>`);
    if (groups['b-triir']) parts.push(`<div class='box b-triir'>${renderLeaves('b-triir')}</div>`);
    return `<div class='box b-tr-inner'>${parts.join('')}</div>`;
  };
  const renderTr = () => {
    const direct = renderLeaves('b-tr');
    const inner = renderInner();
    if (direct && inner) return `<div class='box b-tr'>${direct}${inner}</div>`;
    if (direct) return `<div class='box b-tr'>${direct}</div>`;
    if (inner) return inner;
    return '';
  };
  const renderTl = () => groups['b-tl'] ? `<div class='box b-tl'>${renderLeaves('b-tl')}</div>` : '';

  const topHtml = (renderTl() || renderTr()) ? `<div class='box b-top'>${renderTl()}${renderTr()}</div>` : '';
  const bl = groups['b-bl'] ? `<div class='box b-bl'>${renderLeaves('b-bl')}</div>` : '';
  const br = groups['b-br'] ? `<div class='box b-br'>${renderLeaves('b-br')}</div>` : '';
  const botHtml = (bl || br) ? `<div class='box b-bot'>${bl}${br}</div>` : '';

  return `<div class='layer-mask'><div class='mask-stack'>${topHtml}${botHtml}</div></div>`;
}

function buildMaskCss(leaves, duration, maskColor) {
  maskColor = maskColor || DEFAULT_MASK_COLOR;
  const css = [];
  // 读 W/H 从 leaves 第一个（leaves 含 box/left/width，最右 top+width 即 W）
  const W = Math.max(...leaves.map(l => l.left + l.width));
  const H = Math.max(...leaves.map(l => l.top + l.height));
  const layout = computeLayout(leaves.length, W, H);
  const top = layout.top;
  const bot = layout.bot;

  // 1. 层定位
  css.push('.layer-mask { position: absolute; inset: 0; z-index: 1; pointer-events: none; }');

  // 2. 嵌套结构
  css.push('.mask-stack { position: absolute; inset: 0; }');
  css.push('.box { position: absolute; box-sizing: border-box; overflow: visible; }');

  // 3. 固定 box 坐标
  css.push(`.b-top { top: 0; left: 0; width: ${CANVAS_W}px; height: ${top.h}px; }`);
  css.push(`.b-bot { top: ${top.h}px; left: 0; width: ${CANVAS_W}px; height: ${bot.h}px; }`);

  const byBox = {};
  leaves.forEach((leaf, i) => {
    if (!byBox[leaf.box]) byBox[leaf.box] = [];
    byBox[leaf.box].push({ mkIdx: i + 1, leaf });
  });

  // 提前计算 innerTop / triilW（后面 boxAbs 要用）
  let innerTop = 0;
  let triilW = 0;
  if (byBox['b-tl']) css.push(`.b-tl { top: 0; left: 0; width: ${top.tlW}px; height: ${top.h}px; }`);
  if (byBox['b-tr'] || byBox['b-triil'] || byBox['b-triir']) {
    css.push(`.b-tr { top: 0; left: ${top.tlW}px; width: ${top.trW}px; height: ${top.h}px; }`);
  }
  if (byBox['b-triil'] || byBox['b-triir']) {
    innerTop = byBox['b-tr'] ? (byBox['b-tr'][byBox['b-tr'].length - 1].leaf.top + byBox['b-tr'][byBox['b-tr'].length - 1].leaf.height) : Math.floor(top.h * 0.4);
    css.push(`.b-tr-inner { top: ${innerTop}px; left: 0; width: ${top.trW}px; height: ${top.h - innerTop}px; }`);
    const isSingleRow = byBox['b-triil'] && !byBox['b-triir'];
    triilW = isSingleRow ? top.trW : Math.floor(top.trW * 0.55);
    const triirW = isSingleRow ? 0 : top.trW - triilW;
    if (byBox['b-triil']) css.push(`.b-triil { top: 0; left: 0; width: ${triilW}px; height: ${top.h - innerTop}px; }`);
    if (byBox['b-triir']) css.push(`.b-triir { top: 0; left: ${triilW}px; width: ${triirW}px; height: ${top.h - innerTop}px; }`);
  }
  if (byBox['b-bl']) css.push(`.b-bl { top: 0; left: 0; width: ${bot.blW}px; height: ${bot.h}px; }`);
  if (byBox['b-br']) css.push(`.b-br { top: 0; left: ${bot.blW}px; width: ${bot.brW}px; height: ${bot.h}px; }`);

  // 4. leaf 公共样式
  css.push('.leaf { position: absolute; }');

  // 5. mask 公共样式
  css.push(`.leaf .mask { position: absolute; top: -${MASK_BLEED}px; left: -${MASK_BLEED}px; right: -${MASK_BLEED}px; bottom: -${MASK_BLEED}px; background: ${maskColor}; z-index: 1; pointer-events: none; animation-duration: ${duration}s; animation-fill-mode: forwards; animation-timing-function: linear; }`);

  // 6. nth-child 给每个 box 内的 leaf 定位（相对父盒子）
  const boxAbs = {
    'b-tl': { top: 0, left: 0 },
    'b-tr': { top: 0, left: top.tlW },
    'b-tr-inner': { top: innerTop, left: top.tlW },
    'b-triil': { top: innerTop, left: top.tlW },
    'b-triir': { top: innerTop, left: top.tlW + triilW },
    'b-bl': { top: top.h, left: 0 },
    'b-br': { top: top.h, left: bot.blW },
  };
  for (const [boxName, leavesInBox] of Object.entries(byBox)) {
    const parent = boxAbs[boxName] || { top: 0, left: 0 };
    leavesInBox.forEach(({ mkIdx, leaf }) => {
      const relTop = leaf.top - parent.top;
      const relLeft = leaf.left - parent.left;
      css.push(`.${boxName} .leaf:nth-child(${leaf.index}) { top: ${relTop}px; left: ${relLeft}px; width: ${leaf.width}px; height: ${leaf.height}px; }`);
    });
  }

  // 7. mk-N animation-name
  for (let i = 0; i < leaves.length; i++) {
    css.push(`.mk-${i+1} { animation-name: mk-${i+1}; }`);
  }

  // 8. mk keyframes（4 种擦除方向循环）
  const directions = [
    [100, 0, 0, 0],
    [0, 0, 0, 100],
    [0, 100, 0, 0],
    [0, 0, 100, 0],
  ];
  // 用 mask 的位置（leaves 顺序）来匹配字幕，但 mask 的 keyframes 时间按字幕时间算
  // 字幕按时间顺序分配给 leaves[0..N-1]，所以 leaves[i] 对应 subtitles[i]
  // mask keyframes 也要按字幕 i 来算
  // 但 mask 自身不需要 subtitle index——mask keyframes 直接用 subtitles[i] 的时间
  return { css, byBox, boxAbs };
}

// ==================== 主流程 ====================
function generateRegion(regionJson, options) {
  options = options || {};
  const maskColor = options.maskColor || DEFAULT_MASK_COLOR;

  const duration = regionJson.duration;
  const subtitles = regionJson.subtitles;
  const N = subtitles.length;

  // 画布尺寸：从 region.position 自动读取
  const W = (regionJson.position && regionJson.position.w) || (regionJson.components && regionJson.components[0].position && regionJson.components[0].position.w) || CANVAS_W;
  const H = (regionJson.position && regionJson.position.h) || (regionJson.components && regionJson.components[0].position && regionJson.components[0].position.h) || CANVAS_H;

  const layout = computeLayout(N, W, H);
  const leaves = computeLeaves(layout);

  if (leaves.length !== N) {
    throw new Error(`${regionJson.id}: layout 生成的 leaf 数 (${leaves.length}) 与字幕数 (${N}) 不匹配！`);
  }

  // 1. 生成 mask HTML
  const maskHtml = buildMaskHtml(leaves);

  // 2. 生成 mask CSS（部分 + 后续 fill_txt.js 补全 txt 部分）
  const { css, byBox, boxAbs } = buildMaskCss(leaves, duration, maskColor);

  // 3. 生成 mk keyframes（用字幕时间，需换算成相对 region）
  const directions = [
    [100, 0, 0, 0], [0, 0, 0, 100], [0, 100, 0, 0], [0, 0, 100, 0],
  ];
  const regionStartTime = regionJson.startTime;
  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const relStart = sub.start - regionStartTime;
    const relEnd = sub.end - regionStartTime;
    const startPct = Math.max(0, relStart / duration * 100);
    const endPct = Math.max(0, relEnd / duration * 100);
    const isLast = i === subtitles.length - 1;
    const erasePct = isLast ? 100 : Math.min(endPct + MASK_DELAY_PCT, 99.99);
    const d = directions[i % 4];
    const insetStart = 'inset(0 0 0 0)';
    const insetEnd = `inset(${d[0]}% ${d[1]}% ${d[2]}% ${d[3]}%)`;
    css.push(`@keyframes mk-${i+1} { 0% { clip-path: ${insetStart}; } ${startPct.toFixed(2)}% { clip-path: ${insetStart}; } ${erasePct.toFixed(2)}% { clip-path: ${insetEnd}; } 100% { clip-path: ${insetEnd}; } }`);
  }

  // 4. 占位 layer-txt（fill_txt.js 会替换）
  const txtPlaceholder = `<div class='layer-txt'><div class='tx-placeholder'>待 fill_txt.js 填充</div></div>`;

  regionJson.components[0].content.html = maskHtml + txtPlaceholder;
  regionJson.components[0].content.css = css.join('\n');

  // 保存 leaves 数据到 JSON（让 fill_txt.js 读坐标）
  regionJson._layout = { leaves: leaves, boxAbs: boxAbs, byBox: byBox };

  return regionJson;
}

function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const options = {};
  let target = null;
  for (const arg of args) {
    if (arg.startsWith('--mask-color=')) {
      options.maskColor = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      target = arg;
    }
  }

  if (!target) {
    console.log('用法: node layout.cjs [path] [--mask-color=rgba(...)]');
    console.log('  默认: node layout.cjs regions/');
    console.log('  参数: --mask-color=rgba(26,18,8,1)  默认蒙版颜色');
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
    console.log(`处理 ${region.id}: ${region.subtitles.length} 字幕, ${region.duration}s`);
    const newRegion = generateRegion(region, options);
    fs.writeFileSync(f, JSON.stringify(newRegion, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ 已写入 ${f}`);
  }
}

if (require.main === module) main();

module.exports = { computeLayout, computeLeaves, buildMaskHtml, buildMaskCss, generateRegion };