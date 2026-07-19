/**
 * 批量给所有 region 加 Picsum 背景图
 *
 * 3 种风格（根据 skeleton.json 的 style 字段自动选）：
 *   - tech    → 科技感（AI/数据/代码/电路）        Picsum seed 前缀 "tech-"
 *   - daily   → 日常生活（自然/家居/情感）          Picsum seed 前缀 "daily-"
 *   - general → 通用抽象（中性、干净、商务）        Picsum seed 前缀 "general-"
 *
 * 每 region 一张不同图（seed = "{style}-{region内容关键词}"）：
 *   - 同 seed 同图（Picsum 稳定），所以同概念每次跑图都一致
 *   - 不同 region 不同图
 *
 * 图片用 Picsum URL（不下载本地），由 setup-assets.js 在 pipeline 阶段自动转 base64。
 *
 * 用法：
 *   node add-image-bg.js <regionsDir> [--bg-style=auto|tech|daily|general]
 *
 *   --bg-style=auto    根据 skeleton.json style 字段自动选（默认）
 *   --bg-style=tech    强制所有 region 走科技风
 *   --bg-style=daily   强制所有 region 走日常
 *   --bg-style=general 强制所有 region 走通用
 *
 * 设计参考：docs/rules/06-components.md § R7.1 Picsum 在线图
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 解析参数
const argv = process.argv.slice(2);
const regionsDir = argv[0];
let bgStyleOverride = 'auto';
for (const arg of argv) {
  if (arg.startsWith('--bg-style=')) {
    bgStyleOverride = arg.slice('--bg-style='.length);
  }
}

if (!regionsDir) {
  console.error('用法: node add-image-bg.js <regionsDir> [--bg-style=auto|tech|daily|general]');
  process.exit(1);
}
if (!['auto', 'tech', 'daily', 'general'].includes(bgStyleOverride)) {
  console.error(`✗ --bg-style 必须是 auto / tech / daily / general，收到: ${bgStyleOverride}`);
  process.exit(1);
}

const files = fs.readdirSync(regionsDir).filter(f => /^P\d+\.json$/.test(f));
if (!files.length) {
  console.error(`✗ ${regionsDir} 下没找到 P*.json`);
  process.exit(1);
}

// ========== 风格 → seed 关键词前缀 ==========
const BG_STYLE_SEEDS = {
  // 科技风：电路/数据/赛博/AI/未来
  tech:    ['tech-circuit', 'cyber-data', 'neon-code', 'digital-future', 'ai-matrix'],
  // 日常风：生活/自然/家居/光线
  daily:   ['daily-life', 'warm-morning', 'soft-sunlight', 'home-cozy', 'gentle-touch'],
  // 通用风：抽象/中性/纸张/迷雾
  general: ['clean-white', 'pure-abstract', 'paper-light', 'calm-mist', 'neutral-tone'],
};

// ========== AI 选 style 的规则 ==========
function pickStyleFromSkeleton(skeleton) {
  const s = (skeleton && (skeleton.style || '').toLowerCase()) || '';
  if (s === 'tech' || s === 'technology' || s === 'cyber') return 'tech';
  if (s === 'warm' || s === 'life' || s === 'emotion') return 'daily';
  // business / art / 其他 → general
  return 'general';
}

// ========== 生成 seed 关键部分（每次跑都重新随机） ==========
// 8 位 hex 完全随机 hash（如 'a3f9e2b1'）
// - 不同 region 永远得到不同图（hash 撞库概率 1/2^32）
// - 同 region 复跑会得到不同的图（每次随机）
// - 与 region 内容无关，纯随机保证多样性
function extractSeedKey(region, idx) {
  return crypto.randomBytes(4).toString('hex');
}

// ========== 生成 Picsum URL ==========
function makeBackground(bgStyle, region, idx, duration) {
  const seedPrefixList = BG_STYLE_SEEDS[bgStyle];
  // 哈希 idx 选前缀关键词（保证稳定）
  const prefix = seedPrefixList[idx % seedPrefixList.length];
  const key = extractSeedKey(region, idx);
  const seed = `${prefix}-${key}`;

  // 默认 780x585（4:3 画布）
  const W = 780;
  const H = 585;
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${W}/${H}`;

  // HTML：一个带 .bg-img 的 div（pipeline 阶段会转 base64）
  const html = `<div class="bg-picsum"><img class="bg-picsum__img" src="${url}" alt="" /><div class="bg-picsum__overlay"></div></div>`;

  // CSS：图填满 + 暗化 + 留出字的对比度
  // - 背景图加 Ken Burns 动画：duration 取自 region.duration（每个 region 独立）
  // - 一次正放（forwards 保持终态），region 切换时从头开始
  // - 适配 Picsum 随机图：中心不偏离，幅度小不抢戏
  // - duration 兜底 8s（防止 region 没 duration 字段时变 0s）
  const animDur = (typeof duration === 'number' && duration > 0) ? duration : 8;
  const css = `.bg-picsum { position: absolute; inset: 0; overflow: hidden; }
.bg-picsum__img { width: 100%; height: 100%; object-fit: cover; display: block; transform-origin: center center; will-change: transform; animation: bgDrift ${animDur}s ease-in-out forwards; }
@keyframes bgDrift { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.15) translate(-3%, -2%); } }
.bg-picsum__overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 100%); }`;

  return { html, css, seed, bgStyle, url };
}

// ========== 找 skeleton.json（向上找） ==========
function findSkeleton(regionsDir) {
  let dir = regionsDir;
  for (let i = 0; i < 5; i++) {
    const p = path.join(dir, 'skeleton.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    dir = path.dirname(dir);
  }
  return null;
}

// ========== 主流程 ==========
let skeleton = findSkeleton(regionsDir);
if (!skeleton) {
  console.log('⚠ 没找到 skeleton.json，--bg-style 用默认值 general');
}
let effectiveStyle = bgStyleOverride;
if (bgStyleOverride === 'auto') {
  effectiveStyle = skeleton ? pickStyleFromSkeleton(skeleton) : 'general';
}

console.log(`找到 ${files.length} 个 region`);
console.log(`背景风格: ${effectiveStyle}${bgStyleOverride === 'auto' ? '（auto，从 skeleton.style 推断）' : `（手动指定）`}`);

let counter = { tech: 0, daily: 0, general: 0 };

files.forEach((f, idx) => {
  const p = path.join(regionsDir, f);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  let seedInfo = '';
  if (data.components && data.components[0]) {
    // 区域元信息可能在 data 顶层（name/description）
    const regionMeta = {
      name: data.name || '',
      description: data.description || '',
    };
    // 动画 duration 取自 region.duration（秒），fallback 8s
    const bg = makeBackground(effectiveStyle, regionMeta, idx, data.duration);
    data.components[0].background = {
      html: bg.html,
      css: bg.css,
    };
    counter[bg.bgStyle]++;
    seedInfo = bg.seed;
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  console.log(`✓ ${f} 已加 Picsum 背景 (seed=${seedInfo || 'default'}, dur=${data.duration || 8}s)`);
});

console.log(`\n风格统计: tech=${counter.tech}, daily=${counter.daily}, general=${counter.general}`);
console.log('全部完成');
