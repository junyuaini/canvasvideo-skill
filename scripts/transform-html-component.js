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
 * 新规（2026-07）：仅接受单个字幕 ID（如 "3"）。
 * 连续区间（如 "3-5"）和离散段（如 "1,3,5"）已废弃，元素 end 由脚本自动设为区域 endTime。
 * @param {string} expr - "3"
 * @returns {Array<number>}
 */
function parseSubtitleIndexExpr(expr) {
  if (!expr) return [];
  expr = String(expr).trim();
  if (!expr) return [];
  if (!/^[1-9]\d*$/.test(expr)) {
    throw new Error(
      `data-subtitle="${expr}" 格式错误，新规只支持单个字幕 ID（如 "3"）。` +
      `连续区间（如 "3-5"）和离散段（如 "1,3,5"）已废弃，` +
      `元素结束时间由脚本自动设为区域结束时间。`
    );
  }
  return [parseInt(expr, 10)];
}

/**
 * 根据字幕序号查 start/end
 * 新规（2026-07）：end 固定为传入的 regionEndTime，不再用字幕 end。
 * @param {Array<number>} indices - 字幕序号数组（新规只含 1 个 ID）
 * @param {Array} srtList - 字幕数组（index 1-based，与 SRT 序号对齐）
 * @param {number} regionEndTime - 区域结束时间（元素 end 固定为此值）
 * @returns {{start: number, end: number}}
 */
function resolveSubtitleRange(indices, srtList, regionEndTime) {
  if (!indices || indices.length === 0) return null;
  if (typeof regionEndTime !== 'number' || !Number.isFinite(regionEndTime)) {
    throw new Error(`resolveSubtitleRange 缺少 regionEndTime 参数（必须为有限数字）`);
  }
  const sub = srtList[indices[0] - 1];  // SRT 1-based → 数组 0-based
  if (!sub) {
    throw new Error(
      `data-subtitle 引用了字幕 [${indices.join(', ')}]，但 SRT 字幕表里找不到。` +
      `可用字幕编号: 1-${srtList.length}。` +
      `请检查 SRT 文件或修改 data-subtitle 值。`
    );
  }
  return {
    start: sub.start,
    end: regionEndTime
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
    const dataSubtitleMatch = attrs.match(/\s+data-subtitle\s*=\s*(["'])([^"']*)\1/);
    const hasDataSubtitle = !!dataSubtitleMatch;
    // 检测缺引号写法（HTML 属性值必须用单/双引号包裹）
    // 例：<div class='x' data-subtitle=3>...</div> 正则不匹配，需后续校验报错
    const dataSubtitleUnquotedMatch = !dataSubtitleMatch ? attrs.match(/\s+data-subtitle\s*=\s*([^\s"'>]+)/) : null;
    const dataSubtitleUnquoted = dataSubtitleUnquotedMatch ? dataSubtitleUnquotedMatch[1] : null;
    const dataGlobalMatch = attrs.match(/\s+data-global\s*=\s*(["'])([^"']+)\1/);
    const hasDataGlobal = !!dataGlobalMatch && (dataGlobalMatch[2] === 'true' || dataGlobalMatch[2] === '1');

    // 最近的、声明了时间控制的 class 祖先
    // 父 class 元素：取栈中最近的 class 祖先（无论是否带 data-*）
    // 用于：R15 自动补 data-global 时跳过嵌套子元素
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
      dataSubtitleUnquoted,
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
 * 计算本区域包含的 SRT 字幕范围（1-based 全局号）
 * - 规则：sub.start < regionEndTime 且 sub.end > regionStartTime（即与区域时间窗有交集）
 * - 返回 { firstId, lastId } | null（区域无字幕时为 null，跳过区域校验避免误报）
 * @param {Array} srtList
 * @param {number} regionStartTime
 * @param {number} regionEndTime
 * @returns {{firstId:number, lastId:number}|null}
 */
function getRegionSrtRange(srtList, regionStartTime, regionEndTime) {
  if (!Array.isArray(srtList) || srtList.length === 0) return null;
  if (typeof regionStartTime !== 'number' || typeof regionEndTime !== 'number') return null;
  const ids = [];
  for (let i = 0; i < srtList.length; i++) {
    const sub = srtList[i];
    if (!sub || typeof sub.start !== 'number' || typeof sub.end !== 'number') continue;
    if (sub.start < regionEndTime && sub.end > regionStartTime) ids.push(i + 1);
  }
  if (ids.length === 0) return null;
  return { firstId: ids[0], lastId: ids[ids.length - 1] };
}

/**
 * 转换 HtmlComponent
 * @param {Object} comp - { id, regionId, content: { html, css, ... } }
 * @param {Array} srtList - parseSrt 返回的字幕数组
 * @param {number} [regionEndTime] - 区域结束时间；data-subtitle 元素的 end 固定为此值（必填）
 * @param {number} [regionStartTime] - 区域开始时间（可选；提供后用于校验 data-subtitle 编号是否在本区域字幕范围内）
 * @returns {{
 *   elementIds: Object,    // { "#P1-100": { id, start?, end? } }
 *   animations: Object,    // 始终空对象（保留字段）
 *   cleanedHtml: string,   // 注入了 id 的 HTML
 *   cleanedCss: string     // 原样透传
 * }}
 */
function transformHtmlComponent(comp, srtList, regionEndTime, regionStartTime) {
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

  // 5.5 校验 data-subtitle 属性写法（必须带引号 + 不能为空）
  // - 缺引号（data-subtitle=3）：正则匹配不到，HTML 解析后属性值不可靠，浏览器可能 fallback 到 data-global
  // - 空字符串（data-subtitle=""）：被当"未填"，merge 自动补 data-global，与 AI 意图不符
  // 这两类错误应在第 6 步格式校验之前先报，避免被格式校验的"格式错误"掩盖
  for (const el of elements) {
    const classDesc = el.classNames.join(' ');
    if (el.dataSubtitleUnquoted) {
      errors.push(
        `<${el.tagName} class="${classDesc}"> data-subtitle=${el.dataSubtitleUnquoted} 缺少引号。` +
        `HTML 属性值必须用单引号或双引号包裹，如 data-subtitle="${el.dataSubtitleUnquoted}"。`
      );
    } else if (el.hasDataSubtitle && el.dataSubtitleValue === '') {
      errors.push(
        `<${el.tagName} class="${classDesc}"> data-subtitle="" 值为空。` +
        `data-subtitle 不能为空；若不需要绑字幕，请删除该属性（merge 会自动补 data-global="true"）。`
      );
    }
  }

  // 6. 校验 data-subtitle 表达式格式
  for (const el of elements) {
    if (!el.hasDataSubtitle) continue;
    // 缺引号 / 空值已在 5.5 报错，跳过避免重复
    if (el.dataSubtitleUnquoted) continue;
    if (el.dataSubtitleValue === '') continue;
    try {
      parseSubtitleIndexExpr(el.dataSubtitleValue);
    } catch (e) {
      const classDesc = el.classNames.join(' ');
      errors.push(
        `<${el.tagName} class="${classDesc}"> data-subtitle="${el.dataSubtitleValue}" 格式错误：${e.message}`
      );
    }
  }

  // 6.1 校验 data-subtitle 编号是否落在本区域字幕范围内
  // - 本规则的目的是防止 AI 把"区域内第 N 句"写成 data-subtitle="N"（区域号），
  //   而 merge 阶段查的是 SRT 全局号；超出范围会导致元素永远不显示
  // - 区域无字幕（srtList 缺失或区域内无 SRT）→ 跳过此校验，避免误报
  const regionSrtRange = getRegionSrtRange(srtList, regionStartTime, regionEndTime);
  if (regionSrtRange) {
    for (const el of elements) {
      if (!el.hasDataSubtitle) continue;
      // 缺引号 / 空值 / 格式错误已在上游报过，跳过避免重复
      if (el.dataSubtitleUnquoted) continue;
      if (el.dataSubtitleValue === '') continue;
      let indices;
      try {
        indices = parseSubtitleIndexExpr(el.dataSubtitleValue);
      } catch (_) {
        continue;  // 6 步已记录格式错误，跳过避免重复报错
      }
      for (const subId of indices) {
        if (subId < regionSrtRange.firstId || subId > regionSrtRange.lastId) {
          const classDesc = el.classNames.join(' ');
          errors.push(
            `<${el.tagName} class="${classDesc}"> data-subtitle="${subId}" 不在本区域字幕范围内。` +
            `data-subtitle="N" 中的 N 必须是 SRT 全局号（1-${(srtList && srtList.length) || '?'}），` +
            `且必须落在当前 region 的 subtitle_range 内。` +
            `本区域可用的 SRT 全局号范围: ${regionSrtRange.firstId}-${regionSrtRange.lastId}。`
          );
        }
      }
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
  //    start = data-subtitle 对应字幕 start
  //    end 不写入 elementIds，endTime 由前端按 region.endTime 兜底（新规 2026-07-05）
  const elementIds = {};
  for (const el of elements) {
    const newId = idMap.get(el);
    if (!newId) continue;  // 嵌套豁免的元素不进 elementIds
    const entry = { id: newId, dataGlobal: el.hasDataGlobal && !el.hasDataSubtitle };
    if (el.hasDataSubtitle) {
      const indices = parseSubtitleIndexExpr(el.dataSubtitleValue);
      const range = resolveSubtitleRange(indices, srtList, regionEndTime);
      if (range) {
        entry.start = range.start;
        // entry.end 不写入（前端用 region.endTime）
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
