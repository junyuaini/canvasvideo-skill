/**
 * CanvasVideo Skill — 工作目录与设计文档脚手架
 *
 * 功能：
 *  - ensureWorkdirRoot       ：确保工作根目录 canvasvideo-workdir/ 存在
 *  - ensureProjectWorkdir    ：确保某个项目的工作目录存在（含 assets/ 与 assets/images/）
 *  - ensurePlaceholders      ：把占位 SVG 复制到工作目录的 assets/placeholders/{theme}/
 *  - scaffoldWorkdir         ：根据素材清单批量创建占位文件
 *  - writeDesignMd / readDesignMd ：读写设计文档
 *  - copyUserAsset           ：把用户提供的素材安全拷贝到 assets/，校验路径不越界
 *
 * 状态机约束：
 *  - writeDesignMd  要求 step === 'init'
 *  - readDesignMd   要求 step === 'design' 或 'design_confirmed'
 *  - scaffoldWorkdir 要求 step === 'design_confirmed'
 *  - ensurePlaceholders / ensureBgm 要求 step === 'design_confirmed'
 */
const fs = require('fs');
const path = require('path');
const { assertStep, advanceStep } = require('./state');

/**
 * 7 个标准 hint 关键词（与 templates/placeholders/{theme}/{hint}.svg 一一对应）
 */
const PLACEHOLDER_HINTS = ['hook', 'scene', 'pain', 'solve', 'result', 'cta', 'generic'];

/**
 * 主题枚举
 */
const VALID_THEMES = ['white', 'black'];

/**
 * 把 theme 映射到 placeholders 子目录
 *  white -> light
 *  black -> dark
 */
function themeToPlaceholderDir(theme) {
  if (theme === 'black') return 'dark';
  return 'light'; // default & white
}

/**
 * 确保工作根目录存在（canvasvideo-workdir/ 自身）
 */
function ensureWorkdirRoot(workdirRoot) {
  fs.mkdirSync(workdirRoot, { recursive: true });
  return workdirRoot;
}

/**
 * 确保项目工作目录存在 — 任何首次写文件前都应调用
 *  canvasvideo-workdir/{skillProjectId}/
 *  canvasvideo-workdir/{skillProjectId}/assets/
 *  canvasvideo-workdir/{skillProjectId}/assets/images/
 *
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @returns {string} 项目工作目录绝对路径
 */
function ensureProjectWorkdir(workdirRoot, skillProjectId) {
  ensureWorkdirRoot(workdirRoot);
  const workdir = path.join(workdirRoot, skillProjectId);
  const assetsDir = path.join(workdir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(path.join(assetsDir, 'images'), { recursive: true });
  return workdir;
}

/**
 * 把 templates/placeholders/{theme}/*.svg 复制到工作目录的
 * assets/placeholders/{theme}/，方便 LLM 直接在 project.json 引用本地 SVG。
 *
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @param {string} theme - 'white' | 'black'，默认 'white'
 * @returns {Object} { copied: string[], targetDir: string }
 */
function ensurePlaceholders(workdirRoot, skillProjectId, theme = 'white') {
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  const themeDir = themeToPlaceholderDir(theme);

  // Skill 端的占位图源目录（templates/placeholders/{light|dark}/）
  const sourceDir = path.resolve(__dirname, '..', 'templates', 'placeholders', themeDir);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`占位图模板目录不存在：${sourceDir}`);
  }

  // 工作目录的占位图目录
  const targetDir = path.join(workdir, 'assets', 'placeholders', themeDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const copied = [];
  for (const hint of PLACEHOLDER_HINTS) {
    const src = path.join(sourceDir, `${hint}.svg`);
    const dst = path.join(targetDir, `${hint}.svg`);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      copied.push(`assets/placeholders/${themeDir}/${hint}.svg`);
    }
  }
  return { copied, targetDir };
}

/**
 * BGM 标准风格列表（与 templates/bgm/bgm-catalog.md 一致）
 */
const BGM_STYLES = ['tech-pulse', 'warm-cafe', 'uplifting', 'corporate', 'light-pop', 'cinematic'];

/**
 * 把 templates/bgm/*.mp3（如果存在）复制到工作目录的 assets/placeholders/bgm/。
 * 如果 templates/bgm/ 下没有 mp3 文件（用户尚未入库），静默跳过。
 *
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @param {string} [styleHint] - 想要的 BGM 风格（如 'uplifting'），不传则复制全部
 * @returns {Object} { copied: string[], targetDir: string, hasBgm: boolean }
 */
function ensureBgm(workdirRoot, skillProjectId, styleHint) {
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  const sourceDir = path.resolve(__dirname, '..', 'templates', 'bgm');
  const targetDir = path.join(workdir, 'assets', 'placeholders', 'bgm');

  if (!fs.existsSync(sourceDir)) {
    return { copied: [], targetDir, hasBgm: false };
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const stylesToCopy = styleHint && BGM_STYLES.includes(styleHint) ? [styleHint] : BGM_STYLES;
  const copied = [];
  let hasBgm = false;
  for (const style of stylesToCopy) {
    // 支持 .mp3 和 .wav 两种格式（优先 .mp3）
    const ext = ['.mp3', '.wav'].find(e => fs.existsSync(path.join(sourceDir, `${style}${e}`)));
    if (!ext) continue;
    const src = path.join(sourceDir, `${style}${ext}`);
    const dst = path.join(targetDir, `${style}${ext}`);
    hasBgm = true;
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      copied.push(`assets/placeholders/bgm/${style}${ext}`);
    }
  }
  return { copied, targetDir, hasBgm };
}

/**
 * 创建 workdir 目录结构 + 按素材清单批量占位
 * 状态机要求：step === 'design_confirmed'
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @param {Object} assetChecklist - 素材清单（类别 -> [{ path, status, type, hint? }]）
 * @param {Object} [options]
 * @param {string} [options.theme] - 'white' | 'black'，决定图片占位的色调，默认 'white'
 * @returns {string} 项目工作目录路径
 */
function scaffoldWorkdir(workdirRoot, skillProjectId, assetChecklist = {}, options = {}) {
  // 状态机校验：必须在 design_confirmed 步骤才能创建素材
  assertStep(workdirRoot, 'design_confirmed');

  const theme = options.theme || 'white';
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);

  // 不论素材清单怎么样，先把整套占位 SVG 复制到 workdir，作为兜底
  ensurePlaceholders(workdirRoot, skillProjectId, theme);

  for (const [, items] of Object.entries(assetChecklist)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item.status === '[AI 自动生成]') {
        const fullPath = path.join(workdir, item.path);
        // 防路径穿越
        if (!isPathInside(fullPath, workdir)) {
          throw new Error(`素材路径不安全：${item.path}`);
        }
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        if (!fs.existsSync(fullPath)) {
          fs.writeFileSync(fullPath, createPlaceholder(item.type, item.hint, theme));
        }
      }
    }
  }
  return workdir;
}

/**
 * 创建占位文件内容
 *  - audio    : 空 mp3 占位（0 字节，用户必须替换）
 *  - srt      : 一条占位字幕
 *  - image    : 按 hint + theme 从 templates/placeholders 选择 SVG 内容返回
 */
function createPlaceholder(type, hint, theme) {
  switch (type) {
    case 'audio':
      return '';
    case 'srt':
      return '1\n00:00:00,000 --> 00:00:05,000\n占位字幕\n\n';
    case 'image': {
      const themeDir = themeToPlaceholderDir(theme || 'white');
      const safeHint = PLACEHOLDER_HINTS.includes((hint || '').toLowerCase())
        ? hint.toLowerCase()
        : 'generic';
      const svgPath = path.resolve(__dirname, '..', 'templates', 'placeholders', themeDir, `${safeHint}.svg`);
      if (fs.existsSync(svgPath)) {
        return fs.readFileSync(svgPath, 'utf-8');
      }
      // 兜底：返回最小可用 SVG（水印居中 + 半透明，裁剪也可见）
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">'
        + '<rect width="1280" height="720" fill="#F3F4F6"/>'
        + '<g opacity="0.45"><text x="640" y="380" text-anchor="middle" font-size="42" font-weight="700" fill="#475569" letter-spacing="3" font-family="-apple-system,Segoe UI,Roboto,PingFang SC,Microsoft YaHei,sans-serif">※ 演示图片 请替换</text></g>'
        + '</svg>';
    }
    default:
      return '';
  }
}

/**
 * 写入 design.md
 * 状态机要求：step === 'init'
 * 执行后推进到：step === 'design'
 */
function writeDesignMd(workdirRoot, skillProjectId, content) {
  // 状态机校验：必须在 init 步骤才能写 design.md
  assertStep(workdirRoot, 'init');

  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  const designPath = path.join(workdir, 'design.md');
  fs.writeFileSync(designPath, content, 'utf-8');

  // 推进状态机到 design
  advanceStep(workdirRoot, 'design');

  return designPath;
}

/**
 * 读取 design.md
 * 状态机要求：step === 'design' 或 'design_confirmed'
 */
function readDesignMd(workdirRoot, skillProjectId) {
  // 状态机校验：必须在 design 或 design_confirmed 步骤才能读 design.md
  const state = require('./state').loadOrCreateProject(workdirRoot);
  const currentStep = state.step || 'init';
  if (currentStep !== 'design' && currentStep !== 'design_confirmed') {
    throw new Error(
      `步骤校验失败：当前步骤是 "${currentStep}"，但 readDesignMd 要求步骤为 "design" 或 "design_confirmed"。\n` +
      `请先调用 writeDesignMd 生成设计文档。`
    );
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  const designPath = path.join(workdir, 'design.md');
  if (!fs.existsSync(designPath)) {
    throw new Error('design.md 不存在，请先生成设计文档');
  }
  return fs.readFileSync(designPath, 'utf-8');
}

/**
 * 安全地把用户提供的素材拷贝到 assets/
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @param {string} sourcePath - 用户提供的本地路径（绝对或相对当前 cwd）
 * @param {string} relTarget  - 目标在 workdir 里的相对路径，例如 'assets/images/cover.png'
 */
function copyUserAsset(workdirRoot, skillProjectId, sourcePath, relTarget) {
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  const target = path.resolve(workdir, relTarget);
  if (!isPathInside(target, workdir)) {
    throw new Error(`目标路径不安全（疑似路径穿越）：${relTarget}`);
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`用户提供的素材不存在：${sourcePath}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(sourcePath, target);
  return target;
}

/**
 * 判断 child 是否在 parent 之内（防路径穿越）
 */
function isPathInside(child, parent) {
  const rel = path.relative(parent, path.resolve(child));
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

module.exports = {
  ensureWorkdirRoot,
  ensureProjectWorkdir,
  ensurePlaceholders,
  ensureBgm,
  scaffoldWorkdir,
  writeDesignMd,
  readDesignMd,
  copyUserAsset,
  PLACEHOLDER_HINTS,
  BGM_STYLES,
};
