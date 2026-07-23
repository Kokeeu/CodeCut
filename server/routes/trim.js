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

const jobs = new Map();

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
    duration: (c.sourceEnd - c.sourceStart) / (c.speed || 1),
  }));

  const inputPaths = normalizedClips.map((c) => files[c.fileIndex].path);
  const outputName = `composed-${Date.now()}.mp4`;
  const outputPath = path.join(TEMP_DIR, outputName);
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const job = {
    id: jobId,
    status: 'processing',
    progress: 0,
    outputPath,
    outputName,
    inputPaths,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  res.status(202).json({ jobId });

  try {
    await runPipeline({
      inputPaths,
      clips: normalizedClips,
      transitions,
      meta,
      outputPath,
      onProgress: (progress) => {
        job.progress = progress;
      },
    });
    job.status = 'ready';
  } catch (err) {
    job.status = 'error';
    job.error = err.message || String(err);
    safeUnlinkAll([...inputPaths, outputPath]);
  }

  setTimeout(() => {
    const j = jobs.get(jobId);
    if (j && j.status === 'ready') {
      safeUnlink(j.outputPath);
    }
    jobs.delete(jobId);
  }, 5 * 60 * 1000);
});

router.get('/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired.' });
  }
  if (job.status === 'error') {
    return res.status(500).json({ error: job.error || 'Processing failed.' });
  }
  if (job.status !== 'ready') {
    return res.status(202).json({ status: job.status, progress: job.progress });
  }

  res.download(job.outputPath, job.outputName, (err) => {
    safeUnlinkAll([...job.inputPaths, job.outputPath]);
    jobs.delete(job.id);
    if (err && !res.headersSent) {
      console.error('[trim] download error:', err);
    }
  });
});

router.get('/progress/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendUpdate = () => {
    const data = { progress: job.progress, status: job.status };
    if (job.error) data.error = job.error;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendUpdate();

  const interval = setInterval(() => {
    const currentJob = jobs.get(req.params.jobId);
    if (!currentJob) {
      clearInterval(interval);
      res.end();
      return;
    }
    sendUpdate();
    if (currentJob.status === 'ready' || currentJob.status === 'error') {
      clearInterval(interval);
      setTimeout(() => res.end(), 1000);
    }
  }, 200);

  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;
module.exports.OUTPUT_W = OUTPUT_W;
module.exports.OUTPUT_H = OUTPUT_H;
