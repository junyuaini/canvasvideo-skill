/**
 * 合并 skeleton + regions 为完整的 project.json
 * 用法：node merge-regions.js <workdir路径> [输出路径]
 *   workdir: 包含 skeleton.json 和 regions/ 目录的工作目录
 *   输出路径: 默认为 workdir/project.json
 * 
 * 注意：区域组件时间使用全局绝对时间，合并时无需偏移
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
 * 验证区域JSON来源
 * @param {string} workdir - 工作目录
 * @param {Object} regionData - 区域JSON解析后的对象
 * @param {string} regionFileName - 区域文件名（如 P1.json）
 */
function validateRegionSource(workdir, regionData, regionFileName) {
  // 检查 source_design_doc 字段
  if (!regionData.source_design_doc || regionData.source_design_doc.trim() === '') {
    throw new Error(`[E] ${regionFileName} 缺少 source_design_doc 字段，必须记录区域设计文档来源`);
  }
  
  // 检查区域设计文档文件是否存在
  const designDocPath = path.join(workdir, regionData.source_design_doc);
  if (!fs.existsSync(designDocPath)) {
    throw new Error(`[E] 区域设计文档不存在: ${regionData.source_design_doc}（来自 ${regionFileName}），请确认步骤4已完成`);
  }
  
  console.log(`[✓] ${regionFileName} 设计文档来源验证通过: ${regionData.source_design_doc}`);
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
  
  const skeleton = JSON.parse(fs.readFileSync(skeletonPath, 'utf-8'));
  
  // 步骤1：验证骨架来源
  validateSkeletonSource(workdir, skeleton);
  
  // 初始化 project（保留骨架的 source_design_doc）
  const project = {
    name: skeleton.name,
    description: skeleton.description,
    theme: skeleton.theme,
    duration: skeleton.duration,
    viewport: skeleton.viewport,
    canvas: skeleton.canvas,
    settings: skeleton.settings,
    audio: skeleton.audio,
    regions: [],  // 将在下面填充，包含 source_design_doc
    components: [],
    subtitles: []
  };
  
  // 保留骨架的 source_design_doc（已经在 project 对象中通过展开 skeleton 保留了）
  project.source_design_doc = skeleton.source_design_doc;
  
  // 步骤2：验证区域来源并合并
  const regionsDir = path.join(workdir, 'regions');
  
  for (const skeletonRegion of skeleton.regions) {
    const regionFile = path.join(regionsDir, `${skeletonRegion.name}.json`);
    
    if (!fs.existsSync(regionFile)) {
      console.warn(`警告: 区域文件不存在 ${regionFile}`);
      continue;
    }
    
    const regionData = JSON.parse(fs.readFileSync(regionFile, 'utf-8'));
    
    // 验证区域来源
    validateRegionSource(workdir, regionData, `${skeletonRegion.name}.json`);
    
    // 验证 regionName 匹配
    if (regionData.regionName !== skeletonRegion.name) {
      console.warn(`警告: regionName 不匹配 ${regionData.regionName} !== ${skeletonRegion.name}`);
    }
    
    // 将区域信息添加到 project.regions（包含 source_design_doc）
    project.regions.push({
      name: skeletonRegion.name,
      x: skeletonRegion.x,
      y: skeletonRegion.y,
      source_design_doc: regionData.source_design_doc
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
  const workdir = process.argv[2];
  const outputPath = process.argv[3] || path.join(workdir, 'project.json');
  
  if (!workdir) {
    console.error('用法: node merge-regions.js <workdir路径> [输出路径]');
    process.exit(1);
  }
  
  try {
    const project = mergeRegions(workdir);
    fs.writeFileSync(outputPath, JSON.stringify(project, null, 2));
    console.log(`合并完成: ${outputPath}`);
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
