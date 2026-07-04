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
    // 父 class 元素：取栈中最近的 class 祖先（无论是否带 data-*）
    // 用于：1) R15 自动补 data-global 时跳过嵌套子元素；2) R15.1 60% 上限统计顶级元素
    // 之前只找带 data-* 的祖先，导致嵌套在未带 data-* 的 class 父级下的子元素被误判为顶级
    const parentClassElement = [...stack].reverse().find(s => s.isClass) || null;

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
// CSS class 加前缀（跨 region 防冲突）
// ============================================================
//
// 背景：前端 HtmlComponent 把 component.css 注入到组件容器的子 <style> 标签里。
// HTML 规范下 body 内的 <style> 是全局 CSSOM，会跨 region 互相覆盖同名 class。
//
// 本函数把 component.css 内的所有 class 选择器、@keyframes 名、animation 引用
// 统一加 {regionId}- 前缀（如 "item-title" → "p2-item-title"）。
// 配套的 HTML class 属性也会同步改写。
//
// 注意：
//   - 不处理 background.css（背景的 class 由 region 内独占使用，无跨 region 风险）
//   - 不处理 element.tagName 选择器（type 选择器全局唯一）
//   - 不处理 ID 选择器（id 由 merge 自动分配，已含 region 前缀）
//   - 不处理伪类/伪元素（:hover、::before 等保持原样）

/**
 * 从 CSS 中提取所有 class 选择器名
 * @param {string} css
 * @returns {Set<string>}
 */
function extractClassNamesFromCss(css) {
  const classSet = new Set();
  const stripped = css.replace(/url\([^)]*\)/g, '');
  // CSS 标识符不能以数字开头（class 名、属性名都不能）。要求首字符是字母/下划线/连字符。
  // 这样 0.5s、1.5em 等数字 + 小数点不会被误识别。
  const re = /\.([a-zA-Z_-][\w-]*)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    classSet.add(m[1]);
  }
  return classSet;
}

/**
 * 从 CSS 中提取所有 @keyframes 名称
 * @param {string} css
 * @returns {Set<string>}
 */
function extractKeyframesFromCss(css) {
  const names = new Set();
  const re = /@(?:-webkit-|-moz-|-o-)?keyframes\s+([\w-]+)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    names.add(m[1]);
  }
  return names;
}

/**
 * 给 CSS 字符串加前缀
 * @param {string} css
 * @param {string} prefix - 区域前缀，如 "p2"
 * @returns {string}
 */
function prefixCss(css, prefix) {
  if (!css || !prefix) return css;
  const classes = extractClassNamesFromCss(css);
  const keyframes = extractKeyframesFromCss(css);

  let result = css;

  // 1. 替换 .className 为 .{prefix-className}
  const classList = [...classes].sort((a, b) => b.length - a.length);
  for (const cls of classList) {
    if (cls.startsWith(prefix + '-')) continue;
    // 匹配 .cls 后不接 [a-zA-Z0-9_-]（避免误伤 .foo-bar 中 .foo）
    // 前置要求：. 前面不应该是数字（避免误伤 0.5 中的 .5）
    const re = new RegExp(`(?<![\\d.])\\.${escapeRegExp(cls)}(?![\\w-])`, 'g');
    result = result.replace(re, `.${prefix}-${cls}`);
  }

  // 2. 替换 @keyframes name 和 animation 引用
  const keyframesList = [...keyframes].sort((a, b) => b.length - a.length);
  for (const name of keyframesList) {
    if (name.startsWith(prefix + '-')) continue;
    result = result.replace(
      new RegExp(`(@(?:-webkit-|-moz-|-o-)?keyframes\\s+)${escapeRegExp(name)}(?![\\w-])`, 'g'),
      `$1${prefix}-${name}`
    );
    result = result.replace(
      new RegExp(`(animation(?:-name)?\\s*:\\s*)${escapeRegExp(name)}(?![\\w-])`, 'g'),
      `$1${prefix}-${name}`
    );
  }

  return result;
}

/**
 * 给 HTML 字符串中的 class 属性值加前缀
 * @param {string} html
 * @param {string} prefix
 * @returns {string}
 */
function prefixHtmlClass(html, prefix) {
  if (!html || !prefix) return html;
  return html.replace(
    /(\bclass\s*=\s*)(["'])([^"']+)\2/g,
    (match, prefixAttr, quote, classStr) => {
      const newClassStr = classStr
        .split(/\s+/)
        .filter(Boolean)
        .map(cls => {
          if (cls.startsWith(prefix + '-')) return cls;
          return `${prefix}-${cls}`;
        })
        .join(' ');
      return `${prefixAttr}${quote}${newClassStr}${quote}`;
    }
  );
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

  // 0. R16 跨 region CSS 隔离：自动给所有 class 和 @keyframes 加 {region}- 前缀
  //    原因：前端 HtmlComponent 把 css 注入到组件容器子 <style> 标签里，
  //    body 内的 <style> 是全局 CSSOM，多 region 同名 class 互相覆盖。
  //    必须在所有其他处理之前做（确保 analyzeClassElements 看到的是前缀化后的名字）。
  const regionId = extractRegionId(comp).toLowerCase();  // p1, p2, ...
  const html = prefixHtmlClass(comp.content.html, regionId);
  const css = prefixCss(comp.content.css || '', regionId);

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
  // R15 新约定：AI 只写 data-subtitle；缺 data-* 时 merge 自动补 data-global="true"（不再报错）
  // 旧约定下这里是 throw errors.push(...)；R15 改为自动补全
  for (const el of elements) {
    if (el.hasDataSubtitle || el.hasDataGlobal) continue;
    if (el.parentClassElement && el.parentClassElement.hasDataSubtitle) continue;  // 父级带 data-subtitle，嵌套子元素豁免
    // R15：自动补 data-global="true"
    el.hasDataGlobal = true;
    el.autoInjectedDataGlobal = true;
  }

  // 5.1 R15 互斥校验：data-subtitle 和 data-global 不能同时存在
  for (const el of elements) {
    if (el.hasDataSubtitle && el.hasDataGlobal) {
      const classDesc = el.classNames.join(' ');
      errors.push(
        `<${el.tagName} class="${classDesc}"> 同时含 data-subtitle 和 data-global，互斥（R15 规则）。` +
        `AI 只能写 data-subtitle；要全局显示则不写 data-*，由 merge 自动补。`
      );
    }
  }

  // 5.2 R15.1 50% 上限校验：data-subtitle 元素 ≤ 50% 总顶级 class 元素
  // 统计：仅顶级 class 元素（不含嵌套继承的子元素）
  const topClassElements = elements.filter(el => !el.parentClassElement);
  const totalTopClass = topClassElements.length;
  const subtitleTopClass = topClassElements.filter(el => el.hasDataSubtitle).length;
  if (totalTopClass > 2) {
    const ratio = subtitleTopClass / totalTopClass;
    if (ratio > 0.6) {
      errors.push(
        `R15.1 60% 上限校验失败：\n` +
        `  data-subtitle 元素 = ${subtitleTopClass}（占比 ${(ratio * 100).toFixed(1)}%）\n` +
        `  总顶级 class 元素 = ${totalTopClass}\n` +
        `  60% 上限 = ${Math.floor(totalTopClass * 0.6)}\n` +
        `  → 请将 ≥ ${subtitleTopClass - Math.floor(totalTopClass * 0.6)} 个元素改为不写 data-*，由 merge 自动补 data-global="true"。\n` +
        `  → 参考：rules/06-components.md §R15.1`
      );
    } else if (ratio > 0.5) {
      console.warn(
        `[W] [${comp.id}] R15.1 60% 上限警告：data-subtitle 元素占比 ${(ratio * 100).toFixed(1)}%（接近上限 60%），建议把部分装饰元素留空。`
      );
    }
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
  let cleanedHtml = injectIdsToHtml(html, elements, idMap);

  // 9.5 R15 自动补全：把 data-global="true" 写回 HTML（如果该元素是被自动补的）
  for (const el of elements) {
    if (!el.autoInjectedDataGlobal) continue;
    if (!el.classNames || el.classNames.length === 0) continue;
    // 在 class 属性后插入 data-global="true"
    const originalTag = cleanedHtml.substring(el.rawTagStart, el.rawTagEnd);
    // 注意：rawTagStart/rawTagEnd 是在原始 html 中的位置，但因为我们之前 injectIdsToHtml 时只改 class 之前位置，
    // 之后位置不变，所以这里 rawTagStart/rawTagEnd 仍然指向注入 id 后的位置
    // 但 injectIdsToHtml 改写了 m.index 之前的内容，所以需要重新定位
    // 简单办法：直接在原始 html 上找 class 元素（不含 data-global），注入
    const re = new RegExp(
      `(<${el.tagName}\\b[^>]*?\\bclass\\s*=\\s*["']${escapeRegExp(el.classAttrValue)}["'][^>]*?)(/?>)`
    );
    const m = cleanedHtml.match(re);
    if (m) {
      // 仅当确实没有 data-global 时才注入
      if (!/\sdata-global\s*=/.test(m[1])) {
        const injected = m[1] + ' data-global="true"' + m[2];
        cleanedHtml = cleanedHtml.replace(re, injected);
      }
    }
  }

  // 10. 构建 elementIds
  //    只注入 start（出现时间），不再注入 end（前端通过下一元素 start 推算 / 字幕自然结束）
  const elementIds = {};
  for (const el of elements) {
    const newId = idMap.get(el);
    if (!newId) continue;  // 嵌套豁免的元素不进 elementIds
    const entry = { id: newId, dataGlobal: el.hasDataGlobal && !el.hasDataSubtitle };
    if (el.hasDataSubtitle) {
      const indices = parseSubtitleIndexExpr(el.dataSubtitleValue);
      const range = resolveSubtitleRange(indices, srtList);
      if (range) {
        entry.start = range.start;
      }
    }
    // data-global 不写 start（前端视为始终可见）
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
  extractRegionId,
  prefixCss,
  prefixHtmlClass,
  extractClassNamesFromCss,
  extractKeyframesFromCss
};
