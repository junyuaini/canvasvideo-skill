/**
 * 合并 skeleton + regions 为完整的 project.json
 * 用法：node merge-regions.js <workdir路径> [输出路径]
 *   workdir: 包含 skeleton.json 和 regions/ 目录的工作目录
 *   输出路径: 默认为 workdir/project.json
 */
const fs = require('fs');
const path = require('path');

/**
 * 验证 skeleton.json 来源
 * @param {string} workdir - 工作目录
 * @param {Object} skeleton - skeleton.json 解析后的对象
 */
function validateSkeletonSource(workdir, skeleton) {
  // 检查 source_design_doc 字段
  if (!skeleton.source_design_doc || skeleton.source_design_doc.trim() === '') {
    throw new Error('[E] skeleton.json 缺少 source_design_doc 字段，必须记录设计文档来源');
  }

  // 检查设计文档文件是否存在
  const designDocPath = path.join(workdir, skeleton.source_design_doc);
  if (!fs.existsSync(designDocPath)) {
    throw new Error(`[E] 骨架设计文档不存在: ${skeleton.source_design_doc}，请确认步骤2已完成`);
  }

  console.log(`[✓] 骨架设计文档来源验证通过: ${skeleton.source_design_doc}`);
}

/**
 * 合并区域文件为完整 project.json
 * @param {string} workdir - 工作目录路径
 * @returns {Object} 合并后的 project 对象
 */
function mergeRegions(workdir) {
  const skeletonPath = path.join(workdir, 'skeleton.json');

  if (!fs.existsSync(skeletonPath)) {
    throw new Error('工作目录缺少 skeleton.json');
  }

  const skeleton = JSON.parse(fs.readFileSync(skeletonPath, 'utf8'));

  // 步骤1：验证骨架来源
  validateSkeletonSource(workdir, skeleton);

  // 初始化 project（保留骨架的 source_design_doc）
  const project = {
    name: skeleton.name,
    description: skeleton.description,
    theme: skeleton.theme,
    duration: skeleton.duration,
    viewport: skeleton.viewport,
    settings: skeleton.settings,
    audio: skeleton.audio,
    regions: [], // 将在下面填充
    components: [],
    subtitles: []
  };

  // 保留骨架的 source_design_doc
  project.source_design_doc = skeleton.source_design_doc;

  // 步骤2：验证并合并区域文件
  const regionsDir = path.join(workdir, 'regions');

  for (const skeletonRegion of skeleton.regions) {
    const regionFile = path.join(regionsDir, `${skeletonRegion.name}.json`);

    if (!fs.existsSync(regionFile)) {
      console.warn(`警告: 区域文件不存在 ${regionFile}`);
      continue;
    }

    const regionData = JSON.parse(fs.readFileSync(regionFile, 'utf8'));

    // 验证 regionName 匹配
    if (regionData.regionName !== skeletonRegion.name) {
      console.warn(`警告: regionName 不匹配 ${regionData.regionName} !== ${skeletonRegion.name}`);
    }

    // 将区域信息添加到 project.regions（不再包含 source_design_doc 检查）
    project.regions.push({
      name: skeletonRegion.name,
      x: skeletonRegion.x,
      y: skeletonRegion.y
    });

    // 合并组件
    if (Array.isArray(regionData.components)) {
      project.components.push(...regionData.components);
    }

    // 合并字幕
    if (Array.isArray(regionData.subtitles)) {
      project.subtitles.push(...regionData.subtitles);
    }
  }

  // 按 start 时间排序
  project.components.sort((a, b) => a.start - b.start);
  project.subtitles.sort((a, b) => a.start - b.start);

  return project;
}

// CLI 模式
if (require.main === module) {
  const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');
  const skillProjectId = process.argv[2];
  const outputPath = process.argv[3];

  if (!skillProjectId) {
    console.error('用法: node merge-regions.js <skillProjectId> [输出路径]');
    console.error('');
    console.error('示例:');
    console.error('  node merge-regions.js cv_abc123');
    console.error('  node merge-regions.js cv_abc123 ./output/project.json');
    process.exit(1);
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  const finalOutputPath = outputPath || path.join(workdir, 'project.json');

  try {
    const project = mergeRegions(workdir);
    fs.writeFileSync(finalOutputPath, JSON.stringify(project, null, 2));
    console.log(`合并完成: ${finalOutputPath}`);
    console.log(`  区域数: ${project.regions.length}`);
    console.log(`  组件数: ${project.components.length}`);
    console.log(`  字幕数: ${project.subtitles.length}`);
    process.exit(0);
  } catch (err) {
    console.error('合并失败:', err.message);
    process.exit(1);
  }
}

module.exports = { mergeRegions };