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

    // 提取 data-cv-anim（前端动画模板名）
    const cvAnimMatch = allAttrs.match(/\s+data-cv-anim=(["'])([^"']+)\1/);
    const dataCvAnim = cvAnimMatch ? cvAnimMatch[2] : null;
    const cvAnimDurMatch = allAttrs.match(/\s+data-cv-anim-duration=(["'])([^"']+)\1/);
    const dataCvAnimDuration = cvAnimDurMatch ? cvAnimDurMatch[2] : null;
    const cvAnimDelayMatch = allAttrs.match(/\s+data-cv-anim-delay=(["'])([^"']+)\1/);
    const dataCvAnimDelay = cvAnimDelayMatch ? cvAnimDelayMatch[2] : null;

    // 提取 class
    const classMatch = allAttrs.match(/\s+class=(["'])([^"']+)\1/);
    const classes = classMatch ? classMatch[2].split(/\s+/).filter(Boolean) : [];

    results.push({ id, tag, dataSubtitle, dataGlobal, dataAnimIn, dataCvAnim, dataCvAnimDuration, dataCvAnimDelay, classes, rawMatch: m[0] });
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
// validateCentering：校验 standard CSS absolute 居中
// ------------------------------------------------------------
// 校验依据：W3C CSS Position Module Level 3 + MDN transform 文档
//   公开标准：absolute 居中必须配 transform: translate(-50%, -50%)
//   原因：top: 50%; left: 50% 只把"元素的 top-left 角"放在 50%，
//         不是把"元素的中心"放在 50%。要居中必须用 transform 抵消自身尺寸。
//   参考：https://developer.mozilla.org/en-US/docs/Web/CSS/transform
//         https://css-tricks.com/centering-css-complete-guide/
//
// 触发条件（class 内同时满足才报错）：
//   1. 含 animation 声明
//   2. 含 position: absolute|fixed
//   3. 至少一个方向有 50%（top/bottom/left/right）
//   4. 缺少 transform: translate(-50%, -50%) 居中修正
// ============================================================

function classBodyHasAnimation(body) {
  return /(^|;|\s)animation\s*:/i.test(body);
}

function classBodyHasAbsolutePositioning(body) {
  return /(^|;|\s)position\s*:\s*(absolute|fixed)\b/i.test(body);
}

function classBodyHasCenteringIntent(body) {
  const positionMatch = body.match(/(^|;|\s)(top|left|right|bottom)\s*:\s*([^;]+)/gi);
  if (positionMatch) {
    for (const m of positionMatch) {
      if (/\b50\s*%/.test(m)) return true;
    }
  }
  const transformMatch = body.match(/(^|;|\s)transform\s*:\s*([^;]+)/i);
  if (transformMatch && /-50%/.test(transformMatch[2])) return true;
  return false;
}

function classBodyHasCenteringFix(body) {
  const transformMatch = body.match(/(^|;|\s)transform\s*:\s*([^;]+)/i);
  if (!transformMatch) return false;
  const value = transformMatch[2];
  // 居中修正 = 含 -50% 平移即可（方向、组合方式不限）
  if (!/-50%/.test(value)) return false;
  // 任意以下居中变换都算"已修正"
  if (/translate\s*\(\s*-50%\s*,\s*-50%\s*\)/i.test(value)) return true;
  if (/translateX\s*\(\s*-50%\s*\)/i.test(value)) return true;
  if (/translateY\s*\(\s*-50%\s*\)/i.test(value)) return true;
  if (/translate\s*\(\s*0\s*,\s*-50%\s*\)/i.test(value)) return true;
  if (/translate\s*\(\s*-50%\s*,\s*0\s*\)/i.test(value)) return true;
  return false;
}

function validateCentering(compId, css) {
  const errors = [];
  const re = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const cls = m[1];
    const body = m[2];
    if (!classBodyHasAnimation(body)) continue;
    if (!classBodyHasAbsolutePositioning(body)) continue;
    if (!classBodyHasCenteringIntent(body)) continue;
    if (classBodyHasCenteringFix(body)) continue;
    errors.push(
      `[CssError in ${compId} .${cls}]\n` +
      `检测到 absolute 居中（top/left/right/bottom 含 50%）但缺少 transform: translate(-50%, -50%) 居中修正。\n` +
      `原因：top: 50%; left: 50% 只把元素"左上角"放在 50%，不是"中心"在 50%。要真正居中必须用 transform 抵消自身尺寸。\n\n` +
      `正确写法：\n` +
      `  .${cls} {\n` +
      `    position: absolute;\n` +
      `    top: 50%;\n` +
      `    left: 50%;\n` +
      `    transform: translate(-50%, -50%);  /* 必须加这一行 */\n` +
      `  }\n\n` +
      `参考：https://developer.mozilla.org/en-US/docs/Web/CSS/transform`
    );
  }
  return errors;
}

// ============================================================
// validateKeyframeProps：校验 @keyframes 内只允许白名单属性
// ------------------------------------------------------------
// 校验依据：CSS Animations Level 1 规范
//   公开标准：https://www.w3.org/TR/css-animations-1/
//   规范 § 2.1 列出所有 animate-able 属性
//   已被白名单包含的：opacity, transform, box-shadow, text-shadow,
//                     color, background-color, border-color, filter,
//                     stroke-dashoffset, stroke-dasharray, clip-path
//   不在白名单的：width, height, font-size, top, left, right, bottom,
//                margin, padding 等
//   原因：CSS 规范不支持这些属性的插值动画；前端 JS 动画系统也
//        无法实现（需 discrete step）。
//   替代方案：width 动画 → transform: scaleX()；
//             font-size → transform: scale()；
//             位置 → transform: translate()。
// ============================================================

function validateKeyframeProps(compId, allKeyframes) {
  const errors = [];
  for (const [kfName, kf] of Object.entries(allKeyframes)) {
    for (const frame of kf.frames || []) {
      for (const prop of Object.keys(frame)) {
        if (prop === 'offset' || prop === 'easing') continue;
        if (SUPPORTED_KEYFRAME_PROPS.has(prop)) continue;
        errors.push(
          `[CssError in ${compId} @keyframes ${kfName}]\n` +
          `检测到 keyframe 使用了不支持的属性 "${prop}"。\n` +
          `原因：CSS Animations Level 1 规范不支持该属性的插值动画。\n\n` +
          `替代方案：\n` +
          `  width 动画     → transform: scaleX()\n` +
          `  height 动画    → transform: scaleY()\n` +
          `  font-size 动画 → transform: scale()\n` +
          `  top/left 等位置 → transform: translate()\n\n` +
          `允许的属性：${Array.from(SUPPORTED_KEYFRAME_PROPS).join(', ')}\n\n` +
          `参考：https://www.w3.org/TR/css-animations-1/`
        );
      }
    }
  }
  return errors;
}

// ============================================================
// autoSplitCentering：解决"居中 transform + animation"冲突
// ------------------------------------------------------------
// 背景：JS 动画系统在动画进行时会用 keyframe 中的 transform
//       覆盖 el.style.transform，导致 AI 写的
//       `transform: translate(-50%, -50%)` 居中失效。
//
// 解决：检测"含 animation + 绝对定位"的 class：
//       - 把 position / top / left / right / bottom 搬到 wrapper 上
//       - wrapper 自动加 transform: translate(-50%, -50%) 居中
//       - 原 class 保留 animation 和其他非定位属性
//       - HTML 改造：原元素外包 wrapper
//       解决"AI 写 absolute 居中 + animation"的标准场景
// ============================================================

function hasAnimationDecl(body) {
  return /(^|;|\s)animation\s*:/i.test(body);
}

function hasAbsolutePositioning(body) {
  return /(^|;|\s)position\s*:\s*(absolute|fixed)\b/i.test(body);
}

const POSITION_KEYS = ['position', 'top', 'left', 'right', 'bottom'];
const POSITION_OFFSET_KEYS = ['top', 'left', 'right', 'bottom'];

function extractPositionAndTransform(body) {
  const lines = body.split(';');
  const keep = [];
  const positionProps = {};
  let transform = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(position|top|left|right|bottom)\s*:\s*(.+)$/i);
    if (m) {
      const key = m[1].toLowerCase();
      positionProps[key] = m[2].trim();
      continue;
    }
    const tm = line.match(/^transform\s*:\s*(.+)$/i);
    if (tm && /-50%/.test(tm[1])) {
      transform = tm[1].trim();
      continue;
    }
    keep.push(line);
  }
  const newBody = keep.length > 0 ? keep.join('; ') + ';' : '';
  return { newBody, positionProps, transform };
}

function hasCenteringIntent(positionProps, transform) {
  if (transform && /-50%/.test(transform)) return true;
  for (const key of POSITION_OFFSET_KEYS) {
    const v = positionProps[key];
    if (v != null && /\b50\s*%/.test(v)) return true;
  }
  return false;
}

function findCenteringConflicts(css) {
  const conflicts = [];
  const re = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const cls = m[1];
    const body = m[2];
    if (!hasAnimationDecl(body)) continue;
    if (!hasAbsolutePositioning(body)) continue;
    const { newBody, positionProps, transform } = extractPositionAndTransform(body);
    const hasOffset = POSITION_OFFSET_KEYS.some(k => positionProps[k] != null);
    if (!hasOffset) continue;
    if (!hasCenteringIntent(positionProps, transform)) continue;
    conflicts.push({ className: cls, originalBody: body, newBody, positionProps, transform });
  }
  return conflicts;
}

function makeWrapperClassName(className, idx) {
  return `cv-c-${idx}-${className}`;
}

function buildWrapperDeclarations(positionProps, transform) {
  const decls = [];
  for (const key of POSITION_KEYS) {
    if (positionProps[key] != null) {
      decls.push(`${key}: ${positionProps[key]}`);
    }
  }
  if (transform) {
    decls.push(`transform: ${transform}`);
  } else {
    decls.push('transform: translate(-50%, -50%)');
  }
  return decls.join('; ');
}

function patchCssWithWrappers(css, conflicts) {
  const classMap = {};
  const wrapperRules = [];
  conflicts.forEach((c, idx) => {
    const wrapperClass = makeWrapperClassName(c.className, idx);
    classMap[c.className] = wrapperClass;
    const decls = buildWrapperDeclarations(c.positionProps, c.transform);
    wrapperRules.push(`.${wrapperClass} { ${decls} }`);
    const re = new RegExp(
      `(\\.${escapeRegExp(c.className)}\\s*\\{)([^}]*)(\\})`,
      'g'
    );
    css = css.replace(re, (_, p, b, s) => p + c.newBody + s);
  });
  if (wrapperRules.length > 0) {
    css = css.trimEnd() + '\n\n/* === auto-generated centering wrappers === */\n' + wrapperRules.join('\n') + '\n';
  }
  return { css, wrappers: wrapperRules, classMap };
}

function findMatchingCloseTag(html, tagName, startPos) {
  const openRe = new RegExp(`<${tagName}(?:\\s|>)`, 'gi');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
  let depth = 1;
  let pos = startPos;
  while (pos < html.length && depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const openMatch = openRe.exec(html);
    const closeMatch = closeRe.exec(html);
    if (!closeMatch) return -1;
    if (openMatch && openMatch.index < closeMatch.index) {
      depth++;
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth--;
      pos = closeMatch.index + closeMatch[0].length;
      if (depth === 0) return closeMatch.index;
    }
  }
  return -1;
}

function findElementSpan(html, attrStartIdx) {
  const ltIdx = html.lastIndexOf('<', attrStartIdx);
  if (ltIdx === -1) return null;
  if (html[ltIdx + 1] === '/' || html[ltIdx + 1] === '!') return null;
  const gtIdx = html.indexOf('>', ltIdx);
  if (gtIdx === -1) return null;
  if (html[gtIdx - 1] === '/') return null;
  const tagMatch = html.slice(ltIdx, gtIdx).match(/^<(\w+)/);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];
  const endIdx = findMatchingCloseTag(html, tagName, gtIdx + 1);
  if (endIdx === -1) return null;
  return { openStart: ltIdx, openEnd: gtIdx + 1, closeStart: endIdx, closeEnd: endIdx + (`</${tagName}>`).length };
}

function wrapHtmlElements(html, classMap) {
  const conflictClassNames = Object.keys(classMap);
  if (conflictClassNames.length === 0) return html;

  for (const className of conflictClassNames) {
    const wrapperClass = classMap[className];
    const classAttrRe = new RegExp(
      `class\\s*=\\s*(["'])([^"']*?\\b${escapeRegExp(className)}\\b[^"']*?)\\1`,
      'g'
    );

    const spans = [];
    let m;
    while ((m = classAttrRe.exec(html)) !== null) {
      const span = findElementSpan(html, m.index);
      if (span) spans.push(span);
    }

    spans.sort((a, b) => b.openStart - a.openStart);
    for (const span of spans) {
      html =
        html.slice(0, span.openStart) +
        `<div class="${wrapperClass}">` +
        html.slice(span.openStart, span.closeEnd) +
        `</div>` +
        html.slice(span.closeEnd);
    }
  }

  return html;
}

function autoSplitCentering(html, css) {
  const conflicts = findCenteringConflicts(css);
  if (conflicts.length === 0) {
    return { html, css, splits: [] };
  }
  const { css: patchedCss, classMap } = patchCssWithWrappers(css, conflicts);
  const patchedHtml = wrapHtmlElements(html, classMap);
  return {
    html: patchedHtml,
    css: patchedCss,
    splits: conflicts.map((c, i) => ({
      className: c.className,
      wrapperClass: classMap[c.className],
      positionProps: c.positionProps,
      transform: c.transform
    }))
  };
}

// ============================================================
// 主转换函数
// ============================================================

/**
 * 转换 HtmlComponent（新版本）
 * @param {Object} comp - { id, content: { html, css, ... } }
 * @param {Array} srtList - parseSrt 返回的字幕数组
 * @returns {{
 *   elementIds: Object,
 *   animations: Object,   // 空，动画由前端 data-cv-anim 接管
 *   cleanedHtml: string,
 *   cleanedCss: string
 * }}
 *
 * 职责说明：
 *   - 校验 HTML 结构
 *   - 解析 data-subtitle（时间可见性）
 *   - 解析 data-cv-anim（动画名，透传到前端）
 *   - 不解析 @keyframes / animation CSS 属性（前端强制禁掉）
 *   - cleanedHtml / cleanedCss 等于原值，不修改
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

  const elementIds = {};

  for (const el of elements) {
    let entry = { id: el.id };

    if (el.dataGlobal) {
      // 全局元素：无时间控制
    } else if (el.dataSubtitle) {
      const indices = parseSubtitleIndexExpr(el.dataSubtitle);
      const range = resolveSubtitleRange(indices, srtList);
      if (range) {
        entry.start = range.start;
        entry.end = range.end;
      }
    }

    // 解析 data-cv-anim（前端动画模板名）
    if (el.dataCvAnim) {
      entry.animName = el.dataCvAnim;
      entry.animDuration = el.dataCvAnimDuration || null;
      entry.animDelay = el.dataCvAnimDelay || null;
    }

    elementIds[`#${el.id}`] = entry;
  }

  buildUnsupportedReport(comp.id, errors);

  return {
    elementIds,
    animations: {},   // 前端不再用此字段，动画由 data-cv-anim 接管
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
