/**
 * 合并 skeleton + regions 为完整的 project.json
 *
 * 自动转换（新约定）：
 *   - component.subtitles → component.start/end（查 SRT）
 *   - elementIds["#X"].subtitles → elementIds["#X"].start/end（查 SRT）
 *
 * 兼容旧约定（fallback）：
 *   - component.start/end 直接使用
 *   - elementIds["#X"].start/end 直接使用
 *
 * 用法：node merge-regions.js --cwd=<Agent工作目录> <skillProjectId> [输出路径]
 */
const fs = require('fs');
const path = require('path');
const { resolveAgentWorkdir } = require('./scaffold');
const { getProjectState } = require('./state');
const { parseSrt } = require('./srt-parser');

/**
 * 把"字幕绑定"转换为"start/end 时间"
 * @param {number|Array<number>} subs - 字幕 ID 或 ID 列表（如 [9, 17]）
 * @param {Array} srtList - parseSrt 返回的字幕数组
 * @returns {{start:number, end:number}|null}
 */
function resolveSubtitles(subs, srtList) {
  if (subs == null) return null;
  if (typeof subs === 'number') subs = [subs];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const ids = [...new Set(subs)].sort((a, b) => a - b);
  const startId = ids[0];
  const endId = ids[ids.length - 1];
  const startSub = srtList[startId - 1];
  const endSub = srtList[endId - 1];
  if (!startSub || !endSub) {
    throw new Error(`字幕范围 [${startId}${ids.length > 1 ? `-${endId}` : ''}] 超出 SRT 字幕数 (${srtList.length} 条)`);
  }
  return {
    start: parseFloat(startSub.start.toFixed(3)),
    end: parseFloat(endSub.end.toFixed(3))
  };
}

/**
 * 检测模式（dubbing / creative）
 */
function detectMode(workdir, workdirRoot) {
  try {
    const state = getProjectState(workdirRoot);
    if (state && state.mode) return state.mode;
  } catch (e) {}
  if (fs.existsSync(path.join(workdir, 'design-skeleton-creative.md'))) return 'creative';
  if (fs.existsSync(path.join(workdir, 'design-skeleton-dubbing.md'))) return 'dubbing';
  return null;
}

/**
 * 校验"元素 ⊂ 组件 ⊂ 区域"嵌套关系
 * @param {Object} elem - elementIds["#X"] 值
 * @param {Object} comp - component
 * @param {Object} region - skeleton region
 * @param {string} elemKey - "#P3-002" 形式
 */
function checkHierarchy(elem, comp, region, elemKey) {
  const eps = 0.001;
  if (elem.start < comp.start - eps || elem.end > comp.end + eps) {
    throw new Error(
      `[层级 3 / element] elementIds["${elemKey}"] 时间范围 [${elem.start}, ${elem.end}] 超出所属组件 [${comp.start}, ${comp.end}]`
    );
  }
  if (comp.start < region.startTime - eps || comp.end > region.endTime + eps) {
    throw new Error(
      `[层级 2 / component] 组件 ${comp.id} 时间范围 [${comp.start}, ${comp.end}] 超出所属 region ${region.id} [${region.startTime}, ${region.endTime}]`
    );
  }
}

/**
 * 验证骨架来源
 */
function validateSkeletonSource(workdir, skeleton) {
  if (skeleton.source_design_doc && skeleton.source_design_doc.trim() !== '') {
    const designDocPath = path.join(workdir, skeleton.source_design_doc);
    if (!fs.existsSync(designDocPath)) {
      throw new Error(`[E] 骨架设计文档不存在: ${skeleton.source_design_doc}，请确认步骤2已完成`);
    }
    console.log(`[✓] 骨架设计文档来源验证通过: ${skeleton.source_design_doc}`);
  }
}

/**
 * 合并区域文件为完整 project.json
 * @param {string} workdir - 工作目录路径
 * @param {string} workdirRoot - canvasvideo-workdir 根目录
 * @returns {Object} 合并后的 project 对象
 */
function mergeRegions(workdir, workdirRoot) {
  const skeletonPath = path.join(workdir, 'skeleton.json');
  if (!fs.existsSync(skeletonPath)) {
    throw new Error('工作目录缺少 skeleton.json');
  }
  const skeleton = JSON.parse(fs.readFileSync(skeletonPath, 'utf8'));
  validateSkeletonSource(workdir, skeleton);

  // 1. 检测模式 + 加载 SRT（口播模式必读）
  const mode = detectMode(workdir, workdirRoot);
  let srtList = [];
  if (mode === 'dubbing') {
    try {
      const state = getProjectState(workdirRoot);
      if (state && state.voice && state.voice.srtPath) {
        const srtAbs = path.isAbsolute(state.voice.srtPath)
          ? state.voice.srtPath
          : path.join(workdir, state.voice.srtPath);
        srtList = parseSrt(srtAbs);
        console.log(`[✓] 加载 SRT: ${srtList.length} 条字幕`);
      } else {
        console.warn('[W] 口播模式但 state.voice.srtPath 缺失，元素字幕绑定无法解析');
      }
    } catch (e) {
      console.warn(`[W] SRT 加载失败: ${e.message}，元素字幕绑定无法解析`);
    }
  }

  // 2. 计算每个 region 的全局起止时间
//    - 口播模式：直接从 SRT 取（每个 region 的字幕段首尾 = region 全局起止，与 component 字幕绑定完全对齐）
//    - 创作模式：按骨架顺序累加（无字幕锚点）
  const regionTimes = {};
  if (mode === 'dubbing' && srtList.length > 0) {
    for (const r of skeleton.regions) {
      if (r.subtitle_range) {
        const match = r.subtitle_range.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (match) {
          const startId = parseInt(match[1], 10);
          const endId = parseInt(match[2], 10);
          const startSub = srtList[startId - 1];
          const endSub = srtList[endId - 1];
          if (startSub && endSub) {
            regionTimes[r.id] = {
              id: r.id,
              duration: parseFloat((endSub.end - startSub.start).toFixed(3)),
              startTime: parseFloat(startSub.start.toFixed(3)),
              endTime: parseFloat(endSub.end.toFixed(3))
            };
            continue;
          }
        }
      }
      // fallback：累加
      regionTimes[r.id] = {
        id: r.id,
        duration: r.duration,
        startTime: 0,
        endTime: r.duration
      };
    }
  } else {
    let accTime = 0;
    for (const r of skeleton.regions) {
      regionTimes[r.id] = {
        id: r.id,
        duration: r.duration,
        startTime: parseFloat(accTime.toFixed(3)),
        endTime: parseFloat((accTime + r.duration).toFixed(3))
      };
      accTime += r.duration;
    }
  }
  const lastRegion = skeleton.regions[skeleton.regions.length - 1];
  const lastTime = regionTimes[lastRegion.id]?.endTime || 0;
  console.log(`[✓] region 全局时间计算完成: 末端 ${parseFloat(lastTime.toFixed(3))}s`);

  // 3. 初始化 project
  // 注意：故意不写 canvas 字段。前端 schema 不允许 project.json 出现 canvas（前端已迁到
  // HtmlComponent 模式，用 region 内 component 承载画面），写进去会触发 selfcheck/云端校验失败。
  // 设计稿中"画布"的概念只属于 skeleton（生成阶段），不进 project.json。
  const project = {
    name: skeleton.name,
    description: skeleton.description,
    theme: skeleton.theme,
    duration: skeleton.duration,
    viewport: skeleton.viewport,
    settings: skeleton.settings,
    audio: skeleton.audio,
    regions: [],
    components: [],
    subtitles: []
  };
  if (skeleton.source_design_doc) project.source_design_doc = skeleton.source_design_doc;

  // 项目级字幕样式（必填，6 字段）—— 从 skeleton 透传到 project
  // schema 强约束要求 subtitle 必填；generate-skeleton 已校验 config.subtitle 存在
  if (skeleton.subtitle && typeof skeleton.subtitle === 'object') {
    project.subtitle = skeleton.subtitle;
  } else {
    throw new Error(
      '[merge-regions] skeleton.subtitle 缺失或不是对象。' +
      '项目级字幕样式（color/fontSize/position/weight/background/textShadow）必填，' +
      '请在 init-project 的 config JSON 里加 subtitle 字段。'
    );
  }

  // 4. 校验缺失 region 文件
  const regionsDir = path.join(workdir, 'regions');
  const missingRegions = skeleton.regions
    .filter(r => !fs.existsSync(path.join(regionsDir, `${r.id}.json`)))
    .map(r => r.id);
  if (missingRegions.length > 0) {
    throw new Error(`[E] 缺失区域文件：${missingRegions.map(id => `${id}.json`).join(', ')}`);
  }

  // 5. 处理每个 region
  for (const skeletonRegion of skeleton.regions) {
    const regionFile = path.join(regionsDir, `${skeletonRegion.id}.json`);
    const regionData = JSON.parse(fs.readFileSync(regionFile, 'utf8'));

    const regionEntry = {
      id: skeletonRegion.id,
      name: skeletonRegion.name,
      duration: skeletonRegion.duration,
      x: skeletonRegion.x,
      y: skeletonRegion.y,
      startTime: regionTimes[skeletonRegion.id].startTime,
      endTime: regionTimes[skeletonRegion.id].endTime
    };
    project.regions.push(regionEntry);

    // 6. 处理 components：自动转换 subtitles → start/end
    if (Array.isArray(regionData.components)) {
      for (const comp of regionData.components) {
        // 6.1 决定 component.start/end
        let compTime = null;
        if (comp.subtitles != null && srtList.length > 0) {
          compTime = resolveSubtitles(comp.subtitles, srtList);
        } else if (Array.isArray(comp.time_range)) {
          compTime = resolveTimeRange(comp.time_range, regionEntry.startTime);
        } else if (typeof comp.start === 'number' && typeof comp.end === 'number') {
          compTime = { start: comp.start, end: comp.end };
        } else {
          compTime = { start: regionEntry.startTime, end: regionEntry.endTime };
        }
        comp.start = compTime.start;
        comp.end = compTime.end;

        // 6.2 处理 elementIds：自动转换 subtitles/time_range/start-end
        if (comp.content && comp.content.elementIds) {
          const resolvedElementIds = {};
          for (const [key, value] of Object.entries(comp.content.elementIds)) {
            if (!value || typeof value !== 'object') continue;
            let elemTime = null;
            if (value.subtitles != null && srtList.length > 0) {
              elemTime = resolveSubtitles(value.subtitles, srtList);
            } else if (Array.isArray(value.time_range)) {
              elemTime = resolveTimeRange(value.time_range, regionEntry.startTime);
            } else if (typeof value.start === 'number' && typeof value.end === 'number') {
              elemTime = { start: value.start, end: value.end };
            }
            if (elemTime) {
              checkHierarchy({ start: elemTime.start, end: elemTime.end }, comp, regionEntry, key);
              resolvedElementIds[key] = {
                id: value.id || key.slice(1),
                start: elemTime.start,
                end: elemTime.end
              };
            } else {
              console.warn(`[W] elementIds["${key}"] 既无 subtitles/time_range，也无 start/end，保留原样`);
              resolvedElementIds[key] = value;
            }
          }
          comp.content.elementIds = resolvedElementIds;
        }

        project.components.push(comp);
      }
    }

    if (Array.isArray(regionData.subtitles)) {
      project.subtitles.push(...regionData.subtitles);
    }
  }

  project.components.sort((a, b) => a.start - b.start);
  project.subtitles.sort((a, b) => a.start - b.start);

  return project;
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');
  const positionals = argv.filter(a => !a.startsWith('--'));
  const skillProjectId = positionals[0];
  const outputPath = positionals[1];

  if (!skillProjectId) {
    console.error('用法: node merge-regions.js --cwd=<Agent工作目录> <skillProjectId> [输出路径]');
    process.exit(1);
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  const finalOutputPath = outputPath || path.join(workdir, 'project.json');

  try {
    const project = mergeRegions(workdir, workdirRoot);
    fs.writeFileSync(finalOutputPath, JSON.stringify(project, null, 2));
    console.log(`合并完成: ${finalOutputPath}`);
    console.log(`  区域数: ${project.regions.length}`);
    console.log(`  HtmlComponent 数: ${project.components.length}`);
    console.log(`  字幕数: ${project.subtitles.length}`);
    process.exit(0);
  } catch (err) {
    console.error('合并失败:', err.message);
    process.exit(1);
  }
}

module.exports = { mergeRegions, resolveSubtitles, resolveTimeRange };