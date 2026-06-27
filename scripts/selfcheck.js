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
      errors.push(`组件 ID "${c.id}" 格式错误，应为 P{数字}-{三位数字}，如 P1-001、P3-005`);
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
    return `组件ID重复: ${[...new Set(duplicates)].join(', ')}`;
  }
  return null;
}

/**
 * 检查顶级组件 regionId 必填
 * - 顶级组件（顶层数组成员）必须配置 regionId
 * - regionId 必须在 regions 中存在
 * - 组件 ID 前缀必须与 regionId 一致
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
function checkHtmlElementIds(components, allIds) {
  const errors = [];
  const elementIdPattern = /^P\d+-\d{3}$/;

  function checkRecursive(comps) {
    comps.forEach((comp) => {
      if (!comp || typeof comp !== 'object') return;

      if (comp.type === 'HtmlComponent') {
        const labelId = comp.id || '未知';

        // elementIds 必填
        if (!comp.content || !comp.content.elementIds || typeof comp.content.elementIds !== 'object') {
          errors.push(`HtmlComponent [${labelId}] 缺少 elementIds：必须为内部元素配置独立时间线。`);
          return;
        }

        // elementIds 非空
        const elementIds = comp.content.elementIds;
        if (Object.keys(elementIds).length === 0) {
          errors.push(`HtmlComponent [${labelId}] elementIds 不能为空，至少配置一个元素。`);
          return;
        }

        // [归并] 同一组件内"key 不是 #ID 形式"的 key 收集起来，最后归并为一条错误
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

          if (typeof value.start !== 'number' || !Number.isFinite(value.start) || value.start < 0) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].start 必须是有限非负数字（不允许 Infinity），如 0。`);
          }

          if (typeof value.end !== 'number' || !Number.isFinite(value.end) || value.end < 0) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].end 必须是有限非负数字（不允许 Infinity），如 5。`);
          }

          if (typeof value.start === 'number' && Number.isFinite(value.start) && typeof value.end === 'number' && Number.isFinite(value.end) && value.start > value.end) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${key}"].start (${value.start}) 不能大于 end (${value.end})。`);
          }

          // [层级 3 / element] 元素时间范围必须在所属 component 范围内
          if (
            typeof comp.start === 'number' && Number.isFinite(comp.start) &&
            typeof comp.end === 'number' && Number.isFinite(comp.end) &&
            typeof value.start === 'number' && Number.isFinite(value.start) &&
            typeof value.end === 'number' && Number.isFinite(value.end)
          ) {
            if (value.start < comp.start) {
              errors.push(`[层级 3 / element] HtmlComponent [${labelId}] elementIds["${key}"].start=${value.start} 早于所属组件开始时间 ${comp.start}（组件范围 [${comp.start}, ${comp.end}]）。建议：将 elementIds start 改为 ${comp.start}。`);
            }
            if (value.end > comp.end) {
              errors.push(`[层级 3 / element] HtmlComponent [${labelId}] elementIds["${key}"].end=${value.end} 超出所属组件结束时间 ${comp.end}（组件范围 [${comp.start}, ${comp.end}]）。建议：将 elementIds end 改为 ${comp.end} 或更小。`);
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
 *   - component.start / end 必填、有限数字、≥ 0、start ≤ end
 *   - component.end 必须是有限数字（不允许 Infinity）
 *   - region.startTime ≤ component.start 且 component.end ≤ region.endTime
 *   - elementIds.start / end 必填、有限数字、≥ 0、start ≤ end
 *   - elementIds.end 必须是有限数字（不允许 Infinity）
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
  }

  // [层级 1.4] region 必填字段校验（与后端 schema 对齐）
  regions.forEach((region, index) => {
    if (!region || typeof region !== 'object') return;
    if (!region.id || typeof region.id !== 'string' || region.id.trim() === '') {
      errors.push(
        `regions[${index}] 缺少必填字段 'id'。建议：给每个 region 加一个唯一 ID（如 "P1"），并保证与组件 ID 前缀一致。`
      );
    }
  });

  // [层级 1.5] 累计 region 时长校验
  if (typeof project.duration === 'number' && Number.isFinite(project.duration)) {
    let regionTotal = 0;
    let regionDurationError = false;
    regions.forEach((region, index) => {
      const label = region && region.id ? ` [${region.id}]` : ` [index ${index}]`;
      if (typeof region.duration !== 'number' || !Number.isFinite(region.duration)) {
        errors.push(
          `[层级 1.5 / region]${label} duration 必填且为有限数字（如 3），不能是 Infinity。建议：补一个具体的秒数。`
        );
        regionDurationError = true;
      } else if (region.duration < 0.1) {
        errors.push(
          `[层级 1.5 / region]${label} duration=${region.duration} 太小，必须 ≥ 0.1 秒。建议：合并到相邻 region 或调整时长。`
        );
        regionDurationError = true;
      } else {
        regionTotal += region.duration;
      }
    });

    if (!regionDurationError) {
      if (Math.abs(regionTotal - project.duration) > 0.001) {
        const diff = regionTotal - project.duration;
        if (diff > 0) {
          errors.push(
            `[层级 1.5 / project] regions 时长累计 (${regionTotal} 秒) 超过 project.duration (${project.duration} 秒)，超出 ${diff.toFixed(2)} 秒。建议：①将 project.duration 改为 ${regionTotal}  ②缩短部分 region。`
          );
        } else {
          errors.push(
            `[层级 1.5 / project] regions 时长累计 (${regionTotal} 秒) 小于 project.duration (${project.duration} 秒)，留白 ${(-diff).toFixed(2)} 秒（不允许留白）。建议：①将 project.duration 改为 ${regionTotal}  ②增加 region 或延长 region.duration。`
          );
        }
      }
    }
  }

  // 计算每个 region 的隐式 startTime / endTime
  const regionRanges = new Map();
  let cursor = 0;
  regions.forEach((region) => {
    if (region && region.id && typeof region.duration === 'number' && Number.isFinite(region.duration)) {
      regionRanges.set(region.id, { startTime: cursor, endTime: cursor + region.duration });
      cursor += region.duration;
    }
  });

  // [层级 2] component 时间范围校验
  function checkComponentTimeRecursive(comps) {
    comps.forEach((comp) => {
      if (!comp || typeof comp !== 'object') return;

      const compLabel = comp.id ? ` [${comp.id}]` : '';

      if (comp.start === undefined || comp.start === null || typeof comp.start !== 'number' || !Number.isFinite(comp.start)) {
        errors.push(
          `[层级 2 / component]${compLabel} start 必填且为有限数字（不允许 Infinity），如 0。建议：补一个具体的开始时间。`
        );
      } else if (comp.start < 0) {
        errors.push(
          `[层级 2 / component]${compLabel} start=${comp.start} 不能小于 0。建议：调整为 ≥ 0。`
        );
      }

      if (comp.end === undefined || comp.end === null || typeof comp.end !== 'number' || !Number.isFinite(comp.end)) {
        errors.push(
          `[层级 2 / component]${compLabel} end 必填且为有限数字（不允许 Infinity），如 5。建议：补一个具体的结束时间。`
        );
      } else if (comp.end < 0) {
        errors.push(
          `[层级 2 / component]${compLabel} end=${comp.end} 不能小于 0。建议：调整为 ≥ 0。`
        );
      } else {
        if (comp.regionId && regionRanges.has(comp.regionId)) {
          const range = regionRanges.get(comp.regionId);
          if (typeof comp.start === 'number' && Number.isFinite(comp.start) && comp.end > range.endTime + 0.001) {
            errors.push(
              `[层级 2 / component]${compLabel} end=${comp.end} 超出所属 region "${comp.regionId}" 结束时间 ${range.endTime}（region 范围 [${range.startTime}, ${range.endTime}]）。建议：将 end 改为 ${range.endTime} 或更小。`
            );
          }
        } else if (comp.regionId && !regionRanges.has(comp.regionId)) {
          errors.push(
            `[层级 2 / component]${compLabel} regionId "${comp.regionId}" 在 regions 数组中找不到，无法校验时间范围。`
          );
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

  // 检查 ID 格式
  const formatErrors = checkIdFormat(components);
  errors.push(...formatErrors);

  // 检查 ID 重复（顶级组件）
  const dupError = checkDuplicateIds(components);
  if (dupError) errors.push(dupError);

  // 检查顶级组件 regionId
  const topRegionIdErrors = checkTopRegionId(components, regions);
  errors.push(...topRegionIdErrors);

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

    if (result.errors.length) {
      console.error('\n❌ Errors:');
      result.errors.forEach(e => console.error('  - ' + e));
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
