const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const MAX_YOUTUBE_URLS = 10;
const MAX_YOUTUBE_FILE_BYTES = 1024 * 1024 * 1024;
const ALLOWED_HEIGHTS = new Set([720, 1080, 1440, 2160]);
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);
const NOCOOKIE_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);

function extractVideoId(input) {
  let url;
  try {
    url = new URL(String(input || '').trim());
  } catch (_) {
    throw new Error('Invalid URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Only public HTTPS YouTube URLs are allowed.');
  }

  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1) id = parts[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    const pathMatch = url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)\/?$/);
    if (!id && pathMatch) id = pathMatch[1];
  } else if (NOCOOKIE_HOSTS.has(host)) {
    const pathMatch = url.pathname.match(/^\/embed\/([^/]+)\/?$/);
    if (pathMatch) id = pathMatch[1];
  } else {
    throw new Error('Only YouTube video URLs are allowed.');
  }

  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    throw new Error('The URL does not identify an individual YouTube video.');
  }
  return id;
}

function normalizeYouTubeUrl(input) {
  return `https://www.youtube.com/watch?v=${extractVideoId(input)}`;
}

function validateYouTubeUrls(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error('Provide at least one YouTube URL.');
  if (inputs.length > MAX_YOUTUBE_URLS) throw new Error(`A maximum of ${MAX_YOUTUBE_URLS} videos can be imported at once.`);
  const seen = new Set();
  const urls = [];
  inputs.forEach((input, index) => {
    try {
      const normalized = normalizeYouTubeUrl(input);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        urls.push(normalized);
      }
    } catch (error) {
      throw new Error(`URL ${index + 1}: ${error.message}`);
    }
  });
  return urls;
}

function normalizeMaxHeight(value) {
  const height = Number(value);
  if (!ALLOWED_HEIGHTS.has(height)) throw new Error('maxHeight must be 720, 1080, 1440 or 2160.');
  return height;
}

function parseProgressLine(line) {
  const match = String(line || '').match(/CODECUT_PROGRESS:\s*([\d.]+)%/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value / 100));
}

function parseTaggedJson(line, tag) {
  const prefix = `${tag}:`;
  const index = String(line || '').indexOf(prefix);
  if (index < 0) return null;
  try {
    return JSON.parse(String(line).slice(index + prefix.length));
  } catch (_) {
    return null;
  }
}

function localYtDlpPath() {
  return path.join(__dirname, '..', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
}

function resolveYtDlpPath() {
  if (process.env.YT_DLP_PATH) {
    const configured = path.resolve(process.env.YT_DLP_PATH);
    return fs.existsSync(configured) ? configured : null;
  }
  const local = localYtDlpPath();
  return fs.existsSync(local) ? local : null;
}

function getYtDlpHealth() {
  const binaryPath = resolveYtDlpPath();
  if (!binaryPath) return { available: false, version: null };
  const result = spawnSync(binaryPath, ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    return { available: false, version: null, error: result.error?.message || String(result.stderr || '').trim() };
  }
  return { available: true, version: String(result.stdout || '').trim(), path: binaryPath };
}

function buildYtDlpArgs({ url, maxHeight, workDir, ffmpegPath }) {
  return [
    '--ignore-config',
    '--no-playlist',
    '--no-write-playlist-metafiles',
    '--no-simulate',
    '--newline',
    '--progress',
    '--color', 'never',
    '--progress-delta', '0.25',
    '--max-filesize', '1G',
    '--format-sort', `res:${normalizeMaxHeight(maxHeight)}`,
    '--merge-output-format', 'mp4/webm',
    '--match-filter', '!is_live',
    '--paths', workDir,
    '--output', 'source.%(ext)s',
    '--ffmpeg-location', path.dirname(ffmpegPath),
    '--js-runtimes', `node:${process.execPath}`,
    '--progress-template', 'download:CODECUT_PROGRESS:%(progress._percent_str)s',
    '--print', 'before_dl:CODECUT_TITLE:%(title)j',
    '--print', 'after_move:CODECUT_FILE:%(filepath)j',
    '--', url,
  ];
}

function sanitizeFileName(value) {
  const cleaned = String(value || 'youtube-video')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();
  return (cleaned || 'youtube-video').slice(0, 160);
}

function mimeForExtension(extension) {
  if (extension === '.webm') return 'video/webm';
  return 'video/mp4';
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function findOutputFile(workDir) {
  const files = fs.readdirSync(workDir)
    .filter((name) => !name.endsWith('.part') && !name.endsWith('.ytdl'))
    .map((name) => path.join(workDir, name))
    .filter((candidate) => fs.statSync(candidate).isFile());
  return files.length === 1 ? files[0] : null;
}

function humanizeError(lines) {
  const message = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '').trim();
  if (/sign in|login|age.?restricted|private video/i.test(message)) {
    return 'This video requires authentication or is not public.';
  }
  if (/live event|is live|premiere/i.test(message)) return 'Live and upcoming videos are not supported.';
  if (/larger than max-filesize|max-filesize/i.test(message)) return 'The selected quality exceeds the 1 GB file limit. Choose a lower quality.';
  const errorLine = message.split(/\r?\n/).reverse().find((line) => /error:/i.test(line));
  return (errorLine || 'yt-dlp could not download this video.').replace(/^.*?ERROR:\s*/i, '').slice(0, 500);
}

function terminateProcess(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    return;
  }
  child.kill('SIGTERM');
  setTimeout(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  }, 3000).unref();
}

function runYouTubeDownload({ binaryPath, url, maxHeight, workDir, ffmpegPath, onUpdate }) {
  fs.mkdirSync(workDir, { recursive: true });
  const args = buildYtDlpArgs({ url, maxHeight, workDir, ffmpegPath });
  let child = null;
  let cancelled = false;
  let title = 'youtube-video';
  let outputPath = null;
  const diagnosticLines = [];

  const promise = new Promise((resolve, reject) => {
    child = spawn(binaryPath, args, { shell: false, windowsHide: true });
    const timeout = setTimeout(() => {
      terminateProcess(child);
      reject(new Error('The YouTube download timed out.'));
    }, 60 * 60 * 1000);

    const consume = (stream) => {
      let pending = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        pending += chunk;
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || '';
        lines.forEach((line) => {
          const parsedProgress = parseProgressLine(line);
          if (parsedProgress !== null) onUpdate?.({ status: 'downloading', stage: 'downloading', progress: parsedProgress * 0.96 });
          const parsedTitle = parseTaggedJson(line, 'CODECUT_TITLE');
          if (typeof parsedTitle === 'string' && parsedTitle.trim()) {
            title = parsedTitle.trim();
            onUpdate?.({ title });
          }
          const parsedPath = parseTaggedJson(line, 'CODECUT_FILE');
          if (typeof parsedPath === 'string') outputPath = parsedPath;
          if (/merging formats|post-process|remuxing/i.test(line)) onUpdate?.({ status: 'processing', stage: 'processing', progress: 0.98 });
          if (line.trim() && parsedProgress === null) {
            diagnosticLines.push(line.trim());
            if (diagnosticLines.length > 100) diagnosticLines.shift();
          }
        });
      });
    };

    consume(child.stdout);
    consume(child.stderr);
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (cancelled) {
        reject(new Error('Download cancelled.'));
        return;
      }
      if (code !== 0) {
        reject(new Error(humanizeError(diagnosticLines)));
        return;
      }
      const candidate = outputPath && isPathInside(workDir, outputPath) ? outputPath : findOutputFile(workDir);
      if (!candidate || !fs.existsSync(candidate)) {
        reject(new Error('yt-dlp finished without producing a video file.'));
        return;
      }
      const extension = path.extname(candidate).toLowerCase();
      if (extension !== '.mp4' && extension !== '.webm') {
        reject(new Error(`Unsupported downloaded container: ${extension || 'unknown'}.`));
        return;
      }
      const size = fs.statSync(candidate).size;
      if (size > MAX_YOUTUBE_FILE_BYTES) {
        reject(new Error('The selected quality exceeds the 1 GB file limit. Choose a lower quality.'));
        return;
      }
      resolve({
        outputPath: candidate,
        outputName: `${sanitizeFileName(title)}${extension}`,
        title,
        mimeType: mimeForExtension(extension),
        size,
      });
    });
  });

  promise.cancel = () => {
    cancelled = true;
    terminateProcess(child);
  };
  return promise;
}

module.exports = {
  ALLOWED_HEIGHTS,
  MAX_YOUTUBE_FILE_BYTES,
  MAX_YOUTUBE_URLS,
  extractVideoId,
  normalizeYouTubeUrl,
  validateYouTubeUrls,
  normalizeMaxHeight,
  parseProgressLine,
  parseTaggedJson,
  resolveYtDlpPath,
  getYtDlpHealth,
  buildYtDlpArgs,
  sanitizeFileName,
  runYouTubeDownload,
};
