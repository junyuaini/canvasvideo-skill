/**
 * 骨架 JSON 自动生成脚本
 *
 * 功能：读取 design-skeleton 自动生成 skeleton.json
 * 支持两种模式：
 *   - creative: design-skeleton-creative.md
 *   - dubbing:  design-skeleton-dubbing.md
 *
 * 用法：node generate-skeleton.js <workdir> <skillProjectId>
 *
 * 示例：
 *   node generate-skeleton.js ./canvasvideo-workdir cv_abc123
 */
const fs = require('fs');
const path = require('path');

/**
 * 检测设计文档模式并返回文件路径
 * @param {string} workdir - 工作目录
 * @returns {Object} { mode, designPath }
 */
function detectMode(workdir) {
  const creativePath = path.join(workdir, 'design-skeleton-creative.md');
  const dubbingPath = path.join(workdir, 'design-skeleton-dubbing.md');

  if (fs.existsSync(creativePath)) {
    return { mode: 'creative', designPath: creativePath };
  }
  if (fs.existsSync(dubbingPath)) {
    return { mode: 'dubbing', designPath: dubbingPath };
  }

  throw new Error('未找到设计文档，请确认以下文件之一存在：\n  - design-skeleton-creative.md\n  - design-skeleton-dubbing.md');
}

/**
 * 从 Markdown 中提取 JSON 代码块
 * @param {string} content - Markdown 内容
 * @returns {Object|null} 解析后的 JSON 对象
 */
function extractJsonConfig(content) {
  const match = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) {
    throw new Error('未找到 JSON 配置代码块（```json ... ```）');
  }

  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    throw new Error(`JSON 配置解析失败: ${e.message}`);
  }
}

/**
 * 从 Markdown 中提取区域列表表格
 * @param {string} content - Markdown 内容
 * @param {string} mode - 模式：creative 或 dubbing
 * @returns {Array} regions 数组
 */
function extractRegions(content, mode) {
  const regionSection = content.split('## 区域列表')[1];
  if (!regionSection) {
    throw new Error('未找到 "## 区域列表" 部分');
  }

  const regions = [];
  const lines = regionSection.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('|--')) {
      continue;
    }

    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);

      // 跳过表头行（包含"名称"或"序号"）
      if (cells[0] === '名称' || cells[0] === '序号') {
        continue;
      }

      let name, duration, x, y, subtitleRange;

      if (mode === 'dubbing') {
        // 口播模式列：名称(0) 类型(1) 时间段(2) 时长(3) 包含字幕(4) 核心信息(5) 情绪(6) 位置(7) x(8) y(9)
        if (cells.length >= 10) {
          name = cells[0];
          duration = parseInt(cells[3], 10);
          subtitleRange = cells[4];
          x = parseInt(cells[8], 10);
          y = parseInt(cells[9], 10);
        }
      } else {
        // 创作模式列：名称(0) 类型(1) 时间段(2) 时长(3) 核心信息(4) 情绪(5) 位置(6) x(7) y(8)
        if (cells.length >= 9) {
          name = cells[0];
          duration = parseInt(cells[3], 10);
          x = parseInt(cells[7], 10);
          y = parseInt(cells[8], 10);
        }
      }

      if (name && !isNaN(duration) && !isNaN(x) && !isNaN(y)) {
        const region = { name, x, y, duration };
        if (mode === 'dubbing' && subtitleRange) {
          region.subtitle_range = subtitleRange;
        }
        regions.push(region);
      }
    }
  }

  if (regions.length === 0) {
    throw new Error('区域列表表格为空或格式不正确');
  }

  return regions;
}

/**
 * 生成 skeleton.json
 * @param {string} workdirRoot - 工作根目录
 * @param {string} skillProjectId - 项目ID
 */
function generateSkeleton(workdirRoot, skillProjectId) {
  if (!workdirRoot || !skillProjectId) {
    throw new Error('参数错误：workdir 和 skillProjectId 都是必填项');
  }

  const workdir = path.join(workdirRoot, skillProjectId);

  // 检测模式
  const { mode, designPath } = detectMode(workdir);
  console.log(`[i] 检测到模式: ${mode}`);

  // 读取设计文档
  const content = fs.readFileSync(designPath, 'utf-8');

  // 1. 提取项目配置
  const config = extractJsonConfig(content);
  console.log(`[✓] 项目配置提取成功: ${config.name}`);

  // 2. 提取区域列表
  const regions = extractRegions(content, mode);
  console.log(`[✓] 区域列表提取成功: ${regions.length} 个区域`);

  // 3. 计算总时长（验证）
  const totalDuration = regions.reduce((sum, r) => sum + r.duration, 0);
  if (config.duration && Math.abs(config.duration - totalDuration) > 2) {
    console.warn(`[W] 时长不匹配: 配置声明 ${config.duration}秒，区域总时长 ${totalDuration}秒`);
  }

  // 4. 自动计算 canvas 尺寸
  let canvasWidth = config.canvas?.width || 2460;
  let canvasHeight = config.canvas?.height || 700;

  const maxX = Math.max(...regions.map(r => r.x));
  const maxY = Math.max(...regions.map(r => r.y));
  const minWidth = maxX + 780 + 120;
  const minHeight = maxY + 585 + 50;

  if (minWidth > canvasWidth) {
    console.warn(`[W] canvas 宽度不足，自动调整: ${canvasWidth} → ${minWidth}`);
    canvasWidth = minWidth;
  }
  if (minHeight > canvasHeight) {
    console.warn(`[W] canvas 高度不足，自动调整: ${canvasHeight} → ${minHeight}`);
    canvasHeight = minHeight;
  }

  // 5. 组装 skeleton.json
  const skeleton = {
    name: config.name || '',
    description: config.description || '',
    theme: config.theme || 'white',
    duration: config.duration || totalDuration,
    viewport: config.viewport || { width: 780, height: 585 },
    canvas: { width: canvasWidth, height: canvasHeight },
    settings: {
      autoPlay: false,
      loop: false,
      minScale: 0.01,
      maxScale: 5,
      ease: 0.08,
      contentZoomRatio: 0.9,
      preFullViewDuration: 0.4,
      postFullViewDuration: 0.4
    },
    regions,
    source_design_doc: path.basename(designPath)
  };

  // 模式特有字段
  if (mode === 'creative') {
    skeleton.audio = {
      path: `./assets/placeholders/bgm/${config.bgm || 'corporate'}.mp3`,
      loop: true,
      fadeIn: 1,
      fadeOut: 2
    };
  } else {
    // dubbing 模式
    skeleton.audio = config.audio || { path: './assets/voice.mp3' };
    if (config.style) skeleton.style = config.style;
    if (config.emotion_curve_template) skeleton.emotion_curve_template = config.emotion_curve_template;
    if (config.subtitle_count) skeleton.subtitle_count = config.subtitle_count;
  }

  // 6. 保存 skeleton.json
  const skeletonPath = path.join(workdir, 'skeleton.json');
  fs.writeFileSync(skeletonPath, JSON.stringify(skeleton, null, 2));

  console.log(`[✓] skeleton.json 已生成: ${skeletonPath}`);
  console.log(`  名称: ${skeleton.name}`);
  console.log(`  时长: ${skeleton.duration}秒`);
  console.log(`  画布: ${skeleton.canvas.width} × ${skeleton.canvas.height}`);
  console.log(`  区域: ${skeleton.regions.length} 个`);
  if (mode === 'creative') {
    console.log(`  BGM: ${config.bgm || 'corporate'}`);
  } else {
    console.log(`  音频: ${skeleton.audio.path}`);
    console.log(`  风格: ${skeleton.style || '-'}`);
  }

  return skeleton;
}

// CLI 模式
if (require.main === module) {
  const workdirRoot = path.resolve(__dirname, '..', 'canvasvideo-workdir');
  const skillProjectId = process.argv[3]; // argv[2] now is mode (unused here), argv[3] is skillProjectId

  // 兼容旧调用：node generate-skeleton.js <skillProjectId>
  const projId = process.argv[2]?.startsWith('-') ? process.argv[3] : process.argv[2];
  const effectiveProjectId = projId || skillProjectId;

  if (!effectiveProjectId) {
    console.error('用法: node generate-skeleton.js <skillProjectId>');
    console.error('');
    console.error('示例:');
    console.error('  node generate-skeleton.js cv_abc123');
    process.exit(1);
  }

  try {
    generateSkeleton(workdirRoot, effectiveProjectId);
    process.exit(0);
  } catch (err) {
    console.error('生成失败:', err.message);
    process.exit(1);
  }
}

module.exports = { generateSkeleton, extractJsonConfig, extractRegions, detectMode };
