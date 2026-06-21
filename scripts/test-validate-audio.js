const { validate } = require('./validate');

const base = {
  name: 'test',
  theme: 'white',
  canvas: { width: 5000, height: 2000 },
  viewport: { width: 780, height: 585 },
  regions: [{ name: 'P1', x: 0, y: 0 }],
  settings: { preFullViewDuration: 0.4, postFullViewDuration: 0.4, contentZoomRatio: 0.9 },
  components: [{ id: 'P1-001', type: 'TitleComponent', position: { x: 0, y: 0, w: 780, h: 585 }, customStyle: {} }]
};

function test(name, proj, expectValid) {
  const r = validate(proj);
  const ok = r.valid === expectValid;
  console.log(ok ? '✅' : '❌', name, '| valid=', r.valid, r.errors.length ? '| errors=' + JSON.stringify(r.errors) : '');
  if (!ok) process.exitCode = 1;
}

// 场景1：纯配音（字符串audio + 有字幕）→ 通过
test('配音+字幕', { ...base, audio: 'assets/voice.mp3', subtitles: [{ start: 0, end: 5, text: 'hi' }] }, true);

// 场景2：纯配音（字符串audio + 无字幕）→ 失败
test('配音无字幕', { ...base, audio: 'assets/voice.mp3' }, false);

// 场景3：BGM（对象+loop + 无字幕）→ 通过
test('BGM无字幕', { ...base, audio: { path: 'assets/bgm.mp3', loop: true, fadeIn: 1, fadeOut: 2 } }, true);

// 场景4：BGM（对象+仅fadeIn + 无字幕）→ 通过
test('BGM仅fadeIn', { ...base, audio: { path: 'assets/bgm.mp3', fadeIn: 1 } }, true);

// 场景5：BGM（对象但无loop/fade + 无字幕）→ 视为配音，失败
test('对象audio无音效配置', { ...base, audio: { path: 'assets/bgm.mp3' } }, false);

// 场景6：无audio无字幕 → 通过（创作模式）
test('创作模式静音', base, true);

// 场景7：无audio有字幕 → 失败
test('无audio有字幕', { ...base, subtitles: [{ start: 0, end: 5, text: 'hi' }] }, false);

// 场景8：fadeOut 超范围
test('fadeOut超范围', { ...base, audio: { path: 'assets/bgm.mp3', fadeOut: 6 } }, false);

console.log('\n全部验证结束');
