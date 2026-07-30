const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

if (ffprobeStatic) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(filePath) {
  const fs = require('fs');
  try {
    const stat = fs.statSync(filePath);
    return `${filePath}:${stat.size}:${stat.mtimeMs}`;
  } catch {
    return filePath;
  }
}

function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    const cacheKey = getCacheKey(filePath);
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return resolve(cached.data);
      }
      cache.delete(cacheKey);
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      const data = {
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 0,
        codec: videoStream?.codec_name || 'unknown',
        audioCodec: audioStream?.codec_name || 'unknown',
        bitrate: metadata.format.bit_rate || 0,
      };

      cache.set(cacheKey, { data, timestamp: Date.now() });
      resolve(data);
    });
  });
}

function clearCache() {
  cache.clear();
}

module.exports = { getVideoInfo, clearCache };
