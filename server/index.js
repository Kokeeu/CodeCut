const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

const trimRoute = require('./routes/trim');
const youtubeRoute = require('./routes/youtube');
const { startCleanupCron } = require('./lib/cron');

if (ffmpegStatic) {
  console.log(`[server] FFmpeg binary: ${ffmpegStatic}`);
} else {
  console.warn('[server] ffmpeg-static did not provide a binary path.');
}

if (ffprobeStatic) {
  console.log(`[server] FFprobe binary: ${ffprobeStatic.path}`);
} else {
  console.warn('[server] ffprobe-static did not provide a binary path.');
}

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';
const TEMP_DIR = path.join(__dirname, 'temp');
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error('Origin is not allowed.');
    error.status = 403;
    callback(error);
  },
  exposedHeaders: ['Content-Disposition', 'X-Codecut-Filename'],
}));
app.use(compression({
  filter: (req, res) => {
    if (req.path.includes('/progress/')) return false;
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ffmpegPath: ffmpegStatic || null });
});

app.use('/api/trim', trimRoute);
app.use('/api/youtube', youtubeRoute);

app.use((err, _req, res, _next) => {
  if (!err.status || err.status >= 500) console.error('[server] Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] Listening on http://${HOST}:${PORT}`);
  startCleanupCron();
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, stopping new requests...`);
  server.close(() => process.exit(0));
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref?.();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
