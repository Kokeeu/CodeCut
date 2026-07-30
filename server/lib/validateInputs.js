const { getVideoInfo } = require('./videoInfo');

async function validateInputVideos(inputPaths, clips) {
  const errors = [];

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    
    try {
      const info = await getVideoInfo(inputPath);
      
      if (info.duration <= 0) {
        errors.push(`Video ${i + 1}: Duration is 0 or invalid`);
        continue;
      }

      if (info.width === 0 || info.height === 0) {
        errors.push(`Video ${i + 1}: Invalid dimensions (${info.width}x${info.height})`);
        continue;
      }

      const clipsUsingThisFile = clips.filter(c => c.fileIndex === i);
      for (const clip of clipsUsingThisFile) {
        if (clip.sourceEnd > info.duration) {
          errors.push(`Video ${i + 1}: sourceEnd (${clip.sourceEnd}s) exceeds duration (${info.duration}s)`);
        }
        if (clip.sourceStart >= clip.sourceEnd) {
          errors.push(`Video ${i + 1}: sourceStart (${clip.sourceStart}s) must be less than sourceEnd (${clip.sourceEnd}s)`);
        }
      }

    } catch (err) {
      errors.push(`Video ${i + 1}: Failed to probe - ${err.message}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

module.exports = { validateInputVideos };
