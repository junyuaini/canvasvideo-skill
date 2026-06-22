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
  
  // 初始化 project
  const project = {
    name: skeleton.name,
    description: skeleton.description,
    theme: skeleton.theme,
    duration: skeleton.duration,
    viewport: skeleton.viewport,
    canvas: skeleton.canvas,
    settings: skeleton.settings,
    audio: skeleton.audio,
    regions: skeleton.regions,
    components: [],
    subtitles: []
  };
  
  // 合并每个区域的组件和字幕
  const regionsDir = path.join(workdir, 'regions');
  
  for (const region of skeleton.regions) {
    const regionFile = path.join(regionsDir, `${region.name}.json`);
    
    if (!fs.existsSync(regionFile)) {
      console.warn(`警告: 区域文件不存在 ${regionFile}`);
      continue;
    }
    
    const regionData = JSON.parse(fs.readFileSync(regionFile, 'utf-8'));
    
    // 验证 regionId 匹配
    if (regionData.regionId !== region.name) {
      console.warn(`警告: regionId 不匹配 ${regionData.regionId} !== ${region.name}`);
    }
    
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
