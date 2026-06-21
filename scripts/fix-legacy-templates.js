/**
 * 一次性修复脚本：把老版本 templates/projects/*.json 修成符合现行 schema 的格式
 *
 * 修复的兼容性问题：
 *   1. chapters[*].time/title → name/start/end（end 取下一个 chapter 的 start，或 project.duration）
 *   2. components[*].position 缺 x/y → 补默认值 x:0, y:0（保留 w/h；layout 引擎会按 region 算位置）
 *   3. 顶层 ImageComponent.customStyle 缺失 → 补空对象 {}
 *
 * 用法：node scripts/fix-legacy-templates.js <project.json...>
 *
 * 注意：本脚本只做"字段补全"，不动时间轴、不动组件内容、不修节奏违规。
 */
const fs = require('fs');
const path = require('path');

function fixChapters(project) {
  if (!Array.isArray(project.chapters)) return 0;
  let fixed = 0;
  for (let i = 0; i < project.chapters.length; i++) {
    const ch = project.chapters[i];
    if (!ch || typeof ch !== 'object') continue;

    // time/title → start/name
    if (ch.start === undefined && typeof ch.time === 'number') {
      ch.start = ch.time;
      fixed++;
    }
    if (!ch.name && typeof ch.title === 'string') {
      ch.name = ch.title;
      fixed++;
    }

    // end = 下一章 start，或 project.duration
    if (ch.end === undefined) {
      const next = project.chapters[i + 1];
      if (next && typeof next.time === 'number') {
        ch.end = next.time;
      } else if (next && typeof next.start === 'number') {
        ch.end = next.start;
      } else if (typeof project.duration === 'number') {
        ch.end = project.duration;
      } else {
        ch.end = ch.start || 0;
      }
      fixed++;
    }

    // 删掉老字段（schema 不允许 additionalProperties 但实际 schema 没设置，保留也行）
    delete ch.time;
    delete ch.title;
  }
  return fixed;
}

function fixPositionsRecursive(components, fixedRef) {
  if (!Array.isArray(components)) return;
  for (const comp of components) {
    if (!comp || typeof comp !== 'object') continue;

    // position 缺 x / y → 补 0
    if (comp.position && typeof comp.position === 'object') {
      if (typeof comp.position.x !== 'number') {
        comp.position.x = 0;
        fixedRef.count++;
      }
      if (typeof comp.position.y !== 'number') {
        comp.position.y = 0;
        fixedRef.count++;
      }
    }

    // 非 AggregateComponent customStyle 必填
    if (comp.type !== 'AggregateComponent') {
      if (!comp.customStyle || typeof comp.customStyle !== 'object') {
        comp.customStyle = {};
        fixedRef.count++;
      }
    }

    if (Array.isArray(comp.children)) {
      fixPositionsRecursive(comp.children, fixedRef);
    }
  }
}

function fix(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  const project = JSON.parse(raw);

  const chFixed = fixChapters(project);
  const posRef = { count: 0 };
  fixPositionsRecursive(project.components, posRef);

  const out = JSON.stringify(project, null, 2) + '\n';
  fs.writeFileSync(file, out, 'utf-8');

  return { chFixed, posFixed: posRef.count };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('用法: node fix-legacy-templates.js <project.json...>');
    process.exit(1);
  }
  for (const f of files) {
    try {
      const r = fix(f);
      console.log(`✓ ${path.basename(f)}: chapters fixed=${r.chFixed}, position/customStyle fixed=${r.posFixed}`);
    } catch (e) {
      console.error(`✗ ${path.basename(f)}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

module.exports = { fix };
