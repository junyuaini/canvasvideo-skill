/**
 * 从 Incompetech 批量下载免版权 BGM
 * 每主题提供多首候选，下载成功即停止
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.resolve(__dirname, '..', 'templates', 'bgm');
fs.mkdirSync(TARGET_DIR, { recursive: true });

// 6 个主题，每个主题多首候选曲目（歌名需与 Incompetech 上完全一致）
const CANDIDATES = {
  'tech-pulse': [
    'Volatile Reaction',
    'The Complex',
    'Ouroboros',
    'Rocket Power',
    'Electrodoodle',
  ],
  'warm-cafe': [
    'Acoustic Breeze',
    'Sweeter Vermouth',
    'Lobby Time',
    'Jazz Brunch',
    'Quasi Motion',
  ],
  'uplifting': [
    'Inspired',
    'Life of Riley',
    'Brightly Fancy',
    'Feelin Good',
    'Carefree',
  ],
  'corporate': [
    'Porch Swing Days',
    'Feelin Good',
    'Carefree',
    'Local Forecast',
    'Bossa Antigua',
  ],
  'light-pop': [
    'Happy Alley',
    'Feelin Good',
    'Carefree',
    'Life of Riley',
    'Brightly Fancy',
  ],
  'cinematic': [
    'The Descent',
    'Dreamy Flashback',
    'Epic Song',
    'Dark Times',
    'Our Story Begins',
  ],
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.destroy();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.destroy();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function encodeName(name) {
  return encodeURIComponent(name);
}

async function main() {
  const results = [];

  for (const [theme, songs] of Object.entries(CANDIDATES)) {
    let success = false;
    for (const song of songs) {
      const url = `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeName(song)}.mp3`;
      const dest = path.join(TARGET_DIR, `${theme}.mp3`);
      try {
        console.log(`[${theme}] 尝试: ${song}...`);
        await download(url, dest);
        const size = fs.statSync(dest).size;
        if (size < 10000) {
          // 可能是 HTML 错误页面
          fs.unlinkSync(dest);
          throw new Error('文件太小，可能不是 MP3');
        }
        console.log(`  ✅ 成功: ${song} (${(size / 1024 / 1024).toFixed(2)} MB)`);
        results.push({ theme, song, size });
        success = true;
        break;
      } catch (err) {
        console.log(`  ❌ 失败: ${err.message}`);
      }
    }
    if (!success) {
      console.log(`[${theme}] ⚠️ 所有候选均失败`);
    }
  }

  console.log('\n--- 下载结果 ---');
  for (const r of results) {
    console.log(`${r.theme}: ${r.song} (${(r.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  // 清理旧的 wav 文件
  for (const f of fs.readdirSync(TARGET_DIR)) {
    if (f.endsWith('.wav')) {
      fs.unlinkSync(path.join(TARGET_DIR, f));
      console.log(`🗑️ 删除旧文件: ${f}`);
    }
  }
}

main().catch(console.error);
