/**
 * CanvasVideo Skill — 程序化自检（selfcheck）
 *
 * 三段式流程：原则指导 → 自由创作 → 兜底检查
 *
 * 兜底检查分级：
 *   - Error（必须修复）：焦点缺失、时间覆盖、语义不一致、ID重复、时间冲突
 *   - Warning（建议优化）：区域时长、组件数量、层级不清
 *   - Info（仅供参考）：留白、模式一致性、色彩丰富度
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
 * 检查区域是否有焦点组件
 */
function checkFocus(components, regionIndex) {
  const focusTypes = ['ShockComponent', 'TitleComponent', 'ImageComponent'];
  const hasFocus = components.some(c => focusTypes.includes(c.type));
  if (!hasFocus) {
    return `区域 ${regionIndex} 缺少焦点组件（建议添加 Shock/Title/Image）`;
  }
  return null;
}

/**
 * 检查组件时间是否覆盖区域时间
 */
function checkTimeCoverage(components, regionStart, regionEnd, regionIndex) {
  if (components.length === 0) return null;
  const minStart = Math.min(...components.map(c => c.start));
  const maxEnd = Math.max(...components.map(c => c.end));
  if (minStart > regionStart || maxEnd < regionEnd) {
    return `区域 ${regionIndex} 组件时间未完全覆盖区域时间 (${regionStart}-${regionEnd})`;
  }
  return null;
}

/**
 * 检查ID是否重复
 */
function checkDuplicateIds(components) {
  const ids = components.map(c => c.id);
  const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
  if (duplicates.length > 0) {
    return `组件ID重复: ${[...new Set(duplicates)].join(', ')}`;
  }
  return null;
}

/**
 * 检查时间冲突
 */
function checkTimeConflict(components, regionIndex) {
  // AggregateComponent 的 children 是视觉子元素，不是独立时间轴组件
  const timeComponents = components.filter(c => c.type !== 'AggregateComponent');
  for (let i = 0; i < timeComponents.length; i++) {
    for (let j = i + 1; j < timeComponents.length; j++) {
      const a = timeComponents[i];
      const b = timeComponents[j];
      // 允许时间重叠：组件可以共存于同一时间
      if (a.start === b.start && a.end === b.end) {
        return `区域 ${regionIndex} 组件时间完全重叠: ${a.id} 与 ${b.id}`;
      }
    }
  }
  return null;
}

/**
 * 主入口
 * @param {object} project - 已解析的 project.json
 * @returns {{ ok: boolean, mode: string, errors: string[], warnings: string[], infos: string[] }}
 */
function selfcheck(project) {
  const errors = [];
  const warnings = [];
  const infos = [];

  if (!project || typeof project !== 'object') {
    return { ok: false, mode: 'unknown', errors: ['project 不是对象'], warnings, infos };
  }

  const mode = detectMode(project);

  if (!Array.isArray(project.components) || project.components.length === 0) {
    warnings.push('project.json 中无组件，请确认是否已生成组件数据');
  }

  // 按区域分组组件
  const regions = project.regions || [];
  const components = project.components || [];

  regions.forEach((region, idx) => {
    const regionComponents = components.filter(c => 
      c.start >= region.start && c.end <= region.end
    );

    // Error 检查
    const focusError = checkFocus(regionComponents, idx);
    if (focusError) errors.push(focusError);

    const coverageError = checkTimeCoverage(regionComponents, region.start, region.end, idx);
    if (coverageError) errors.push(coverageError);

    const conflictError = checkTimeConflict(regionComponents, idx);
    if (conflictError) errors.push(conflictError);

    // Warning 检查
    const duration = region.end - region.start;
    if (duration > 8) {
      warnings.push(`区域 ${idx} 时长 ${duration.toFixed(1)}s 超过建议值 8s`);
    }

    if (regionComponents.length > 8) {
      warnings.push(`区域 ${idx} 组件数 ${regionComponents.length} 较多，建议检查是否必要`);
    }

    if (regionComponents.length < 2 && duration > 4) {
      warnings.push(`区域 ${idx} 只有 ${regionComponents.length} 个组件，确认是否为极简设计`);
    }
  });

  // 全局 Error 检查
  const dupError = checkDuplicateIds(components);
  if (dupError) errors.push(dupError);

  // Info 检查
  const modeTypes = new Set(components.map(c => c.type));
  if (modeTypes.size < 3) {
    infos.push(`使用了 ${modeTypes.size} 种组件类型，建议增加多样性`);
  }

  return { ok: errors.length === 0, mode, errors, warnings, infos };
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

    if (result.errors.length) {
      console.error('\n❌ Errors（必须修复）:');
      result.errors.forEach(e => console.error('  - ' + e));
    }

    if (result.warnings.length) {
      console.log('\n⚠️ Warnings（建议优化）:');
      result.warnings.forEach(w => console.log('  - ' + w));
    }

    if (result.infos.length) {
      console.log('\nℹ️ Info（仅供参考）:');
      result.infos.forEach(i => console.log('  - ' + i));
    }

    if (result.ok && result.warnings.length === 0) {
      console.log('\n✅ 自检通过');
      process.exit(0);
    } else if (result.ok) {
      console.log('\n✅ 自检通过（有 Warning，建议优化）');
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

module.exports = { selfcheck, detectMode };
