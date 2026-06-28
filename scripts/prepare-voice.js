/**
 * 音频与字幕准备脚本（仅口播模式）
 *
 * 功能：
 *  - 模式 A：用户提供 MP3 + SRT → 复制到 workdir
 *  - 模式 B：调 scripts/tts.js 从文本生成 MP3 + SRT
 *  - 统一输出到：
 *      {workdir}/{skillProjectId}/assets/voice/voice.mp3
 *      {workdir}/{skillProjectId}/assets/subtitles/subtitle.srt
 *  - 把音频/字幕信息（路径、时长、字幕数）写进 state.json
 *
 * 用法：
 *
 *   # 模式 A：用户提供素材
 *   node prepare-voice.js --cwd=<Agent工作目录> {skillProjectId} \
 *     --mp3=<path> --srt=<path>
 *
 *   # 模式 B：AI 自动生成（从命令行文本）
 *   node prepare-voice.js --cwd=<Agent工作目录> {skillProjectId} \
 *     --generate --text="你的文章内容..." \
 *     [--voice=zh-CN-XiaoxiaoNeural] [--rate="+10%"] [--volume="+0%"] [--pitch="+0Hz"]
 *
 *   # 模式 C：AI 自动生成（从文件读文本）
 *   node prepare-voice.js --cwd=<Agent工作目录> {skillProjectId} \
 *     --generate --text-file=<path>
 *
 * 前置条件：
 *   - 已执行 init-project.js（state.json 已创建，state.mode === 'dubbing'）
 *   - 模式 B 需联网（Azure TTS 端点）
 *   - 模式 B 依赖 node-edge-tts（已在 canvasvideo-skill/package.json 中声明，npm install 一次即装）
 *
 * 重新生成：
 *   - 多次跑本脚本会**覆盖**旧的 voice.mp3 + subtitle.srt，并刷新 state.voice
 *   - 用户可重复执行直到满意为止（与骨架设计"可重做"行为一致）
 */
const fs = require('fs');
const path = require('path');
const { resolveAgentWorkdir } = require('./scaffold');
const { loadOrCreateProject, saveProjectState } = require('./state');
const { parseSrt } = require('./srt-parser');
const { textToAudioSrt } = require('./tts');

// 输出固定路径（workdir 内部相对路径，merge-regions 会再转成 ./assets/...）
const VOICE_REL = 'assets/voice/voice.mp3';
const SRT_REL = 'assets/subtitles/subtitle.srt';

function parseArgs(argv) {
  const agentWorkdir = resolveAgentWorkdir(argv);
  const workdirRoot = path.join(agentWorkdir, 'canvasvideo-workdir');

  const args = {
    workdirRoot,
    skillProjectId: null,
    mode: null,  // 'user' | 'generate'
    mp3: null,
    srt: null,
    text: null,
    textFile: null,
    voice: null,    // TTS 音色，默认 zh-CN-XiaoxiaoNeural
    rate: null,     // TTS 语速，如 +10%
    volume: null,   // TTS 音量
    pitch: null,    // TTS 音调
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--cwd=')) continue;
    if (arg === '--generate' || arg === '--user') {
      args.mode = arg === '--generate' ? 'generate' : 'user';
    } else if (arg.startsWith('--mp3=')) {
      args.mp3 = arg.slice('--mp3='.length);
      args.mode = args.mode || 'user';
    } else if (arg.startsWith('--srt=')) {
      args.srt = arg.slice('--srt='.length);
      args.mode = args.mode || 'user';
    } else if (arg.startsWith('--text=')) {
      args.text = arg.slice('--text='.length);
      args.mode = args.mode || 'generate';
    } else if (arg.startsWith('--text-file=')) {
      args.textFile = arg.slice('--text-file='.length);
      args.mode = args.mode || 'generate';
    } else if (arg.startsWith('--voice=')) {
      args.voice = arg.slice('--voice='.length);
    } else if (arg.startsWith('--rate=')) {
      args.rate = arg.slice('--rate='.length);
    } else if (arg.startsWith('--volume=')) {
      args.volume = arg.slice('--volume='.length);
    } else if (arg.startsWith('--pitch=')) {
      args.pitch = arg.slice('--pitch='.length);
    } else if (!args.skillProjectId && !arg.startsWith('--')) {
      args.skillProjectId = arg;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
用法: node prepare-voice.js --cwd=<Agent工作目录> <skillProjectId> [选项]

必传:
  --cwd=<绝对路径>              Agent 工作目录的绝对路径
  <skillProjectId>              项目 ID

模式 A：用户提供素材
  --mp3=<path>                  配音音频文件路径（mp3/wav/m4a）
  --srt=<path>                  字幕文件路径（srt 格式）

模式 B：AI 自动生成（需联网）
  --generate                    切换到 TTS 生成模式
  --text="..."                  文本内容（命令行直接传）
  --text-file=<path>            文本文件路径（UTF-8 编码）
  --voice=<name>                TTS 音色，默认 zh-CN-XiaoxiaoNeural
  --rate="+10%"                 语速
  --volume="+0%"                音量
  --pitch="+0Hz"                音调

输出:
  {workdir}/{skillProjectId}/assets/voice/voice.mp3
  {workdir}/{skillProjectId}/assets/subtitles/subtitle.srt
  state.json 会更新 voice 字段

示例:
  node prepare-voice.js --cwd=/path/to/workspace cv_abc --mp3=recording.mp3 --srt=subtitle.srt
  node prepare-voice.js --cwd=/path/to/workspace cv_abc --generate --text="你好世界"
  node prepare-voice.js --cwd=/path/to/workspace cv_abc --generate --text-file=article.txt --voice=zh-CN-YunxiNeural
`);
}

// ===== 校验工具 =====

/**
 * 校验 SRT 文件格式 + 提取时长和字幕数
 * @param {string} srtPath
 * @returns {Object} { duration, subtitleCount }
 */
function inspectSrt(srtPath) {
  if (!fs.existsSync(srtPath)) {
    throw new Error(`SRT 文件不存在: ${srtPath}`);
  }
  const stat = fs.statSync(srtPath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`SRT 文件无效或为空: ${srtPath}`);
  }
  let subtitles;
  try {
    subtitles = parseSrt(srtPath);
  } catch (e) {
    throw new Error(`SRT 解析失败: ${e.message}`);
  }
  if (!subtitles.length) {
    throw new Error(`SRT 文件没有字幕条目: ${srtPath}`);
  }
  const last = subtitles[subtitles.length - 1];
  return {
    duration: last.end,
    subtitleCount: subtitles.length,
  };
}

/**
 * 校验 MP3 文件（最简：非空即可，详细帧解析不必要）
 * @param {string} mp3Path
 * @returns {number} 文件大小（字节）
 */
function inspectMp3(mp3Path) {
  if (!fs.existsSync(mp3Path)) {
    throw new Error(`音频文件不存在: ${mp3Path}`);
  }
  const stat = fs.statSync(mp3Path);
  if (!stat.isFile() || stat.size < 1024) {
    throw new Error(`音频文件无效或太小 (< 1KB): ${mp3Path}`);
  }
  return stat.size;
}

// ===== 模式 A：用户素材 =====

async function prepareFromUser(workdir, args) {
  if (!args.mp3) {
    throw new Error('模式 A 必传 --mp3=<path>');
  }
  if (!args.srt) {
    throw new Error('模式 A 必传 --srt=<path>');
  }

  // 校验
  const mp3Size = inspectMp3(args.mp3);
  const srtInfo = inspectSrt(args.srt);

  // 复制
  const voiceDir = path.join(workdir, 'assets', 'voice');
  const srtDir = path.join(workdir, 'assets', 'subtitles');
  fs.mkdirSync(voiceDir, { recursive: true });
  fs.mkdirSync(srtDir, { recursive: true });

  const voiceDest = path.join(workdir, VOICE_REL);
  const srtDest = path.join(workdir, SRT_REL);
  fs.copyFileSync(args.mp3, voiceDest);
  fs.copyFileSync(args.srt, srtDest);

  console.log(`[✓] 已复制音频: ${args.mp3} -> ${voiceDest} (${mp3Size} 字节)`);
  console.log(`[✓] 已复制字幕: ${args.srt} -> ${srtDest} (${srtInfo.subtitleCount} 条)`);

  return {
    source: 'user',
    audioPath: `./${VOICE_REL}`,
    srtPath: `./${SRT_REL}`,
    duration: srtInfo.duration,
    subtitleCount: srtInfo.subtitleCount,
    voiceName: null,
  };
}

// ===== 模式 B：TTS 生成 =====

async function prepareFromGenerate(workdir, args) {
  let text = args.text;
  if (!text && args.textFile) {
    if (!fs.existsSync(args.textFile)) {
      throw new Error(`文本文件不存在: ${args.textFile}`);
    }
    text = fs.readFileSync(args.textFile, 'utf-8').trim();
  }
  if (!text) {
    throw new Error('模式 B 必传 --text="..." 或 --text-file=<path>');
  }
  if (text.length > 50000) {
    throw new Error(`文本过长（${text.length} 字 > 50000 字上限），请分批合成`);
  }

  // 直接生成到标准路径（不再中转临时目录）
  // MP3 → assets/voice/voice.mp3，SRT → assets/subtitles/subtitle.srt
  const voiceDir = path.join(workdir, 'assets', 'voice');
  const srtDir = path.join(workdir, 'assets', 'subtitles');
  fs.mkdirSync(voiceDir, { recursive: true });
  fs.mkdirSync(srtDir, { recursive: true });

  console.log(`[i] 正在调 Azure TTS 合成（${text.length} 字）...`);

  let result;
  try {
    result = await textToAudioSrt({
      text,
      audioDir: voiceDir,
      audioFileName: 'voice.mp3',
      srtDir: srtDir,
      srtFileName: 'subtitle.srt',
      voice: args.voice || 'zh-CN-XiaoxiaoNeural',
      rate: args.rate || '+0%',
      volume: args.volume || '+0%',
      pitch: args.pitch || '+0Hz',
      chunkSize: 200,
      shortSubtitle: true,
    });
  } catch (e) {
    throw new Error(`TTS 合成失败: ${e.message}`);
  }

  const [generatedMp3, generatedSrt] = result;
  if (!fs.existsSync(generatedMp3) || !fs.existsSync(generatedSrt)) {
    throw new Error(`TTS 输出文件缺失: ${generatedMp3} / ${generatedSrt}`);
  }

  // 提取时长和字幕数
  const srtInfo = inspectSrt(generatedSrt);
  const mp3Size = fs.statSync(generatedMp3).size;

  console.log(`[✓] TTS 生成完成`);
  console.log(`    音色: ${args.voice || 'zh-CN-XiaoxiaoNeural'}`);
  console.log(`    音频: ${generatedMp3} (${mp3Size} 字节)`);
  console.log(`    字幕: ${generatedSrt} (${srtInfo.subtitleCount} 条, ${srtInfo.duration.toFixed(2)}s)`);

  return {
    source: 'generated',
    audioPath: `./${VOICE_REL}`,
    srtPath: `./${SRT_REL}`,
    duration: srtInfo.duration,
    subtitleCount: srtInfo.subtitleCount,
    voiceName: args.voice || 'zh-CN-XiaoxiaoNeural',
  };
}

// ===== 主流程 =====

async function prepareVoice(workdirRoot, skillProjectId, options = {}) {
  if (!skillProjectId) {
    throw new Error('参数错误：skillProjectId 是必填项');
  }

  const workdir = path.join(workdirRoot, skillProjectId);
  if (!fs.existsSync(workdir)) {
    throw new Error(`workdir 不存在: ${workdir}。请先执行步骤1 init-project`);
  }

  // 校验 state.mode === 'dubbing'
  const state = loadOrCreateProject(workdirRoot);
  if (state.mode !== 'dubbing') {
    throw new Error(`口播素材准备仅限口播模式，当前 state.mode=${state.mode}`);
  }

  // 校验不能两个模式都给了
  if (options.mp3 && (options.text || options.textFile)) {
    throw new Error('不能同时给 --mp3 和 --text/--text-file，请选择一种');
  }

  // 自动判定模式
  let mode = options.mode;
  if (!mode) {
    if (options.mp3 || options.srt) mode = 'user';
    else if (options.text || options.textFile) mode = 'generate';
    else {
      throw new Error('未指定模式。请传 --mp3/--srt（用户提供）或 --generate --text="..."（AI 生成）');
    }
  }

  console.log(`\n========== 准备口播素材（${mode === 'user' ? '用户提供' : 'AI 自动生成'}）==========`);

  let voiceInfo;
  if (mode === 'user') {
    voiceInfo = await prepareFromUser(workdir, options);
  } else {
    voiceInfo = await prepareFromGenerate(workdir, options);
  }

  // 写回 state
  state.voice = voiceInfo;
  saveProjectState(workdirRoot, state);

  console.log(`\n[✓] 素材准备完成`);
  console.log(`    audioPath:  ${voiceInfo.audioPath}`);
  console.log(`    srtPath:    ${voiceInfo.srtPath}`);
  console.log(`    duration:   ${voiceInfo.duration.toFixed(2)}s`);
  console.log(`    subtitles:  ${voiceInfo.subtitleCount} 条`);
  if (voiceInfo.voiceName) {
    console.log(`    voice:      ${voiceInfo.voiceName}`);
  }
  console.log(`    state.voice 已更新`);

  return voiceInfo;
}

// ===== CLI 入口 =====
if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));

  if (!args.skillProjectId || process.argv.slice(2).includes('-h') || process.argv.slice(2).includes('--help')) {
    printHelp();
    process.exit(args.skillProjectId ? 0 : 1);
  }

  prepareVoice(args.workdirRoot, args.skillProjectId, {
    mode: args.mode,
    mp3: args.mp3,
    srt: args.srt,
    text: args.text,
    textFile: args.textFile,
    voice: args.voice,
    rate: args.rate,
    volume: args.volume,
    pitch: args.pitch,
  }).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('准备失败:', err.message);
    process.exit(1);
  });
}

module.exports = { prepareVoice, VOICE_REL, SRT_REL };
