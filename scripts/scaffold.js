/**
 * CanvasVideo Skill — 工作目录与设计文档脚手架
 *
 * 功能：
 *  - ensureWorkdirRoot       ：确保工作根目录 canvasvideo-workdir/ 存在
 *  - ensureProjectWorkdir    ：确保某个项目的工作目录存在（含 assets/ 与 assets/images/）
 *  - scaffoldWorkdir         ：根据素材清单批量创建占位文件
 *  - writeDesignMd / readDesignMd ：读写设计文档
 *  - copyUserAsset           ：把用户提供的素材安全拷贝到 assets/，校验路径不越界
 */
const fs = require('fs');
const path = require('path');

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
 * 创建 workdir 目录结构 + 按素材清单批量占位
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @param {Object} assetChecklist - 素材清单（类别 -> [{ path, status, type }]）
 * @returns {string} 项目工作目录路径
 */
function scaffoldWorkdir(workdirRoot, skillProjectId, assetChecklist = {}) {
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);

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
          fs.writeFileSync(fullPath, createPlaceholder(item.type));
        }
      }
    }
  }
  return workdir;
}

/**
 * 创建占位文件内容
 */
function createPlaceholder(type) {
  switch (type) {
    case 'audio':
      return '';
    case 'srt':
      return '1\n00:00:00,000 --> 00:00:05,000\n占位字幕\n\n';
    case 'image':
      return '';
    default:
      return '';
  }
}

/**
 * 写入 design.md
 */
function writeDesignMd(workdirRoot, skillProjectId, content) {
  const workdir = ensureProjectWorkdir(workdirRoot, skillProjectId);
  const designPath = path.join(workdir, 'design.md');
  fs.writeFileSync(designPath, content, 'utf-8');
  return designPath;
}

/**
 * 读取 design.md
 */
function readDesignMd(workdirRoot, skillProjectId) {
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
  scaffoldWorkdir,
  writeDesignMd,
  readDesignMd,
  copyUserAsset,
};
