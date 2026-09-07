const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { safeUnlink, OUTPUT_W, OUTPUT_H } = require('../lib/ffmpegPipeline');
const {
  MAX_VIDEO_FILES,
  acceptUpload,
  getUploadLimits,
  validateUploadSet,
} = require('../lib/uploadPolicy');
const { jobQueue } = require('../lib/queue');
const {
  getJob,
  deleteJob,
  jobCancelers,
  subscribeToJob,
  toPublic,
} = require('../lib/jobs');
const { parseExportRequest } = require('../lib/exportRequest');
const { startExport } = require('../services/exportService');

const router = express.Router();

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const upload = multer({
  dest: TEMP_DIR,
  limits: getUploadLimits(),
  fileFilter: acceptUpload,
});

function safeUnlinkAll(paths) {
  [...new Set((paths || []).filter(Boolean))].forEach((p) => safeUnlink(p));
}

router.post('/', upload.fields([
  { name: 'videos', maxCount: MAX_VIDEO_FILES },
  { name: 'ratingOverlays', maxCount: MAX_VIDEO_FILES },
]), async (req, res) => {
  const files = req.files?.videos || [];
  const ratingOverlayFiles = req.files?.ratingOverlays || [];
  const uploadedFiles = [...files, ...ratingOverlayFiles];
  if (files.length === 0) {
    safeUnlinkAll(uploadedFiles.map((f) => f.path));
    return res.status(400).json({ error: 'No video files uploaded under field "videos".' });
  }

  const uploadError = await validateUploadSet(files, ratingOverlayFiles);
  if (uploadError) {
    safeUnlinkAll(uploadedFiles.map((file) => file.path));
    return res.status(uploadError.status).json({ error: uploadError.error });
  }

  try {
    const request = parseExportRequest(req.body, files.length, ratingOverlayFiles.length);
    const result = await startExport({ files, ratingOverlayFiles, request });
    return res.status(202).json(result);
  } catch (error) {
    safeUnlinkAll(uploadedFiles.map((f) => f.path));
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
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
    safeUnlinkAll(job.cleanupPaths || [...(job.inputPaths || []), job.outputPath]);
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

  let closed = false;
  let endTimer = null;
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15000);
  let unsubscribe = () => {};

  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    if (endTimer) clearTimeout(endTimer);
    unsubscribe();
    res.end();
  };

  const sendUpdate = (current) => {
    if (!current) {
      close();
      return;
    }
    res.write(`data: ${JSON.stringify(current)}\n\n`);
    if (['ready', 'error', 'cancelled'].includes(current.status)) {
      endTimer = setTimeout(close, 250);
    }
  };

  unsubscribe = subscribeToJob(req.params.jobId, sendUpdate);
  sendUpdate(toPublic(job));
  req.on('close', close);
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
    safeUnlinkAll(job.cleanupPaths || [...(job.inputPaths || []), job.outputPath]);
  }

  deleteJob(req.params.jobId);
  res.json({ status: 'cancelled' });
});

router.use((error, req, res, next) => {
  const partialFiles = Object.values(req.files || {}).flat();
  safeUnlinkAll(partialFiles.map((file) => file.path));
  if (error instanceof multer.MulterError) {
    const tooLarge = ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_PART_COUNT', 'LIMIT_FIELD_VALUE'].includes(error.code);
    return res.status(tooLarge ? 413 : 400).json({ error: error.message });
  }
  if (error.status) return res.status(error.status).json({ error: error.message });
  return next(error);
});

module.exports = router;
module.exports.OUTPUT_W = OUTPUT_W;
module.exports.OUTPUT_H = OUTPUT_H;
