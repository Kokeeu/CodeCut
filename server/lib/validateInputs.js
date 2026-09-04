const { getVideoInfo } = require('./videoInfo');

async function validateInputVideos(files, clips) {
  const errors = [];
  const infoCache = new Map();
  const infoByFileIndex = [];

  async function infoFor(file) {
    if (!file || !file.path) throw new Error('Missing file path');
    if (infoCache.has(file.path)) return infoCache.get(file.path);
    const info = await getVideoInfo(file.path);
    infoCache.set(file.path, info);
    return info;
  }

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const file = files[clip.fileIndex];
    if (!file) {
      errors.push(`Clip ${i + 1}: Invalid fileIndex ${clip.fileIndex}`);
      continue;
    }

    try {
      const info = await infoFor(file);
      infoByFileIndex[clip.fileIndex] = info;
      if (info.duration <= 0) {
        errors.push(`Video ${clip.fileIndex + 1}: Duration is 0 or invalid`);
        continue;
      }
      if (info.width === 0 || info.height === 0) {
        errors.push(`Video ${clip.fileIndex + 1}: Invalid dimensions (${info.width}x${info.height})`);
        continue;
      }
      if (clip.sourceEnd > info.duration + 0.05) {
        errors.push(`Clip ${i + 1}: sourceEnd (${clip.sourceEnd}s) exceeds duration (${info.duration.toFixed(2)}s)`);
      }
      if (clip.sourceStart >= clip.sourceEnd) {
        errors.push(`Clip ${i + 1}: sourceStart (${clip.sourceStart}s) must be less than sourceEnd (${clip.sourceEnd}s)`);
      }
    } catch (err) {
      errors.push(`Video ${clip.fileIndex + 1}: Failed to probe - ${err.message}`);
    }

    const pip = clip.pip;
    if (pip && pip.enabled && typeof pip.fileIndex === 'number') {
      const pipFile = files[pip.fileIndex];
      if (!pipFile) {
        errors.push(`Clip ${i + 1}: Invalid PIP fileIndex ${pip.fileIndex}`);
      } else {
        try {
          const pipInfo = await infoFor(pipFile);
          infoByFileIndex[pip.fileIndex] = pipInfo;
          if (pipInfo.duration <= 0 || pipInfo.width === 0) {
            errors.push(`Clip ${i + 1}: PIP source is not a valid video`);
          }
        } catch (err) {
          errors.push(`Clip ${i + 1}: PIP probe failed - ${err.message}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, infoByFileIndex };
  }

  return { valid: true, errors: [], infoByFileIndex };
}

module.exports = { validateInputVideos };
