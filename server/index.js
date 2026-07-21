const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

const trimRoute = require('./routes/trim');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log(`[server] FFmpeg binary: ${ffmpegStatic}`);
} else {
  console.warn('[server] ffmpeg-static did not provide a binary path.');
}

const app = express();
const PORT = process.env.PORT || 4000;
const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ffmpegPath: ffmpegStatic || null });
});

app.use('/api/trim', trimRoute);

app.use((err, _req, res, _next) => {
  console.error('[server] Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
