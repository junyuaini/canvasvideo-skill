/**
 * 校验 project.json 是否符合 schema
 * 用法：node validate.js <project.json路径>
 */
const fs = require('fs');
const path = require('path');

/**
 * 校验 project.json
 * @param {Object|string} projectOrPath - 解析后的对象或文件路径
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validate(projectOrPath) {
  let project;
  
  if (typeof projectOrPath === 'string') {
    project = JSON.parse(fs.readFileSync(projectOrPath, 'utf-8'));
  } else {
    project = projectOrPath;
  }
  
  const errors = [];
  
  // 必填字段
  if (!project.name || typeof project.name !== 'string') {
    errors.push('缺少或 name 字段不合法');
  }
  
  if (!Array.isArray(project.components)) {
    errors.push('components 必须是数组');
  } else if (project.components.length === 0) {
    errors.push('components 不能为空');
  } else {
    // 校验每个组件
    project.components.forEach((comp, i) => {
      if (!comp.id) errors.push(`组件[${i}] 缺少 id`);
      if (!comp.type) errors.push(`组件[${i}] 缺少 type`);
      if (!comp.position) errors.push(`组件[${comp.id || i}] 缺少 position`);
      else {
        if (typeof comp.position.x !== 'number') errors.push(`组件[${comp.id}] position.x 必须是数字`);
        if (typeof comp.position.y !== 'number') errors.push(`组件[${comp.id}] position.y 必须是数字`);
        if (typeof comp.position.w !== 'number') errors.push(`组件[${comp.id}] position.w 必须是数字`);
        if (typeof comp.position.h !== 'number') errors.push(`组件[${comp.id}] position.h 必须是数字`);
      }
    });
  }
  
  // audio 可以是字符串路径或对象 { path, loop, fadeIn, fadeOut }
  let audioPath = '';
  if (project.audio !== undefined) {
    if (typeof project.audio === 'string') {
      audioPath = project.audio;
    } else if (typeof project.audio === 'object' && project.audio !== null) {
      const a = project.audio;
      if (typeof a.path !== 'string' || a.path.trim().length === 0) {
        errors.push('audio.path 必须是非空字符串');
      } else {
        audioPath = a.path;
      }
      if (a.loop !== undefined && typeof a.loop !== 'boolean') {
        errors.push('audio.loop 必须是布尔值');
      }
      if (a.fadeIn !== undefined) {
        if (typeof a.fadeIn !== 'number' || a.fadeIn < 0 || a.fadeIn > 5) {
          errors.push(`audio.fadeIn 必须是 0-5 之间的数字（当前 ${a.fadeIn}）`);
        }
      }
      if (a.fadeOut !== undefined) {
        if (typeof a.fadeOut !== 'number' || a.fadeOut < 0 || a.fadeOut > 5) {
          errors.push(`audio.fadeOut 必须是 0-5 之间的数字（当前 ${a.fadeOut}）`);
        }
      }
    } else {
      errors.push('audio 必须是字符串路径或对象（含 path/loop/fadeIn/fadeOut）');
    }
  }
  
  // subtitles 必须是数组
  if (project.subtitles !== undefined && !Array.isArray(project.subtitles)) {
    errors.push('subtitles 必须是数组');
  } else if (Array.isArray(project.subtitles)) {
    project.subtitles.forEach((sub, i) => {
      if (typeof sub.start !== 'number') errors.push(`subtitles[${i}] start 必须是数字`);
      if (typeof sub.end !== 'number') errors.push(`subtitles[${i}] end 必须是数字`);
      if (!sub.text) errors.push(`subtitles[${i}] text 不能为空`);
    });
  }

  // 字幕与音频共生规则（详见 SKILL.md §2.4）
  // 判定 audio 是 BGM 用法还是 配音 用法：
  //   - BGM 用法：audio 是对象且包含 loop/fadeIn/fadeOut 任一字段（LLM 主动设置过）
  //   - 配音用法：audio 是字符串、或对象但只有 path（无音效配置）
  const hasAudio = audioPath.trim().length > 0;
  const isBgmUsage = (typeof project.audio === 'object' && project.audio !== null
    && (project.audio.loop !== undefined
        || project.audio.fadeIn !== undefined
        || project.audio.fadeOut !== undefined));
  const hasSubtitles = Array.isArray(project.subtitles) && project.subtitles.length > 0;

  if (hasSubtitles && !hasAudio) {
    errors.push(
      'subtitles 数组非空，但缺少 audio 字段：字幕必须与配音音频共生，' +
      '创作模式（无音频）严禁写 subtitles，请删除 subtitles 数组或补充 audio 路径。'
    );
  }
  // 提示：有 audio 但没 subtitles 时——只有"配音用法"才拦截；BGM 用法（loop/fadeIn/fadeOut 任一存在）跳过
  if (hasAudio && !hasSubtitles && !isBgmUsage) {
    errors.push(
      'audio 字段已设置但视为配音用法（未配置 loop/fadeIn/fadeOut），但 subtitles 数组为空：' +
      '配音模式必须提供 SRT 字幕。要让这段音频作为 BGM，请把 audio 改为对象形式并设置 ' +
      '{ "path": "...", "loop": true, "fadeIn": 1, "fadeOut": 2 }；详见 SKILL.md §2.4。'
    );
  }

  // theme 仅允许 white / black（v1.4 限制）
  if (project.theme !== undefined) {
    if (typeof project.theme !== 'string') {
      errors.push('theme 必须是字符串');
    } else if (!['white', 'black'].includes(project.theme)) {
      errors.push(`theme 仅支持 "white" / "black"，当前值 "${project.theme}" 不允许（v1.4 不支持自定义主题）`);
    }
  }

  // settings 三个动画参数（详见 SKILL.md §2.6.2）
  if (project.settings && typeof project.settings === 'object') {
    const s = project.settings;
    if (typeof s.preFullViewDuration === 'number' && s.preFullViewDuration > 0.6) {
      errors.push(`settings.preFullViewDuration 必须 ≤ 0.6（当前 ${s.preFullViewDuration}），推荐 0.4`);
    }
    if (typeof s.postFullViewDuration === 'number' && s.postFullViewDuration > 0.6) {
      errors.push(`settings.postFullViewDuration 必须 ≤ 0.6（当前 ${s.postFullViewDuration}），推荐 0.4`);
    }
    if (typeof s.contentZoomRatio === 'number' && (s.contentZoomRatio < 0.85 || s.contentZoomRatio > 0.95)) {
      errors.push(`settings.contentZoomRatio 必须在 0.85-0.95 区间（当前 ${s.contentZoomRatio}），推荐 0.9`);
    }
  }
  
  // viewport
  if (project.viewport) {
    if (typeof project.viewport.width !== 'number') errors.push('viewport.width 必须是数字');
    if (typeof project.viewport.height !== 'number') errors.push('viewport.height 必须是数字');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
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
    if (result.valid) {
      console.log('✓ project.json 校验通过');
      process.exit(0);
    } else {
      console.error('✗ project.json 校验失败:');
      result.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
  } catch (err) {
    console.error('校验异常:', err.message);
    process.exit(1);
  }
}

module.exports = { validate };
