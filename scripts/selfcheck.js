/**
 * CanvasVideo Skill — 程序化自检（selfcheck）
 *
 * 已简化：不再做硬性的节奏/布局阻断校验。
 * 节奏和布局规则改为文档层面的软性指导（见 timing-rules.md / layout-rules.md），
 * 由 LLM 在设计阶段自觉遵守，不再程序化拦截。
 *
 * 当前仅保留：
 *   - 模式检测（用于日志输出）
 *   - 基础结构检查（project 是否为对象、是否有组件）
 *
 * 真正的格式硬校验由云端 /api/projects/validate 在上传前完成。
 */

/**
 * 判定模式（与 mode-rules.md §3 一致）
 *   - 有 subtitles 数组 → 口播
 *   - 其它默认创作
 */
function detectMode(project) {
  if (Array.isArray(project.subtitles) && project.subtitles.length > 0) {
    return 'voice';
  }
  return 'creation';
}

/**
 * 主入口
 * @param {object} project - 已解析的 project.json
 * @returns {{ ok: boolean, mode: string, errors: string[], warnings: string[] }}
 */
function selfcheck(project) {
  const errors = [];
  const warnings = [];

  if (!project || typeof project !== 'object') {
    return { ok: false, mode: 'unknown', errors: ['project 不是对象'], warnings };
  }

  const mode = detectMode(project);

  if (!Array.isArray(project.components) || project.components.length === 0) {
    warnings.push('project.json 中无组件，请确认是否已生成组件数据');
  }

  // 节奏和布局规则已改为软性指导，不再程序化拦截
  // 详见 references/timing-rules.md 和 references/layout-rules.md

  return { ok: errors.length === 0, mode, errors, warnings };
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
    console.log(`模式: ${result.mode}`);
    if (result.warnings.length) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log('  - ' + w));
    }
    if (result.ok) {
      console.log('\n✓ 自检通过（节奏/布局规则已改为软性指导，由设计阶段自觉遵守）');
      process.exit(0);
    } else {
      console.error('\n✗ 自检失败:');
      result.errors.forEach(e => console.error('  - ' + e));
      process.exit(1);
    }
  } catch (e) {
    console.error('自检异常:', e.message);
    process.exit(1);
  }
}

module.exports = { selfcheck, detectMode };
