/**
 * voice-detect.js
 * MP3 → WAV (ffmpeg-static) → PCM (read) → RMS 人声起点检测
 * 依赖：ffmpeg-static
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SAMPLE_RATE = 16000;
const FRAME_MS = 100;
const SILENCE_THRESH = 0.01;
const MIN_SILENCE_MS = 300;
const MAX_SHIFT_MS = 2000;

function mp3ToPcm(mp3Buffer) {
  const tmpIn = path.join(os.tmpdir(), `vd_in_${Date.now()}_${process.pid}.mp3`);
  const tmpOut = path.join(os.tmpdir(), `vd_out_${Date.now()}_${process.pid}.wav`);
  fs.writeFileSync(tmpIn, mp3Buffer);
  let pcm;
  try {
    const r = spawnSync(ffmpegPath, [
      '-y', '-loglevel', 'error',
      '-i', tmpIn,
      '-f', 'wav',
      '-ar', String(SAMPLE_RATE),
      '-ac', '1',
      '-acodec', 'pcm_s16le',
      tmpOut,
    ], { stdio: 'pipe', timeout: 30000, killSignal: 'SIGKILL' });
    if (r.error) throw new Error('ffmpeg spawn 失败: ' + r.error.message);
    if (r.status === null) {
      throw new Error('ffmpeg 超时或被杀死（status=null, signal=' + (r.signal || 'none') + '），10 分钟音频预期 < 10s，转码卡住');
    }
    if (r.status !== 0) {
      throw new Error('ffmpeg 退出码 ' + r.status + ': ' + (r.stderr && r.stderr.toString().slice(-300)));
    }
    const wav = fs.readFileSync(tmpOut);
    if (wav.length < 44) throw new Error('WAV 文件异常');
    pcm = wav.slice(44);
  } finally {
    try { fs.unlinkSync(tmpIn); } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
  }
  return pcm;
}

function pcmToVoiceStarts(pcm) {
  const frameBytes = Math.round((FRAME_MS / 1000) * SAMPLE_RATE) * 2;
  const minSilenceFrames = Math.max(1, Math.round(MIN_SILENCE_MS / FRAME_MS));
  const starts = [];
  let silent = true;
  let silentFrames = 0;
  for (let i = 0; i < pcm.length; i += frameBytes) {
    const end = Math.min(i + frameBytes, pcm.length);
    let sumSq = 0;
    let n = 0;
    for (let j = i; j < end; j += 2) {
      const v = pcm.readInt16LE(j) / 32768;
      sumSq += v * v;
      n++;
    }
    if (n === 0) continue;
    const rms = Math.sqrt(sumSq / n);
    const time = (i / 2) / SAMPLE_RATE;
    if (rms > SILENCE_THRESH) {
      if (silent && silentFrames >= minSilenceFrames) {
        starts.push(+time.toFixed(2));
        silent = false;
      }
      silentFrames = 0;
    } else {
      if (!silent) {
        silentFrames++;
        if (silentFrames >= minSilenceFrames) silent = true;
      } else {
        silentFrames++;
      }
    }
  }
  return starts;
}

function detectVoiceStarts(mp3Buffer) {
  if (!Buffer.isBuffer(mp3Buffer) || mp3Buffer.length === 0) {
    return Promise.resolve([]);
  }
  const pcm = mp3ToPcm(mp3Buffer);
  if (!pcm || pcm.length < 64) return Promise.resolve([]);
  return Promise.resolve(pcmToVoiceStarts(pcm));
}

function alignSrtStartsByVoice(entries, voiceStarts, opts) {
  const maxShiftMs = (opts && opts.maxShiftMs) || MAX_SHIFT_MS;
  if (!Array.isArray(entries) || !Array.isArray(voiceStarts) || voiceStarts.length === 0) {
    return entries;
  }
  const starts = voiceStarts
    .filter(v => typeof v === 'number' && isFinite(v) && v >= 0)
    .map(v => v * 1000);
  if (starts.length === 0) return entries;
  return entries.map(([start, end, txt]) => {
    if (typeof start !== 'number' || !isFinite(start)) return [start, end, txt];
    let best = null;
    let bestDiff = Infinity;
    for (const vs of starts) {
      const d = Math.abs(vs - start);
      if (d < bestDiff) { bestDiff = d; best = vs; }
    }
    if (best !== null && bestDiff <= maxShiftMs) {
      return [Math.round(best), end, txt];
    }
    return [start, end, txt];
  });
}

module.exports = { detectVoiceStarts, alignSrtStartsByVoice };
