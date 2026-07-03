/**
 * HTML 内容校验（content.html / background.html）
 *
 * 2026-07 新约定：AI 不写 id（merge 自动分配），所以"有 class 必有 id"已废弃。
 * 保留兜底校验：
 *   1. id 格式正确（P{n}-{三位数字}，merge 注入的 id 必须符合）
 *   2. data-subtitle / data-global 互斥（一个元素不能同时声明）
 *   3. data-global 取值合法
 *
 * 完整校验（AI 写 id 报错 / class 元素无 data-subtitle 报错等）由 transformHtmlComponent 处理。
 *
 * @param {string} html - HTML 字符串
 * @param {string} label - 错误标识（如 "P1-001 content"）
 * @throws {Error} 校验失败时抛出
 */
function validateHtml(html, label = '') {
  const prefix = label ? `[${label}] ` : '';

  const SVG_ATOM_TAGS = new Set([
    'circle','path','line','rect','polygon','polyline','ellipse',
    'g','text','tspan','use','image','defs',
    'linearGradient','radialGradient','stop',
    'animate','animateTransform','animateMotion'
  ]);

  // 1. id 格式正确
  const idRegex = /<(\w+)([^>]*?)\s+id\s*=\s*(["'])([^"']+)\3([^>]*?)>/g;
  const idFormatErrors = [];
  const idConflict = [];
  const globalValueErrors = [];
  let m;
  while ((m = idRegex.exec(html)) !== null) {
    const tag = m[1];
    if (SVG_ATOM_TAGS.has(tag)) continue;
    const id = m[4];
    const attrs = m[2] + m[5];
    if (!/^P\d+-\d{3}$/.test(id)) {
      idFormatErrors.push(id);
    }
    const hasSub = /\sdata-subtitle\s*=/.test(attrs);
    const globalMatch = attrs.match(/\s+data-global\s*=\s*(["'])([^"']+)\1/);
    const hasGlobal = globalMatch ? (globalMatch[2] === 'true' || globalMatch[2] === '1') : false;
    if (hasSub && hasGlobal) {
      idConflict.push(id);
    }
    if (globalMatch && !['true', 'false', '1', '0'].includes(globalMatch[2])) {
      globalValueErrors.push(`${id}(data-global="${globalMatch[2]}")`);
    }
  }
  if (idFormatErrors.length > 0) {
    throw new Error(
      `${prefix}[id 格式] id 格式错误（必须为 P{数字}-{三位数字}，如 P1-002）：\n  ` +
      idFormatErrors.join(', ') +
      '\n修复：把 id 改为 P{区域编号}-{三位数字} 格式'
    );
  }
  if (idConflict.length > 0) {
    throw new Error(
      `${prefix}[互斥] data-subtitle 和 data-global 同时存在（互斥，${idConflict.length} 个）：\n  ` +
      idConflict.join(', ') +
      '\n修复：二选一，全局元素只写 data-global="true"，专属元素只写 data-subtitle="..."'
    );
  }
  if (globalValueErrors.length > 0) {
    throw new Error(
      `${prefix}[data-global 取值] data-global 取值只能是 "true" / "false" / "1" / "0"：\n  ` +
      globalValueErrors.join(', ')
    );
  }
}

/**
 * 校验所有 region 文件的 HTML 内容 + 全量 ID 防重
 *
 * @param {string} workdir - 工作目录路径
 * @returns {{ errors: string[], allIds: Set<string> }}
 */
function validateAllRegions(workdir) {
  const fs = require('fs');
  const path = require('path');

  const errors = [];
  const allIds = new Set();
  const dupIds = [];

  const regionsDir = path.join(workdir, 'regions');
  if (!fs.existsSync(regionsDir)) {
    return { errors, allIds };
  }

  const regionFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.json'));

  for (const file of regionFiles) {
    const regionPath = path.join(regionsDir, file);
    let region;
    try {
      region = JSON.parse(fs.readFileSync(regionPath, 'utf-8'));
    } catch (e) {
      errors.push(`[${file}] JSON 解析失败: ${e.message}`);
      continue;
    }

    // 第一步~第三步校验 content.html
    if (!Array.isArray(region.components)) continue;
    for (const comp of region.components) {
      if (comp.type !== 'HtmlComponent') continue;
      const compId = comp.id || file.replace('.json', '');

      if (comp.content && typeof comp.content.html === 'string' && comp.content.html.trim()) {
        try {
          validateHtml(comp.content.html, `${compId} content`);
        } catch (e) {
          errors.push(e.message);
        }
      }

      // 全量 ID 收集（含 component id 和 HTML element id）
      const htmlIds = [];
      if (comp.content && typeof comp.content.html === 'string') {
        const idMatch = comp.content.html.matchAll(/<[^>]*\sid\s*=\s*(["'])([^"']+)\1/g);
        for (const m of idMatch) {
          htmlIds.push(m[2]);
        }
      }

      const ids = [comp.id, ...htmlIds].filter(Boolean);
      for (const id of ids) {
        if (allIds.has(id)) {
          dupIds.push(id);
        } else {
          allIds.add(id);
        }
      }
    }
  }

  if (dupIds.length > 0) {
    errors.push(`[跨 Region ID 重复] ${[...new Set(dupIds)].join(', ')}`);
  }

  return { errors, allIds };
}

module.exports = { validateHtml, validateAllRegions };
