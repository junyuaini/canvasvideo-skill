/**
 * CanvasVideo Skill — 程序化自检（selfcheck）
 *
 * 只做三项检查：
 *   1. ID 格式：{区域ID}-{三位数字}，如 P1-001、P3-005
 *   2. ID 重复：全局唯一
 *   3. HtmlComponent elementIds 必填且格式合法
 *
 * 真正的格式硬校验由云端 /cv/api/projects/validate 在上传前完成。
 *
 * 用法：node selfcheck.js <project.json路径>
 *
 * 示例：
 *   node selfcheck.js ./canvasvideo-workdir/cv_abc123/project.json
 */

/**
 * 检查 ID 格式
 * 格式：{区域ID}-{三位数字}，如 P1-001、P3-005
 */
function checkIdFormat(components) {
  const idPattern = /^P\d+-\d{3}$/;
  const errors = [];

  components.forEach(c => {
    if (c.id && !idPattern.test(c.id)) {
      errors.push(`HtmlComponent ID "${c.id}" 格式错误，应为 P{数字}-{三位数字}，如 P1-001、P3-005`);
    }
  });

  return errors;
}

/**
 * 检查 ID 是否重复
 */
function checkDuplicateIds(components) {
  const ids = components.map(c => c.id).filter(Boolean);
  const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
  if (duplicates.length > 0) {
    return `HtmlComponent ID 重复: ${[...new Set(duplicates)].join(', ')}`;
  }
  return null;
}

/**
 * 检查 region schema 必填字段（与后端 schema 对齐）
 * - id 必填、字符串、非空（与 HtmlComponent ID 前缀对应）
 * - name 必填、字符串、非空（仅用于日志展示）
 * - duration 必填校验由 checkTimeHierarchy 处理，不重复
 */
function checkRegionSchema(regions) {
  const errors = [];
  if (!Array.isArray(regions)) return errors;
  regions.forEach((region, index) => {
    if (!region || typeof region !== 'object') return;
    if (!region.id || typeof region.id !== 'string' || region.id.trim() === '') {
      errors.push(
        `regions[${index}] 缺少必填字段 'id'。建议：给每个 region 加一个唯一 ID（如 "P1"），并保证与 HtmlComponent ID 前缀对应。`
      );
    }
    if (!region.name || typeof region.name !== 'string' || region.name.trim() === '') {
      errors.push(
        `regions[${index}] 缺少必填字段 'name'。建议：给每个 region 加一个可读名称（如 "开场封面"），仅用于日志展示。`
      );
    }
  });
  return errors;
}

/**
 * 检查所有 HtmlComponent 的 background 必填字段（与 content 平级）
 * - background 是 HtmlComponent 的两个基本属性之一（另一个是 content）
 * - background.html 必填、字符串、非空（一般是单个根 div，承载 SVG/渐变/装饰）
 * - background.css 必填、字符串、非空（建议 position: absolute + inset: 0 让背景填满 video-frame）
 * - background 必填
 * - 递归检查 children
 */
function checkHtmlComponentBackground(components) {
  const errors = [];
  if (!Array.isArray(components)) return errors;

  function checkRecursive(comps, pathPrefix) {
    comps.forEach((comp, idx) => {
      if (!comp || typeof comp !== 'object') return;
      const pathStr = pathPrefix ? `${pathPrefix}.children[${idx}]` : `components[${idx}]`;
      const compLabel = `[${comp.id || `index ${idx}`}]`;

      if (comp.type === 'HtmlComponent') {
        const bg = comp.background;

        if (!bg || typeof bg !== 'object') {
          errors.push(
            `${pathStr} HtmlComponent ${compLabel} 缺少 'background' 字段（与 content 平级）。HtmlComponent 必须同时携带 background 和 content 作为两个基本属性，例：{ "background": { "html": "<div class='region-bg'></div>", "css": ".region-bg { position: absolute; inset: 0; background: linear-gradient(...); }" } }。详见 docs/04-region-design-dubbing.md。`
          );
        } else {
          if (!bg.html || typeof bg.html !== 'string' || bg.html.trim() === '') {
            errors.push(
              `${pathStr} HtmlComponent ${compLabel} background.html 必填且为非空字符串。建议：写一个根 div，例如 "<div class='region-bg'></div>"，内部可嵌套 SVG/渐变/几何装饰。`
            );
          } else {
            // 校验 background.html 里的元素不能带 id
            // 原因：HEAD 禁动画的 CSS 选择器是 [id]，背景元素带 id 会被误禁，CSS 动画失效
            const idMatches = bg.html.matchAll(/\sid=([\"'])([^\"']+)\1/g);
            const bgIds = Array.from(idMatches, m => m[2]);
            if (bgIds.length > 0) {
              errors.push(
                `${pathStr} HtmlComponent ${compLabel} background.html 里的元素不允许配 id（发现 ${bgIds.map(id => '#' + id).join('、')}）。背景元素由 CSS class 控制，HEAD 不会管它；带 id 会被强制禁动画。请删除这些 id 属性。`
              );
            }
          }
          if (!bg.css || typeof bg.css !== 'string' || bg.css.trim() === '') {
            errors.push(
              `${pathStr} HtmlComponent ${compLabel} background.css 必填且为非空字符串。建议：position: absolute + inset: 0 让背景填满 video-frame，再加 background: ... / 动画 / 装饰样式。`
            );
          }
        }
      }

      // 递归 children
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        checkRecursive(comp.children, pathStr);
      }
    });
  }

  checkRecursive(components, null);
  return errors;
}

/**
 * 检查顶级组件 type 白名单
 * - 后端 / Skill 只允许 HtmlComponent
 * - 与后端 schemas/project.schema.json 的 component.type enum 保持一致
 */
function checkTopComponentType(components) {
  const errors = [];
  const ALLOWED_TYPES = new Set(['HtmlComponent']);
  if (!Array.isArray(components)) return errors;
  components.forEach((comp, index) => {
    if (!comp || typeof comp !== 'object') return;
    const label = comp.id ? `[${comp.id}]` : `[index ${index}]`;
    if (!comp.type || typeof comp.type !== 'string') {
      // type 必填校验交给 schema / checkIdFormat 之类的其他函数，这里只检查白名单
      return;
    }
    if (!ALLOWED_TYPES.has(comp.type)) {
      errors.push(
        `顶级组件 ${label} type="${comp.type}" 不被允许。workdir 的 project.json 顶层组件只接受 HtmlComponent，请改写为 HtmlComponent 并用 content.html + content.css 实现所需视觉效果。详见 rules/06-components.md §R2。`
      );
    }
  });
  return errors;
}

/**
 * 检查顶级组件 regionId 必填
 * - 顶级组件（顶层数组成员）必须配置 regionId
 * - regionId 必须在 regions 中存在
 * - HtmlComponent ID 前缀必须与 regionId 一致
 */
function checkTopRegionId(components, regions) {
  const errors = [];

  const regionIds = new Set();
  if (Array.isArray(regions)) {
    regions.forEach(r => { if (r && r.id) regionIds.add(r.id); });
  }

  const idPattern = /^P(\d+)-\d{3}$/;

  components.forEach((comp) => {
    if (!comp || typeof comp !== 'object') return;
    if (!comp.id) return;

    if (!comp.regionId || typeof comp.regionId !== 'string' || comp.regionId.trim() === '') {
      errors.push(`顶级组件 [${comp.id}] 缺少 regionId 字段。`);
      return;
    }

    if (!regionIds.has(comp.regionId)) {
      errors.push(
        `顶级组件 [${comp.id}] regionId "${comp.regionId}" 在 regions 中不存在，有效区域为：${[...regionIds].join(', ')}。`
      );
    }

    const match = comp.id.match(idPattern);
    if (match) {
      const idPrefix = `P${match[1]}`;
      if (idPrefix !== comp.regionId) {
        errors.push(
          `顶级组件 [${comp.id}] ID 前缀 ${idPrefix} 与 regionId "${comp.regionId}" 不一致。`
        );
      }
    }
  });

  return errors;
}

/**
 * 检查 HtmlComponent 的 elementIds
 *   - elementIds 必填且非空
 *   - key 必须是 #ID 形式（如 "#P1-002"），不再支持 class/tag 等其他 CSS 选择器
 *   - value.id 必填，且必须等于 key 去掉 # 后的部分（如 key="#P1-002" → value.id="P1-002"）
 *   - value.id 格式：P{区域编号}-{三位数字}，全局唯一
 *   - value.id 的 P{num} 部分必须等于所属区域的 regionId
 *   - value.start / value.end 必填，数字、非负、start <= end
 */

/**
 * 解析 HTML 字符串，提取所有 id 属性值
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

function checkHtmlElementIds(components, allIds) {
  const errors = [];
  const elementIdPattern = /^P\d+-\d{3}$/;

  function checkRecursive(comps) {
    comps.forEach((comp) => {
      if (!comp || typeof comp !== 'object') return;

      if (comp.type === 'HtmlComponent') {
        const labelId = comp.id || '未知';

        // elementIds 可选（R11 新约定），缺失时跳过 elementIds 校验
        if (!comp.content || !comp.content.elementIds || typeof comp.content.elementIds !== 'object') {
          return;
        }

        // elementIds 非空
        const elementIds = comp.content.elementIds;
        if (Object.keys(elementIds).length === 0) {
          return;
        }

        // [归并] 同一 HtmlComponent 内"key 不是 #ID 形式"的 key 收集起来，最后归并为一条错误
        const invalidKeys = [];
        const expectedKeyMissing = []; // key 是 # 但 # 后没内容

        // 校验每个 elementId
        Object.entries(elementIds).forEach(([key, value]) => {
          // key 必须是 #ID 形式
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
            errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 格式错误，必须为 P{{区域编号}}-{三位数字}，如 P1-002、P1-003。`);
          } else {
            // 元素 ID 必须以所属区域的 regionId 为前缀
            if (comp.regionId && !value.id.startsWith(comp.regionId + '-')) {
              errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 必须以所属区域 "${comp.regionId}" 为前缀，如 ${comp.regionId}-002。`);
            }

            // 元素 ID 全局唯一
            if (allIds.has(value.id)) {
              errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].id "${value.id}" 重复：所有 ID（顶级组件 + 元素）必须全局唯一。`);
            } else {
              allIds.add(value.id);
            }
          }

          // start 可选（未设置时由前端按所属 HtmlComponent 自动推算）
          if (value.start !== undefined && value.start !== null) {
            if (typeof value.start !== 'number' || !Number.isFinite(value.start) || value.start < 0) {
              errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].start 已设置时必须是有限非负数字（不允许 Infinity），如 0。建议：删除 start 字段让系统按所属 HtmlComponent 自动推算。`);
            }
          }

          // end 可选（未设置时由前端按所属 HtmlComponent 自动推算）
          if (value.end !== undefined && value.end !== null) {
            if (typeof value.end !== 'number' || !Number.isFinite(value.end) || value.end < 0) {
              errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].end 已设置时必须是有限非负数字（不允许 Infinity），如 5。建议：删除 end 字段让系统按所属 HtmlComponent 自动推算。`);
            }
          }

          // start/end 同时存在时检查顺序
          if (typeof value.start === 'number' && Number.isFinite(value.start) && typeof value.end === 'number' && Number.isFinite(value.end) && value.start > value.end) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].start (${value.start}) 不能大于 end (${value.end})。`);
          }

          // [层级 3 / element] 元素时间范围必须在所属 component 范围内
          const eps = 0.001;
          if (
            typeof comp.start === 'number' && Number.isFinite(comp.start) &&
            typeof comp.end === 'number' && Number.isFinite(comp.end) &&
            typeof value.start === 'number' && Number.isFinite(value.start) &&
            typeof value.end === 'number' && Number.isFinite(value.end)
          ) {
            if (value.start < comp.start - eps) {
              errors.push(`[层级 3 / element] HtmlComponent [${labelId}] elementIds["${key}"].start=${value.start} 早于所属 HtmlComponent 开始时间 ${comp.start}（HtmlComponent 范围 [${comp.start}, ${comp.end}]）。建议：将 elementIds start 改为 ${comp.start}。`);
            }
            if (value.end > comp.end + eps) {
              errors.push(`[层级 3 / element] HtmlComponent [${labelId}] elementIds["${key}"].end=${value.end} 超出所属 HtmlComponent 结束时间 ${comp.end}（HtmlComponent 范围 [${comp.start}, ${comp.end}]）。建议：将 elementIds end 改为 ${comp.end} 或更小。`);
            }
          }
        });

        // 归并错误输出
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

        // [交叉校验 1] HTML 中 id 重复
        const htmlIds = extractHtmlIds(comp.content.html);
        const dupHtmlIds = countDuplicates(htmlIds);
        if (dupHtmlIds.length > 0) {
          errors.push(
            `HtmlComponent [${labelId}] HTML 中有 ${dupHtmlIds.length} 个 id 重复出现：${dupHtmlIds.join('、')}。建议：每个 id 必须在 HTML 字符串中唯一（HTML 规范），若有重复块请用 class 区分或合并 elementIds 配置。`
          );
        }

        // [交叉校验 2] elementIds 中 id 重复（多个 key 指向同一 id）
        const elIds = Object.values(elementIds)
          .map((v) => (v && typeof v === 'object' ? v.id : null))
          .filter(Boolean);
        const dupElIds = countDuplicates(elIds);
        if (dupElIds.length > 0) {
          errors.push(
            `HtmlComponent [${labelId}] elementIds 中 ${dupElIds.length} 个 id 被重复配置：${dupElIds.join('、')}。建议：elementIds 只能 1:1 对应 HTML 中的 id，重复 key 合并或删除。`
          );
        }

        // [交叉校验 3] HTML 中有但 elementIds 未配置
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

        // [交叉校验 4] elementIds 配了但 HTML 中未找到
        const elOnlyIds = [...elIdSet].filter((id) => !htmlIdSet.has(id));
        if (elOnlyIds.length > 0) {
          const preview = elOnlyIds.slice(0, 8).map((s) => `"${s}"`).join('、');
          const more = elOnlyIds.length > 8 ? ` 等 ${elOnlyIds.length} 个` : '';
          errors.push(
            `HtmlComponent [${labelId}] elementIds 配置了 ${elOnlyIds.length} 个 id 在 HTML 中未找到：${preview}${more}。建议：①在 HTML 字符串中添加对应 id 的元素，或②从 elementIds 中删除该配置。`
          );
        }
      }

      // 递归检查 children
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        checkRecursive(comp.children);
      }
    });
  }

  checkRecursive(components);
  return errors;
}

/**
 * 时间层次校验（project → region → component → element）
 * 规则：
 *   - project.duration 必填（> 0.1）
 *   - Σ region.duration === project.duration（严格相等，不允许留白）
 *   - component.start / end 可选；未设置时由前端根据所属 region 推算（start=region.startTime, end=下一region.startTime）
 *   - elementIds.start / end 可选；未设置时由前端根据所属 component 推算
 *   - 已设置时必须为有限数字，≥ 0，start ≤ end
 *   - region.startTime ≤ component.start 且 component.end ≤ 下一region.startTime（无下一 region 时为 project.duration）
 *   - component.start ≤ elementIds.start 且 elementIds.end ≤ component.end
 */
function checkTimeHierarchy(project) {
  const errors = [];
  const components = Array.isArray(project.components) ? project.components : [];
  const regions = Array.isArray(project.regions) ? project.regions : [];

  // [层级 1] project.duration 必填 + > 0.1
  if (typeof project.duration !== 'number' || !Number.isFinite(project.duration)) {
    errors.push(
      `[层级 1 / project] project.duration 必填且为有限数字（如 9），不能是 Infinity 或缺失。建议：在 project.json 顶层加 "duration": 9。`
    );
  } else if (project.duration <= 0.1) {
    errors.push(
      `[层级 1 / project] project.duration=${project.duration} 不合法，必须 > 0.1 秒。建议：调整为合理时长（如 9、15、30）。`
    );
  } else {
    // [层级 1.1] project.duration 小数位不超过 3 位（与 SRT 字幕时间保持一致，禁止四舍五入）
    const durStr = String(project.duration);
    const durDotIdx = durStr.indexOf('.');
    if (durDotIdx !== -1 && durStr.length - durDotIdx - 1 > 3) {
      errors.push(
        `[层级 1.1 / project] project.duration=${project.duration} 超过 3 位小数（精度被四舍五入/累加污染），与 SRT 字幕时间不一致。建议：重新跑 merge-regions.js（已用 truncateTo3 截断，禁止 .toFixed(3) 四舍五入）。`
      );
    }
  }

  // [层级 1.2] regions[].{duration,startTime,endTime} 小数位不超过 3 位
  if (Array.isArray(regions)) {
    for (const region of regions) {
      if (!region || !region.id) continue;
      for (const field of ['duration', 'startTime', 'endTime']) {
        const v = region[field];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        const vStr = String(v);
        const vDotIdx = vStr.indexOf('.');
        if (vDotIdx !== -1 && vStr.length - vDotIdx - 1 > 3) {
          errors.push(
            `[层级 1.2 / region] regions[${region.id}].${field}=${v} 超过 3 位小数（精度被四舍五入/累加污染），与 SRT 字幕时间不一致。建议：重新跑 merge-regions.js（已用 truncateTo3 截断）。`
          );
        }
      }
    }
  }

  // [层级 1.5] 累计 region 时长校验
  // 总时长直接读 project.regions 最后一个 endTime（口播=最后一帧字幕 end；创作=最后一个 region 的 endTime）
  // region 实际时长 = endTime - startTime（不依赖累加）
  const regionRanges = new Map();
  let lastEndTime = 0;
  if (Array.isArray(regions)) {
    for (const region of regions) {
      if (!region || !region.id) continue;
      if (typeof region.startTime !== 'number' || typeof region.endTime !== 'number') {
        errors.push(
          `[层级 1.5 / region] [${region.id}] startTime/endTime 必填（merge-regions.js 已自动写入）。建议：重新跑 merge-regions.js。`
        );
        continue;
      }
      regionRanges.set(region.id, { startTime: region.startTime, endTime: region.endTime });
      if (region.endTime > lastEndTime) lastEndTime = region.endTime;
    }
  }

  // [口播模式] 计算每个 region 的 end 上界：下一个 region 的 startTime，无下一 region 用 project.duration
  const regionEndUpperBound = new Map();
  const sortedRegions = Array.isArray(regions) ? [...regions].sort((a, b) => (a.startTime || 0) - (b.startTime || 0)) : [];
  for (let i = 0; i < sortedRegions.length; i++) {
    const r = sortedRegions[i];
    const upperBound = i + 1 < sortedRegions.length ? sortedRegions[i + 1].startTime : (typeof project.duration === 'number' ? project.duration : lastEndTime);
    regionEndUpperBound.set(r.id, upperBound);
  }

  if (typeof project.duration === 'number' && Number.isFinite(project.duration)) {
    if (Math.abs(lastEndTime - project.duration) > 0.001) {
      errors.push(
        `[层级 1.5 / project] project.duration=${project.duration} 与 regions 实际末端时间 ${lastEndTime} 不一致（差 ${Math.abs(lastEndTime - project.duration).toFixed(3)} 秒）。建议：重新跑 generate-skeleton.js / merge-regions.js 让 project.duration 与 regions 末端对齐。`
      );
    }
  }

  // [层级 2] component 时间范围校验
  function checkComponentTimeRecursive(comps) {
    comps.forEach((comp) => {
      if (!comp || typeof comp !== 'object') return;

      const compLabel = comp.id ? ` [${comp.id}]` : '';

      if (comp.start !== undefined && comp.start !== null) {
        if (typeof comp.start !== 'number' || !Number.isFinite(comp.start)) {
          errors.push(
            `[层级 2 / component]${compLabel} start 已设置时必须是有限数字（不允许 Infinity），如 0。建议：删除 start 字段让系统按所属 region 自动推算。`
          );
        } else if (comp.start < 0) {
          errors.push(
            `[层级 2 / component]${compLabel} start=${comp.start} 不能小于 0。建议：调整为 ≥ 0。`
          );
        }
      }

      if (comp.end !== undefined && comp.end !== null) {
        if (typeof comp.end !== 'number' || !Number.isFinite(comp.end)) {
          errors.push(
            `[层级 2 / component]${compLabel} end 已设置时必须是有限数字（不允许 Infinity），如 5。建议：删除 end 字段让系统按所属 region 自动推算。`
          );
        } else if (comp.end < 0) {
          errors.push(
            `[层级 2 / component]${compLabel} end=${comp.end} 不能小于 0。建议：调整为 ≥ 0。`
          );
        } else {
          if (comp.regionId && regionRanges.has(comp.regionId)) {
            const range = regionRanges.get(comp.regionId);
            const endUpper = regionEndUpperBound.has(comp.regionId) ? regionEndUpperBound.get(comp.regionId) : range.endTime;
            if (typeof comp.start === 'number' && Number.isFinite(comp.start) && comp.end > endUpper + 0.001) {
              errors.push(
                `[层级 2 / component]${compLabel} end=${comp.end} 超出所属 region "${comp.regionId}" 有效上界 ${endUpper}（region 范围 [${range.startTime}, ${range.endTime}]，下一 region 开始于 ${endUpper}）。建议：将 end 改为 ${endUpper} 或更小，或删除 end 让系统按所属 region 自动推算。`
              );
            }
          } else if (comp.regionId && !regionRanges.has(comp.regionId)) {
            errors.push(
              `[层级 2 / component]${compLabel} regionId "${comp.regionId}" 在 regions 数组中找不到，无法校验时间范围。`
            );
          }
        }
      }

      if (typeof comp.start === 'number' && Number.isFinite(comp.start) && typeof comp.end === 'number' && Number.isFinite(comp.end) && comp.start > comp.end + 0.001) {
        errors.push(
          `[层级 2 / component]${compLabel} start=${comp.start} 大于 end=${comp.end}。建议：交换 start/end，或调整到合理范围。`
        );
      }

      if (comp.regionId && regionRanges.has(comp.regionId)) {
        const range = regionRanges.get(comp.regionId);
        if (typeof comp.start === 'number' && Number.isFinite(comp.start) && comp.start < range.startTime - 0.001) {
          errors.push(
            `[层级 2 / component]${compLabel} start=${comp.start} 早于所属 region "${comp.regionId}" 开始时间 ${range.startTime}（region 范围 [${range.startTime}, ${range.endTime}]）。建议：将 start 改为 ${range.startTime}。`
          );
        }
      }

      if (Array.isArray(comp.children) && comp.children.length > 0) {
        checkComponentTimeRecursive(comp.children);
      }
    });
  }

  checkComponentTimeRecursive(components);

  return errors;
}

/**
 * 主入口
 * @param {object} project - 已解析的 project.json
 * @returns {{ ok: boolean, errors: string[], warnings: string[], infos: string[] }}
 */
function selfcheck(project) {
  const errors = [];
  const warnings = [];
  const infos = [];

  if (!project || typeof project !== 'object') {
    return { ok: false, errors: ['project 不是对象'], warnings, infos };
  }

  const components = project.components || [];
  const regions = project.regions || [];

  // region 时序索引（供 element 时间 fallback 使用）
  const regionRanges = new Map();
  for (const r of regions) {
    if (r && r.id && typeof r.startTime === 'number' && typeof r.endTime === 'number') {
      regionRanges.set(r.id, { startTime: r.startTime, endTime: r.endTime });
    }
  }

  // [禁止设置] project.canvas 字段不允许手动设置
  // 画布尺寸由前后端按 viewport × 10 自动计算（前端 LayoutEngine.calculateCanvasAuto / 服务端兜底）
  // 强制手填反而易错（容易误填成 viewport 尺寸而非画布尺寸）
  if (project.canvas !== undefined && project.canvas !== null) {
    errors.push(
      '[禁止设置] project.canvas 字段不允许手动设置：画布尺寸由前后端按 viewport × 10 自动计算。' +
      '请删除 project.json 顶层的 canvas 字段，并在 viewport 中正确填写视频窗口尺寸（如 780×585）。'
    );
  }

  // project.subtitle —— 字幕渲染配置（可选）
  if (project.subtitle && typeof project.subtitle === 'object') {
    if (project.subtitle.enabled !== undefined && typeof project.subtitle.enabled !== 'boolean') {
      errors.push('[类型] project.subtitle.enabled 必须是 boolean');
    }
  }

  // [必填] project.mode —— 项目模式（仅口播模式）
  const VALID_MODES = ['dubbing'];
  if (!project.mode || !VALID_MODES.includes(project.mode)) {
    errors.push(
      '[必填] project.mode 缺失或非法：必须为 "dubbing"（口播模式）。' +
      '口播模式必须配置配音音频（audio）+ 字幕（subtitles）。'
    );
  }

  const hasAudio = (() => {
    if (typeof project.audio === 'string') return project.audio.trim().length > 0;
    if (project.audio && typeof project.audio === 'object' && typeof project.audio.path === 'string') return project.audio.path.trim().length > 0;
    return false;
  })();
  const isBgmUsage = (typeof project.audio === 'object' && project.audio !== null
    && (project.audio.loop !== undefined
        || project.audio.fadeIn !== undefined
        || project.audio.fadeOut !== undefined));
  const hasSubtitles = Array.isArray(project.subtitles) && project.subtitles.length > 0;

  if (!hasAudio) errors.push('[口播模式] 必须配置配音音频（audio 字段）。');
  if (!hasSubtitles) errors.push('[口播模式] 必须提供字幕（subtitles 数组）。请先用 prepare-voice.js 生成 SRT 字幕。');
  if (isBgmUsage) errors.push('[口播模式] audio 不能使用 BGM 用法（loop/fadeIn/fadeOut），配音音频应直接写路径字符串或对象形式（无 loop/fadeIn/fadeOut）。');

  // 检查 ID 格式
  const formatErrors = checkIdFormat(components);
  errors.push(...formatErrors);

  // 检查 ID 重复（顶级组件）
  const dupError = checkDuplicateIds(components);
  if (dupError) errors.push(dupError);

  // 检查 region 必填字段（id / name）
  const regionSchemaErrors = checkRegionSchema(regions);
  errors.push(...regionSchemaErrors);

  // 检查所有 HtmlComponent 的 background 必填（html + css，与 content 平级）
  const htmlCompBgErrors = checkHtmlComponentBackground(components);
  errors.push(...htmlCompBgErrors);

  // 检查顶级组件 regionId
  const topRegionIdErrors = checkTopRegionId(components, regions);
  errors.push(...topRegionIdErrors);

  // 检查顶级组件 type 白名单（后端 / Skill 只允许 HtmlComponent）
  const topTypeErrors = checkTopComponentType(components);
  errors.push(...topTypeErrors);

  // [时间层次校验] project → region → component → element
  const timeHierarchyErrors = checkTimeHierarchy(project);
  errors.push(...timeHierarchyErrors);

  // 收集所有顶级组件 ID，用于元素 ID 全局唯一校验
  const allIds = new Set();
  components.forEach((c) => {
    if (c && c.id) allIds.add(c.id);
  });

  // 检查 HtmlComponent elementIds
  const htmlElementIdsErrors = checkHtmlElementIds(components, allIds);
  errors.push(...htmlElementIdsErrors);

  return { ok: errors.length === 0, errors, warnings, infos };
}

// CLI 模式
if (require.main === module) {
  const fs = require('fs');
  const projectPath = process.argv[2];
  if (!projectPath) {
    console.error('用法: node selfcheck.js <project.json路径>');
    process.exit(1);
  }
  try {
    const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const result = selfcheck(project);

    const examplePath = 'templates/projects/分合示例-口播/';
    if (result.errors.length) {
      console.error('\n❌ Errors:');
      result.errors.forEach(e => console.error('  - ' + e));
      console.error(`\n参考: ${examplePath}`);
    }

    if (result.warnings.length) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(w => console.log('  - ' + w));
    }

    if (result.infos.length) {
      console.log('\nℹ️ Info:');
      result.infos.forEach(i => console.log('  - ' + i));
    }

    if (result.ok) {
      console.log('\n✅ 自检通过');
      process.exit(0);
    } else {
      console.error('\n❌ 自检失败，请先修复 Errors');
      process.exit(1);
    }
  } catch (e) {
    console.error('自检异常:', e.message);
    process.exit(1);
  }
}

module.exports = { selfcheck };
