/**
 * CanvasVideo Skill — 元素 ID 反查脚本（v1.0）
 *
 * 输入 HTML 元素 ID（如 "P4-107"），自动反查：
 *   - 所在 region（区域 ID + 区域名）
 *   - 对应 class（去掉 region 前缀，如 "arrow"、"mini-card mc-4"）
 *   - 当前 data-subtitle 编号
 *
 * 用法（CLI）：
 *   node lookup-element.js --cwd=<Agent工作目录> <skillProjectId> <id1> [id2 ...]
 *   node lookup-element.js --cwd=<Agent工作目录> <skillProjectId> --region=<P编号>     # 列出该 region 全部元素
 *   node lookup-element.js --cwd=<Agent工作目录> <skillProjectId> --all                  # 列出全部元素
 *
 * 示例：
 *   node scripts/lookup-element.js --cwd=d:/TRAE SOLO/视频制作 cv_xxx P4-107 P7-106
 *   node scripts/lookup-element.js --cwd=d:/TRAE SOLO/视频制作 cv_xxx --region=P4
 *
 * 程序化导出：
 *   - lookup(workdir, skillProjectId, ids)        → Array<{id, regionId, regionName, class, subtitle}>
 *   - listRegion(workdir, skillProjectId, regionId) → 同上（指定 region 全部）
 *   - listAll(workdir, skillProjectId)              → 同上（全部）
 */
const fs = require('fs');
const path = require('path');
const { resolveAgentWorkdir } = require('./scaffold');

function parseArgs(argv) {
  const args = { cwd: null, ids: [], region: null, all: false };
  for (const a of argv) {
    if (a.startsWith('--cwd=')) args.cwd = a.slice('--cwd='.length);
    else if (a.startsWith('--region=')) args.region = a.slice('--region='.length);
    else if (a === '--all') args.all = true;
    else args.ids.push(a);
  }
  return args;
}

/**
 * 从 project.json 中遍历 components，提取每个元素的 (id, class, subtitle, regionId, regionName)
 *
 * 注意：merge 时 transform 会给 class 加 {region 小写}- 前缀（如 "player-window" → "p6-player-window"）。
 *       originalClass 字段保存去掉前缀后的原始 class，方便用户去 regions/P{n}.json 源文件检索。
 */
function extractElements(project) {
  const regionMap = {};
  for (const r of project.regions) regionMap[r.id] = r.name;

  const out = [];
  for (const comp of project.components) {
    const html = (comp.content && comp.content.html) || (comp.background && comp.background.html) || '';
    // 匹配 <... id="PX-NNN" ... class='cls' ... [data-subtitle='N'] ...>
    const re = /<[^>]*\sid="(P\d+-\d+)"[^>]*>/g;
    let m;
    while ((m = re.exec(html))) {
      const tag = m[0];
      const id = m[1];
      const clsMatch = tag.match(/class=['"]([^'"]+)['"]/);
      const subMatch = tag.match(/data-subtitle=['"](\d+)['"]/);
      const cls = clsMatch ? clsMatch[1] : '';
      const regionId = id.split('-')[0]; // P4
      const prefix = regionId.toLowerCase() + '-'; // p4-
      // 去掉前缀（多 class 取第一个）
      const classes = cls ? cls.split(/\s+/) : [];
      const originalClass = classes[0] && classes[0].startsWith(prefix)
        ? classes[0].slice(prefix.length)
        : (classes[0] || '');
      out.push({
        id,
        regionId,
        regionName: regionMap[regionId] || '(未命名)',
        class: cls,
        originalClass,
        subtitle: subMatch ? parseInt(subMatch[1], 10) : null,
      });
    }
  }
  // 去重（按 id），保留首次出现
  const seen = new Set();
  return out.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function loadProjectJson(workdir) {
  const pj = path.join(workdir, 'project.json');
  if (!fs.existsSync(pj)) throw new Error('找不到 project.json：' + pj + '（请先跑步骤 6：merge-regions.js）');
  return JSON.parse(fs.readFileSync(pj, 'utf-8'));
}

function lookup(workdir, skillProjectId, ids) {
  const project = loadProjectJson(workdir);
  const all = extractElements(project);
  const map = new Map(all.map(e => [e.id, e]));
  return ids.map(id => map.get(id) || {
    id, regionId: '?', regionName: '?', class: '(未找到)', subtitle: null,
  });
}

function listRegion(workdir, skillProjectId, regionId) {
  const project = loadProjectJson(workdir);
  return extractElements(project).filter(e => e.regionId === regionId);
}

function listAll(workdir, skillProjectId) {
  const project = loadProjectJson(workdir);
  return extractElements(project);
}

function formatRow(e) {
  const sub = e.subtitle !== null ? e.subtitle : '-';
  // originalClass 是去掉 p{N}- 前缀后的源文件类名，方便对照 regions/P{N}.json
  // class 是含前缀的完整类名
  return `${e.id.padEnd(8)} region=${e.regionId.padEnd(4)} (${e.regionName.padEnd(14)})  class='${e.originalClass}'  subtitle=${sub}  (full: '${e.class}')`;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cwd || args.ids.length === 0 && !args.region && !args.all) {
    console.error('用法: node lookup-element.js --cwd=<Agent工作目录> <skillProjectId> <id1> [id2 ...]');
    console.error('      node lookup-element.js --cwd=<Agent工作目录> <skillProjectId> --region=<P编号>');
    console.error('      node lookup-element.js --cwd=<Agent工作目录> <skillProjectId> --all');
    process.exit(1);
  }
  const agentWorkdir = resolveAgentWorkdir(process.argv.slice(2));
  const workdir = path.join(agentWorkdir, 'canvasvideo-workdir', args.ids[0]);
  if (!fs.existsSync(workdir)) {
    console.error('项目目录不存在：' + workdir);
    process.exit(1);
  }
  let rows;
  if (args.all) rows = listAll(workdir, args.ids[0]);
  else if (args.region) rows = listRegion(workdir, args.ids[0], args.region);
  else rows = lookup(workdir, args.ids[0], args.ids.slice(1));

  if (rows.length === 0) {
    console.log('(无匹配元素)');
  } else {
    for (const r of rows) console.log(formatRow(r));
  }
}

module.exports = { lookup, listRegion, listAll, extractElements };