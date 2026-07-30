const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runPipeline, validateClips, safeUnlink, OUTPUT_W, OUTPUT_H } = require('../lib/ffmpegPipeline');
const { validateInputVideos } = require('../lib/validateInputs');
const { jobQueue } = require('../lib/queue');

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
const ffmpegProcesses = new Map();

function cleanupOldTempFiles() {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    const MAX_AGE_MS = 60 * 60 * 1000;
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > MAX_AGE_MS) {
          safeUnlink(filePath);
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

cleanupOldTempFiles();

router.post('/', upload.array('videos', MAX_FILES), async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'No video files uploaded under field "videos".' });
  }

  let clips;
  let transitions = {};
  let meta = { ...DEFAULT_META };
  let exportConfig = {};
  try {
    clips = JSON.parse(req.body.clips || '[]');
    if (req.body.transitions) transitions = JSON.parse(req.body.transitions);
    if (req.body.meta) meta = { ...meta, ...JSON.parse(req.body.meta) };
    if (req.body.exportConfig) exportConfig = JSON.parse(req.body.exportConfig);
  } catch (e) {
    safeUnlinkAll(files.map((f) => f.path));
    return res.status(400).json({ error: 'Invalid JSON in clips, transitions, meta or exportConfig.' });
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

  try {
    const validation = await validateInputVideos(inputPaths, normalizedClips);
    if (!validation.valid) {
      safeUnlinkAll(files.map((f) => f.path));
      return res.status(400).json({ error: validation.errors.join('; ') });
    }
  } catch (err) {
    safeUnlinkAll(files.map((f) => f.path));
    return res.status(400).json({ error: `Video validation failed: ${err.message}` });
  }

  const outputName = `composed-${Date.now()}.mp4`;
  const outputPath = path.join(TEMP_DIR, outputName);
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const job = {
    id: jobId,
    status: 'queued',
    progress: 0,
    outputPath,
    outputName,
    inputPaths,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  res.status(202).json({ jobId, status: 'queued' });

  jobQueue.enqueue(jobId, async () => {
    job.status = 'processing';
    
    try {
      const pipelinePromise = runPipeline({
        inputPaths,
        clips: normalizedClips,
        transitions,
        meta,
        outputPath,
        exportConfig,
        onProgress: (progress) => {
          job.progress = progress;
        },
      });
      
      pipelinePromise._ffmpegCommand && ffmpegProcesses.set(jobId, () => pipelinePromise._ffmpegCommand._kill());
      
      await pipelinePromise;
      job.status = 'ready';
    } catch (err) {
      job.status = 'error';
      job.error = err.message || String(err);
      safeUnlinkAll([...inputPaths, outputPath]);
    } finally {
      ffmpegProcesses.delete(jobId);
    }
  }).catch((err) => {
    job.status = 'error';
    job.error = err.message || String(err);
    safeUnlinkAll([...inputPaths, outputPath]);
  });

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

  let lastSentProgress = -1;
  let lastSentStatus = null;

  const sendUpdate = () => {
    const progressChanged = Math.abs(job.progress - lastSentProgress) >= 0.005;
    const statusChanged = job.status !== lastSentStatus;
    
    if (progressChanged || statusChanged) {
      const data = { progress: job.progress, status: job.status };
      if (job.error) data.error = job.error;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      lastSentProgress = job.progress;
      lastSentStatus = job.status;
    }
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
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

router.delete('/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }
  
  const killFn = ffmpegProcesses.get(req.params.jobId);
  if (killFn) {
    killFn();
    ffmpegProcesses.delete(req.params.jobId);
  }
  
  if (job.status === 'processing') {
    job.status = 'cancelled';
    safeUnlinkAll([...job.inputPaths, job.outputPath]);
  }
  
  jobs.delete(req.params.jobId);
  res.json({ status: 'cancelled' });
});

module.exports = router;
module.exports.OUTPUT_W = OUTPUT_W;
module.exports.OUTPUT_H = OUTPUT_H;
