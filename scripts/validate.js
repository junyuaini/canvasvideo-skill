/**
 * 本地自检（B 方案 v2.0）
 *
 * 历史变更：
 *   v1.x —— 三层校验：schema 结构 + 业务规则 + selfcheck 节奏/布局
 *   v2.0 —— 单层自检：只跑 selfcheck（节奏 4 门槛 + 布局 Y 坐标）
 *
 * 为什么砍掉前两层：
 *   - schema 结构 + customStyle 字段 + audio/subtitles 共生 = 全部交给云端 /api/projects/validate（权威）
 *   - 本地保留 schema 副本会形成"前端/本地 Skill/服务端"三份同步负担
 *   - 节奏 4 门槛 / 布局 Y 坐标是云端不懂的"设计规则"，必须留在 Skill 端
 *
 * 因此本脚本不再叫"校验器"，更准确地说是"本地自检（selfcheck wrapper）"——
 *   - 通过 = 进入打 zip 步骤
 *   - 失败 = 改 project.json 重跑
 *
 * 真正阻止上传的硬错（schema/customStyle 字段缺失）由 upload-video.js 的云端 precheck 兜底。
 *
 * 用法：node validate.js <project.json路径>
 */
const fs = require('fs');
const { selfcheck } = require('./selfcheck');


/**
 * 本地自检 project.json
 * @param {Object|string} projectOrPath - 解析后的对象或文件路径
 * @returns {{ valid: boolean, errors: string[], warnings: string[], mode: string }}
 */
function validate(projectOrPath) {
  let project;
  if (typeof projectOrPath === 'string') {
    try {
      project = JSON.parse(fs.readFileSync(projectOrPath, 'utf-8'));
    } catch (e) {
      throw new Error(`JSON.parse 失败: ${e.message}`);
    }
  } else {
    project = projectOrPath;
  }

  const sc = selfcheck(project);
  const result = {
    valid: sc.errors.length === 0,
    errors: sc.errors,
    warnings: sc.warnings,
    mode: sc.mode,
  };

  return result;
}

// CLI 模式
if (require.main === module) {
  const projectPath = process.argv[2];
  if (!projectPath) {
    console.error('用法: node validate.js <project.json路径>');
    process.exit(1);
  }

  try {
    const result = validate(projectPath);
    if (result.mode) {
      console.log(`模式: ${result.mode}`);
    }
    if (result.warnings && result.warnings.length) {
      console.log('Warnings:');
      result.warnings.forEach(w => console.log('  - ' + w));
    }
    if (result.valid) {
      console.log('✓ 本地自检通过（节奏/布局规则）');
      console.log('  注意：schema 结构 + customStyle 字段级 校验由云端 /api/projects/validate 在上传前自动完成');
      process.exit(0);
    } else {
      console.error('✗ 本地自检未通过:');
      result.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
  } catch (err) {
    console.error('自检异常:', err.message);
    process.exit(1);
  }
}

module.exports = { validate };
