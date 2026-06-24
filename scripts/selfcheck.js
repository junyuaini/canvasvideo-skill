/**
 * CanvasVideo Skill — 程序化自检（selfcheck）
 *
 * 只做两项检查：
 *   1. ID 格式：{区域ID}-{三位数字}，如 P1-001、P3-005
 *   2. ID 重复：全局唯一
 *
 * 真正的格式硬校验由云端 /api/projects/validate 在上传前完成。
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

  // 检查 ID 格式
  const formatErrors = checkIdFormat(components);
  errors.push(...formatErrors);

  // 检查 ID 重复
  const dupError = checkDuplicateIds(components);
  if (dupError) errors.push(dupError);

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
