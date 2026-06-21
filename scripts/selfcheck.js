/**
 * CanvasVideo Skill — 程序化自检（selfcheck）
 *
 * 把 references/selfcheck-rules.md 中 L0 / L4 里"可机器判定"的硬规则
 * 落到代码里，validate.js 会调用它，避免靠 LLM 手填表格出现"全部填通过"的情况。
 *
 * 当前覆盖（按 selfcheck-rules.md L0 / L4）：
 *   - 节奏 4 条门槛（timing-rules.md 门槛 1 / 2 / 3 / 4，按模式区分）
 *   - 组件 Y 坐标连续递增（layout-rules.md §2）
 *   - 组件 y+h ≤ viewport.height - 10（layout-rules.md §3）
 *
 * 用法：
 *   const { selfcheck } = require('./selfcheck');
 *   const { ok, errors, warnings } = selfcheck(project);
 *
 * 注意：本脚本只输出 errors / warnings 数组，不抛错；调用方决定是否阻断打包。
 */

// 节奏门槛（必须与 references/timing-rules.md 保持一致）
const TIMING = {
  creation: {
    label: '创作模式',
    maxRegionDuration: 5,         // 门槛 3：单区域上限
    maxLastCompTrail: 1,          // 门槛 1：末组件 start → 区域 end 上限
    maxAdjacentGap: 1,            // 门槛 2：同区域相邻组件 start 间隔上限
    minDensityPerSecond: 0.6,     // 门槛 4：组件总数 / 视频时长（仅创作模式）
  },
  voice: {
    label: '口播模式',
    maxRegionDuration: 8,
    maxLastCompTrail: 2,
    maxAdjacentGap: 3,
    minDensityPerSecond: null,    // 口播模式无此门槛
  },
};

/**
 * 判定模式（与 mode-rules.md §3 一致）
 *   - 有 subtitles 数组 → 口播
 *   - audio 是对象且设置了 loop/fadeIn/fadeOut → 创作 + BGM
 *   - 其它默认创作
 */
function detectMode(project) {
  if (Array.isArray(project.subtitles) && project.subtitles.length > 0) {
    return 'voice';
  }
  return 'creation';
}

/**
 * 从 viewport 字段拿高度，没有则按 layout-rules.md §1.1 默认 4:3 → 585
 */
function getViewportHeight(project) {
  if (project.viewport && typeof project.viewport.height === 'number') {
    return project.viewport.height;
  }
  return 585;
}

/**
 * 收集每个区域的组件 start/end，按 region 分组
 *   regions: { [regionId]: { start, end, components: [{id, start, y, h, region}] } }
 *
 * project.json 没有显式 "region" 字段，但组件 id 形如 `P1-001`，可用前缀分组。
 */
function groupByRegion(project) {
  const regions = {};
  if (!Array.isArray(project.components)) return regions;

  for (const comp of project.components) {
    if (!comp || typeof comp !== 'object') continue;
    const id = comp.id || '';
    const m = /^(P\d+)-/.exec(id);
    if (!m) continue;
    const region = m[1];
    if (!regions[region]) {
      regions[region] = { id: region, components: [] };
    }
    regions[region].components.push({
      id,
      start: typeof comp.start === 'number' ? comp.start : null,
      end: typeof comp.end === 'number' ? comp.end : null,
      y: typeof comp.y === 'number' ? comp.y : null,
      h: typeof comp.h === 'number' ? comp.h : null,
    });
  }

  // 推算每个区域的 start / end（min start / max end）
  for (const region of Object.values(regions)) {
    const starts = region.components.map(c => c.start).filter(v => v !== null);
    const ends = region.components.map(c => c.end).filter(v => v !== null);
    region.start = starts.length ? Math.min(...starts) : null;
    region.end = ends.length ? Math.max(...ends) : null;
    if (region.start !== null && region.end !== null) {
      region.duration = region.end - region.start;
    }
  }

  return regions;
}

/**
 * 节奏 4 条门槛检查
 *
 * ⚠️ 严重级别按模式区分（详见 references/timing-rules.md / mode-rules.md §3）：
 *   - 创作模式：LLM 自由生成，节奏完全由 Skill 控制 → 违规一律 error，阻断打包
 *   - 口播模式：一切以 SRT 为准（音频/字幕的真实时间是不可动的"硬约束"）
 *               节奏门槛违规仅 warning（提示但不阻断），避免与 SRT 对齐冲突时被迫破坏对齐
 */
function checkTiming(project, mode, regions, errors, warnings) {
  const cfg = TIMING[mode];
  // 口播模式下，节奏违规降级为 warning（SRT 才是硬约束）
  const bucket = mode === 'voice' ? warnings : errors;
  const tag = mode === 'voice' ? '[warn]' : '';
  const regionIds = Object.keys(regions).sort((a, b) => {
    return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
  });

  for (const rid of regionIds) {
    const region = regions[rid];
    if (region.start === null || region.end === null) continue;

    // 门槛 3：区域时长上限
    if (region.duration > cfg.maxRegionDuration) {
      bucket.push(
        `${tag}[节奏门槛3] ${cfg.label}区域 ${rid} duration=${region.duration}s > 上限 ${cfg.maxRegionDuration}s（${mode === 'voice' ? '口播模式以 SRT 为准，仅提示' : '请拆分区域'}）`
      );
    }

    // 排序该区域内组件 start
    const sortedByStart = region.components
      .filter(c => c.start !== null)
      .slice()
      .sort((a, b) => a.start - b.start);

    if (sortedByStart.length === 0) continue;

    // 门槛 1：末组件 start → 区域 end
    const lastComp = sortedByStart[sortedByStart.length - 1];
    const trail = region.end - lastComp.start;
    if (trail > cfg.maxLastCompTrail) {
      bucket.push(
        `${tag}[节奏门槛1] ${cfg.label}区域 ${rid} 末组件 ${lastComp.id} stop→end 间隔=${trail.toFixed(2)}s > 上限 ${cfg.maxLastCompTrail}s（${mode === 'voice' ? '口播模式以 SRT 为准，仅提示' : '需要补收尾组件或前移末组件 start'}）`
      );
    }

    // 门槛 2：相邻组件 start 间隔
    for (let i = 1; i < sortedByStart.length; i++) {
      const gap = sortedByStart[i].start - sortedByStart[i - 1].start;
      if (gap > cfg.maxAdjacentGap) {
        bucket.push(
          `${tag}[节奏门槛2] ${cfg.label}区域 ${rid} 相邻组件 ${sortedByStart[i - 1].id} → ${sortedByStart[i].id} start 间隔=${gap.toFixed(2)}s > 上限 ${cfg.maxAdjacentGap}s（${mode === 'voice' ? '口播模式以 SRT 为准，仅提示' : '需要补过渡组件'}）`
        );
      }
    }
  }

  // 门槛 4：创作模式平均出场密度 ≥ 0.6（口播模式无此门槛）
  if (mode === 'creation' && cfg.minDensityPerSecond !== null) {
    const compCount = Array.isArray(project.components) ? project.components.length : 0;
    const totalDuration = typeof project.duration === 'number' ? project.duration : null;
    if (totalDuration && totalDuration > 0) {
      const density = compCount / totalDuration;
      if (density < cfg.minDensityPerSecond) {
        errors.push(
          `[节奏门槛4] ${cfg.label}组件密度=${density.toFixed(2)}/s (${compCount}/${totalDuration}s) < 门槛 ${cfg.minDensityPerSecond}/s（需要增加组件或缩短视频时长）`
        );
      }
    }
  }
}

/**
 * 布局检查：Y 坐标连续递增 + y+h 不超 viewport
 */
function checkLayout(project, regions, errors, warnings) {
  const viewportH = getViewportHeight(project);
  const MARGIN = 10; // layout-rules.md 推荐 10px 安全间距

  for (const region of Object.values(regions)) {
    // y+h 不超 viewport
    for (const c of region.components) {
      if (c.y === null || c.h === null) continue;
      if (c.y + c.h > viewportH - MARGIN) {
        errors.push(
          `[布局-溢出] 组件 ${c.id} y+h=${c.y + c.h} > viewport.height-${MARGIN}=${viewportH - MARGIN}（超出可视区）`
        );
      }
    }

    // Y 坐标连续递增（无重叠）
    const sortedByY = region.components
      .filter(c => c.y !== null && c.h !== null)
      .slice()
      .sort((a, b) => a.y - b.y);

    for (let i = 1; i < sortedByY.length; i++) {
      const prev = sortedByY[i - 1];
      const cur = sortedByY[i];
      const expectedMinY = prev.y + prev.h + MARGIN;
      if (cur.y < expectedMinY) {
        errors.push(
          `[布局-重叠] 区域 ${region.id} 组件 ${cur.id} y=${cur.y} < 前一个组件 ${prev.id} bottom+margin=${expectedMinY}（Y 坐标重叠或贴边）`
        );
      }
    }
  }
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
  const regions = groupByRegion(project);

  if (Object.keys(regions).length === 0) {
    warnings.push('未发现任何 P{n}- 前缀的组件，跳过节奏 / 布局检查');
    return { ok: errors.length === 0, mode, errors, warnings };
  }

  checkTiming(project, mode, regions, errors, warnings);
  checkLayout(project, regions, errors, warnings);

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
      console.log('\n✓ 程序化自检通过');
      process.exit(0);
    } else {
      console.error('\n✗ 程序化自检失败:');
      result.errors.forEach(e => console.error('  - ' + e));
      process.exit(1);
    }
  } catch (e) {
    console.error('自检异常:', e.message);
    process.exit(1);
  }
}

module.exports = { selfcheck, detectMode, TIMING };
