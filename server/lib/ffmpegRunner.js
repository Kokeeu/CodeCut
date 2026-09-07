const { spawn } = require('node:child_process');
const ffmpegPath = require('ffmpeg-static');
const { parseFfmpegProgress } = require('./ffmpegProgress');

function buildFfmpegArgs({ inputPaths, filterGraph, outputPath, encoding, audioRate }) {
  const args = ['-hide_banner', '-y'];
  inputPaths.forEach((inputPath) => args.push('-i', inputPath));
  args.push(
    '-filter_complex', filterGraph,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', encoding.preset,
    '-crf', String(encoding.crf),
    '-maxrate', `${encoding.maxRateKbps}k`,
    '-bufsize', `${encoding.bufferSizeKbps}k`,
    '-r', String(encoding.fps),
    '-g', String(encoding.fps * 2),
    '-keyint_min', String(encoding.fps),
    '-profile:v', 'high',
    '-tag:v', 'avc1',
    '-c:a', 'aac',
    '-b:a', `${encoding.audioBitrateKbps}k`,
    '-ar', String(audioRate),
    '-ac', '2',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    outputPath
  );
  return args;
}

function runFfmpeg({
  inputPaths,
  filterGraph,
  outputPath,
  encoding,
  audioRate,
  totalDuration,
  totalFrames,
  onLog,
  onProgress,
  stallTimeoutMs = 5 * 60 * 1000,
}) {
  if (!ffmpegPath) throw new Error('FFmpeg binary is not available.');
  const args = buildFfmpegArgs({ inputPaths, filterGraph, outputPath, encoding, audioRate });
  let child = null;
  let cancel = () => {};

  const promise = new Promise((resolve, reject) => {
    let settled = false;
    let stallTimer = null;
    let stderrBuffer = '';
    const recentLines = [];
    let lastProgress = 0;

    const clearStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = null;
    };

    const fail = (error, kill = false) => {
      if (settled) return;
      settled = true;
      clearStallTimer();
      if (kill && child && !child.killed) child.kill('SIGKILL');
      reject(error);
    };

    const resetStallTimer = () => {
      clearStallTimer();
      stallTimer = setTimeout(() => {
        fail(new Error('FFmpeg stopped responding for 5 minutes'), true);
      }, stallTimeoutMs);
      stallTimer.unref?.();
    };

    const reportLine = (line) => {
      if (!line) return;
      recentLines.push(line);
      if (recentLines.length > 40) recentLines.shift();
      onLog?.('stderr', line);
      const progress = parseFfmpegProgress(line, totalDuration, totalFrames);
      if (progress == null) return;
      resetStallTimer();
      lastProgress = Math.max(lastProgress, Math.min(1, progress));
      onProgress?.(lastProgress);
    };

    child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const command = `${ffmpegPath} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`;
    onLog?.('start', command);
    onProgress?.(0.005);
    resetStallTimer();

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk;
      const lines = stderrBuffer.split(/\r\n|\r|\n/);
      stderrBuffer = lines.pop() || '';
      lines.forEach(reportLine);
    });

    child.on('error', (error) => fail(error));
    child.on('close', (code, signal) => {
      if (stderrBuffer) reportLine(stderrBuffer);
      if (settled) return;
      settled = true;
      clearStallTimer();
      if (code === 0) {
        onProgress?.(1);
        onLog?.('end', null);
        resolve();
        return;
      }
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      const detail = recentLines.slice(-8).join('\n');
      const error = new Error(`FFmpeg failed with ${reason}${detail ? `:\n${detail}` : ''}`);
      onLog?.('error', error.message);
      reject(error);
    });

    cancel = () => fail(new Error('Export cancelled'), true);
  });

  promise._kill = () => cancel();
  return promise;
}

module.exports = { buildFfmpegArgs, runFfmpeg };
