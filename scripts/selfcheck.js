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
 */
function checkHtmlElementIds(components) {
  const errors = [];
  const elementIdPattern = /^[A-Za-z0-9_\-]+$/;
  const upperSuffixPattern = /^[A-Z][A-Z0-9_]*$/;

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

        // 校验每个 elementId
        Object.entries(elementIds).forEach(([selector, value]) => {
          if (!value || typeof value !== 'object') {
            errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"] 格式错误，应为 { id, start, end }。`);
            return;
          }

          if (!value.id || typeof value.id !== 'string') {
            errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].id 必须是字符串。`);
          } else if (!elementIdPattern.test(value.id)) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].id "${value.id}" 包含非法字符。`);
          } else {
            // 强校验：必须为 {组件ID}-{大写名称} 格式，如 P1-001-TITLE
            if (comp.id && value.id.startsWith(comp.id + '-')) {
              const suffix = value.id.slice(comp.id.length + 1);
              if (!upperSuffixPattern.test(suffix)) {
                errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].id "${value.id}" 后缀必须是「大写字母+数字+下划线」，如 ${comp.id}-TITLE。`);
              }
            } else {
              errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].id "${value.id}" 必须以组件 ID "${comp.id}" 为前缀，格式如 ${comp.id}-TITLE。`);
            }
          }

          if (typeof value.start !== 'number' || value.start < 0) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].start 必须是非负数字。`);
          }

          if (typeof value.end !== 'number' || value.end < 0) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].end 必须是非负数字。`);
          }

          if (typeof value.start === 'number' && typeof value.end === 'number' && value.start > value.end) {
            errors.push(`HtmlComponent [${labelId}] elementIds["${selector}"].start (${value.start}) 不能大于 end (${value.end})。`);
          }
        });
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

  // 检查 ID 重复
  const dupError = checkDuplicateIds(components);
  if (dupError) errors.push(dupError);

  // 检查顶级组件 regionId
  const topRegionIdErrors = checkTopRegionId(components, regions);
  errors.push(...topRegionIdErrors);

  // 检查 HtmlComponent elementIds
  const htmlElementIdsErrors = checkHtmlElementIds(components);
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
