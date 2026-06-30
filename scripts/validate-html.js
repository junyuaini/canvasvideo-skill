/**
 * HTML 内容校验（content.html / background.html）
 *
 * 三步校验：
 *   第一步：有 class 必有 id
 *   第二步：id 格式正确（P{n}-{三位数字}）
 *   第三步：有 id 必有归属（data-subtitle 或 data-global）
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

  // 第一步：有 class 必有 id
  const classRegex = /<(\w+)([^>]*)class\s*=\s*(["'])([^"']*)\3([^>]*)>/g;
  const classNoId = [];
  let m;
  while ((m = classRegex.exec(html)) !== null) {
    const tag = m[1];
    if (SVG_ATOM_TAGS.has(tag)) continue;
    if (/\sid\s*=/.test(m[2] + m[5])) continue;
    classNoId.push(m[0].slice(0, 80));
  }
  if (classNoId.length > 0) {
    throw new Error(
      `${prefix}[第一步] 有 class 但没 id 的元素（${classNoId.length} 个，svg 内部已豁免）：\n  ` +
      classNoId.join('\n  ') +
      '\n修复：给这些元素加 id="..."'
    );
  }

  // 第二步：id 格式正确
  const idRegex = /<(\w+)([^>]*?)\s+id\s*=\s*(["'])([^"']+)\3([^>]*?)>/g;
  const idFormatErrors = [];
  const idPattern = /^P\d+-\d{3}$/;
  while ((m = idRegex.exec(html)) !== null) {
    const tag = m[1];
    if (SVG_ATOM_TAGS.has(tag)) continue;
    const id = m[4];
    if (!idPattern.test(id)) {
      idFormatErrors.push(id);
    }
  }
  if (idFormatErrors.length > 0) {
    throw new Error(
      `${prefix}[第二步] id 格式错误（必须为 P{数字}-{三位数字}，如 P1-002）：\n  ` +
      idFormatErrors.join(', ') +
      '\n修复：把 id 改为 P{区域编号}-{三位数字} 格式'
    );
  }

  // 第三步：有 id 必有归属
  const idRe2 = /<(\w+)([^>]*?)\s+id\s*=\s*(["'])([^"']+)\3([^>]*?)>/g;
  const idNoBind = [];
  const idConflict = [];
  while ((m = idRe2.exec(html)) !== null) {
    const tag = m[1];
    if (SVG_ATOM_TAGS.has(tag)) continue;
    const attrs = m[2] + m[5];
    const hasSub = /\sdata-subtitle\s*=/.test(attrs);
    const globalMatch = attrs.match(/\s+data-global\s*=\s*(["'])([^"']+)\1/);
    const hasGlobal = globalMatch ? (globalMatch[2] === 'true' || globalMatch[2] === '1') : false;

    if (hasSub && hasGlobal) {
      idConflict.push(m[4]);
    } else if (!hasSub && !hasGlobal) {
      idNoBind.push(m[4]);
    }
  }
  if (idConflict.length > 0) {
    throw new Error(
      `${prefix}[第三步] data-subtitle 和 data-global 同时存在（互斥，${idConflict.length} 个）：\n  ` +
      idConflict.join(', ') +
      '\n修复：二选一，全局元素只写 data-global="true"，专属元素只写 data-subtitle="..."'
    );
  }
  if (idNoBind.length > 0) {
    throw new Error(
      `${prefix}[第三步] 有 id 但没归属的元素（${idNoBind.length} 个）：\n  ` +
      idNoBind.join(', ') +
      '\n修复：给这些元素加 data-subtitle="N"（专属）或 data-global="true"（全局）'
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
