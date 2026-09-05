const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runPipeline, validateClips, safeUnlink, collectPipInputs, OUTPUT_W, OUTPUT_H } = require('../lib/ffmpegPipeline');
const { validateInputVideos } = require('../lib/validateInputs');
const { jobQueue } = require('../lib/queue');
const { setJob, getJob, updateJob, deleteJob, jobCancelers, expireJobLater } = require('../lib/jobs');

const router = express.Router();

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const MAX_FILES = 10;
const MAX_SIZE_MB = 1024;

const upload = multer({
  dest: TEMP_DIR,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: MAX_FILES * 2,
  },
});

function safeUnlinkAll(paths) {
  [...new Set((paths || []).filter(Boolean))].forEach((p) => safeUnlink(p));
}

const DEFAULT_META = {
  blur: 30,
  blurEnabled: true,
};

router.post('/', upload.fields([
  { name: 'videos', maxCount: MAX_FILES },
  { name: 'ratingOverlays', maxCount: MAX_FILES },
]), async (req, res) => {
  const files = req.files?.videos || [];
  const ratingOverlayFiles = req.files?.ratingOverlays || [];
  const uploadedFiles = [...files, ...ratingOverlayFiles];
  if (files.length === 0) {
    safeUnlinkAll(uploadedFiles.map((f) => f.path));
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
    safeUnlinkAll(uploadedFiles.map((f) => f.path));
    return res.status(400).json({ error: 'Invalid JSON in clips, transitions, meta or exportConfig.' });
  }

  const validationError = validateClips(clips);
  if (validationError) {
    safeUnlinkAll(uploadedFiles.map((f) => f.path));
    return res.status(400).json({ error: validationError });
  }

  for (const clip of clips) {
    if (typeof clip.fileIndex !== 'number' || clip.fileIndex < 0 || clip.fileIndex >= files.length) {
      safeUnlinkAll(uploadedFiles.map((f) => f.path));
      return res.status(400).json({ error: `Invalid fileIndex ${clip.fileIndex} for clip ${clip.id}.` });
    }
    if (clip.pip && clip.pip.enabled && typeof clip.pip.fileIndex === 'number') {
      if (clip.pip.fileIndex < 0 || clip.pip.fileIndex >= files.length) {
        safeUnlinkAll(uploadedFiles.map((f) => f.path));
        return res.status(400).json({ error: `Invalid PIP fileIndex ${clip.pip.fileIndex} for clip ${clip.id}.` });
      }
    }
  }

  const normalizedClips = clips.map((c) => ({
    ...c,
    duration: (c.sourceEnd - c.sourceStart) / (c.speed || 1),
  }));

  let infoByFileIndex = [];
  try {
    const validation = await validateInputVideos(files, normalizedClips);
    if (!validation.valid) {
      safeUnlinkAll(uploadedFiles.map((f) => f.path));
      return res.status(400).json({ error: validation.errors.join('; ') });
    }
    infoByFileIndex = validation.infoByFileIndex || [];
  } catch (err) {
    safeUnlinkAll(uploadedFiles.map((f) => f.path));
    return res.status(400).json({ error: `Video validation failed: ${err.message}` });
  }

  const pipelineClips = normalizedClips.map((c) => ({
    ...c,
    hasAudio: infoByFileIndex[c.fileIndex]?.hasAudio !== false,
  }));
  const clipPaths = pipelineClips.map((c) => files[c.fileIndex].path);
  const { extraPaths, pipInputIndexByClip } = collectPipInputs(pipelineClips, files);
  const ratingOverlayInputIndexByClip = {};
  const ratingOverlayPaths = [];
  let nextRatingInputIndex = clipPaths.length + extraPaths.length;
  pipelineClips.forEach((clip, index) => {
    if (!Number.isInteger(clip.ratingOverlayFileIndex)) return;
    const overlayFile = ratingOverlayFiles[clip.ratingOverlayFileIndex];
    if (!overlayFile) return;
    ratingOverlayInputIndexByClip[index] = nextRatingInputIndex;
    ratingOverlayPaths.push(overlayFile.path);
    nextRatingInputIndex += 1;
  });
  const inputPaths = [...clipPaths, ...extraPaths, ...ratingOverlayPaths];

  const outputName = `composed-${Date.now()}.mp4`;
  const outputPath = path.join(TEMP_DIR, outputName);
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  setJob({
    id: jobId,
    status: 'queued',
    progress: 0,
    outputPath,
    outputName,
    inputPaths,
    cleanupPaths: [...inputPaths, outputPath],
    createdAt: Date.now(),
  });

  res.status(202).json({ jobId, status: 'queued' });

  jobQueue.enqueue(jobId, async () => {
    if (!getJob(jobId) || getJob(jobId).status === 'cancelled') return;
    updateJob(jobId, { status: 'processing', progress: 0 });

    try {
      const pipelinePromise = runPipeline({
        inputPaths,
        clips: pipelineClips,
        transitions,
        meta,
        outputPath,
        exportConfig,
        pipInputIndexByClip,
        ratingOverlayInputIndexByClip,
        onProgress: (progress) => {
          updateJob(jobId, { progress });
        },
      });

      jobCancelers.set(jobId, () => {
        if (pipelinePromise._kill) pipelinePromise._kill();
      });

      await pipelinePromise;
      updateJob(jobId, { status: 'ready', progress: 1 });
      expireJobLater(jobId);
    } catch (err) {
      updateJob(jobId, { status: 'error', error: err.message || String(err) });
      safeUnlinkAll([...inputPaths, outputPath]);
      expireJobLater(jobId);
    } finally {
      jobCancelers.delete(jobId);
    }
  }, { priority: 10 }).catch((err) => {
    if (!getJob(jobId) || getJob(jobId).status === 'cancelled') return;
    updateJob(jobId, { status: 'error', error: err.message || String(err) });
    safeUnlinkAll([...inputPaths, outputPath]);
    expireJobLater(jobId);
  });
});

router.get('/download/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
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
    safeUnlinkAll([...(job.inputPaths || []), job.outputPath]);
    deleteJob(job.id);
    if (err && !res.headersSent) {
      console.error('[trim] download error:', err);
    }
  });
});

router.get('/progress/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
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
    const current = getJob(req.params.jobId);
    if (!current) return false;
    const progressChanged = Math.abs((current.progress || 0) - lastSentProgress) >= 0.005;
    const statusChanged = current.status !== lastSentStatus;

    if (progressChanged || statusChanged) {
      const data = { progress: current.progress, status: current.status };
      if (current.error) data.error = current.error;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      lastSentProgress = current.progress;
      lastSentStatus = current.status;
    }
    return current.status === 'ready' || current.status === 'error' || current.status === 'cancelled';
  };

  sendUpdate();

  const interval = setInterval(() => {
    const current = getJob(req.params.jobId);
    if (!current) {
      clearInterval(interval);
      res.end();
      return;
    }
    const done = sendUpdate();
    if (done) {
      clearInterval(interval);
      setTimeout(() => res.end(), 1000);
    }
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

router.delete('/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  const removedFromQueue = jobQueue.cancel(req.params.jobId);
  const killFn = jobCancelers.get(req.params.jobId);
  if (killFn) {
    killFn();
    jobCancelers.delete(req.params.jobId);
  }

  if (job.status === 'processing' || job.status === 'queued' || removedFromQueue) {
    safeUnlinkAll([...(job.inputPaths || []), job.outputPath]);
  }

  deleteJob(req.params.jobId);
  res.json({ status: 'cancelled' });
});

module.exports = router;
module.exports.OUTPUT_W = OUTPUT_W;
module.exports.OUTPUT_H = OUTPUT_H;
