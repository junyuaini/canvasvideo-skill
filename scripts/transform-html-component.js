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
 *   - 白名单约束（keyframe 名、属性、timing function）
 *   - 错误信息直接告诉 AI 怎么改
 *   - 失败时抛错阻断打包
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================
// 白名单定义
// ============================================================

/**
 * 支持的 keyframe 名（建议白名单，运行时不做硬限制）
 * AI 写的 @keyframes 名在建议列表内更好（语义清晰），但允许自定义
 * 错误规则：保留这些白名单值是为了文档推荐；运行时不再阻断
 */
const SUGGESTED_KEYFRAME_NAMES = new Set([
  // 入场
  'fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right',
  'scale-in', 'scale-out', 'scale-up', 'scale-down',
  'pop-in', 'pop-out',
  'slide-in-left', 'slide-in-right', 'slide-in-up', 'slide-in-down',
  // 出场
  'fade-out',
  // 持续
  'pulse', 'glow', 'flicker', 'float', 'breathe', 'spin', 'shimmer',
  'pulse-strong', 'pulse-fast', 'shake', 'shake-strong', 'swing',
  'pulse-dot', 'ring-spread', 'light-sweep', 'heartbeat', 'draw-line',
  // 工具
  'blink', 'flip-in', 'flip-out', 'crack-grow', 'x-pop'
]);

/**
 * 支持的 keyframe 内部属性（白名单，运行时硬限制）
 * 允许的 keyframe 属性是为了保障 JS 端能精确插值
 * 数字属性（opacity）直接线性插值；transform 解析后插值；颜色/阴影解析后插值
 */
const SUPPORTED_KEYFRAME_PROPS = new Set([
  'opacity', 'transform',
  'box-shadow', 'text-shadow',
  'color', 'background-color', 'border-color',
  'filter',
  'stroke-dashoffset', 'stroke-dasharray',
  'clip-path'
]);

/**
 * 支持的 timing function
 * 不允许 cubic-bezier() 自定义曲线
 */
const SUPPORTED_TIMING_FUNCTIONS = new Set([
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
  'cubic-bezier(0.34, 1.56, 0.64, 1)',  // back-out（弹性出场）
  'cubic-bezier(0.68, -0.55, 0.27, 1.55)'  // 弹性
]);

/**
 * 支持的 iterationCount
 */
const SUPPORTED_ITERATION_COUNTS = new Set(['1', 'infinite']);

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

/**
 * 两步校验：
 *   1. 所有带 class 的元素必须有 id（但 svg 内部图形原子豁免：circle/path/line/rect/...）
 *   2. 所有带 id 的元素必须有 data-subtitle 或 data-global="true"（二选一，互斥）
 * 失败时抛错，错误信息含元素位置以便 AI 修复
 */
function validateHtmlBindings(html) {
  // svg 内部图形原子不需要 id（AI 不会单独控制它们）
  const SVG_INNER_TAGS = new Set([
    'circle', 'path', 'line', 'rect', 'polygon', 'polyline',
    'ellipse', 'g', 'text', 'tspan', 'use', 'image', 'defs', 'linearGradient',
    'radialGradient', 'stop', 'animate', 'animateTransform', 'animateMotion'
  ]);

  // 第一步：class 必有 id（svg 内部豁免）
  const classRe = /<(\w+)([^>]*?)\s+class=(["'])([^"']+)\3([^>]*?)>/g;
  let m;
  const classNoId = [];
  while ((m = classRe.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    if (SVG_INNER_TAGS.has(tag)) continue;  // svg 内部图形原子豁免
    const attrs = m[2] + m[5];
    if (!/\sid=(["'])/.test(attrs)) {
      classNoId.push(m[0].slice(0, 80));
    }
  }
  if (classNoId.length > 0) {
    throw new Error(
      `[第一步校验] 有 class 但没 id 的元素（${classNoId.length} 个，svg 内部已豁免）：\n  ` +
      classNoId.join('\n  ') +
      '\n修复：给这些元素加 id="..."'
    );
  }

  // 第二步：id 必有 data-subtitle 或 data-global
  const idRe = /<(\w+)([^>]*?)\s+id=(["'])([^"']+)\3([^>]*?)>/g;
  const idNoBind = [];
  const idConflict = [];
  const seenIds = new Set();
  const dupIds = [];
  while ((m = idRe.exec(html)) !== null) {
    const attrs = m[2] + m[5];
    const id = m[4];
    const hasSub = /\sdata-subtitle=/.test(attrs);
    const globalMatch = attrs.match(/\s+data-global=(["'])([^"']+)\1/);
    const hasGlobal = globalMatch ? (globalMatch[2] === 'true' || globalMatch[2] === '1') : false;

    if (seenIds.has(id)) {
      dupIds.push(id);
    } else {
      seenIds.add(id);
    }

    if (hasSub && hasGlobal) {
      idConflict.push(id);
    } else if (!hasSub && !hasGlobal) {
      idNoBind.push(id);
    }
  }
  if (dupIds.length > 0) {
    throw new Error(`[第二步校验] id 重复：${[...new Set(dupIds)].join(', ')}`);
  }
  if (idConflict.length > 0) {
    throw new Error(
      `[第二步校验] data-subtitle 和 data-global 同时存在（互斥，${idConflict.length} 个）：\n  ` +
      idConflict.join(', ') +
      '\n修复：二选一，全局元素只写 data-global="true"，专属元素只写 data-subtitle="..."'
    );
  }
  if (idNoBind.length > 0) {
    throw new Error(
      `[第二步校验] 有 id 但没归属的元素（${idNoBind.length} 个）：\n  ` +
      idNoBind.join(', ') +
      '\n修复：给这些元素加 data-subtitle="N"（专属）或 data-global="true"（全局）'
    );
  }
}

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
  // 匹配 @keyframes name { ... }（支持嵌套大括号）
  const re = /@keyframes\s+([a-zA-Z_-][\w-]*)\s*\{/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const name = match[1];
    const start = match.index + match[0].length;
    // 找到匹配的右大括号
    let depth = 1;
    let i = start;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    const body = css.substring(start, i - 1);

    try {
      const keyframes = parseKeyframeBody(body);
      if (keyframes.length > 0) {
        result[name] = { keyframes };
      }
    } catch (err) {
      throw new Error(`@keyframes "${name}" 解析失败：${err.message}`);
    }
  }
  return result;
}

/**
 * 解析单个 @keyframes 的 body
 * @param {string} body - "0%, 100% { opacity: 1 } 50% { opacity: 0.5 }"
 * @returns {Array<{offset, props}>}
 */
function parseKeyframeBody(body) {
  const keyframes = [];
  // 匹配 "0%, 100% { ... }" 或 "from { ... }"
  const re = /((?:\d+%|from|to)(?:\s*,\s*(?:\d+%|from|to))*)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const selectors = m[1].split(',').map(s => s.trim());
    const props = parseKeyframeProps(m[2]);

    // 校验属性（兼容驼峰和连字符）
    for (const key of Object.keys(props)) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (!SUPPORTED_KEYFRAME_PROPS.has(key) && !SUPPORTED_KEYFRAME_PROPS.has(kebabKey)) {
        throw new Error(
          `属性 "${key}" 不在白名单内。\n` +
          `支持的属性: ${Array.from(SUPPORTED_KEYFRAME_PROPS).join(', ')}。\n` +
          `如需 transform 内的 translate/scale/rotate，请用 transform: translateY(20px) 形式。`
        );
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
    throw new Error('keyframes 块为空或格式错误');
  }

  // 排序
  keyframes.sort((a, b) => a.offset - b.offset);

  // 补 from / to
  if (keyframes[0].offset > 0) {
    keyframes.unshift({ offset: 0, ...keyframes[0] });
  }
  if (keyframes[keyframes.length - 1].offset < 1) {
    keyframes.push({ offset: 1, ...keyframes[keyframes.length - 1] });
  }

  return keyframes;
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
    // 匹配 .classname { ... animation: ... ... ... }
    const re = new RegExp(
      `\\.${escapeRegExp(cls)}\\s*\\{([^}]*)\\}`,
      'g'
    );
    let m;
    while ((m = re.exec(css)) !== null) {
      const body = m[1];
      const animMatch = body.match(/(?:^|;)\s*animation\s*:\s*([^;]+)/);
      if (animMatch) {
        // CSS 标准：animation 简写支持逗号分隔多个动画
        // 例：animation: shake 0.6s ease-out forwards, fade-in 0.4s ease-out forwards
        const animStr = animMatch[1].trim();
        const shorthandList = splitAnimationShorthand(animStr);
        for (const sh of shorthandList) {
          const parsed = parseAnimationShorthand(sh, cls);
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
  // 先用括号保护的方式切：cubic-bezier(...) / steps(...) 内部不切
  const tokens = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < shorthand.length; i++) {
    const c = shorthand[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (/\s/.test(c) && depth === 0) {
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

  for (const tok of tokens) {
    // duration (e.g., "1.5s" or "1500ms")
    if (/^\d+(\.\d+)?(ms|s)$/.test(tok)) {
      if (tok.endsWith('ms')) {
        result.duration = parseFloat(tok);
      } else {
        result.duration = parseFloat(tok) * 1000;
      }
      continue;
    }
    // iteration-count
    if (tok === 'infinite' || /^\d+$/.test(tok)) {
      result.iterationCount = tok === 'infinite' ? 'infinite' : parseInt(tok, 10);
      continue;
    }
    // fill-mode
    if (['none', 'forwards', 'backwards', 'both'].includes(tok)) {
      result.fill = tok;
      continue;
    }
    // timing function（含 cubic-bezier(...)）
    if (tok.startsWith('cubic-bezier(') || tok.startsWith('steps(') || SUPPORTED_TIMING_FUNCTIONS.has(tok)) {
      result.timingFunction = tok;
      continue;
    }
    // 兜底：第一个不是数字/infinite/timing/fill 的 token 就是 name
    if (result.name === null) {
      result.name = tok;
      continue;
    }
    // 多个未识别 token 报错
    throw new Error(
      `.${className} 的 animation 简写 "${shorthand}" 包含不支持的 token "${tok}"。\n` +
      `支持的 timing function: ${Array.from(SUPPORTED_TIMING_FUNCTIONS).join(', ')}。\n` +
      `注意：不支持 cubic-bezier() 自定义曲线。`
    );
  }

  if (!result.name) {
    throw new Error(`.${className} 的 animation 简写 "${shorthand}" 缺少动画名（第一个 token）。`);
  }
  if (result.duration <= 0) {
    throw new Error(
      `.${className} 的 animation "${result.name}" 缺少 duration（如 "1.5s"）。\n` +
      `完整格式: ${result.name} 1.5s ease-in-out infinite`
    );
  }

  // 提示但不阻断：keyframes 名不在建议列表
  if (!SUGGESTED_KEYFRAME_NAMES.has(result.name)) {
    // 这里只记录建议，不抛错（白名单只针对 keyframe 内部属性）
    // R11 文档会展示建议列表，AI 仍可使用语义化自定义命名
  }

  return result;
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

  // 0. 两步强校验：class 必有 id，id 必有归属（data-subtitle / data-global 二选一，互斥）
  validateHtmlBindings(html);

  // 1. 提取所有带 id 的元素（含 data-subtitle / data-global / data-anim-in）
  const elements = extractElementsWithDataSubtitle(html);

  // 2. 解析 @keyframes（全局）
  const allKeyframes = parseKeyframes(css);

  // 3. 为每个元素建立 elementIds，并解析 class 上的 animation
  const elementIds = {};
  const animMeta = {};  // animation name → {duration, timingFunction, iterationCount, fill}（data-anim-in 优先，class animation 兜底）

  for (const el of elements) {
    // 处理归属：data-global 或 data-subtitle
    if (el.dataGlobal) {
      // 全局元素：不设 start/end，前端走 component 边界（= region 边界）
      elementIds[`#${el.id}`] = { id: el.id };
    } else if (el.dataSubtitle) {
      // 专属元素：从 SRT 推算 start/end
      const indices = parseSubtitleIndexExpr(el.dataSubtitle);
      const range = resolveSubtitleRange(indices, srtList);
      if (range) {
        elementIds[`#${el.id}`] = {
          id: el.id,
          start: range.start,
          end: range.end
        };
      } else {
        // 字幕索引无效：保留 id 但无时间（前端按 component 边界兜底）
        elementIds[`#${el.id}`] = { id: el.id };
      }
    }

    // 处理 data-anim-in（AI 显式声明入场动画的完整简写）
    // 例：data-anim-in="pop-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
    if (el.dataAnimIn) {
      const parsed = parseAnimationShorthand(el.dataAnimIn, el.id);
      if (parsed) {
        const elemEntry = elementIds[`#${el.id}`];
        if (elemEntry) {
          if (!Array.isArray(elemEntry.animations)) elemEntry.animations = [];
          if (!elemEntry.animations.includes(parsed.name)) {
            elemEntry.animations.push(parsed.name);
          }
          // 写入元数据（data-anim-in 优先于 class 提取的同名动画）
          animMeta[parsed.name] = parsed;
        }
      }
    }

    // 处理 class 上的 animation
    // 每个元素独立扫一遍 class 上的 animation（多元素共享 class 时都能拿到）
    for (const cls of el.classes) {
      const classAnims = parseClassAnimations(css, [cls]);
      for (const [animName, animDef] of Object.entries(classAnims)) {
        const elemEntry = elementIds[`#${el.id}`];
        if (elemEntry) {
          // animations 数组：记录所有引用的 keyframe 名（前端会按 CSS 规则并行播放）
          if (!Array.isArray(elemEntry.animations)) elemEntry.animations = [];
          if (!elemEntry.animations.includes(animName)) {
            elemEntry.animations.push(animName);
          }
          // 兼容字段：区分入场/持续（前端可按需使用）
          if (animDef.iterationCount === 'infinite') {
            elemEntry.animLoop = animName;
          } else {
            elemEntry.animIn = animName;
          }
          // 元数据兜底（data-anim-in 已写过的同名 keyframe 不覆盖）
          if (!animMeta[animName]) {
            animMeta[animName] = animDef;
          }
        }
      }
    }
  }

  // 4. 合并 animations manifest
  // 关键：所有引用到的 keyframe 必须有 @keyframes 定义
  const animations = {};
  const usedAnimNames = new Set();
  Object.values(elementIds).forEach(e => {
    // 优先从 animations 数组收集（多 animation 支持）
    if (Array.isArray(e.animations)) {
      e.animations.forEach(n => usedAnimNames.add(n));
    }
    // 兼容：单数字段
    if (e.animIn) usedAnimNames.add(e.animIn);
    if (e.animLoop) usedAnimNames.add(e.animLoop);
    if (e.animOut) usedAnimNames.add(e.animOut);
  });

  // 校验：每个用到的 keyframe 名必须在 CSS 里定义
  for (const name of usedAnimNames) {
    if (!allKeyframes[name]) {
      // 找相似名（建议列表里最接近的）
      const similar = Array.from(SUGGESTED_KEYFRAME_NAMES).filter(n =>
        n.includes(name) || name.includes(n)
      ).slice(0, 3);

      throw new Error(
        `元素引用了动画 "${name}"，但 CSS 里没有 @keyframes ${name} 定义。\n` +
        `请在 CSS 里添加：\n` +
        `  @keyframes ${name} { from { ... } to { ... } }\n` +
        (similar.length > 0 ? `相似动画: ${similar.join(', ')}` : '')
      );
    }
  }

  for (const name of usedAnimNames) {
    const kfData = allKeyframes[name];
    // 优先用 animMeta（data-anim-in 优先，其次 class 提取的）
    const meta = animMeta[name] || { duration: 1000, timingFunction: 'ease', iterationCount: 1, fill: 'none' };
    animations[name] = {
      duration: meta.duration,
      timingFunction: meta.timingFunction,
      iterationCount: meta.iterationCount,
      fill: meta.fill,
      keyframes: kfData.keyframes
    };
  }

  // 5. 清理 HTML（去掉 data-subtitle 属性，保留其他）
  // 同时处理单引号和双引号
  let cleanedHtml = html
    .replace(/\s+data-subtitle="[^"]+"/g, '')
    .replace(/\s+data-subtitle='[^']+'/g, '');

  // 6. 清理 CSS（去掉 class 上的 animation 简写，保留 @keyframes 供 fallback）
  let cleanedCss = css.replace(
    /((?:\.\w[\w-]*\s*,\s*)*(?:\.\w[\w-]*)\s*\{[^}]*?)\s*animation\s*:\s*[^;}]+;?/g,
    '$1'
  );

  return {
    elementIds,
    animations,
    cleanedHtml,
    cleanedCss
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
  // 白名单（供 R11 文档生成）
  SUGGESTED_KEYFRAME_NAMES,
  SUPPORTED_KEYFRAME_PROPS,
  SUPPORTED_TIMING_FUNCTIONS
};
