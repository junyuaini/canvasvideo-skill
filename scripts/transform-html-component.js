/**
 * HtmlComponent 内容转换器
 *
 * 把 AI 写的"标准 H5+CSS"形式：
 *   <div id="P1-002" class="moon" data-subtitle="1-8">...</div>
 *   .moon { animation: moon-glow 1.5s ease-in-out infinite; }
 *   @keyframes moon-glow { 0%, 100% { box-shadow: 0 0 60px gold; } 50% { ... } }
 *
 * 转换成"前端可控"形式：
 *   elementIds: { "#P1-002": { id, start, end, animIn, animLoop, animOut } }
 *   animations: { "moon-glow": { duration, iterationCount, timingFunction, keyframes } }
 *
 * 设计原则：
 *   - AI 写的是标准 Web 语法，零学习成本
 *   - 所有不支持的内容一次报错全部列出，失败时抛错阻断打包
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { validateHtml } = require('./validate-html');

// ============================================================
// 支持列表（前端 JS 动画系统实际能处理的）
// ============================================================

const SUPPORTED_TIMING_FUNCTIONS = new Set([
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out',
  'step-start', 'step-end',
  'cubic-bezier(0.34, 1.56, 0.64, 1)',   // 弹性回弹
  'cubic-bezier(0.68, -0.55, 0.27, 1.55)' // 弹性入场
]);

const SUPPORTED_KEYFRAME_PROPS = new Set([
  'opacity', 'transform',
  'box-shadow', 'text-shadow',
  'color', 'background-color', 'border-color',
  'filter',
  'stroke-dashoffset', 'stroke-dasharray',
  'clip-path'
]);

// ============================================================
// 不支持列表（一次报错全部列出）
// ============================================================

function buildUnsupportedReport(compId, errors) {
  if (errors.length === 0) return;
  const lines = [
    `[${compId}] 发现 ${errors.length} 个不支持的写法，一次性列出：`
  ];
  for (const e of errors) {
    lines.push(`  - ${e}`);
  }
  lines.push('');
  lines.push('【支持的 keyframe 属性】opacity, transform, box-shadow, text-shadow, color, background-color, border-color, filter, stroke-dashoffset, stroke-dasharray, clip-path');
  lines.push('【支持的 timing function】linear, ease, ease-in, ease-out, ease-in-out, step-start, step-end, cubic-bezier(0.34, 1.56, 0.64, 1), cubic-bezier(0.68, -0.55, 0.27, 1.55)');
  lines.push('【禁止】animation-delay、keyframes 里写 width/height/font-size 等布局属性');
  lines.push('');
  lines.push('【替代方案】width 动画 → transform: scaleX()；font-size → transform: scale()；animation-delay → 错开元素 start/end 时间');
  throw new Error(lines.join('\n'));
}

// ============================================================
// SRT 字幕解析（轻量版，只看 00:00:00,000 格式）
// ============================================================

/**
 * 把 SRT 索引转成秒
 * @param {string} idx - "1" / "1,3,5" / "1-8"
 * @returns {Array<number>} 字幕序号数组
 */
function parseSubtitleIndexExpr(expr) {
  if (!expr) return [];
  expr = expr.trim();

  // "1-8" 范围
  if (expr.includes('-')) {
    const [a, b] = expr.split('-').map(s => parseInt(s.trim(), 10));
    if (isNaN(a) || isNaN(b) || a > b) {
      throw new Error(`data-subtitle 表达式 "${expr}" 格式错误，应为 "开始-结束" 且开始 ≤ 结束`);
    }
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }

  // "1,3,5" 列表
  if (expr.includes(',')) {
    return expr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  }

  // "1" 单个
  const n = parseInt(expr, 10);
  if (isNaN(n)) {
    throw new Error(`data-subtitle 表达式 "${expr}" 格式错误，应为字幕编号（如 "1"）或范围（如 "1-8"）`);
  }
  return [n];
}

/**
 * 根据字幕序号查 start/end
 * @param {Array<number>} indices - 字幕序号数组
 * @param {Array} srtList - 字幕数组（index 1-based，与 SRT 序号对齐）
 * @returns {{start: number, end: number}}
 */
function resolveSubtitleRange(indices, srtList) {
  if (!indices || indices.length === 0) return null;
  const times = indices
    .map(i => srtList[i - 1])  // SRT 1-based → 数组 0-based
    .filter(Boolean);
  if (times.length === 0) {
    throw new Error(
      `data-subtitle 引用了字幕 [${indices.join(', ')}]，但 SRT 字幕表里找不到。` +
      `可用字幕编号: 1-${srtList.length}。` +
      `请检查 SRT 文件或修改 data-subtitle 值。`
    );
  }
  return {
    start: times[0].start,
    end: times[times.length - 1].end
  };
}

// ============================================================
// HTML 解析
// ============================================================

/**
 * 扫描 HTML，提取所有带 id 的元素及其属性
 * @returns {Array<{id, tag, dataSubtitle, dataGlobal, dataAnimIn, classes, rawMatch}>}
 */
function extractElementsWithDataSubtitle(html) {
  const results = [];
  // 匹配 <tag ... id="X" ... data-subtitle="Y" ...>
  // 支持双引号和单引号
  const re = /<(\w+)([^>]*?)\s+id=(["'])([^"']+)\3([^>]*?)>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1];
    const pre = m[2] || '';
    const id = m[4];
    const post = m[5] || '';
    const allAttrs = pre + post;

    // 提取 data-subtitle
    const subMatch = allAttrs.match(/\s+data-subtitle=(["'])([^"']+)\1/);
    const dataSubtitle = subMatch ? subMatch[2] : null;

    // 提取 data-global（"true" / "1" 视为全局元素，忽略 data-subtitle）
    const globalMatch = allAttrs.match(/\s+data-global=(["'])([^"']+)\1/);
    const dataGlobal = globalMatch ? (globalMatch[2] === 'true' || globalMatch[2] === '1') : false;

    // 提取 data-anim-in（AI 声明入场动画完整简写）
    const animInMatch = allAttrs.match(/\s+data-anim-in=(["'])([^"']+)\1/);
    const dataAnimIn = animInMatch ? animInMatch[2] : null;

    // 提取 class
    const classMatch = allAttrs.match(/\s+class=(["'])([^"']+)\1/);
    const classes = classMatch ? classMatch[2].split(/\s+/).filter(Boolean) : [];

    results.push({ id, tag, dataSubtitle, dataGlobal, dataAnimIn, classes, rawMatch: m[0] });
  }
  return results;
}

// ============================================================
// HTML 校验
// ============================================================
// validateHtml 来自 ./validate-html

// ============================================================
// @keyframes 解析
// ============================================================

/**
 * 解析 @keyframes 块
 * @param {string} css - CSS 字符串
 * @returns {Object} { "fade-up": { duration, keyframes, ... }, ... }
 */
function parseKeyframes(css) {
  const result = {};
  const allErrors = [];
  // 匹配 @keyframes name { ... }（支持嵌套大括号）
  const re = /@keyframes\s+([a-zA-Z_-][\w-]*)\s*\{/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const name = match[1];
    const start = match.index + match[0].length;
    let depth = 1, i = start;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    const body = css.substring(start, i - 1);

    const { keyframes, errors } = parseKeyframeBody(body, name);
    allErrors.push(...errors);
    if (keyframes.length > 0) {
      result[name] = { keyframes };
    }
  }
  return { result, errors: allErrors };
}

/**
 * 解析单个 @keyframes 的 body
 * @returns {{keyframes: Array, errors: string[]}}
 */
function parseKeyframeBody(body, kfName) {
  const keyframes = [];
  const errors = [];
  const re = /((?:\d+%|from|to)(?:\s*,\s*(?:\d+%|from|to))*)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const selectors = m[1].split(',').map(s => s.trim());
    const props = parseKeyframeProps(m[2]);

    for (const key of Object.keys(props)) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (!SUPPORTED_KEYFRAME_PROPS.has(key) && !SUPPORTED_KEYFRAME_PROPS.has(kebabKey)) {
        errors.push(`@keyframes ${kfName} 里使用了不支持的属性 "${key}"，请用支持的属性替代`);
      }
    }

    for (const sel of selectors) {
      let offset;
      if (sel === 'from') offset = 0;
      else if (sel === 'to') offset = 1;
      else offset = parseInt(sel.replace('%', ''), 10) / 100;
      keyframes.push({ offset, ...props });
    }
  }

  if (keyframes.length === 0) {
    errors.push(`@keyframes ${kfName} 块为空或格式错误`);
  } else {
    keyframes.sort((a, b) => a.offset - b.offset);
    if (keyframes[0].offset > 0) keyframes.unshift({ offset: 0, ...keyframes[0] });
    if (keyframes[keyframes.length - 1].offset < 1) keyframes.push({ offset: 1, ...keyframes[keyframes.length - 1] });
  }

  return { keyframes, errors };
}

/**
 * 解析 keyframe 的属性块
 * @param {string} propsStr - "opacity: 1; transform: translateY(0)"
 * @returns {Object}
 */
function parseKeyframeProps(propsStr) {
  const props = {};
  propsStr.split(';').forEach(line => {
    line = line.trim();
    if (!line) return;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!key || !value) return;
    // camelCase: background-color → backgroundColor
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    props[camelKey] = value;
  });
  return props;
}

// ============================================================
// class 上的 animation 简写解析
// ============================================================

/**
 * 解析 CSS 里的 animation 简写
 * @param {string} css - CSS 字符串
 * @param {Array<string>} classes - 元素的 class 列表
 * @returns {Object} { "moon-glow": { name, duration, timingFunction, iterationCount, fill } }
 */
function parseClassAnimations(css, classes) {
  const result = {};
  for (const cls of classes) {
    const re = new RegExp(
      `\\.${escapeRegExp(cls)}\\s*\\{([^}]*)\\}`,
      'g'
    );
    let m;
    while ((m = re.exec(css)) !== null) {
      const body = m[1];
      const animMatch = body.match(/(?:^|;)\s*animation\s*:\s*([^;]+)/);
      if (animMatch) {
        const animStr = animMatch[1].trim();
        const shorthandList = splitAnimationShorthand(animStr);
        for (const sh of shorthandList) {
          const { result: parsed, errors } = parseAnimationShorthand(sh, cls);
          if (parsed) {
            result[parsed.name] = parsed;
          }
        }
      }
    }
  }
  return result;
}

/**
 * 把 CSS animation 简写字符串按顶层逗号切分
 * 注意：cubic-bezier(0.1, 0.2) 内的逗号不能切
 */
function splitAnimationShorthand(s) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      out.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

/**
 * 解析 animation 简写字符串
 * 例： "moon-glow 1.5s ease-in-out infinite"
 *      "fade-up 0.7s ease-out forwards"
 * @param {string} shorthand
 * @param {string} className - 用于错误信息
 * @returns {Object|null}
 */
function parseAnimationShorthand(shorthand, className) {
  const tokens = [];
  let buf = '';
  let parenDepth = 0;
  for (let i = 0; i < shorthand.length; i++) {
    const c = shorthand[i];
    if (c === '(') {
      parenDepth++;
      buf += c;
      continue;
    }
    if (c === ')') {
      parenDepth--;
      buf += c;
      continue;
    }
    if (/\s/.test(c) && parenDepth === 0) {
      if (buf) tokens.push(buf);
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf) tokens.push(buf);
  if (tokens.length === 0) return null;

  const result = {
    name: null,
    duration: 0,
    timingFunction: 'ease',
    iterationCount: 1,
    fill: 'none'
  };
  const errors = [];

  for (const tok of tokens) {
    if (/^\d+(\.\d+)?(ms|s)$/.test(tok)) {
      if (tok.endsWith('ms')) {
        result.duration = parseFloat(tok);
      } else {
        result.duration = parseFloat(tok) * 1000;
      }
      continue;
    }
    if (tok === 'infinite' || /^\d+$/.test(tok)) {
      result.iterationCount = tok === 'infinite' ? 'infinite' : parseInt(tok, 10);
      continue;
    }
    if (['none', 'forwards', 'backwards', 'both'].includes(tok)) {
      result.fill = tok;
      continue;
    }
    if (tok.startsWith('cubic-bezier(')) {
      result.timingFunction = tok;
      continue;
    }
    if (tok.startsWith('steps(')) {
      result.timingFunction = tok;
      continue;
    }
    if (SUPPORTED_TIMING_FUNCTIONS.has(tok)) {
      result.timingFunction = tok;
      continue;
    }
    if (result.name === null) {
      result.name = tok;
      continue;
    }
    errors.push(`.${className} 的 animation "${result.name}" 包含不支持的 token "${tok}"`);
  }

  if (result.name === null) {
    errors.push(`.${className} 的 animation 简写 "${shorthand}" 缺少动画名`);
  }
  if (result.duration <= 0) {
    errors.push(`.${className} 的 animation 缺少 duration（如 "1.5s"）`);
  }

  return { result, errors };
}

// ============================================================
// 主转换函数
// ============================================================

/**
 * 转换 HtmlComponent
 * @param {Object} comp - { id, content: { html, css, ... } }
 * @param {Array} srtList - parseSrt 返回的字幕数组
 * @returns {{
 *   elementIds: Object,
 *   animations: Object,
 *   cleanedHtml: string,
 *   cleanedCss: string
 * }}
 */
function transformHtmlComponent(comp, srtList) {
  if (!comp.content || !comp.content.html) {
    return { elementIds: {}, animations: {}, cleanedHtml: '', cleanedCss: '' };
  }

  const html = comp.content.html;
  const css = comp.content.css || '';
  const errors = [];

  validateHtml(html, comp.id);

  const elements = extractElementsWithDataSubtitle(html);

  // 2. 解析 @keyframes，收集 keyframe 属性错误
  const { result: allKeyframes, errors: kfErrors } = parseKeyframes(css);
  errors.push(...kfErrors);

  // 3. CSS 全局扫描：animation-delay 校验
  const delayRe = /\.([\w-]+)\s*\{[^}]*animation(?:-name)?\s*:[^;]*animation-delay\s*:/g;
  let dm;
  while ((dm = delayRe.exec(css)) !== null) {
    errors.push(`类 .${dm[1]} 使用了 animation-delay，前端不支持，请删除或用元素 start/end 时间错开`);
  }

  // 4. 为每个元素建立 elementIds，收集 animation 错误
  const elementIds = {};
  const animMeta = {};

  for (const el of elements) {
    if (el.dataGlobal) {
      elementIds[`#${el.id}`] = { id: el.id };
    } else if (el.dataSubtitle) {
      const indices = parseSubtitleIndexExpr(el.dataSubtitle);
      const range = resolveSubtitleRange(indices, srtList);
      if (range) {
        elementIds[`#${el.id}`] = { id: el.id, start: range.start, end: range.end };
      } else {
        elementIds[`#${el.id}`] = { id: el.id };
      }
    }

    if (el.dataAnimIn) {
      const { result: parsed, errors: animErrors } = parseAnimationShorthand(el.dataAnimIn, el.id);
      errors.push(...animErrors);
      if (parsed) {
        const elemEntry = elementIds[`#${el.id}`];
        if (elemEntry) {
          if (!Array.isArray(elemEntry.animations)) elemEntry.animations = [];
          if (!elemEntry.animations.includes(parsed.name)) elemEntry.animations.push(parsed.name);
          animMeta[parsed.name] = parsed;
        }
      }
    }

    for (const cls of el.classes) {
      const classAnims = parseClassAnimations(css, [cls]);
      for (const [animName, animDef] of Object.entries(classAnims)) {
        const elemEntry = elementIds[`#${el.id}`];
        if (elemEntry) {
          if (!Array.isArray(elemEntry.animations)) elemEntry.animations = [];
          if (!elemEntry.animations.includes(animName)) elemEntry.animations.push(animName);
          if (animDef.iterationCount === 'infinite') {
            elemEntry.animLoop = animName;
          } else {
            elemEntry.animIn = animName;
          }
          if (!animMeta[animName]) animMeta[animName] = animDef;
        }
      }
    }
  }

  // 5. 校验 keyframe 定义
  const usedAnimNames = new Set();
  Object.values(elementIds).forEach(e => {
    if (Array.isArray(e.animations)) e.animations.forEach(n => usedAnimNames.add(n));
    if (e.animIn) usedAnimNames.add(e.animIn);
    if (e.animLoop) usedAnimNames.add(e.animLoop);
    if (e.animOut) usedAnimNames.add(e.animOut);
  });

  for (const name of usedAnimNames) {
    if (!allKeyframes[name]) {
      errors.push(`引用了动画 "${name}"，但 CSS 里没有 @keyframes ${name} 定义`);
    }
  }

  // 6. 构建 animations manifest
  const animations = {};
  for (const name of usedAnimNames) {
    if (!allKeyframes[name]) continue;
    const kfData = allKeyframes[name];
    const meta = animMeta[name] || { duration: 1000, timingFunction: 'ease', iterationCount: 1, fill: 'none' };
    animations[name] = {
      duration: meta.duration,
      timingFunction: meta.timingFunction,
      iterationCount: meta.iterationCount,
      fill: meta.fill,
      keyframes: kfData.keyframes
    };
  }

  // 7. 一次报错全部列出
  buildUnsupportedReport(comp.id, errors);

  return {
    elementIds,
    animations,
    cleanedHtml: html,
    cleanedCss: css
  };
}

// ============================================================
// 工具
// ============================================================

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 主函数
  transformHtmlComponent,
  // 子函数（供测试）
  parseSubtitleIndexExpr,
  resolveSubtitleRange,
  extractElementsWithDataSubtitle,
  parseKeyframes,
  parseAnimationShorthand,
  parseClassAnimations,
  // 支持列表（供校验和文档）
  SUPPORTED_KEYFRAME_PROPS,
  SUPPORTED_TIMING_FUNCTIONS
};
