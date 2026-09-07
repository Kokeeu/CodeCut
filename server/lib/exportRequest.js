const { SPEED_OPTIONS } = require('./speed');

class ExportRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ExportRequestError';
    this.status = status;
  }
}

function parseField(body, name, fallback) {
  if (!body[name]) return fallback;
  try {
    return JSON.parse(body[name]);
  } catch {
    throw new ExportRequestError(`Invalid JSON in ${name}.`);
  }
}

function validateClips(clips) {
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new ExportRequestError('At least one clip is required.');
  }
  clips.forEach((clip, index) => {
    if (!clip || typeof clip !== 'object') {
      throw new ExportRequestError(`Clip ${index} must be an object.`);
    }
    if (!Number.isFinite(clip.sourceStart) || !Number.isFinite(clip.sourceEnd)) {
      throw new ExportRequestError(`Clip ${index}: sourceStart and sourceEnd must be finite numbers.`);
    }
    if (clip.sourceStart < 0) {
      throw new ExportRequestError(`Clip ${index}: sourceStart must be >= 0.`);
    }
    if (clip.sourceEnd <= clip.sourceStart) {
      throw new ExportRequestError(`Clip ${index}: sourceEnd must be greater than sourceStart.`);
    }
    const speed = clip.speed == null ? 1 : Number(clip.speed);
    if (!SPEED_OPTIONS.includes(speed)) {
      throw new ExportRequestError(`Clip ${index}: unsupported speed ${clip.speed}.`);
    }
  });
}

function validateFileReferences(clips, fileCount, ratingOverlayFileCount = 0) {
  clips.forEach((clip) => {
    if (!Number.isInteger(clip.fileIndex) || clip.fileIndex < 0 || clip.fileIndex >= fileCount) {
      throw new ExportRequestError(`Invalid fileIndex ${clip.fileIndex} for clip ${clip.id}.`);
    }
    if (clip.pip?.enabled) {
      if (!Number.isInteger(clip.pip.fileIndex) || clip.pip.fileIndex < 0 || clip.pip.fileIndex >= fileCount) {
        throw new ExportRequestError(`Invalid PIP fileIndex ${clip.pip.fileIndex} for clip ${clip.id}.`);
      }
    }
    if (clip.ratingOverlayFileIndex != null) {
      if (!Number.isInteger(clip.ratingOverlayFileIndex)
        || clip.ratingOverlayFileIndex < 0
        || clip.ratingOverlayFileIndex >= ratingOverlayFileCount) {
        throw new ExportRequestError(`Invalid rating overlay fileIndex ${clip.ratingOverlayFileIndex} for clip ${clip.id}.`);
      }
    }
  });
}

function parseExportRequest(body, fileCount, ratingOverlayFileCount = 0) {
  const clips = parseField(body, 'clips', []);
  const transitions = parseField(body, 'transitions', {});
  const meta = { blur: 30, blurEnabled: true, ...parseField(body, 'meta', {}) };
  const exportConfig = parseField(body, 'exportConfig', {});
  validateClips(clips);
  validateFileReferences(clips, fileCount, ratingOverlayFileCount);
  if (!transitions || typeof transitions !== 'object' || Array.isArray(transitions)) {
    throw new ExportRequestError('Transitions must be an object keyed by adjacent clip IDs.');
  }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    throw new ExportRequestError('Meta must be an object.');
  }
  if (!exportConfig || typeof exportConfig !== 'object' || Array.isArray(exportConfig)) {
    throw new ExportRequestError('Export config must be an object.');
  }
  return { clips, transitions, meta, exportConfig };
}

module.exports = {
  ExportRequestError,
  parseExportRequest,
  validateClips,
  validateFileReferences,
};
