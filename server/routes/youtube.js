const express = require('express');
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
const { jobQueue } = require('../lib/queue');
const {
  setJob,
  getJob,
  updateJob,
  deleteJob,
  jobCancelers,
  expireJobLater,
  cleanupJobFiles,
  toPublic,
} = require('../lib/jobs');
const youtubeDownloader = require('../lib/youtubeDownloader');

const YOUTUBE_TEMP_DIR = path.join(__dirname, '..', 'temp', 'youtube');
const { MAX_YOUTUBE_FILE_BYTES } = youtubeDownloader;

function createYouTubeRouter({
  runDownload = youtubeDownloader.runYouTubeDownload,
  getHealth = youtubeDownloader.getYtDlpHealth,
  validateUrls = youtubeDownloader.validateYouTubeUrls,
  normalizeHeight = youtubeDownloader.normalizeMaxHeight,
  queue = jobQueue,
  ffmpegPath = ffmpegStatic,
} = {}) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    const health = getHealth();
    res.status(health.available ? 200 : 503).json({
      available: health.available,
      version: health.version || null,
      error: health.available ? null : health.error || 'yt-dlp is not installed. Run npm run setup:ytdlp in the server directory.',
    });
  });

  router.post('/imports', (req, res) => {
    const health = getHealth();
    if (!health.available || !health.path) {
      return res.status(503).json({ error: health.error || 'yt-dlp is not available. Run npm run setup:ytdlp in the server directory.' });
    }
    if (!ffmpegPath) return res.status(503).json({ error: 'FFmpeg is not available.' });

    let urls;
    let maxHeight;
    try {
      urls = validateUrls(req.body?.urls);
      maxHeight = normalizeHeight(req.body?.maxHeight ?? 1080);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    fs.mkdirSync(YOUTUBE_TEMP_DIR, { recursive: true });
    const batchId = `yt-batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdJobs = urls.map((sourceUrl, index) => {
      const id = `yt-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
      const workDir = path.join(YOUTUBE_TEMP_DIR, id);
      const job = setJob({
        id,
        kind: 'youtube',
        batchId,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        sourceUrl,
        maxHeight,
        workDir,
        cleanupPaths: [workDir],
        createdAt: Date.now(),
      });
      return job;
    });

    res.status(202).json({
      batchId,
      jobs: createdJobs.map((job) => ({ id: job.id, sourceUrl: job.sourceUrl, status: job.status })),
    });

    createdJobs.forEach((job) => {
      queue.enqueue(job.id, async () => {
        const current = getJob(job.id);
        if (!current || current.status === 'cancelled') return;
        updateJob(job.id, { status: 'downloading', stage: 'downloading', progress: 0 });
        try {
          const task = runDownload({
            binaryPath: health.path,
            url: job.sourceUrl,
            maxHeight,
            workDir: job.workDir,
            ffmpegPath,
            onUpdate: (patch) => {
              const active = getJob(job.id);
              if (active && !['cancelled', 'error', 'ready'].includes(active.status)) updateJob(job.id, patch);
            },
          });
          jobCancelers.set(job.id, () => task.cancel?.());
          const result = await task;
          if (getJob(job.id)?.status === 'cancelled') {
            cleanupJobFiles(job);
            return;
          }
          const actualSize = fs.statSync(result.outputPath).size;
          if (actualSize > MAX_YOUTUBE_FILE_BYTES) {
            throw new Error('The selected quality exceeds the 1 GB file limit. Choose a lower quality.');
          }
          updateJob(job.id, {
            status: 'ready',
            stage: 'ready',
            progress: 1,
            outputPath: result.outputPath,
            outputName: result.outputName,
            title: result.title,
            mimeType: result.mimeType,
            size: actualSize,
          });
          expireJobLater(job.id);
        } catch (error) {
          const active = getJob(job.id);
          cleanupJobFiles(active || job);
          if (!active || active.status === 'cancelled') return;
          updateJob(job.id, { status: 'error', stage: 'error', error: error.message || String(error) });
          expireJobLater(job.id);
        } finally {
          jobCancelers.delete(job.id);
        }
      }, { priority: 0 }).catch((error) => {
        const active = getJob(job.id);
        if (!active || active.status === 'cancelled') return;
        cleanupJobFiles(active);
        updateJob(job.id, { status: 'error', stage: 'error', error: error.message || String(error) });
        expireJobLater(job.id);
      });
    });
  });

  router.get('/imports/:id/progress', (req, res) => {
    const job = getJob(req.params.id);
    if (!job || job.kind !== 'youtube') return res.status(404).json({ error: 'Import job not found or expired.' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let lastPayload = '';
    const sendUpdate = () => {
      const current = getJob(req.params.id);
      if (!current) return true;
      const data = toPublic(current);
      const payload = JSON.stringify(data);
      if (payload !== lastPayload) {
        res.write(`data: ${payload}\n\n`);
        lastPayload = payload;
      }
      return ['ready', 'error', 'cancelled'].includes(current.status);
    };

    const finished = sendUpdate();
    if (finished) {
      setTimeout(() => res.end(), 250);
      return;
    }
    const interval = setInterval(() => {
      const done = sendUpdate();
      if (done) {
        clearInterval(interval);
        setTimeout(() => res.end(), 250);
      }
    }, 400);
    req.on('close', () => clearInterval(interval));
  });

  router.get('/imports/:id/file', (req, res) => {
    const job = getJob(req.params.id);
    if (!job || job.kind !== 'youtube') return res.status(404).json({ error: 'Import job not found or expired.' });
    if (job.status === 'error') return res.status(500).json({ error: job.error || 'Import failed.' });
    if (job.status !== 'ready') return res.status(202).json(toPublic(job));
    if (!job.outputPath || !fs.existsSync(job.outputPath)) return res.status(410).json({ error: 'The downloaded file is no longer available.' });

    res.setHeader('X-Codecut-Filename', encodeURIComponent(job.outputName || 'youtube-video.mp4'));
    res.type(job.mimeType || 'application/octet-stream');
    res.download(job.outputPath, job.outputName, (error) => {
      cleanupJobFiles(job);
      deleteJob(job.id);
      if (error && !res.headersSent) res.status(500).json({ error: 'Could not transfer the downloaded video.' });
    });
  });

  router.delete('/imports/:id', (req, res) => {
    const job = getJob(req.params.id);
    if (!job || job.kind !== 'youtube') return res.status(404).json({ error: 'Import job not found.' });
    queue.cancel(job.id);
    const cancel = jobCancelers.get(job.id);
    if (cancel) cancel();
    jobCancelers.delete(job.id);
    updateJob(job.id, { status: 'cancelled', stage: 'cancelled', error: null });
    cleanupJobFiles(job);
    expireJobLater(job.id);
    res.json({ id: job.id, status: 'cancelled' });
  });

  return router;
}

const router = createYouTubeRouter();

module.exports = router;
module.exports.createYouTubeRouter = createYouTubeRouter;
