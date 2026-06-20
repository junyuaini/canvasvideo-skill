/**
 * 生成 6 首简单合成 BGM（WAV 格式）到 templates/bgm/
 * 每首约 30 秒，不同风格通过 BPM、和弦进行、音色区分
 * 生成后自动用 ffmpeg 转 mp3（如果系统有 ffmpeg），否则保持 wav
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const CHANNELS = 2;
const DURATION = 30; // 秒

const TARGET_DIR = path.resolve(__dirname, '..', 'templates', 'bgm');
fs.mkdirSync(TARGET_DIR, { recursive: true });

// 音符频率表（C4 = 261.63）
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  'C#4': 277.18, 'D#4': 311.13, 'F#4': 369.99, 'G#4': 415.30, 'A#4': 466.16,
};

// 6 首风格定义
const TRACKS = [
  {
    name: 'tech-pulse',
    bpm: 128,
    baseOctave: 1, // 实际频率会乘以 octave
    progression: [
      { notes: ['C4','E4','G4'], beats: 4 },
      { notes: ['A3','C4','E4'], beats: 4 },
      { notes: ['F3','A3','C4'], beats: 4 },
      { notes: ['G3','B3','D4'], beats: 4 },
    ],
    wave: 'sawtooth',
    arp: true,
  },
  {
    name: 'warm-cafe',
    bpm: 85,
    progression: [
      { notes: ['C4','E4','G4'], beats: 8 },
      { notes: ['F4','A4','C5'], beats: 8 },
      { notes: ['G4','B4','D5'], beats: 8 },
      { notes: ['C4','E4','G4'], beats: 8 },
    ],
    wave: 'sine',
    arp: false,
  },
  {
    name: 'uplifting',
    bpm: 120,
    progression: [
      { notes: ['C4','E4','G4'], beats: 4 },
      { notes: ['G3','B3','D4'], beats: 4 },
      { notes: ['A3','C4','E4'], beats: 4 },
      { notes: ['F3','A3','C4'], beats: 4 },
    ],
    wave: 'triangle',
    arp: false,
  },
  {
    name: 'corporate',
    bpm: 100,
    progression: [
      { notes: ['C4','E4','G4'], beats: 8 },
      { notes: ['A3','C4','E4'], beats: 8 },
      { notes: ['F3','A3','C4'], beats: 8 },
      { notes: ['G3','B3','D4'], beats: 8 },
    ],
    wave: 'sine',
    arp: false,
  },
  {
    name: 'light-pop',
    bpm: 110,
    progression: [
      { notes: ['C4','E4','G4'], beats: 4 },
      { notes: ['F4','A4','C5'], beats: 4 },
      { notes: ['G4','B4','D5'], beats: 4 },
      { notes: ['C4','E4','G4'], beats: 4 },
    ],
    wave: 'triangle',
    arp: true,
  },
  {
    name: 'cinematic',
    bpm: 90,
    progression: [
      { notes: ['C3','G3','C4'], beats: 12 },
      { notes: ['A2','E3','A3'], beats: 12 },
      { notes: ['F2','C3','F3'], beats: 12 },
      { notes: ['G2','D3','G3'], beats: 12 },
    ],
    wave: 'sine',
    arp: false,
  },
];

function generateWave(type, freq, t) {
  const phase = (t * freq) % 1;
  switch (type) {
    case 'sine': return Math.sin(phase * 2 * Math.PI);
    case 'square': return phase < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * phase - 1;
    case 'triangle': return phase < 0.5 ? (4 * phase - 1) : (3 - 4 * phase);
    default: return Math.sin(phase * 2 * Math.PI);
  }
}

function envelope(t, attack, decay, sustain, release, totalDuration) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < totalDuration - release) return sustain;
  return sustain * ((totalDuration - t) / release);
}

function generateTrack(track) {
  const totalSamples = SAMPLE_RATE * DURATION;
  const data = new Int16Array(totalSamples * CHANNELS);
  const beatDuration = 60 / track.bpm;
  const samplesPerBeat = Math.floor(SAMPLE_RATE * beatDuration);

  // 构建完整和弦序列
  const chordSequence = [];
  const totalBeats = Math.ceil(DURATION / beatDuration);
  let beatIdx = 0;
  while (beatIdx < totalBeats) {
    for (const chord of track.progression) {
      for (let b = 0; b < chord.beats; b++) {
        chordSequence.push(chord.notes);
        beatIdx++;
        if (beatIdx >= totalBeats) break;
      }
      if (beatIdx >= totalBeats) break;
    }
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beatPos = Math.floor(t / beatDuration);
    const notes = chordSequence[Math.min(beatPos, chordSequence.length - 1)] || ['C4'];

    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const freq = NOTES[notes[n]] || 440;
      // arpeggio: 错开时间
      const noteT = track.arp ? t + n * 0.08 : t;
      const env = envelope(noteT % (beatDuration * (track.arp ? 1 : 2)), 0.05, 0.1, 0.6, 0.3, beatDuration * (track.arp ? 1 : 2));
      sample += generateWave(track.wave, freq, noteT) * env * 0.3;
    }

    // 限幅
    sample = Math.max(-1, Math.min(1, sample));
    const intSample = Math.floor(sample * 32767);
    data[i * 2] = intSample;     // L
    data[i * 2 + 1] = intSample; // R
  }

  return data;
}

function writeWav(filename, data) {
  const dataSize = data.length * BYTES_PER_SAMPLE;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, 28);
  buffer.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < data.length; i++) {
    buffer.writeInt16LE(data[i], headerSize + i * BYTES_PER_SAMPLE);
  }

  fs.writeFileSync(filename, buffer);
}

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// 主流程
console.log('开始生成 BGM...');
const hasFF = hasFfmpeg();

for (const track of TRACKS) {
  console.log(`生成: ${track.name} (${track.bpm} BPM, ${track.wave})`);
  const data = generateTrack(track);
  const wavPath = path.join(TARGET_DIR, `${track.name}.wav`);
  writeWav(wavPath, data);

  if (hasFF) {
    const mp3Path = path.join(TARGET_DIR, `${track.name}.mp3`);
    console.log(`  转码为 MP3: ${mp3Path}`);
    execSync(`ffmpeg -y -i "${wavPath}" -b:a 128k "${mp3Path}"`, { stdio: 'ignore' });
    fs.unlinkSync(wavPath); // 删除中间 wav
  } else {
    console.log(`  无 ffmpeg，保持 WAV 格式: ${wavPath}`);
  }
}

console.log(`\n✅ 全部生成完成，输出目录: ${TARGET_DIR}`);
console.log('文件列表:');
for (const f of fs.readdirSync(TARGET_DIR)) {
  const stat = fs.statSync(path.join(TARGET_DIR, f));
  console.log(`  ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
}
