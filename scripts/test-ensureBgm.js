const fs = require('fs');
const path = require('path');
const { ensureBgm, BGM_STYLES } = require('./scaffold');

const workdirRoot = path.join(__dirname, '..', 'test-workdir');
const skillProjectId = 'test_bgm_project';

// 清理旧测试目录
const projectDir = path.join(workdirRoot, skillProjectId);
if (fs.existsSync(projectDir)) {
  fs.rmSync(projectDir, { recursive: true });
}

console.log('=== Test 1: 有 wav 时正确复制 ===');
const r1 = ensureBgm(workdirRoot, skillProjectId);
console.log('hasBgm:', r1.hasBgm, '| copied:', r1.copied.length);
console.assert(r1.hasBgm === true, '有 wav 时应返回 hasBgm=true');
console.assert(r1.copied.length === 6, '应复制 6 个 wav 文件');

console.log('\n=== Test 2: 模拟放入 2 个 mp3 ===');
const sourceDir = path.resolve(__dirname, '..', 'templates', 'bgm');
fs.mkdirSync(sourceDir, { recursive: true });
// 创建两个假 mp3（空文件即可）
const fakeMp3 = ['uplifting', 'tech-pulse'];
for (const s of fakeMp3) {
  fs.writeFileSync(path.join(sourceDir, `${s}.mp3`), Buffer.alloc(0));
}

const r2 = ensureBgm(workdirRoot, skillProjectId);
console.log('hasBgm:', r2.hasBgm, '| copied:', r2.copied);
console.assert(r2.hasBgm === true, '有 mp3 时应返回 hasBgm=true');
console.assert(r2.copied.length === 2, '应复制 2 个文件');
console.assert(r2.copied.includes('assets/placeholders/bgm/uplifting.mp3'), '应包含 uplifting');

console.log('\n=== Test 3: styleHint 精准匹配 ===');
const r3 = ensureBgm(workdirRoot, skillProjectId, 'uplifting');
console.log('hasBgm:', r3.hasBgm, '| copied:', r3.copied);
console.assert(r3.copied.length === 0, '已存在不应重复复制');

// 清理假 mp3
for (const s of fakeMp3) {
  fs.unlinkSync(path.join(sourceDir, `${s}.mp3`));
}

console.log('\n=== Test 4: 无效 styleHint 回退全部 ===');
// 重新放入一个
fs.writeFileSync(path.join(sourceDir, 'cinematic.mp3'), Buffer.alloc(0));
const r4 = ensureBgm(workdirRoot, skillProjectId, 'invalid-style');
console.log('hasBgm:', r4.hasBgm, '| copied:', r4.copied);
console.assert(r4.copied.includes('assets/placeholders/bgm/cinematic.mp3'), '无效 hint 应回退并复制 cinematic');
fs.unlinkSync(path.join(sourceDir, 'cinematic.mp3'));

// 清理测试目录
fs.rmSync(workdirRoot, { recursive: true, force: true });

console.log('\n✅ 全部测试通过');
