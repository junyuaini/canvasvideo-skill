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
 * 解析 region 的"包含字幕"范围，返回首末字幕 ID
 * 支持 "1-5" 和 "3" 两种格式
 * @param {string} subtitleRange - 区域 subtitle_range 字段
 * @returns {{firstId:number, lastId:number}|null}
 */
function parseRegionSubtitleRange(subtitleRange) {
  if (!subtitleRange) return null;
  const match = String(subtitleRange).match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!match) return null;
  const firstId = parseInt(match[1], 10);
  const lastId = match[2] !== undefined ? parseInt(match[2], 10) : firstId;
  return { firstId, lastId };
}

/**
 * 提取 component / element 字幕绑定的首末字幕 ID
 * @param {number|Array<number>} subs
 * @returns {{firstId:number, lastId:number}|null}
 */
function getSubtitleRangeBound(subs) {
  if (subs == null) return null;
  if (typeof subs === 'number') subs = [subs];
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const ids = [...new Set(subs)].sort((a, b) => a - b);
  return { firstId: ids[0], lastId: ids[ids.length - 1] };
}

/**
 * 判断 start/end 是否"等于默认"——等于则不需要写入 project.json
 * 默认规则：
 *   - 创作模式：start 默认 = region.startTime，end 默认 = region.endTime
 *   - 口播模式：仅当绑定首条字幕 = 区域首条字幕 时，start 是默认
 *               仅当绑定末条字幕 = 区域末条字幕 时，end 是默认
 * @param {Object} params
 * @param {string} params.mode - 'creative' | 'dubbing'
 * @param {number} params.actualStart - 实际计算出的 start（绝对时间）
 * @param {number} params.actualEnd - 实际计算出的 end（绝对时间）
 * @param {number} params.regionStartTime - region.startTime
 * @param {number} params.regionEndTime - region.endTime
 * @param {{firstId:number, lastId:number}|null} params.regionSubRange - region 字幕范围
 * @param {{firstId:number, lastId:number}|null} params.boundSubRange - 当前 component/element 字幕范围
 * @param {Array} params.srtList - SRT 列表（口播模式需要）
 * @returns {{startIsDefault:boolean, endIsDefault:boolean}}
 */
function checkStartEndDefault(params) {
  const {
    mode,
    actualStart,
    actualEnd,
    regionStartTime,
    regionEndTime,
    regionSubRange,
    boundSubRange,
    srtList
  } = params;

  const eps = 0.001;
  let startIsDefault = false;
  let endIsDefault = false;

  if (mode === 'creative') {
    // 创作模式：默认 = region 起止
    if (Math.abs(actualStart - regionStartTime) < eps) startIsDefault = true;
    if (Math.abs(actualEnd - regionEndTime) < eps) endIsDefault = true;
  } else if (mode === 'dubbing') {
    // 口播模式：仅当绑定首条字幕 = 区域首条字幕 时，start 是默认
    //         仅当绑定末条字幕 = 区域末条字幕 时，end 是默认
    if (regionSubRange && boundSubRange && Array.isArray(srtList) && srtList.length > 0) {
      if (boundSubRange.firstId === regionSubRange.firstId) {
        // 区域首条字幕的 SRT start == region.startTime，
        // 因此 comp/element.start == region.startTime 时不写
        if (Math.abs(actualStart - regionStartTime) < eps) startIsDefault = true;
      }
      if (boundSubRange.lastId === regionSubRange.lastId) {
        // 区域末条字幕的 SRT end == region.endTime
        if (Math.abs(actualEnd - regionEndTime) < eps) endIsDefault = true;
      }
    }
  }

  return { startIsDefault, endIsDefault };
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
        const match = r.subtitle_range.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
        if (match) {
          const startId = parseInt(match[1], 10);
          const endId = match[2] !== undefined ? parseInt(match[2], 10) : startId; // 单条字幕 "3" 等价于 "3-3"
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
    mode: mode,
    theme: skeleton.theme,
    duration: parseFloat(lastTime.toFixed(3)),
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

    // 解析 region 字幕范围（口播模式用），用于 start/end 默认判定
    const regionSubRange = mode === 'dubbing'
      ? parseRegionSubtitleRange(skeletonRegion.subtitle_range)
      : null;

    // 6. 处理 components：自动转换 subtitles → start/end
    if (Array.isArray(regionData.components)) {
      for (const comp of regionData.components) {
        // 6.1 决定 component.start/end
        // 优先级：subtitles（口播）> time_range（创作）> 旧 start/end > 缺省 = region 完整范围
        // 缺省 fallback 与"未设置 = 默认展示整个 region"语义保持一致
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

        // 判断 comp.start/end 是否为默认（不需要写入）
        const compBoundSubRange = getSubtitleRangeBound(comp.subtitles);
        const { startIsDefault: compStartIsDefault, endIsDefault: compEndIsDefault } = checkStartEndDefault({
          mode,
          actualStart: compTime.start,
          actualEnd: compTime.end,
          regionStartTime: regionEntry.startTime,
          regionEndTime: regionEntry.endTime,
          regionSubRange,
          boundSubRange: compBoundSubRange,
          srtList
        });

        // resolveSubtitles 返回全局 SRT 时间，需转为区域相对时间（用于 element 校验）
        const compRelativeStart = compTime.start - regionEntry.startTime;
        const compRelativeEnd = compTime.end - regionEntry.startTime;
        comp.start = parseFloat(compRelativeStart.toFixed(3));
        comp.end = parseFloat(compRelativeEnd.toFixed(3));
        const compAbsoluteStart = compTime.start;
        const compAbsoluteEnd = compTime.end;

        const regionBounds = {
          startTime: 0,
          endTime: parseFloat((regionEntry.endTime - regionEntry.startTime).toFixed(3))
        };

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
              const localElemTime = {
                start: parseFloat((elemTime.start - regionEntry.startTime).toFixed(3)),
                end: parseFloat((elemTime.end - regionEntry.startTime).toFixed(3))
              };
              checkHierarchy(localElemTime, comp, regionBounds, key);

              // 判断 element start/end 是否为默认（不需要写入）
              const elemBoundSubRange = getSubtitleRangeBound(value.subtitles);
              const { startIsDefault: elemStartIsDefault, endIsDefault: elemEndIsDefault } = checkStartEndDefault({
                mode,
                actualStart: elemTime.start,
                actualEnd: elemTime.end,
                regionStartTime: regionEntry.startTime,
                regionEndTime: regionEntry.endTime,
                regionSubRange,
                boundSubRange: elemBoundSubRange,
                srtList
              });

              const elemEntry = { id: value.id || key.slice(1) };
              if (!elemStartIsDefault) elemEntry.start = localElemTime.start;
              if (!elemEndIsDefault) elemEntry.end = localElemTime.end;
              resolvedElementIds[key] = elemEntry;
            } else {
              console.warn(`[W] elementIds["${key}"] 既无 subtitles/time_range，也无 start/end，保留原样`);
              resolvedElementIds[key] = value;
            }
          }
          comp.content.elementIds = resolvedElementIds;
        }

        // 最终：comp.start/end 写绝对时间；如果是默认则不写
        if (compStartIsDefault) {
          delete comp.start;
        } else {
          comp.start = compAbsoluteStart;
        }
        if (compEndIsDefault) {
          delete comp.end;
        } else {
          comp.end = compAbsoluteEnd;
        }
        if (comp.content && comp.content.elementIds) {
          for (const key of Object.keys(comp.content.elementIds)) {
            const entry = comp.content.elementIds[key];
            if (entry && typeof entry.start === 'number') {
              entry.start = parseFloat((entry.start + regionEntry.startTime).toFixed(3));
            }
            if (entry && typeof entry.end === 'number') {
              entry.end = parseFloat((entry.end + regionEntry.startTime).toFixed(3));
            }
          }
        }

        project.components.push(comp);
      }
    }

    if (Array.isArray(regionData.subtitles)) {
      project.subtitles.push(...regionData.subtitles);
    }
  }

  // 按 start 升序排序（start 可能为 undefined，视为 -Infinity 排在最前）
  project.components.sort((a, b) => {
    const aStart = typeof a.start === 'number' ? a.start : -Infinity;
    const bStart = typeof b.start === 'number' ? b.start : -Infinity;
    return aStart - bStart;
  });
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

module.exports = { mergeRegions, resolveSubtitles, resolveTimeRange, parseRegionSubtitleRange, getSubtitleRangeBound, checkStartEndDefault };