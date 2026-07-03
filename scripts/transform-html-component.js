/**
 * HtmlComponent 内容转换器
 *
 * 新设计（2026-07）：
 *   - AI 不再手写 id，全部由 merge 阶段自动分配
 *   - AI 写标准 H5+CSS：class + data-subtitle / data-global
 *   - merge 自动给 class 元素分配 id（P{区}-100 起，按 HTML 出现顺序）
 *   - 嵌套在父元素（带 data-subtitle/data-global）内的子元素豁免校验
 *   - 校验严格化：AI 写 id 报错、class 元素无时间控制声明报错
 *   - merge 不再做任何样式/动画的 auto-fix
 *
 * 转换流程：
 *   1. 扫描 HTML 里所有带 class 的元素，建立嵌套关系
 *   2. 校验：AI 写了 id → 报错
 *   3. 校验：class 元素既无 data-subtitle/data-global 又非嵌套子元素 → 报错
 *   4. 自动分配 id：P{区}-100 起，按 HTML 出现顺序
 *   5. 把 id 写回 HTML 标签
 *   6. 从 data-subtitle 解析 start/end，写入 elementIds
 */

'use strict';

const { validateHtml } = require('./validate-html');

// ============================================================
// SRT 字幕解析
// ============================================================

/**
 * 把 SRT 索引表达式转成字幕序号数组
 * @param {string} expr - "1" / "1,3,5" / "1-8"
 * @returns {Array<number>}
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
// HTML 元素扫描（建立嵌套关系）
// ============================================================

/**
 * 扫描 HTML 标签流，提取所有带 class 的元素并建立嵌套关系
 * @param {string} html
 * @returns {Array<{
 *   tagName: string,
 *   classNames: string[],
 *   classAttrValue: string,
 *   hasManualId: boolean,
 *   hasDataSubtitle: boolean,
 *   hasDataGlobal: boolean,
 *   dataSubtitleValue: string|null,
 *   parentClassElement: Object|null,  // 最近的、声明了 data-subtitle/data-global 的 class 祖先
 *   rawTagStart: number,
 *   rawTagEnd: number,
 *   attrsString: string,
 *   isSelfClose: boolean
 * }>}
 */
function analyzeClassElements(html) {
  const results = [];
  // 栈：所有开始标签（包括非 class 的）
  const stack = [];

  const tagRe = /<(\/?)([\w-]+)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const isClose = m[1] === '/';
    const tagName = m[2];
    const attrs = m[3] || '';
    const isSelfClose = m[4] === '/';

    if (isClose) {
      // 弹出最近一个匹配的 tag
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tagName) {
          stack.splice(i, 1);
          break;
        }
      }
      continue;
    }

    const classMatch = attrs.match(/\s+class\s*=\s*(["'])([^"']+)\1/);
    if (!classMatch) {
      // 非 class 元素：只压栈
      if (!isSelfClose) {
        stack.push({ tagName, isClass: false });
      }
      continue;
    }

    // 带 class 的元素
    const classNames = classMatch[2].split(/\s+/).filter(Boolean);
    const idMatch = attrs.match(/\sid\s*=\s*(["'])([^"']+)\1/);
    const hasManualId = !!idMatch;
    const dataSubtitleMatch = attrs.match(/\s+data-subtitle\s*=\s*(["'])([^"']+)\1/);
    const hasDataSubtitle = !!dataSubtitleMatch;
    const dataGlobalMatch = attrs.match(/\s+data-global\s*=\s*(["'])([^"']+)\1/);
    const hasDataGlobal = !!dataGlobalMatch && (dataGlobalMatch[2] === 'true' || dataGlobalMatch[2] === '1');

    // 最近的、声明了时间控制的 class 祖先
    const parentClassElement = [...stack].reverse().find(
      s => s.isClass && (s.hasDataSubtitle || s.hasDataGlobal)
    ) || null;

    const entry = {
      tagName,
      classNames,
      classAttrValue: classMatch[2],
      hasManualId,
      hasDataSubtitle,
      hasDataGlobal,
      dataSubtitleValue: hasDataSubtitle ? dataSubtitleMatch[2] : null,
      parentClassElement,
      rawTagStart: m.index,
      rawTagEnd: m.index + m[0].length,
      attrsString: attrs,
      isSelfClose
    };
    results.push(entry);

    if (!isSelfClose) {
      stack.push({
        tagName,
        isClass: true,
        className: classNames.join(' '),
        hasDataSubtitle,
        hasDataGlobal
      });
    }
  }

  return results;
}

// ============================================================
// 工具
// ============================================================

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 从 comp.id 提取 regionId
 * 例："P1-099" → "P1"
 */
function extractRegionId(comp) {
  if (comp.regionId) return comp.regionId;
  const m = comp.id && comp.id.match(/^(P\d+)/);
  if (m) return m[1];
  throw new Error(`[${comp.id}] 无法提取 regionId，请检查 comp.id 格式（P{区域}-{三位数字}）`);
}

/**
 * 把分配好的 id 写回 HTML 标签
 * 在 class 属性前插入 id="..."
 * @param {string} html
 * @param {Array} elements
 * @param {Map<Object, string>} idMap - element → 分配的 id
 * @returns {string}
 */
function injectIdsToHtml(html, elements, idMap) {
  // 倒序处理，避免 index 偏移
  const sorted = [...elements].sort((a, b) => b.rawTagStart - a.rawTagStart);
  let result = html;
  for (const el of sorted) {
    const newId = idMap.get(el);
    if (!newId) continue;
    const originalTag = html.substring(el.rawTagStart, el.rawTagEnd);
    // 在 class 之前插入 id
    const newTag = originalTag.replace(
      new RegExp(`(\\sclass\\s*=\\s*)(["'])${escapeRegExp(el.classAttrValue)}\\2`),
      ` id="${newId}"$1$2${el.classAttrValue}$2`
    );
    result = result.substring(0, el.rawTagStart) + newTag + result.substring(el.rawTagEnd);
  }
  return result;
}

// ============================================================
// 主转换函数
// ============================================================

/**
 * 转换 HtmlComponent
 * @param {Object} comp - { id, regionId, content: { html, css, ... } }
 * @param {Array} srtList - parseSrt 返回的字幕数组
 * @returns {{
 *   elementIds: Object,    // { "#P1-100": { id, start?, end? } }
 *   animations: Object,    // 始终空对象（保留字段）
 *   cleanedHtml: string,   // 注入了 id 的 HTML
 *   cleanedCss: string     // 原样透传
 * }}
 */
function transformHtmlComponent(comp, srtList) {
  if (!comp.content || !comp.content.html) {
    return { elementIds: {}, animations: {}, cleanedHtml: '', cleanedCss: '' };
  }

  const html = comp.content.html;
  const css = comp.content.css || '';
  const errors = [];

  // 1. 校验 HTML 结构
  validateHtml(html, comp.id);

  // 2. 校验 background.html 里的元素不能带 id
  if (comp.background && comp.background.html) {
    const bgIdRe = /\bid\s*=\s*(["'])([^"']+)\1/g;
    let m;
    const bgIds = [];
    while ((m = bgIdRe.exec(comp.background.html)) !== null) bgIds.push(m[1]);
    if (bgIds.length > 0) {
      errors.push(
        `background.html 里的元素不允许配 id（发现 ${bgIds.map(id => '#' + id).join(', ')}）。` +
        `背景元素由 CSS class 控制；带 id 会被强制禁动画。` +
        `请删除 id 属性。`
      );
    }
  }

  // 3. 扫描所有带 class 的元素
  const elements = analyzeClassElements(html);

  // 4. 校验：AI 写了 id → 报错
  for (const el of elements) {
    if (!el.hasManualId) continue;
    const classDesc = el.classNames.join(' ');
    errors.push(
      `<${el.tagName} class="${classDesc}"> 不允许手写 id 属性。` +
      `id 由 merge 阶段自动分配（P{区}-100 起按出现顺序），请删除 id="..."。`
    );
  }

  // 5. 校验：class 元素必须声明 data-subtitle/data-global（嵌套子元素豁免）
  for (const el of elements) {
    if (el.hasDataSubtitle || el.hasDataGlobal) continue;
    if (el.parentClassElement) continue;  // 嵌套在已声明时间控制的 class 父元素内，豁免
    const classDesc = el.classNames.join(' ');
    errors.push(
      `<${el.tagName} class="${classDesc}"> 必须显式声明 data-subtitle="..." 或 data-global="true"。` +
      `否则该元素无时间控制语义，前端无法渲染。` +
      `data-subtitle 格式："1"（单条）/ "1-8"（范围）/ "1,3,5"（列表）；data-global 始终显示。`
    );
  }

  // 6. 校验 data-subtitle 表达式格式
  for (const el of elements) {
    if (!el.hasDataSubtitle) continue;
    try {
      parseSubtitleIndexExpr(el.dataSubtitleValue);
    } catch (e) {
      const classDesc = el.classNames.join(' ');
      errors.push(
        `<${el.tagName} class="${classDesc}"> data-subtitle="${el.dataSubtitleValue}" 格式错误：${e.message}`
      );
    }
  }

  // 7. 校验 data-global 取值
  for (const el of elements) {
    const m = el.attrsString.match(/\s+data-global\s*=\s*(["'])([^"']+)\1/);
    if (!m) continue;
    const v = m[2];
    if (v !== 'true' && v !== 'false' && v !== '1' && v !== '0') {
      const classDesc = el.classNames.join(' ');
      errors.push(
        `<${el.tagName} class="${classDesc}"> data-global="${v}" 取值只能是 "true" / "false" / "1" / "0"`
      );
    }
  }

  // 先抛错（一次性列出所有错误）
  if (errors.length > 0) {
    throw new Error(`[${comp.id}] 转换失败，共 ${errors.length} 个问题：\n  - ${errors.join('\n  - ')}`);
  }

  // 8. 自动分配 id
  // 起始编号：100（避开顶级组件 001-099）
  let counter = 99;
  const idMap = new Map(); // element → 分配的 id
  for (const el of elements) {
    // 嵌套豁免：父元素是 data-subtitle 控制的，子元素继承时间，不分配 id
    if (el.parentClassElement && el.parentClassElement.hasDataSubtitle && !el.hasDataSubtitle) {
      continue;
    }
    counter++;
    const newId = `${extractRegionId(comp)}-${String(counter).padStart(3, '0')}`;
    idMap.set(el, newId);
  }

  // 9. 把 id 写回 HTML 标签
  const cleanedHtml = injectIdsToHtml(html, elements, idMap);

  // 10. 构建 elementIds
  const elementIds = {};
  for (const el of elements) {
    const newId = idMap.get(el);
    if (!newId) continue;  // 嵌套豁免的元素不进 elementIds
    const entry = { id: newId };
    if (el.hasDataSubtitle) {
      const indices = parseSubtitleIndexExpr(el.dataSubtitleValue);
      const range = resolveSubtitleRange(indices, srtList);
      if (range) {
        entry.start = range.start;
        entry.end = range.end;
      }
    }
    // data-global 不写 start/end（前端视为始终可见）
    elementIds[`#${newId}`] = entry;
  }

  return {
    elementIds,
    animations: {},
    cleanedHtml,
    cleanedCss: css
  };
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  transformHtmlComponent,
  parseSubtitleIndexExpr,
  resolveSubtitleRange,
  analyzeClassElements,
  extractRegionId
};
