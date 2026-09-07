const fs = require('node:fs');

const MAX_VIDEO_FILES = 10;
const MAX_FILE_MB = Number(process.env.MAX_UPLOAD_FILE_MB) || 1024;
const MAX_TOTAL_MB = Number(process.env.MAX_UPLOAD_TOTAL_MB) || 2048;
const MAX_OVERLAY_MB = Number(process.env.MAX_OVERLAY_FILE_MB) || 20;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function acceptUpload(_request, file, callback) {
  if (file.fieldname === 'ratingOverlays') {
    if (file.mimetype !== 'image/png') {
      const error = new Error('Rating overlays must be PNG images.');
      error.status = 415;
      callback(error);
      return;
    }
    callback(null, true);
    return;
  }

  const accepted = file.mimetype.startsWith('video/')
    || file.mimetype === 'application/octet-stream';
  if (!accepted) {
    const error = new Error('Only video files are accepted.');
    error.status = 415;
    callback(error);
    return;
  }
  callback(null, true);
}

function getUploadLimits() {
  return {
    fileSize: MAX_FILE_MB * 1024 * 1024,
    files: MAX_VIDEO_FILES * 2,
    fields: 4,
    parts: MAX_VIDEO_FILES * 2 + 4,
    fieldNameSize: 100,
    fieldSize: 2 * 1024 * 1024,
    headerPairs: 100,
  };
}

async function hasPngSignature(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(PNG_SIGNATURE.length);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return bytesRead === PNG_SIGNATURE.length && buffer.equals(PNG_SIGNATURE);
  } finally {
    await handle.close();
  }
}

async function validateUploadSet(videoFiles, overlayFiles) {
  const allFiles = [...videoFiles, ...overlayFiles];
  const totalBytes = allFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
    return { status: 413, error: `Combined upload exceeds the ${MAX_TOTAL_MB} MB limit.` };
  }
  for (const overlay of overlayFiles) {
    if (overlay.size > MAX_OVERLAY_MB * 1024 * 1024) {
      return { status: 413, error: `A rating overlay exceeds the ${MAX_OVERLAY_MB} MB limit.` };
    }
    let validPng = false;
    try {
      validPng = await hasPngSignature(overlay.path);
    } catch {
      validPng = false;
    }
    if (!validPng) {
      return { status: 415, error: 'A rating overlay does not contain a valid PNG signature.' };
    }
  }
  return null;
}

module.exports = {
  MAX_VIDEO_FILES,
  acceptUpload,
  getUploadLimits,
  validateUploadSet,
};
