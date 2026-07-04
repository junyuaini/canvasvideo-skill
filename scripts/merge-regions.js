/**
 * 合并 skeleton + regions 为完整的 project.json
 *
 * 合并规则：
 *   - component 不写 start/end（前端按 region 边界自动推算）
 *   - elementIds 的 start/end 由 transformHtmlComponent 从 data-subtitle 解析，checkStartEndDefault 判断是否省略
 *   - background 原样透传，不处理
 *
 * 用法：node merge-regions.js --cwd=<Agent工作目录> <skillProjectId> [输出路径]
 */
const fs = require('fs');
const path = require('path');
const { resolveAgentWorkdir } = require('./scaffold');
const { getProjectState } = require('./state');
const { parseSrt } = require('./srt-parser');
const { transformHtmlComponent } = require('./transform-html-component');

/**
 * 截断到 3 位小数（不四舍五入）
 * 严格保留 3 位小数精度，与 SRT 字幕时间保持一致；任何 .toFixed(3) 场景必须用本函数替代。
 */
function truncateTo3(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return x;
  const str = String(x);
  const dotIdx = str.indexOf('.');
  if (dotIdx === -1) return x;
  return parseFloat(str.substring(0, dotIdx + 4));
}

/**
 * 校验 project.duration / regions[].{duration,startTime,endTime} 小数位不超过 3 位
 * 用于 merge 写出前与 selfcheck 中双重检查；超过 3 位小数（被四舍五入污染）报错。
 */
function assert3Decimal(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[3位小数校验] ${label} 不是有限数字：${value}`);
  }
  const str = String(value);
  const dotIdx = str.indexOf('.');
  if (dotIdx !== -1 && str.length - dotIdx - 1 > 3) {
    throw new Error(`[3位小数校验] ${label}=${value} 超过 3 位小数（精度被四舍五入/累加污染），与 SRT 字幕时间不一致。建议：使用 truncateTo3(${value}) 截断，禁止 .toFixed(3) 四舍五入。`);
  }
}

/**
 * 把"字幕绑定"转换为"start/end 时间"
 * @param {number|Array<number>} subs - 字幕 ID 或 ID 列表（如 [9, 17]）
 * @param {Array} srtList - parseSrt 返回的字幕数组
 * @returns {{start:number, end:number}|null}
 */
function resolveSubtitles(subs, srtList) {
  if (subs == null) return null;
  if (typeof subs === 'number') subs = [subs];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const ids = [...new Set(subs)].sort((a, b) => a - b);
  const startId = ids[0];
  const endId = ids[ids.length - 1];
  const startSub = srtList[startId - 1];
  const endSub = srtList[endId - 1];
  if (!startSub || !endSub) {
    throw new Error(`字幕范围 [${startId}${ids.length > 1 ? `-${endId}` : ''}] 超出 SRT 字幕数 (${srtList.length} 条)`);
  }
  return {
    start: truncateTo3(startSub.start),
    end: truncateTo3(endSub.end)
  };
}

/**
 * 解析 region 的"包含字幕"范围，返回首末字幕 ID
 * 支持 "1-5" 和 "3" 两种格式
 * @param {string} subtitleRange - 区域 subtitle_range 字段
 * @returns {{firstId:number, lastId:number}|null}
 */
function parseRegionSubtitleRange(subtitleRange) {
  if (!subtitleRange) return null;
  const match = String(subtitleRange).match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!match) return null;
  const firstId = parseInt(match[1], 10);
  const lastId = match[2] !== undefined ? parseInt(match[2], 10) : firstId;
  return { firstId, lastId };
}

/**
 * 提取 component / element 字幕绑定的首末字幕 ID
 * @param {number|Array<number>} subs
 * @returns {{firstId:number, lastId:number}|null}
 */
function getSubtitleRangeBound(subs) {
  if (subs == null) return null;
  if (typeof subs === 'number') subs = [subs];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const ids = [...new Set(subs)].sort((a, b) => a - b);
  return { firstId: ids[0], lastId: ids[ids.length - 1] };
}

/**
 * 由绝对时间范围反推覆盖的 SRT 字幕 ID 范围（firstId/lastId）
 * 用于：元素只写了 start/end 没写 subtitles 时，识别"是否与 region 首末字幕重合"
 * 容差 0.05s（SRT 边界吸附允许微小误差）
 */
function inferSubtitleBoundFromTimeRange(start, end, srtList) {
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  if (!Array.isArray(srtList) || srtList.length === 0) return null;
  const eps = 0.05;
  let firstId = null;
  let lastId = null;
  for (let i = 0; i < srtList.length; i++) {
    const sub = srtList[i];
    if (firstId === null && Math.abs(sub.start - start) <= eps) firstId = i + 1;
    if (Math.abs(sub.end - end) <= eps) lastId = i + 1;
  }
  if (firstId == null || lastId == null) return null;
  return { firstId, lastId };
}

/**
 * 判断 start/end 是否"等于默认"——等于则不需要写入 project.json
 * 默认规则（口播模式）：
 *   - 仅当绑定首条字幕 = 区域首条字幕 时，start 是默认（start == region.startTime）
 *   - 仅当绑定末条字幕 = 区域末条字幕 时，end 是默认（end == region.endTime）
 * @param {Object} params
 * @param {number} params.actualStart - 实际计算出的 start（绝对时间）
 * @param {number} params.actualEnd - 实际计算出的 end（绝对时间）
 * @param {number} params.regionStartTime - region.startTime
 * @param {number} params.regionEndTime - region.endTime
 * @param {{firstId:number, lastId:number}|null} params.regionSubRange - region 字幕范围
 * @param {{firstId:number, lastId:number}|null} params.boundSubRange - 当前 component/element 字幕范围
 * @param {Array} params.srtList - SRT 列表
 * @returns {{startIsDefault:boolean, endIsDefault:boolean}}
 */
function checkStartEndDefault(params) {
  const {
    actualStart,
    actualEnd,
    regionStartTime,
    regionEndTime,
    regionSubRange,
    boundSubRange
  } = params;

  let startIsDefault = false;
  let endIsDefault = false;

  if (regionSubRange && boundSubRange) {
    if (boundSubRange.firstId === regionSubRange.firstId) startIsDefault = true;
    if (boundSubRange.lastId === regionSubRange.lastId) endIsDefault = true;
  }

  return { startIsDefault, endIsDefault };
}

/**
 * 检测模式（仅支持口播模式）
 */
function detectMode(workdirRoot) {
  try {
    const state = getProjectState(workdirRoot);
    if (state && state.mode) return state.mode;
  } catch (e) {}
  return 'dubbing';
}

/**
 * 校验"元素 ⊂ 组件 ⊂ 区域"嵌套关系
 * @param {Object} elem - elementIds["#X"] 值
 * @param {Object} comp - component
 * @param {Object} region - skeleton region
 * @param {string} elemKey - "#P3-002" 形式
 * @param {number|null} effectiveEndTime - 口播模式下组件 end 的上界，取下一个 region 的开始时间；creative 模式传 null 表示用 region.endTime
 * @param {Object} [defaults] - { compStartIsDefault, compEndIsDefault, elemStartIsDefault, elemEndIsDefault }，default 的时间不参与边界校验
 */
function checkHierarchy(elem, comp, region, elemKey, effectiveEndTime, defaults) {
  const eps = 0.001;
  const compStartIsDefault = defaults && defaults.compStartIsDefault;
  const compEndIsDefault = defaults && defaults.compEndIsDefault;
  const elemStartIsDefault = defaults && defaults.elemStartIsDefault;
  const elemEndIsDefault = defaults && defaults.elemEndIsDefault;

  if (!compStartIsDefault && !elemStartIsDefault && elem.start < comp.start - eps) {
    throw new Error(
      `[层级 3 / element] elementIds["${elemKey}"] start=${elem.start} 早于所属组件 start=${comp.start}`
    );
  }
  if (!compEndIsDefault && !elemEndIsDefault && elem.end > comp.end + eps) {
    throw new Error(
      `[层级 3 / element] elementIds["${elemKey}"] end=${elem.end} 超出所属组件 end=${comp.end}`
    );
  }
  if (!compStartIsDefault && comp.start < region.startTime - eps) {
    throw new Error(
      `[层级 2 / component] 组件 ${comp.id} start=${comp.start} 早于所属 region ${region.id} startTime=${region.startTime}`
    );
  }
  if (!compEndIsDefault) {
    const compEndUpper = effectiveEndTime != null ? effectiveEndTime : region.endTime;
    if (comp.end > compEndUpper + eps) {
      const boundDesc = effectiveEndTime != null ? `下一 region 开始时间 ${effectiveEndTime}` : `region ${region.id} 结束时间 ${region.endTime}`;
      throw new Error(
        `[层级 2 / component] 组件 ${comp.id} 时间范围 [${comp.start}, ${comp.end}] 超出有效边界（${boundDesc}），请确认组件结束时间不超过下一 region 的开始时间。`
      );
    }
  }
}

/**
 * 验证骨架来源
 */
function validateSkeletonSource(workdir, skeleton) {
  if (skeleton.source_design_doc && skeleton.source_design_doc.trim() !== '') {
    const designDocPath = path.join(workdir, skeleton.source_design_doc);
    if (!fs.existsSync(designDocPath)) {
      throw new Error(`[E] 骨架设计文档不存在: ${skeleton.source_design_doc}，请确认步骤2已完成`);
    }
    console.log(`[✓] 骨架设计文档来源验证通过: ${skeleton.source_design_doc}`);
  }
}

/**
 * 从 HTML 字符串中提取所有 id 属性值
 */
function extractHtmlIds(html) {
  const ids = [];
  if (!html || typeof html !== 'string') return ids;
  const idRegex = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = idRegex.exec(html)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/**
 * 解析 data-subtitle 属性
 * 支持 "3" / "3-5" / "3,5" 三种格式
 */
function parseDataSubtitle(attr) {
  if (!attr || typeof attr !== 'string') return null;
  const trimmed = attr.trim();
  if (!trimmed) return null;

  if (trimmed.includes('-')) {
    const [a, b] = trimmed.split('-').map(s => parseInt(s.trim(), 10));
    if (isNaN(a) || isNaN(b)) return null;
    const list = [];
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    for (let i = start; i <= end; i++) list.push(i);
    return { type: 'range', ids: list };
  }

  if (trimmed.includes(',')) {
    const ids = trimmed.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (ids.length === 0) return null;
    return { type: 'multi', ids };
  }

  const n = parseInt(trimmed, 10);
  if (isNaN(n)) return null;
  return { type: 'single', ids: [n] };
}

/**
 * 解析 data-subtitle 字符串，仅在 attribute 已存在时返回 (用于 merge 注入)
 */
function getDataSubtitleAttr(html, id) {
  if (!html || !id) return null;
  const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<[^>]*\\bid\\s*=\\s*["']${safeId}["'][^>]*>`, 'g');
  const m = regex.exec(html);
  if (!m) return null;
  const tag = m[0];
  const dataSubtitleMatch = tag.match(/\bdata-subtitle\s*=\s*["']([^"']+)["']/);
  return dataSubtitleMatch ? dataSubtitleMatch[1] : null;
}

/**
 * 提取元素 data-subtitle 对应字幕的全局时间范围
 * @returns {{start:number, end:number, isContinuous:boolean, subIds:number[]}|null}
 */
function resolveElementSubtitleTimes(attrValue, srtList) {
  const parsed = parseDataSubtitle(attrValue);
  if (!parsed) return null;
  if (srtList.length === 0) return null;

  const ids = parsed.ids;
  const validIds = ids.filter(id => id >= 1 && id <= srtList.length);
  if (validIds.length === 0) return null;

  const firstSub = srtList[validIds[0] - 1];
  const lastSub = srtList[validIds[validIds.length - 1] - 1];

  if (parsed.type === 'multi') {
    const segments = validIds.map(id => ({
      subId: id,
      start: truncateTo3(srtList[id - 1].start),
      end: truncateTo3(srtList[id - 1].end)
    }));
    return {
      start: truncateTo3(firstSub.start),
      end: truncateTo3(lastSub.end),
      isContinuous: false,
      segments,
      subIds: validIds
    };
  }

  return {
    start: truncateTo3(firstSub.start),
    end: truncateTo3(lastSub.end),
    isContinuous: true,
    subIds: validIds
  };
}

/**
 * 把 animation 强制设为 none（前端会用 JS 完全控制元素可见性，不再依赖 CSS animation）
 */
function injectAnimationDelay(css, classNames, delaySec) {
  if (!css || !classNames || classNames.length === 0) return css;
  let result = css;
  classNames.forEach(cls => {
    if (!cls) return;
    const safeCls = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\.${safeCls}\\s*\\{)([^}]*?)(\\})`, 'g');
    result = result.replace(regex, (match, open, body, close) => {
      let newBody = body;
      // 强制禁用 CSS animation（前端 JS 用 element.style.opacity 控制可见性）
      newBody = newBody.replace(/animation\s*:\s*[^;\n}]+/g, 'animation: none');
      newBody = newBody.replace(/animation-delay\s*:\s*[^;\n}]+/g, '');
      newBody = newBody.replace(/animation-fill-mode\s*:\s*[^;\n}]+/g, '');
      return `${open}${newBody}${close}`;
    });
  });
  return result;
}

/**
 * 提取元素 class 名列表
 */
function getElementClasses(html, id) {
  if (!html || !id) return [];
  const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<[^>]*\\bid\\s*=\\s*["']${safeId}["'][^>]*>`, 'g');
  const m = regex.exec(html);
  if (!m) return [];
  const tag = m[0];
  const classMatch = tag.match(/\bclass\s*=\s*["']([^"']+)["']/);
  if (!classMatch) return [];
  return classMatch[1].split(/\s+/).filter(Boolean);
}

/**
 * 统计数组中每个值出现次数，过滤出 > 1 的项，返回 "[id](×count)" 列表
 */
function countDuplicates(items) {
  const countMap = {};
  items.forEach((it) => {
    if (it) countMap[it] = (countMap[it] || 0) + 1;
  });
  return Object.entries(countMap)
    .filter(([, c]) => c > 1)
    .map(([id, c]) => `"${id}"(×${c})`);
}

/**
 * 校验单个 HtmlComponent 的 elementIds（与 selfcheck.js checkHtmlElementIds 对齐）
 * - elementIds 必填且非空
 * - key 必须是 #ID 形式（如 "#P1-002"）
 * - value.id 必填且 === key.slice(1)
 * - value.id 格式：P{区域编号}-{三位数字}
 * - value.id 必须以所属 regionId 为前缀
 * - value.id 全局唯一（与顶级组件 + 已收集的 elementId 一起查重）
 * - start/end 已设置时必须为有限非负数字
 * - start <= end
 * - 交叉校验：HTML id 重复 / elementIds id 重复 / HTML 与 elementIds 不一致
 */
function validateHtmlElementIds(comp, project) {
  if (!comp || comp.type !== 'HtmlComponent') return;
  const labelId = comp.id || '未知';
  const errors = [];

  // elementIds 可选（R11 新约定：缺失时由 merge 从 HTML id 自动生成）
  if (!comp.content || !comp.content.elementIds || typeof comp.content.elementIds !== 'object') {
    return;
  }
  const elementIds = comp.content.elementIds;
  if (Object.keys(elementIds).length === 0) {
    return;
  }

  // 收集已声明的所有 id（顶级组件 + 其它 component 的 elementId）
  const declaredIds = new Set();
  if (Array.isArray(project.components)) {
    for (const c of project.components) {
      if (c && c.id) declaredIds.add(c.id);
      if (c && c.content && c.content.elementIds && typeof c.content.elementIds === 'object') {
        for (const v of Object.values(c.content.elementIds)) {
          if (v && typeof v === 'object' && v.id) declaredIds.add(v.id);
        }
      }
    }
  }
  // 移除当前 comp 自己（合并按 region 顺序处理时，当前 comp 可能已 push）
  if (comp.id) declaredIds.delete(comp.id);
  if (elementIds) {
    for (const v of Object.values(elementIds)) {
      if (v && typeof v === 'object' && v.id) declaredIds.delete(v.id);
    }
  }

  const elementIdPattern = /^P\d+-\d{3}$/;
  const invalidKeys = [];
  const expectedKeyMissing = [];

  Object.entries(elementIds).forEach(([key, value]) => {
    if (typeof key !== 'string' || !key.startsWith('#')) {
      invalidKeys.push(key);
      return;
    }
    const expectedId = key.slice(1);
    if (!expectedId) {
      expectedKeyMissing.push(key);
      return;
    }
    if (!value || typeof value !== 'object') {
      errors.push(`HtmlComponent [${labelId}] elementIds["${key}"] 格式错误，应为 { id, start, end }。`);
      return;
    }
    if (!value.id || typeof value.id !== 'string') {
      errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id 必填且为字符串。`);
    } else if (value.id !== expectedId) {
      errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 与 key 不一致，必须等于 "${expectedId}"。`);
    } else if (!elementIdPattern.test(value.id)) {
      errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 格式错误，必须为 P{区域编号}-{三位数字}，如 P1-002。`);
    } else {
      if (comp.regionId && !value.id.startsWith(comp.regionId + '-')) {
        errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 必须以所属区域 "${comp.regionId}" 为前缀，如 ${comp.regionId}-002。`);
      }
      if (declaredIds.has(value.id)) {
        errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 重复：所有 ID（顶级组件 + 元素）必须全局唯一。`);
      } else {
        declaredIds.add(value.id);
      }
    }

    if (value.start !== undefined && value.start !== null) {
      if (typeof value.start !== 'number' || !Number.isFinite(value.start) || value.start < 0) {
        errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].start 已设置时必须是有限非负数字（不允许 Infinity），如 0。建议：删除 start 字段让系统按所属 HtmlComponent 自动推算。`);
      }
    }
    if (value.end !== undefined && value.end !== null) {
      if (typeof value.end !== 'number' || !Number.isFinite(value.end) || value.end < 0) {
        errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].end 已设置时必须是有限非负数字（不允许 Infinity），如 5。建议：删除 end 字段让系统按所属 HtmlComponent 自动推算。`);
      }
    }
    if (typeof value.start === 'number' && Number.isFinite(value.start) && typeof value.end === 'number' && Number.isFinite(value.end) && value.start > value.end) {
      errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].start (${value.start}) 不能大于 end (${value.end})。`);
    }
  });

  if (invalidKeys.length > 0) {
    const preview = invalidKeys.slice(0, 8).map((k) => `"${k}"`).join('、');
    const more = invalidKeys.length > 8 ? ` 等 ${invalidKeys.length} 个` : '';
    errors.push(
      `HtmlComponent [${labelId}] elementIds 有 ${invalidKeys.length} 个 key 不是 #ID 形式：${preview}${more}。建议：①将每个 key 改为 "#P{区域}-{三位数字}" 形式（如 "#P1-002"），②同时在 HTML 字符串中给对应元素加上 id="P1-002" 等属性。`
    );
  }
  if (expectedKeyMissing.length > 0) {
    const preview = expectedKeyMissing.slice(0, 8).map((k) => `"${k}"`).join('、');
    const more = expectedKeyMissing.length > 8 ? ` 等 ${expectedKeyMissing.length} 个` : '';
    errors.push(
      `HtmlComponent [${labelId}] elementIds 有 ${expectedKeyMissing.length} 个 key 形如 "#" 但后面没有 ID：${preview}${more}。建议：补全为 "#P{区域}-{三位数字}" 形式。`
    );
  }

  // 交叉校验：HTML 与 elementIds
  if (comp.content && typeof comp.content.html === 'string') {
    const htmlIds = extractHtmlIds(comp.content.html);
    const dupHtmlIds = countDuplicates(htmlIds);
    if (dupHtmlIds.length > 0) {
      errors.push(
        `HtmlComponent [${labelId}] HTML 中有 ${dupHtmlIds.length} 个 id 重复出现：${dupHtmlIds.join('、')}。建议：每个 id 必须在 HTML 字符串中唯一（HTML 规范），若有重复块请用 class 区分或合并 elementIds 配置。`
      );
    }
    const elIds = Object.values(elementIds)
      .map((v) => (v && typeof v === 'object' ? v.id : null))
      .filter(Boolean);
    const dupElIds = countDuplicates(elIds);
    if (dupElIds.length > 0) {
      errors.push(
        `HtmlComponent [${labelId}] elementIds 中 ${dupElIds.length} 个 id 被重复配置：${dupElIds.join('、')}。建议：elementIds 只能 1:1 对应 HTML 中的 id，重复 key 合并或删除。`
      );
    }
    const htmlIdSet = new Set(htmlIds);
    const elIdSet = new Set(elIds);
    const htmlOnlyIds = [...new Set(htmlIds)].filter((id) => !elIdSet.has(id));
    if (htmlOnlyIds.length > 0) {
      const preview = htmlOnlyIds.slice(0, 8).map((s) => `"${s}"`).join('、');
      const more = htmlOnlyIds.length > 8 ? ` 等 ${htmlOnlyIds.length} 个` : '';
      errors.push(
        `HtmlComponent [${labelId}] HTML 中有 ${htmlOnlyIds.length} 个 id 在 elementIds 未配置：${preview}${more}。建议：①为这些 id 配置 elementIds 时间线，或②从 HTML 中删除未使用的 id。`
      );
    }
    const elOnlyIds = [...elIdSet].filter((id) => !htmlIdSet.has(id));
    if (elOnlyIds.length > 0) {
      const preview = elOnlyIds.slice(0, 8).map((s) => `"${s}"`).join('、');
      const more = elOnlyIds.length > 8 ? ` 等 ${elOnlyIds.length} 个` : '';
      errors.push(
        `HtmlComponent [${labelId}] elementIds 配置了 ${elOnlyIds.length} 个 id 在 HTML 中未找到：${preview}${more}。建议：①在 HTML 字符串中添加对应 id 的元素，或②从 elementIds 中删除该配置。`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`[merge-regions / elementId校验] ${errors.join(' | ')}`);
  }
}

/**
 * 合并区域文件为完整 project.json
 * @param {string} workdir - 工作目录路径
 * @param {string} workdirRoot - canvasvideo-workdir 根目录
 * @returns {Object} 合并后的 project 对象
 */
function mergeRegions(workdir, workdirRoot) {
  const skeletonPath = path.join(workdir, 'skeleton.json');
  if (!fs.existsSync(skeletonPath)) {
    throw new Error('工作目录缺少 skeleton.json');
  }
  const skeleton = (() => {
    try { return JSON.parse(fs.readFileSync(skeletonPath, 'utf8')); }
    catch(e) { throw new Error(`skeleton.json 解析失败: ${e.message}`); }
  })();
  validateSkeletonSource(workdir, skeleton);

  // 1. 检测模式 + 加载 SRT（口播模式必读）
  const mode = detectMode(workdirRoot);
  let srtList = [];
  try {
    const state = getProjectState(workdirRoot);
    if (state && state.voice && state.voice.srtPath) {
      const srtAbs = path.isAbsolute(state.voice.srtPath)
        ? state.voice.srtPath
        : path.join(workdir, state.voice.srtPath);
      srtList = parseSrt(srtAbs);
      console.log(`[✓] 加载 SRT: ${srtList.length} 条字幕`);
    } else {
      console.warn('[W] state.voice.srtPath 缺失，元素字幕绑定无法解析');
    }
  } catch (e) {
    console.warn(`[W] SRT 加载失败: ${e.message}，元素字幕绑定无法解析`);
  }

  // 2. 直接用 skeleton 的 startTime/endTime（generate-skeleton 已从 SRT 算好）
  const regionTimes = {};
  for (const r of skeleton.regions) {
    if (typeof r.startTime === 'number' && typeof r.endTime === 'number') {
      regionTimes[r.id] = {
        id: r.id,
        duration: r.duration,
        startTime: truncateTo3(r.startTime),
        endTime: truncateTo3(r.endTime)
      };
    } else {
      throw new Error(`region ${r.id} 缺少 startTime/endTime，请先运行 generate-skeleton.js 生成最新骨架`);
    }
  }
  const lastRegion = skeleton.regions[skeleton.regions.length - 1];
  const lastTime = regionTimes[lastRegion.id]?.endTime || 0;
  console.log(`[✓] region 全局时间计算完成: 末端 ${truncateTo3(lastTime)}s`);

  // 3. 初始化 project
  // 注意：故意不写 canvas 字段。前端 schema 不允许 project.json 出现 canvas（前端已迁到
  // HtmlComponent 模式，用 region 内 component 承载画面），写进去会触发 selfcheck/云端校验失败。
  // 设计稿中"画布"的概念只属于 skeleton（生成阶段），不进 project.json。
  const project = {
    name: skeleton.name,
    description: skeleton.description,
    mode: mode,
    theme: skeleton.theme,
    duration: truncateTo3(lastTime),
    viewport: skeleton.viewport,
    settings: skeleton.settings,
    audio: skeleton.audio,
    regions: [],
    components: [],
    subtitles: []
  };
  if (skeleton.source_design_doc) project.source_design_doc = skeleton.source_design_doc;

  // 项目级字幕样式（可选）
  if (skeleton.subtitle && typeof skeleton.subtitle === 'object') {
    project.subtitle = skeleton.subtitle;
  }

  // 4. 校验缺失 region 文件
  const regionsDir = path.join(workdir, 'regions');
  const missingRegions = skeleton.regions
    .filter(r => !fs.existsSync(path.join(regionsDir, `${r.id}.json`)))
    .map(r => r.id);
  if (missingRegions.length > 0) {
    throw new Error(`[E] 缺失区域文件：${missingRegions.map(id => `${id}.json`).join(', ')}`);
  }

  // 5. 处理每个 region
  // 最后一个 region 的 endTime 即项目总时长，用作"无下一 region"时的 end 上界
  const lastRegionEndTime = regionTimes[skeleton.regions[skeleton.regions.length - 1].id].endTime;
  for (let ri = 0; ri < skeleton.regions.length; ri++) {
    const skeletonRegion = skeleton.regions[ri];
    const nextSkeletonRegion = ri + 1 < skeleton.regions.length ? skeleton.regions[ri + 1] : null;
    const nextRegionStartTime = nextSkeletonRegion ? regionTimes[nextSkeletonRegion.id].startTime : lastRegionEndTime;

    const regionFile = path.join(regionsDir, `${skeletonRegion.id}.json`);
    const regionData = (() => {
      try { return JSON.parse(fs.readFileSync(regionFile, 'utf8')); }
      catch(e) { throw new Error(`${skeletonRegion.id}.json 解析失败: ${e.message}`); }
    })();

    const regionEntry = {
      id: skeletonRegion.id,
      name: skeletonRegion.name,
      duration: skeletonRegion.duration,
      x: skeletonRegion.x,
      y: skeletonRegion.y,
      startTime: regionTimes[skeletonRegion.id].startTime,
      endTime: regionTimes[skeletonRegion.id].endTime
    };
    project.regions.push(regionEntry);

    // 解析 region 字幕范围，用于 start/end 默认判定
    // 优先使用 skeleton 的 subtitle_range，其次从 regionFile.subtitles 推算（按 start 在 SRT 中匹配），最后从 SRT 按时间范围推算
    let regionSubRange = parseRegionSubtitleRange(skeletonRegion.subtitle_range);
    if (!regionSubRange && Array.isArray(regionData.subtitles) && Array.isArray(srtList) && srtList.length > 0) {
      // regionFile.subtitles[i] 与 srtList 中 start 相同的项 = SRT sub (i+offset+1)
      // 用第一个和最后一个 sub 的 start 在 SRT 中匹配
      const firstStart = regionData.subtitles[0].start;
      const lastStart = regionData.subtitles[regionData.subtitles.length - 1].start;
      const firstIdx = srtList.findIndex(s => Math.abs(s.start - firstStart) < 0.01);
      const lastIdx = srtList.findIndex(s => Math.abs(s.start - lastStart) < 0.01);
      if (firstIdx !== -1 && lastIdx !== -1) {
        regionSubRange = { firstId: firstIdx + 1, lastId: lastIdx + 1 };
      }
    }
    if (!regionSubRange && Array.isArray(srtList) && srtList.length > 0) {
      // fallback：按时间范围找
      const firstIdx = srtList.findIndex(s => s.start >= regionEntry.startTime - 0.5);
      const lastIdx = srtList.length - 1 - [...srtList].reverse().findIndex(s => s.end <= regionEntry.endTime + 0.5);
      if (firstIdx !== -1 && lastIdx !== -1) {
        regionSubRange = { firstId: firstIdx + 1, lastId: lastIdx + 1 };
      }
    }

    // 6. 处理 components：自动转换 subtitles → start/end
    if (Array.isArray(regionData.components)) {
      const allComponentErrors = [];  // 累积所有 component 转换错误，循环结束统一抛出（避免一次一报）
      for (const comp of regionData.components) {
        // 6.0 注入 regionId（合并阶段携带的"所属区域"标识，自检与前端均依赖）
        if (!comp.regionId) comp.regionId = skeletonRegion.id;
        // 6.1 决定 component.start/end
        // 优先级：subtitles（口播）> 旧 start/end > 缺省 = region 完整范围
        // 缺省 fallback 与"未设置 = 默认展示整个 region"语义保持一致
        let compTime = null;
        if (comp.subtitles != null && srtList.length > 0) {
          compTime = resolveSubtitles(comp.subtitles, srtList);
        } else if (typeof comp.start === 'number' && typeof comp.end === 'number') {
          compTime = { start: comp.start, end: comp.end };
        } else {
          compTime = { start: regionEntry.startTime, end: regionEntry.endTime };
        }

        // 判断 comp.start/end 是否为默认（不需要写入）
        const compBoundSubRange = getSubtitleRangeBound(comp.subtitles);
        const { startIsDefault: compStartIsDefault, endIsDefault: compEndIsDefault } = checkStartEndDefault({
          actualStart: compTime.start,
          actualEnd: compTime.end,
          regionStartTime: regionEntry.startTime,
          regionEndTime: regionEntry.endTime,
          regionSubRange,
          boundSubRange: compBoundSubRange
        });

        // resolveSubtitles 返回全局 SRT 时间，统一采用绝对时间
        const compAbsoluteStart = truncateTo3(compTime.start);
        const compAbsoluteEnd = truncateTo3(compTime.end);

        const regionBounds = {
          startTime: regionEntry.startTime,
          endTime: regionEntry.endTime
        };

        // 6.1.5 校验 background.html/css 非空
        if (comp.background && typeof comp.background.html === 'string' && comp.background.html.trim() === '') {
          throw new Error(`HtmlComponent [${comp.id}] background.html 为空`);
        }
        if (comp.background && typeof comp.background.css === 'string' && comp.background.css.trim() === '') {
          throw new Error(`HtmlComponent [${comp.id}] background.css 为空`);
        }

        // 6.1.6 校验 animation-delay 禁止与 opacity: 0 共用
        const cssContent = comp.content && comp.content.css || '';
        const opacityZeroWithDelayRegex = /\.([\w-]+)\s*\{[^}]*opacity\s*:\s*0[^}]*animation[^}]*animation-delay\s*:\s*[^;]+;?[^}]*\}/g;
        const delayWithOpacityZeroRegex = /\.([\w-]+)\s*\{[^}]*animation[^}]*animation-delay\s*:\s*[^;]+;?[^}]*opacity\s*:\s*0[^}]*\}/g;
        let m;
        while ((m = opacityZeroWithDelayRegex.exec(cssContent)) !== null || (m = delayWithOpacityZeroRegex.exec(cssContent)) !== null) {
          throw new Error(`HtmlComponent [${comp.id}] .${m[1]} 禁止 animation-delay 与 opacity: 0 同时使用（delay 期间元素已在页面会闪）。`);
        }

        // 6.1.7 校验 elementIds 格式（与 selfcheck.js checkHtmlElementIds 对齐）
        validateHtmlElementIds(comp, project);

        // 6.1.8 R14 校验：transform: translate(-50%, -50%) + animation 互斥
        // 规则：CSS 中若含 translate(-50%, -50%)（居中常用），则同一文件不得有 @keyframes / animation
        // 原因：CSS Animations 规范会让动画期间 transform 计算值被重置为 identity matrix，居中失效
        // 推荐替代：left:0 + right:0 + text-align:center 三件套
        if (comp.type === 'HtmlComponent' && comp.content && typeof comp.content.css === 'string') {
          const cssText = comp.content.css;
          const hasTranslateCenter = /transform\s*:\s*translate\s*\(\s*-50%\s*,\s*-50%\s*\)/.test(cssText);
          const hasKeyframes = /@keyframes\b/.test(cssText);
          const hasAnimation = /animation\s*(?:-name)?\s*:/.test(cssText);
          if (hasTranslateCenter && (hasKeyframes || hasAnimation)) {
            throw new Error(
              `HtmlComponent [${comp.id}] R14 校验失败：检测到 "transform: translate(-50%, -50%)" 与 animation/@keyframes 共存。\n` +
              `原因：CSS Animations 规范规定动画期间 transform 计算值会被重置为 identity matrix，居中失效（元素会偏）。\n` +
              `修复：用 "left:0; right:0; text-align:center" 三件套替代（详见 rules/06-components.md §R14）。`
            );
          }
          // 额外：keyframes 内出现 transform 也警告（容易与居中冲突）
          if (hasKeyframes) {
            const keyframeWithTransform = /@keyframes[^{]+\{[^}]*transform\s*:/.test(cssText);
            if (keyframeWithTransform) {
              console.warn(`[W] HtmlComponent [${comp.id}] @keyframes 内含 transform 属性，建议改用 margin/width/opacity 避免与居中冲突（详见 R14）。`);
            }
          }
        }

        // 6.1.6 新约定（2026-07）：调用 transformHtmlComponent
        //   - elementIds: { "#X": { id, start?, end? } }（start/end 查 SRT 推算；data-global 无时间）
        //   - cleanedHtml: 注入 id 后的 HTML（AI 写的 id 会被报错；merge 自动分配并写回标签）
        //   - cleanedCss: 原样透传（merge 不再做任何样式/动画 auto-fix）
        // AI 不再写 elementIds、id、subtitles、animations 等任何前端协议字段
        if (comp.type === 'HtmlComponent' && comp.content && typeof comp.content.html === 'string') {
          try {
            const transformed = transformHtmlComponent(comp, srtList);
            // 1) cleanedHtml 覆盖：含注入的 id 属性
            if (transformed.cleanedHtml) {
              comp.content.html = transformed.cleanedHtml;
            }
            // 2) cleanedCss 覆盖：R16 自动加 region 前缀后的 CSS
            if (transformed.cleanedCss) {
              comp.content.css = transformed.cleanedCss;
            }
            // 3) elementIds 用转换结果（AI 不写，全权由 transformHtmlComponent 生成）
            if (transformed.elementIds && Object.keys(transformed.elementIds).length > 0) {
              comp.content.elementIds = transformed.elementIds;
            }
          } catch (err) {
            // 累积错误：循环结束统一抛出（避免一次只报 1 个错）
            allComponentErrors.push({ compId: comp.id, message: err.message });
          }
        }

        // 6.2 元素 ⊂ 组件 层级校验（仅做安全网，start/end 不再二次转换）
        if (comp.content && comp.content.elementIds) {
          for (const [key, value] of Object.entries(comp.content.elementIds)) {
            if (!value || typeof value !== 'object') continue;
            if (typeof value.start !== 'number' || typeof value.end !== 'number') continue;
            checkHierarchy(
              { start: truncateTo3(value.start), end: truncateTo3(value.end) },
              comp,
              regionBounds,
              key,
              nextRegionStartTime,
              {
                compStartIsDefault,
                compEndIsDefault,
                elemStartIsDefault: false,  // elementIds 显式写了 start/end
                elemEndIsDefault: false
              }
            );
          }
        }

        // component 不写 start/end（前端按 region 边界自动推算）
        project.components.push(comp);
      }
    }

    if (Array.isArray(regionData.subtitles)) {
      project.subtitles.push(...regionData.subtitles);
    }
  }

  // 按 start 升序排序（start 可能为 undefined，视为 -Infinity 排在最前）
  project.components.sort((a, b) => {
    const aStart = typeof a.start === 'number' ? a.start : -Infinity;
    const bStart = typeof b.start === 'number' ? b.start : -Infinity;
    return aStart - bStart;
  });
  project.subtitles.sort((a, b) => a.start - b.start);

  return project;
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');
  const positionals = argv.filter(a => !a.startsWith('--'));
  const skillProjectId = positionals[0];
  const outputPath = positionals[1];

  if (!skillProjectId) {
    console.error('用法: node merge-regions.js --cwd=<Agent工作目录> <skillProjectId> [输出路径]');
    process.exit(1);
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  const finalOutputPath = outputPath || path.join(workdir, 'project.json');

  try {
    const project = mergeRegions(workdir, workdirRoot);

    // 写出前最终校验：project.duration + regions[].{duration,startTime,endTime} 必须 3 位小数
    assert3Decimal(project.duration, 'project.duration');
    for (const region of project.regions) {
      assert3Decimal(region.duration, `regions[${region.id}].duration`);
      assert3Decimal(region.startTime, `regions[${region.id}].startTime`);
      assert3Decimal(region.endTime, `regions[${region.id}].endTime`);
    }

    fs.writeFileSync(finalOutputPath, JSON.stringify(project, null, 2));

    // HTML 三步校验 + 跨 Region ID 防重
    const { validateAllRegions } = require('./validate-html');
    const htmlResult = validateAllRegions(workdir);
    if (htmlResult.errors.length > 0) {
      for (const err of htmlResult.errors) {
        console.error(`[HTML 校验] ${err}`);
      }
      process.exit(1);
    }

    console.log(`合并完成: ${finalOutputPath}`);
    console.log(`  区域数: ${project.regions.length}`);
    console.log(`  HtmlComponent 数: ${project.components.length}`);
    console.log(`  字幕数: ${project.subtitles.length}`);
    // 6.x 提醒：后续用户修改时 id → class 定位
    console.log(`\n📌 后续修改：当用户提供 id（如 "P1-101"）时，通过合并后的 project.json 反查：elementIds["#P1-101"] → 所在 component → regions/P{n}.json → class 名`);
    process.exit(0);
  } catch (e) {
    if (e.message && e.message.includes('Expected double-quoted')) {
      console.error('合并失败: JSON 序列化出错（project.json 包含非法字段值）:', e.message);
      console.error('尝试诊断…');
      try {
        const serializable = JSON.parse(JSON.stringify(project, (k, v) => {
          if (v === undefined || typeof v === 'function') return `[跳过字段: ${k}]`;
          if (v !== v) return 'NaN'; // NaN check
          return v;
        }));
        console.error('诊断用序列化结果（字段值已替换）:\n', JSON.stringify(serializable, null, 2).slice(0, 2000));
      } catch (_) {}
    } else {
      console.error('合并失败:', e.message);
    }
    process.exit(1);
  }
}

module.exports = { mergeRegions, resolveSubtitles, parseRegionSubtitleRange, getSubtitleRangeBound, inferSubtitleBoundFromTimeRange, checkStartEndDefault, validateHtmlElementIds, truncateTo3, assert3Decimal };