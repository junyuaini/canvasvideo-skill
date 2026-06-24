/**
 * 区域时间范围验证脚本
 * 
 * 功能：
 *  - 检查区域组件时间是否在区域时间范围内
 *  - 检查区域组件时间是否重叠
 * 
 * 用法：node validate-region.js <skillProjectId> <regionName>
 *
 * 示例：
 *   node validate-region.js cv_abc123 P1
 *   node validate-region.js cv_abc123 P2
 * 
 * 工作目录：{skill根目录}/canvasvideo-workdir/{skillProjectId}/
 */
const fs = require('fs');
const path = require('path');

const workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');

/**
 * 计算区域开始时间
 * @param {Object} skeleton - skeleton.json 解析后的对象
 * @param {number} regionIndex - 区域索引
 * @returns {number} 区域开始时间（秒）
 */
function calculateRegionStart(skeleton, regionIndex) {
  let start = 0;
  for (let i = 0; i < regionIndex; i++) {
    const regionDuration = skeleton.regions[i]?.duration || 4;
    start += regionDuration;
  }
  return start;
}

/**
 * 计算区域结束时间
 * @param {Object} skeleton - skeleton.json 解析后的对象
 * @param {number} regionIndex - 区域索引
 * @returns {number} 区域结束时间（秒）
 */
function calculateRegionEnd(skeleton, regionIndex) {
  return calculateRegionStart(skeleton, regionIndex) + (skeleton.regions[regionIndex]?.duration || 4);
}

/**
 * 验证区域时间范围
 * @param {Object} skeleton - skeleton.json 解析后的对象
 * @param {Object} regionData - 区域JSON解析后的对象
 * @param {string} regionName - 区域名称
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
function validateRegion(skeleton, regionData, regionName) {
  const errors = [];
  const warnings = [];
  
  const regionIndex = skeleton.regions.findIndex(r => r.name === regionName);
  if (regionIndex === -1) {
    errors.push(`[E] 区域 ${regionName} 在 skeleton.json 中不存在`);
    return { valid: false, errors, warnings };
  }
  
  const regionStart = calculateRegionStart(skeleton, regionIndex);
  const regionEnd = calculateRegionEnd(skeleton, regionIndex);
  
  // 检查每个组件的时间范围
  if (Array.isArray(regionData.components)) {
    regionData.components.forEach((comp, index) => {
      if (comp.start < regionStart || comp.end > regionEnd) {
        errors.push(`[E] ${comp.id || `组件${index}`} 时间 ${comp.start}-${comp.end} 超出区域范围 ${regionStart.toFixed(1)}-${regionEnd.toFixed(1)}`);
      }
      
      // 检查时间合理性
      if (comp.start >= comp.end) {
        errors.push(`[E] ${comp.id || `组件${index}`} start(${comp.start}) 必须小于 end(${comp.end})`);
      }
    });
    
    // 检查组件时间重叠（同区域内）
    for (let i = 0; i < regionData.components.length; i++) {
      for (let j = i + 1; j < regionData.components.length; j++) {
        const compA = regionData.components[i];
        const compB = regionData.components[j];
        
        // 检查是否有重叠
        if (compA.start < compB.end && compB.start < compA.end) {
          warnings.push(`[W] ${compA.id} 和 ${compB.id} 时间重叠 (${compA.start}-${compA.end} vs ${compB.start}-${compB.end})`);
        }
      }
    }
  }
  
  // 检查字幕时间范围
  if (Array.isArray(regionData.subtitles)) {
    regionData.subtitles.forEach((sub, index) => {
      if (sub.start < regionStart || sub.end > regionEnd) {
        errors.push(`[E] 字幕${index} 时间 ${sub.start}-${sub.end} 超出区域范围 ${regionStart.toFixed(1)}-${regionEnd.toFixed(1)}`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// CLI 模式
if (require.main === module) {
  const skillProjectId = process.argv[2];
  const regionName = process.argv[3]; // e.g., "P1"
  
  if (!skillProjectId || !regionName) {
    console.error('用法: node validate-region.js <skillProjectId> <regionName>');
    console.error('');
    console.error('示例:');
    console.error('  node validate-region.js cv_abc123 P1');
    console.error('  node validate-region.js cv_abc123 P2');
    process.exit(1);
  }
  
  const workdir = path.join(workdirRoot, skillProjectId);
  const skeletonPath = path.join(workdir, 'skeleton.json');
  const regionPath = path.join(workdir, 'regions', `${regionName}.json`);
  
  if (!fs.existsSync(skeletonPath)) {
    console.error(`错误: skeleton.json 不存在: ${skeletonPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(regionPath)) {
    console.error(`错误: 区域文件不存在: ${regionPath}`);
    process.exit(1);
  }
  
  try {
    const skeleton = JSON.parse(fs.readFileSync(skeletonPath, 'utf-8'));
    const regionData = JSON.parse(fs.readFileSync(regionPath, 'utf-8'));
    
    const result = validateRegion(skeleton, regionData, regionName);
    
    if (result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach(w => console.log('  - ' + w));
    }
    
    if (result.valid) {
      console.log(`[✓] 区域 ${regionName} 时间验证通过`);
      process.exit(0);
    } else {
      console.error(`[✗] 区域 ${regionName} 时间验证未通过:`);
      result.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
  } catch (err) {
    console.error('验证异常:', err.message);
    process.exit(1);
  }
}

module.exports = { validateRegion, calculateRegionStart, calculateRegionEnd };
