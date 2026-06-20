/**
 * 校验 project.json
 *
 * 校验分两层：
 *   1. 结构校验：用 ../schema/project.schema.json 跑 schemaValidator（零依赖）
 *   2. 业务规则：subtitles/audio 共生、BGM 用法判定（schema 表达不出来的逻辑）
 *
 * 用法：node validate.js <project.json路径>
 */
const fs = require('fs');
const path = require('path');
const { validateAgainstSchema } = require('./schemaValidator');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema', 'project.schema.json');
let SCHEMA_CACHE = null;

function loadSchema() {
  if (SCHEMA_CACHE) return SCHEMA_CACHE;
  try {
    SCHEMA_CACHE = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    return SCHEMA_CACHE;
  } catch (e) {
    throw new Error(`无法加载 schema: ${SCHEMA_PATH}, ${e.message}`);
  }
}

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

  const schema = loadSchema();
  const errors = [];

  // 第一层：schema 结构校验
  const schemaErrors = validateAgainstSchema(project, schema);
  errors.push(...schemaErrors);

  // 第二层：业务规则（schema 表达不出来的）
  errors.push(...businessRules(project));

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 业务规则校验
 * - subtitles 与 audio 共生
 * - audio 配音用法必须有字幕，BGM 用法可无字幕
 */
function businessRules(project) {
  const errors = [];

  // 拿到 audio 路径
  let audioPath = '';
  if (typeof project.audio === 'string') {
    audioPath = project.audio;
  } else if (project.audio && typeof project.audio === 'object' && typeof project.audio.path === 'string') {
    audioPath = project.audio.path;
  }
  const hasAudio = audioPath.trim().length > 0;

  // 判定 BGM 用法：audio 是对象且包含 loop/fadeIn/fadeOut 任一字段
  const isBgmUsage = (typeof project.audio === 'object' && project.audio !== null
    && (project.audio.loop !== undefined
        || project.audio.fadeIn !== undefined
        || project.audio.fadeOut !== undefined));

  const hasSubtitles = Array.isArray(project.subtitles) && project.subtitles.length > 0;

  // 字幕 → 音频已经在 schema dependencies 里检查过了，这里只补充配音用法的反向规则
  if (hasAudio && !hasSubtitles && !isBgmUsage) {
    errors.push(
      'audio 字段已设置但视为配音用法（未配置 loop/fadeIn/fadeOut），但 subtitles 数组为空：' +
      '配音模式必须提供 SRT 字幕。要让这段音频作为 BGM，请把 audio 改为对象形式并设置 ' +
      '{ "path": "...", "loop": true, "fadeIn": 1, "fadeOut": 2 }；详见 SKILL.md §2.4。'
    );
  }

  return errors;
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
