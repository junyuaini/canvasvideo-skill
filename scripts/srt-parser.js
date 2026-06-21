/**
 * SRT 字幕解析器
 * 将标准 SRT 格式转换为 project.json 的 subtitles 数组
 *
 * 用法：
 *   const { parseSrt } = require('./scripts/srt-parser');
 *   const subtitles = parseSrt('/path/to/file.srt');
 */

const fs = require('fs');

/**
 * 将 SRT 时间戳转换为秒数
 * @param {string} timeStr - 格式: "00:00:02,366" 或 "00:00:02.366"
 * @returns {number} 秒数，保留 3 位小数
 */
function timeToSeconds(timeStr) {
  // 统一逗号为点号（SRT 标准用逗号，但有些文件用点号）
  const normalized = timeStr.trim().replace(',', '.');
  const parts = normalized.split(':');

  if (parts.length !== 3) {
    throw new Error(`Invalid SRT time format: "${timeStr}"`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);

  const total = hours * 3600 + minutes * 60 + seconds;
  return Math.round(total * 1000) / 1000; // 保留 3 位小数
}

/**
 * 解析 SRT 文件内容
 * @param {string} content - SRT 文件完整内容
 * @returns {Array<{start: number, end: number, text: string}>}
 */
function parseSrtContent(content) {
  const subtitles = [];

  // 按空行分割条目（兼容 \n\n 和 \r\n\r\n）
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) continue;

    // 第一行是序号（可选，有些 SRT 可能没有序号行）
    let lineIndex = 0;
    if (/^\d+$/.test(lines[0])) {
      lineIndex = 1; // 跳过序号行
    }

    // 时间轴行: "00:00:00,000 --> 00:00:02,366"
    const timeLine = lines[lineIndex];
    const timeMatch = timeLine.match(
      /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*$/
    );

    if (!timeMatch) {
      // 如果时间轴格式不匹配，可能是没有序号的格式，尝试下一行
      if (lineIndex === 0 && lines.length > 1) {
        const altMatch = lines[1].match(
          /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*$/
        );
        if (altMatch) {
          // 重新解析
          const start = timeToSeconds(altMatch[1]);
          const end = timeToSeconds(altMatch[2]);
          const text = lines.slice(2).join('\n');
          if (text) {
            subtitles.push({ start, end, text });
          }
          continue;
        }
      }
      throw new Error(`Invalid SRT time line: "${timeLine}"`);
    }

    const start = timeToSeconds(timeMatch[1]);
    const end = timeToSeconds(timeMatch[2]);

    // 剩余行是字幕文本（可能有多行）
    const text = lines.slice(lineIndex + 1).join('\n');

    if (text) {
      subtitles.push({ start, end, text });
    }
  }

  return subtitles;
}

/**
 * 读取并解析 SRT 文件
 * @param {string} filePath - SRT 文件路径
 * @returns {Array<{start: number, end: number, text: string}>}
 */
function parseSrt(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SRT file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return parseSrtContent(content);
}

module.exports = {
  parseSrt,
  parseSrtContent,
  timeToSeconds
};
