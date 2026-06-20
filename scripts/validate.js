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
  
  // audio 必须是字符串
  if (project.audio !== undefined && typeof project.audio !== 'string') {
    errors.push('audio 必须是字符串路径');
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
  
  // theme 必须是字符串
  if (project.theme !== undefined && typeof project.theme !== 'string') {
    errors.push('theme 必须是字符串');
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
