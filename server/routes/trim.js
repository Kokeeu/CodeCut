const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runPipeline, validateClips, safeUnlink, OUTPUT_W, OUTPUT_H } = require('../lib/ffmpegPipeline');

const router = express.Router();

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const MAX_FILES = 10;
const MAX_SIZE_MB = 500;

const upload = multer({
  dest: TEMP_DIR,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: MAX_FILES,
  },
});

function safeUnlinkAll(paths) {
  paths.forEach((p) => safeUnlink(p));
}

const DEFAULT_META = {
  blur: 30,
  blurEnabled: true,
};

router.post('/', upload.array('videos', MAX_FILES), async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'No video files uploaded under field "videos".' });
  }

  let clips;
  let transitions = {};
  let meta = { ...DEFAULT_META };
  try {
    clips = JSON.parse(req.body.clips || '[]');
    if (req.body.transitions) transitions = JSON.parse(req.body.transitions);
    if (req.body.meta) meta = { ...meta, ...JSON.parse(req.body.meta) };
  } catch (e) {
    safeUnlinkAll(files.map((f) => f.path));
    return res.status(400).json({ error: 'Invalid JSON in clips, transitions or meta.' });
  }

  const validationError = validateClips(clips);
  if (validationError) {
    safeUnlinkAll(files.map((f) => f.path));
    return res.status(400).json({ error: validationError });
  }

  for (const clip of clips) {
    if (typeof clip.fileIndex !== 'number' || clip.fileIndex < 0 || clip.fileIndex >= files.length) {
      safeUnlinkAll(files.map((f) => f.path));
      return res.status(400).json({ error: `Invalid fileIndex ${clip.fileIndex} for clip ${clip.id}.` });
    }
  }

  const normalizedClips = clips.map((c) => ({
    ...c,
    duration: c.sourceEnd - c.sourceStart,
  }));

  const inputPaths = normalizedClips.map((c) => files[c.fileIndex].path);
  const outputName = `composed-${Date.now()}.mp4`;
  const outputPath = path.join(TEMP_DIR, outputName);

  try {
    await runPipeline({
      inputPaths,
      clips: normalizedClips,
      transitions,
      meta,
      outputPath,
    });
  } catch (err) {
    safeUnlinkAll([...files.map((f) => f.path), outputPath]);
    if (!res.headersSent) {
      return res.status(500).json({ error: `FFmpeg failed: ${err.message || String(err)}` });
    }
    return;
  }

  res.download(outputPath, outputName, (err) => {
    safeUnlinkAll([...files.map((f) => f.path), outputPath]);
    if (err && !res.headersSent) {
      console.error('[trim] download error:', err);
    }
  });
});

module.exports = router;
module.exports.OUTPUT_W = OUTPUT_W;
module.exports.OUTPUT_H = OUTPUT_H;
