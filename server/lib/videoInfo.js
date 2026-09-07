const fs = require('node:fs');
const { execFile } = require('node:child_process');
const ffprobeStatic = require('ffprobe-static');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getCacheKey(filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    return `${filePath}:${stat.size}:${stat.mtimeMs}`;
  } catch {
    return filePath;
  }
}

function parseFrameRate(value) {
  const [numerator, denominator = '1'] = String(value || '0').split('/');
  const divisor = Number(denominator);
  const rate = divisor ? Number(numerator) / divisor : 0;
  return Number.isFinite(rate) ? rate : 0;
}

function probe(filePath) {
  if (!ffprobeStatic?.path) return Promise.reject(new Error('FFprobe binary is not available.'));
  return new Promise((resolve, reject) => {
    execFile(ffprobeStatic.path, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ], { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(new Error(`FFprobe returned invalid metadata: ${parseError.message}`));
      }
    });
  });
}

async function getVideoInfo(filePath) {
  const cacheKey = await getCacheKey(filePath);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  if (cached) cache.delete(cacheKey);

  const metadata = await probe(filePath);
  const videoStream = metadata.streams?.find((stream) => stream.codec_type === 'video');
  const audioStream = metadata.streams?.find((stream) => stream.codec_type === 'audio');
  const data = {
    duration: Number(metadata.format?.duration) || 0,
    width: videoStream?.width || 0,
    height: videoStream?.height || 0,
    fps: parseFrameRate(videoStream?.r_frame_rate),
    codec: videoStream?.codec_name || 'unknown',
    hasAudio: Boolean(audioStream),
    audioCodec: audioStream?.codec_name || 'unknown',
    audioSampleRate: Number(audioStream?.sample_rate) || 0,
    audioChannels: Number(audioStream?.channels) || 0,
    audioChannelLayout: audioStream?.channel_layout || 'unknown',
    bitrate: Number(metadata.format?.bit_rate) || 0,
  };
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

function clearCache() {
  cache.clear();
}

module.exports = { getVideoInfo, clearCache, parseFrameRate };
