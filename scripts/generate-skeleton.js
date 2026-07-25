/**
 * 骨架 JSON 自动生成脚本
 *
 * 功能：读取 design-skeleton-dubbing.md 自动生成 skeleton.json
 * 仅支持口播模式
 *
 * 用法：node generate-skeleton.js --cwd=<Agent工作目录> <skillProjectId>
 *
 * 示例：
 *   node generate-skeleton.js --cwd=/path/to/agent/workspace cv_abc123
 */
const fs = require('fs');
const path = require('path');
const { resolveAgentWorkdir } = require('./scaffold');
const { getProjectState } = require('./state');
const { parseSrt } = require('./srt-parser');

/**
 * 检测口播模式设计文档路径
 * @param {string} workdirRoot - 工作根目录
 * @param {string} workdir - 工作目录
 * @returns {Object} { mode, designPath }
 */
function detectMode(workdirRoot, workdir) {
  const mode = 'dubbing';
  const p = path.join(workdir, 'design-skeleton-dubbing.md');
  if (!fs.existsSync(p)) {
    throw new Error('未找到口播设计文档 design-skeleton-dubbing.md');
  }
  return { mode, designPath: p };
}

/**
 * 从 Markdown 中提取 JSON 配置代码块
 * 优先匹配"项目配置（JSON）"标题下的 JSON 块；找不到再 fallback 到第一个 JSON
 * @param {string} content - Markdown 内容
 * @returns {Object|null} 解析后的 JSON 对象
 */
function extractJsonConfig(content) {
  // 1. 优先匹配"## 项目配置（JSON）"标题下的第一个 ```json``` 块
  const titleMatch = content.match(/##\s*项目配置[（(]JSON[）)]\s*\n+```json\s*([\s\S]*?)\s*```/);
  if (titleMatch) {
    try {
      return JSON.parse(titleMatch[1].trim());
    } catch (e) {
      throw new Error(`项目配置 JSON 解析失败: ${e.message}`);
    }
  }

  // 2. fallback: 抓第一个 JSON 块（兼容老 MD）
  const fallback = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!fallback) {
    throw new Error('未找到 JSON 配置代码块（```json ... ```）');
  }
  console.warn('[W] 未找到"项目配置（JSON）"标题，使用第一个 JSON 块（兼容模式）');
  try {
    return JSON.parse(fallback[1].trim());
  } catch (e) {
    throw new Error(`JSON 配置解析失败: ${e.message}`);
  }
}

/**
 * 从 Markdown 中提取区域列表表格（按表头找列名）
 * @param {string} content - Markdown 内容
 * @param {string} mode - 模式（口播）
 * @returns {Array} regions 数组
 */
function extractRegions(content, mode) {
  // 兼容写法：## 区域列表 / ## 3. 区域列表 / ## 第 3 节 区域列表 / ##区域列表（无空格）
  // 用正则匹配"##" 后面跟着可选的 "序号." 或 "第N节"，再跟 "区域列表"
  const regionHeaderRe = /^##\s*(?:[\d.、]+\s*|第[一二三四五六七八九十\d]+\s*[节章节]?\s*)?区域列表\s*$/m;
  const match = content.match(regionHeaderRe);
  if (!match) {
    throw new Error('未找到 "## 区域列表" 部分（兼容写法：## 3. 区域列表、## 第3节 区域列表、##区域列表）');
  }
  const headerEnd = match.index + match[0].length;
  const regionSection = content.slice(headerEnd);
  if (!regionSection) {
    throw new Error('未找到 "## 区域列表" 部分');
  }

  const lines = regionSection.split('\n');

  // 1. 找表头行（包含"名称"或"序号"的行）
  let header = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|') && (t.includes('名称') || t.includes('序号'))) {
      header = t.split('|').map(c => c.trim()).filter(c => c);
      break;
    }
  }

  if (!header) {
    throw new Error('区域列表未找到表头（应包含"名称"或"序号"列）');
  }

  // 2. 列名 -> 列索引（支持模糊匹配：包含即可）
  const colIdx = (...names) => {
    for (const n of names) {
      const i = header.findIndex(h => h === n || h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };
  const idIdx = colIdx('区域 ID', 'ID');
  const humanNameIdx = colIdx('区域名称');
  const legacyNameIdx = colIdx('名称', '序号');  // 兼容旧 MD
  const durationIdx = colIdx('时长');
  const typeIdx = colIdx('类型');
  const subtitleRangeIdx = colIdx('包含字幕');
  const emotionIdx = colIdx('情绪');
  const descriptionIdx = colIdx('内容描述');

  if (idIdx === -1 && legacyNameIdx === -1) {
    throw new Error(`区域列表表头缺少必填列：区域 ID 或 名称。当前表头：${header.join(', ')}`);
  }
  // 时长列：可省略（用"包含字幕"代替）；同时存在时优先用 SRT 重算
  if (durationIdx === -1 && subtitleRangeIdx === -1) {
    throw new Error(`口播模式区域列表必须包含"时长"或"包含字幕"列。当前表头：${header.join(', ')}`);
  }

  // 3. 解析数据行（跳过表头行：含列名"区域 ID"或"ID"）
  const regions = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.startsWith('|--')) continue;

    const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < header.length - 1) continue;

    // id: 优先取"区域 ID"列；旧 MD 没有该列时回退到"名称"列
    const idCell = idIdx !== -1 ? cells[idIdx] : cells[legacyNameIdx];
    if (!idCell || idCell.startsWith('--')) continue;
    // 跳过表头行：idCell 等于列名（"区域 ID" / "ID" / "名称" / "序号"）
    if (idCell === '区域 ID' || idCell === 'ID' || idCell === '名称' || idCell === '序号') continue;

    // name: 优先取"区域名称"列；缺失时回退到 id（不友好但兼容）
    let nameCell = humanNameIdx !== -1 ? cells[humanNameIdx] : '';
    if (!nameCell) nameCell = idCell;

    // 解析时长：parseFloat 保留 3 位小数（不取整）
    let duration = 0;
    if (durationIdx !== -1) {
      const durationStr = cells[durationIdx].replace(/[a-zA-Z\s秒]/g, '');
      const parsed = parseFloat(durationStr);
      if (!isNaN(parsed)) {
        duration = parseFloat(parsed.toFixed(3));
      }
    }

    // 口播模式 + 有字幕范围：duration 暂存 0，后面用 SRT 重算（更精准）
    const hasSubtitleRange = mode === 'dubbing' && subtitleRangeIdx !== -1 && cells[subtitleRangeIdx];
    if (hasSubtitleRange) {
      duration = 0;
    } else if (duration === 0) {
      // 口播模式没填字幕范围：必须有 duration
      continue;
    }

    const nameLen = (nameCell || '').replace(/\s/g, '').length;
    if (!nameCell || nameLen < 4 || nameLen > 12) {
      throw new Error(`区域名称"${nameCell}"不符合要求：必须为 4-12 个字符（不含空格），当前 ${nameLen} 个字符`);
    }
    const region = { id: idCell, name: nameCell, duration };
    if (mode === 'dubbing' && subtitleRangeIdx !== -1 && cells[subtitleRangeIdx]) {
      region.subtitle_range = cells[subtitleRangeIdx];
    }
    if (typeIdx !== -1 && cells[typeIdx]) {
      region.type = cells[typeIdx];
    }
    if (emotionIdx !== -1 && cells[emotionIdx]) {
      region.emotion = cells[emotionIdx];
    }
    if (descriptionIdx !== -1 && cells[descriptionIdx]) {
      region.description = cells[descriptionIdx];
    }
    regions.push(region);
  }

  if (regions.length === 0) {
    throw new Error('区域列表表格为空或格式不正确');
  }

  return regions;
}

/**
 * 区域模板注入说明（精简版）
 *
 * 设计原则（用户确认）：只给 AI 最小可执行单元
 *   - 写什么：必须填的字段
 *   - 怎么写：元素写法示例
 *   - 校验：硬性规则
 * 不写：AI 不需要管的字段说明（已剥离 / 自动化）
 *
 * 校验规则来源（仅保留实际生效的硬约束）：
 *   - transform-html-component.js: id 禁手写、data-* 互斥
 *   - merge-regions.js: background 非空、animation-delay 禁与 opacity:0 共用、R14 居中互斥、R21.5 入场动画 forwards 禁与 opacity:0 共用
 *   - transform-html L357: R16 跨 region CSS 自动加 {区域}- 前缀（无需 AI 关心）
 */
const REGION_TEMPLATE_RULES = {
  HARD_RULES: [
    '❌ 不要手写 id 属性（merge 自动分配）',
    '❌ 不要手写 start / end / elementIds 字段（merge 从 data-* 推算）',
    '❌ data-subtitle 和 data-global 不能写在同一个元素上（互斥，merge 报错）',
    '❌ data-subtitle 必须是单个数字（如 data-subtitle="3"），不能用 "1-3" 或 "1,3"（merge 报错）',
    '❌ data-subtitle 编号必须存在于本区域字幕范围（merge 报错）',
    '❌ background.html 里的元素不能带 id 属性（merge 报错）',
    '❌ R15：data-subtitle 和 data-global 互斥',
    '❌ background.html 和 background.css 不能为空（merge 报错）',
    '❌ R14：CSS 中 "transform: translate(-50%, -50%)" 不能与 @keyframes / animation 共存（merge 报错）',
    '❌ CSS 中 "animation-delay" 不能与 "opacity: 0" 在同一选择器共存（merge 报错）',
    "❌ R21.5：CSS 选择器不能同时含 \"opacity: 0\" 与 \"animation ... forwards\"（display:none → 切换后元素永远不可见）。入场动画的\"起手式\"必须写在 @keyframes from {} 里",
    '✅ 元素用 class + data-subtitle="N" 绑字幕；整段显示的不写 data-*（merge 自动补 data-global=true）'
  ]
};

/**
 * 构建 region 模板的注入对象（精简版 + 结构化字段）
 * 该对象以 `_` 前缀标识，merge 时由 stripUnderscoreFields 剥离
 * @param {Object} skeleton - 完整 skeleton 对象
 * @param {Object} region - 当前 region 对象
 * @returns {Object} 包含 _whatToWrite / _howToWrite / _hardRules 的对象
 */
function buildValidationHints(skeleton, region) {
  const subs = Array.isArray(region.subtitles) ? region.subtitles : [];
  const subtitleCount = subs.length;
  // 数据说明：本区域包含的 SRT 全局号范围 = skeleton.subtitle_range（如 "12-23"），
  //          也可由 region.subtitles 推算（= SRT 与区域时间窗相交的子集）
  // 优先取 skeleton.subtitle_range（merge 阶段用它）；缺失时回退到 1-N
  const globalSubRange = (typeof skeleton.subtitle_range === 'string')
    ? skeleton.subtitle_range
    : (subtitleCount > 0 ? `1-${subtitleCount}` : 'N/A');
  // 本区域的时间窗
  const regionStart = region.startTime;
  const regionEnd = region.endTime;

  return {
    _whatToWrite: {
      background: 'components[0].background.html/css — 区域背景（HTML+CSS）',
      content: 'components[0].content.html/css — 区域画面元素（HTML+CSS）'
    },
    _howToWrite: {
      globalDisplay: '整段显示：<div class="my-title">…</div>',
      bindSubtitle: `绑字幕 1：<div class="my-card" data-subtitle="1">…</div>（起=${subs[0]?.start ?? '?'}s，止=${regionEnd}s）`,
      timeWindow: `区域时间窗：[${regionStart}, ${regionEnd}]`,
      subtitleRange: `本区域共 ${subtitleCount} 条字幕；SRT 全局号范围 = ${globalSubRange}`,
      // R17 新增：明确告知 AI data-subtitle 必须用 SRT 全局号，且只能在本区域内
      subtitleGlobalHint: `data-subtitle 必须填 SRT 全局号（不是区域号）。本区域可用的 SRT 全局号: ${globalSubRange}。例如区域内第 1 句 = data-subtitle="${globalSubRange === 'N/A' ? '?' : globalSubRange.split('-')[0]}"。`
    },
    _hardRules: REGION_TEMPLATE_RULES.HARD_RULES
  };
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

  // 从 state.json 读取项目级默认配置（fallback 源）
  let projectState = {};
  try {
    projectState = getProjectState(workdirRoot) || {};
  } catch (e) {
    // state.json 不存在也不阻塞（兼容老 workdir）
  }

  // 检测模式 + 一致性校验
  const { mode, designPath } = detectMode(workdirRoot, workdir);
  if (projectState.mode && projectState.mode !== mode) {
    throw new Error(`模式不匹配：state.mode=${projectState.mode}，但 MD 是 ${mode}。请确认 MD 模板正确，或删除 workdir 重建项目。`);
  }
  console.log(`[i] 检测到模式: ${mode}`);

  // 读取设计文档
  const content = fs.readFileSync(designPath, 'utf-8');

  // 1. 提取项目配置
  const config = extractJsonConfig(content);
  console.log(`[✓] 项目配置提取成功: ${config.name}`);

  // 2. 提取区域列表
  const regions = extractRegions(content, mode);
  console.log(`[✓] 区域列表提取成功: ${regions.length} 个区域`);

  // 2.5 用 SRT 按"包含字幕"重算 region.duration（3 位小数，绝对精准）
  if (!projectState.voice || !projectState.voice.srtPath) {
    throw new Error(
      '口播模式必须先执行步骤 1.5（prepare-voice.js）准备配音音频和字幕。\n' +
      '当前 state.voice 为空，请参考 docs/01.5-voice-prepare.md。'
    );
  }
  const srtAbsPath = path.isAbsolute(projectState.voice.srtPath)
    ? projectState.voice.srtPath
    : path.join(workdir, projectState.voice.srtPath);
  if (!fs.existsSync(srtAbsPath)) {
    throw new Error(`SRT 文件不存在: ${srtAbsPath}`);
  }
  const subtitles = parseSrt(srtAbsPath);
  let lastSubtitleEnd = null;
  if (subtitles.length > 0) {
    lastSubtitleEnd = parseFloat(subtitles[subtitles.length - 1].end.toFixed(3));
  }
  let srtCalcCount = 0;
  for (const region of regions) {
    if (!region.subtitle_range) continue;
    const match = region.subtitle_range.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) {
      console.warn(`[W] region ${region.id} 的"包含字幕"格式不合法: "${region.subtitle_range}"（应为 "1-5" 或 "3"）`);
      continue;
    }
    const startIdx = parseInt(match[1], 10) - 1;
    let endIdx = match[2] !== undefined ? parseInt(match[2], 10) - 1 : startIdx;
    if (!subtitles[startIdx] || !subtitles[endIdx]) {
      throw new Error(
        `region ${region.id} 的字幕范围 "${region.subtitle_range}" 超出 SRT 字幕数（${subtitles.length} 条）`
      );
    }
    region.startTime = parseFloat(subtitles[startIdx].start.toFixed(3));
    region.endTime = parseFloat(subtitles[endIdx].end.toFixed(3));
    const dur = region.endTime - region.startTime;
    region.duration = parseFloat(dur.toFixed(3));
    region.subtitles = subtitles.slice(startIdx, endIdx + 1);
    srtCalcCount++;
  }
  console.log(`[✓] 按 SRT 重算 ${srtCalcCount} 个口播区域时长 + 起止时间（3 位小数）`);

  // 3. 计算总时长（口播=最后一帧字幕 end）
  const totalDuration = lastSubtitleEnd !== null
    ? lastSubtitleEnd
    : parseFloat(regions.reduce((sum, r) => sum + r.duration, 0).toFixed(3));
  if (config.duration && Math.abs(config.duration - totalDuration) > 2) {
    console.warn(`[W] 时长不匹配: 配置声明 ${config.duration}秒，实际总时长 ${totalDuration}秒。优先使用实际总时长。`);
  }

  // 4. 自动计算 canvas 尺寸
  // canvas 尺寸 = viewport 的 10 倍
  const viewportWidth = config.viewport?.width || 780;
  const viewportHeight = config.viewport?.height || 585;
  const canvasWidth = viewportWidth * 10;
  const canvasHeight = viewportHeight * 10;

  // 5. 组装 skeleton.json（不含 component start/end）
  const skeleton = {
    name: config.name || '',
    description: config.description || '',
    theme: config.theme || projectState.theme || 'white',
    // 总时长优先用 totalDuration（口播按 SRT 最后一帧）
    duration: totalDuration || config.duration || projectState.duration,
    viewport: config.viewport || { width: 780, height: 585 },
    canvas: { width: canvasWidth, height: canvasHeight },
    settings: {
      autoPlay: false,
      loop: false,
      minScale: 0.01,
      maxScale: 5,
      ease: 0.08,
      contentZoomRatio: 1,
      preFullViewDuration: 0.4,
      postFullViewDuration: 0.4
    },
    regions,
    source_design_doc: path.basename(designPath)
  };

  // 口播模式 —— 强制用 state.voice.audioPath 覆盖 MD 里写的 audio.path
  // 理由：MD 是 AI 写的，路径可能写错；prepare-voice.js 才是 source of truth
  if (!projectState.voice || !projectState.voice.audioPath) {
    throw new Error(
      '口播模式必须先执行步骤 1.5（prepare-voice.js）准备配音音频和字幕。\n' +
      '当前 state.voice 为空，请参考 docs/01.5-voice-prepare.md。'
    );
  }
  skeleton.audio = config.audio && config.audio.path
    ? { ...config.audio, path: projectState.voice.audioPath }  // 保留 fadeIn/loop 等
    : { path: projectState.voice.audioPath };
  // 用 state.voice.duration 覆盖（如果 MD 里 duration 缺失或不准）
  if (!config.duration && projectState.voice.duration) {
    skeleton.duration = projectState.voice.duration;
  }
  if (config.style) skeleton.style = config.style;
  else skeleton.style = 'warm';  // dubbing fallback 默认 warm
  if (config.emotion_curve_template) skeleton.emotion_curve_template = config.emotion_curve_template;
  if (config.subtitle_count) skeleton.subtitle_count = config.subtitle_count;
  else if (projectState.voice.subtitleCount) {
    skeleton.subtitle_count = projectState.voice.subtitleCount;
  }
  if (config.subtitle) skeleton.subtitle = config.subtitle;

  // 项目级字幕样式（可选）
  if (config.subtitle && typeof config.subtitle === 'object') {
    skeleton.subtitle = config.subtitle;
  }

  // 项目模式（固定 dubbing）
  skeleton.mode = 'dubbing';

  // 6. 保存 skeleton.json（顶层 region 节点剥离 _srtSubs 临时字段和 subtitles）
  const skeletonForSave = {
    ...skeleton,
    regions: skeleton.regions.map(r => {
      const { subtitles, _srtSubs, ...rest } = r;
      return rest;
    })
  };
  const skeletonPath = path.join(workdir, 'skeleton.json');
  fs.writeFileSync(skeletonPath, JSON.stringify(skeletonForSave, null, 2));
  console.log(`[✓] skeleton.json 已生成: ${skeletonPath}`);
  console.log(`  名称: ${skeleton.name}`);
  console.log(`  时长: ${skeleton.duration}秒`);
  console.log(`  画布: ${skeleton.canvas.width} × ${skeleton.canvas.height}`);
  console.log(`  区域: ${skeleton.regions.length} 个`);
  console.log(`  音频: ${skeleton.audio.path}`);
  console.log(`  风格: ${skeleton.style || '-'}`);

  // 7. 生成 region 模板文件
  const regionsDir = path.join(workdir, 'regions');
  if (!fs.existsSync(regionsDir)) {
    fs.mkdirSync(regionsDir, { recursive: true });
  }
  for (const region of skeleton.regions) {
    const template = {
      id: region.id,
      name: region.name,
      type: region.type,
      emotion: region.emotion,
      description: region.description,
      startTime: region.startTime,
      endTime: region.endTime,
      duration: region.duration,
      subtitles: region._srtSubs || region.subtitles || [],
      components: [
        {
          id: `${region.id}-001`,
          type: 'HtmlComponent',
          position: { x: 0, y: 0, w: skeleton.viewport.width, h: skeleton.viewport.height },
          background: { html: '', css: '' },
          content: { html: '', css: '' }
        }
      ]
    };
    // 注入校验提示（_ 前缀字段，merge 时由 stripUnderscoreFields 剥离）
    Object.assign(template, buildValidationHints(skeleton, region));
    const templatePath = path.join(regionsDir, `${region.id}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
    console.log(`[✓] 区域模板已生成: ${templatePath}`);
  }

  return skeleton;
}

// CLI 模式
if (require.main === module) {
  const argv = process.argv.slice(2);
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');
  const positionals = argv.filter(a => !a.startsWith('--'));
  const skillProjectId = positionals[0];

  if (!skillProjectId) {
    console.error('用法: node generate-skeleton.js --cwd=<Agent工作目录> <skillProjectId>');
    console.error('');
    console.error('必传: --cwd=<Agent工作目录的绝对路径>');
    console.error('');
    console.error('示例:');
    console.error('  node generate-skeleton.js --cwd=/path/to/agent/workspace cv_abc123');
    process.exit(1);
  }

  try {
    generateSkeleton(workdirRoot, skillProjectId);
    process.exit(0);
  } catch (err) {
    console.error('生成失败:', err.message);
    process.exit(1);
  }
}

module.exports = { generateSkeleton, extractJsonConfig, extractRegions, detectMode, buildValidationHints, REGION_TEMPLATE_RULES };
