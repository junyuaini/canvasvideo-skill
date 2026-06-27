// 把 project.json 从旧规则（.class selector）迁移到新规则（#ID 形式 + HTML 加 id）
// 用法: node migrate-elementIds.js <project.json>
const fs = require('fs');
const path = require('path');

const projectPath = process.argv[2];
if (!projectPath) {
  console.error('用法: node migrate-elementIds.js <project.json>');
  process.exit(1);
}

const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

// 1) 找到每个 region 当前已用的 ID 最大值（顶级组件 + 元素）
const idByRegion = {};
project.components.forEach((c) => {
  if (!c.regionId) return;
  if (!idByRegion[c.regionId]) idByRegion[c.regionId] = 0;
  const m = (c.id || '').match(/^P\d+-(\d+)$/);
  if (m) {
    const seq = parseInt(m[1], 10);
    if (seq > idByRegion[c.regionId]) idByRegion[c.regionId] = seq;
  }
});

// 2) 遍历每个 HtmlComponent 的 elementIds，把 .class 转换为 #P{n}-XXX
let migratedKeys = 0;
project.components.forEach((comp) => {
  if (comp.type !== 'HtmlComponent') return;
  const elementIds = comp.content && comp.content.elementIds;
  if (!elementIds || typeof elementIds !== 'object') return;

  // 重建 elementIds
  const newElementIds = {};
  Object.entries(elementIds).forEach(([oldKey, value]) => {
    if (oldKey.startsWith('#')) {
      newElementIds[oldKey] = value; // 已经是新规则
      return;
    }
    // 旧规则 key（如 .stage），分配新 ID
    idByRegion[comp.regionId] = (idByRegion[comp.regionId] || 0) + 1;
    const newSeq = String(idByRegion[comp.regionId]).padStart(3, '0');
    const newId = `${comp.regionId}-${newSeq}`;
    const newKey = `#${newId}`;
    newElementIds[newKey] = {
      id: newId,
      start: value.start,
      end: value.end
    };
    // 给 HTML 字符串里的对应 class 元素加上 id
    // 支持简单映射：.stage → <div class="stage" 转为 <div id="P1-002" class="stage"
    const className = oldKey.startsWith('.') ? oldKey.slice(1) : oldKey;
    if (comp.content && comp.content.html) {
      // 匹配 class="X" 或 class='X' 形式（精确匹配 className）
      // 优先匹配 class="X " / class="X" 边界
      const regex = new RegExp(`(<\\w+[^>]*\\sclass=["'])${className}(["'])`, 'g');
      comp.content.html = comp.content.html.replace(regex, (m, p1, p2) => {
        // 已经在该 tag 里有 id 则不重复加
        return `${p1}${className}${p2}`;
      });
      // 用更简单的方式：在 class="X" 前面插入 id="P{n}-XXX"（如果该标签还没 id）
      // 由于正则复杂，分两步走
      const tagRegex = new RegExp(`(<\\w+)([^>]*\\bclass=["'])${className}(["'][^>]*)(?<!\\bid=)`, 'g');
      comp.content.html = comp.content.html.replace(tagRegex, (m, tagStart, beforeClass, afterClass) => {
        // 检查整段标签里是否已经有 id="
        return `${tagStart} id="${newId}"${beforeClass}${className}${afterClass}`;
      });
    }
    migratedKeys++;
  });
  comp.content.elementIds = newElementIds;
});

console.log(`迁移完成：共 ${migratedKeys} 个 key 改为 #ID 形式`);

// 备份原文件
const backupPath = projectPath + '.bak';
fs.writeFileSync(backupPath, fs.readFileSync(projectPath, 'utf-8'));
console.log(`已备份原文件到 ${backupPath}`);

// 输出新文件
const outPath = projectPath.replace(/\.json$/, '.migrated.json');
fs.writeFileSync(outPath, JSON.stringify(project, null, 2), 'utf-8');
console.log(`已生成新文件: ${outPath}`);
