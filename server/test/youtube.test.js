const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const express = require('express');
const { JobQueue } = require('../lib/queue');
const { jobs, cleanupJobFiles, deleteJob } = require('../lib/jobs');
const {
  buildYtDlpArgs,
  MAX_YOUTUBE_FILE_BYTES,
  normalizeMaxHeight,
  normalizeYouTubeUrl,
  parseProgressLine,
  parseTaggedJson,
  validateYouTubeUrls,
} = require('../lib/youtubeDownloader');
const { createYouTubeRouter } = require('../routes/youtube');
const { parseChecksums, selectAsset, sha256, verifyChecksum } = require('../scripts/setup_ytdlp');

test('normalizes supported individual YouTube URLs and removes playlist parameters', () => {
  assert.equal(normalizeYouTubeUrl('https://youtu.be/YE7VzlLtp-4?t=10'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=YE7VzlLtp-4&list=abc'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/shorts/YE7VzlLtp-4'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
  assert.equal(normalizeYouTubeUrl('https://www.youtube-nocookie.com/embed/YE7VzlLtp-4'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
});

test('rejects non-video, non-HTTPS and non-YouTube URLs', () => {
  assert.throws(() => normalizeYouTubeUrl('http://youtu.be/YE7VzlLtp-4'), /HTTPS/);
  assert.throws(() => normalizeYouTubeUrl('https://example.com/watch?v=YE7VzlLtp-4'), /YouTube/);
  assert.throws(() => normalizeYouTubeUrl('https://www.youtube.com/playlist?list=abc'), /individual/);
  assert.throws(() => normalizeYouTubeUrl('https://www.youtube.com/@channel'), /individual/);
  assert.throws(() => normalizeYouTubeUrl('file:///etc/passwd'), /HTTPS/);
});

test('deduplicates URLs and enforces batch and resolution limits', () => {
  const urls = validateYouTubeUrls([
    'https://youtu.be/YE7VzlLtp-4',
    'https://www.youtube.com/watch?v=YE7VzlLtp-4',
  ]);
  assert.deepEqual(urls, ['https://www.youtube.com/watch?v=YE7VzlLtp-4']);
  assert.throws(() => validateYouTubeUrls(Array.from({ length: 11 }, (_, index) => `https://youtu.be/abcdefghi${index}`)), /maximum of 10/);
  assert.equal(normalizeMaxHeight('2160'), 2160);
  assert.throws(() => normalizeMaxHeight(4320), /maxHeight/);
});

test('parses tagged yt-dlp output and builds constrained arguments', () => {
  assert.equal(parseProgressLine('CODECUT_PROGRESS: 42.5%'), 0.425);
  assert.equal(parseProgressLine('unrelated'), null);
  assert.equal(parseTaggedJson('CODECUT_TITLE:"A title"', 'CODECUT_TITLE'), 'A title');
  const args = buildYtDlpArgs({
    url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    maxHeight: 2160,
    workDir: path.join(os.tmpdir(), 'codecut-youtube-test'),
    ffmpegPath: path.join(os.tmpdir(), 'ffmpeg'),
  });
  assert.ok(args.includes('--ignore-config'));
  assert.ok(args.includes('--no-playlist'));
  assert.equal(args.includes('--max-downloads'), false);
  assert.ok(args.includes('res:2160'));
  assert.ok(args.includes('1G'));
  assert.equal(args.at(-2), '--');
});

test('selects official assets and validates SHA-256 manifests', () => {
  assert.equal(selectAsset('win32', 'x64', false), 'yt-dlp.exe');
  assert.equal(selectAsset('win32', 'arm64', false), 'yt-dlp_arm64.exe');
  assert.equal(selectAsset('darwin', 'arm64', false), 'yt-dlp_macos');
  assert.equal(selectAsset('linux', 'x64', false), 'yt-dlp_linux');
  assert.equal(selectAsset('linux', 'arm64', true), 'yt-dlp_musllinux_aarch64');
  assert.throws(() => selectAsset('freebsd', 'x64', false), /Unsupported/);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codecut-checksum-'));
  const filePath = path.join(tempDir, 'yt-dlp');
  fs.writeFileSync(filePath, 'verified binary');
  const checksum = sha256(Buffer.from('verified binary'));
  const parsed = parseChecksums(`${checksum}  yt-dlp\n`);
  assert.equal(parsed.get('yt-dlp'), checksum);
  assert.equal(verifyChecksum(filePath, checksum), true);
  assert.throws(() => verifyChecksum(filePath, '0'.repeat(64)), /mismatch/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('queue prioritizes exports and removes queued jobs on cancel', async () => {
  const queue = new JobQueue(1);
  const order = [];
  let release;
  const blocker = new Promise((resolve) => { release = resolve; });
  const first = queue.enqueue('first', async () => {
    order.push('first');
    await blocker;
  });
  const low = queue.enqueue('low', async () => order.push('low'), { priority: 0 });
  const high = queue.enqueue('high', async () => order.push('high'), { priority: 10 });
  const cancelled = queue.enqueue('cancelled', async () => order.push('cancelled'), { priority: 0 });
  assert.equal(queue.cancel('cancelled'), true);
  release();
  await Promise.all([first, low, high, cancelled]);
  assert.deepEqual(order, ['first', 'high', 'low']);
});

test('YouTube API reports progress, preserves partial failures and transfers a result', async (t) => {
  const queue = new JobQueue(2);
  const createdIds = [];
  const fakeDownload = ({ url, workDir, onUpdate }) => {
    let cancelled = false;
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (cancelled) {
          reject(new Error('Download cancelled.'));
          return;
        }
        onUpdate({ progress: 0.5, status: 'downloading', stage: 'downloading', title: 'Fixture video' });
        if (url.includes('failvideo1')) {
          reject(new Error('Fixture failure'));
          return;
        }
        fs.mkdirSync(workDir, { recursive: true });
        const outputPath = path.join(workDir, 'source.mp4');
        fs.writeFileSync(outputPath, Buffer.from('fixture video'));
        resolve({ outputPath, outputName: 'Fixture video.mp4', title: 'Fixture video', mimeType: 'video/mp4', size: 13 });
      }, 20);
    });
    promise.cancel = () => { cancelled = true; };
    return promise;
  };

  const app = express();
  app.use(express.json());
  app.use('/api/youtube', createYouTubeRouter({
    runDownload: fakeDownload,
    getHealth: () => ({ available: true, version: 'fixture', path: 'fixture-yt-dlp' }),
    queue,
    ffmpegPath: path.join(os.tmpdir(), 'ffmpeg'),
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => {
    createdIds.forEach((id) => {
      const job = jobs.get(id);
      if (job) cleanupJobFiles(job);
      deleteJob(id);
    });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/youtube/imports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: ['https://youtu.be/success001', 'https://youtu.be/failvideo1'],
      maxHeight: 1080,
    }),
  });
  assert.equal(response.status, 202);
  const payload = await response.json();
  createdIds.push(...payload.jobs.map((job) => job.id));

  const terminal = await Promise.all(payload.jobs.map(async (job) => {
    const progressResponse = await fetch(`${base}/api/youtube/imports/${job.id}/progress`);
    const body = await progressResponse.text();
    const messages = body.split(/\r?\n/).filter((line) => line.startsWith('data: ')).map((line) => JSON.parse(line.slice(6)));
    return messages.at(-1);
  }));
  assert.deepEqual(terminal.map((item) => item.status).sort(), ['error', 'ready']);

  const readyJob = terminal.find((item) => item.status === 'ready');
  const fileResponse = await fetch(`${base}/api/youtube/imports/${readyJob.id}/file`);
  assert.equal(fileResponse.status, 200);
  assert.equal(decodeURIComponent(fileResponse.headers.get('x-codecut-filename')), 'Fixture video.mp4');
  assert.equal(Buffer.from(await fileResponse.arrayBuffer()).toString(), 'fixture video');
});

test('YouTube API cancels an active download and removes partial files', async (t) => {
  const queue = new JobQueue(2);
  const createdIds = [];
  const fakeDownload = ({ workDir, onUpdate }) => {
    fs.mkdirSync(workDir, { recursive: true });
    fs.writeFileSync(path.join(workDir, 'source.mp4.part'), 'partial');
    let rejectDownload;
    const promise = new Promise((_resolve, reject) => {
      rejectDownload = reject;
      onUpdate({ progress: 0.1, status: 'downloading', stage: 'downloading' });
    });
    promise.cancel = () => rejectDownload(new Error('Download cancelled.'));
    return promise;
  };

  const app = express();
  app.use(express.json());
  app.use('/api/youtube', createYouTubeRouter({
    runDownload: fakeDownload,
    getHealth: () => ({ available: true, version: 'fixture', path: 'fixture-yt-dlp' }),
    queue,
    ffmpegPath: path.join(os.tmpdir(), 'ffmpeg'),
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => {
    createdIds.forEach((id) => {
      const job = jobs.get(id);
      if (job) cleanupJobFiles(job);
      deleteJob(id);
    });
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/youtube/imports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: ['https://youtu.be/cancelled01'], maxHeight: 1080 }),
  });
  const payload = await response.json();
  const jobId = payload.jobs[0].id;
  createdIds.push(jobId);
  const workDir = jobs.get(jobId).workDir;

  const cancelResponse = await fetch(`${base}/api/youtube/imports/${jobId}`, { method: 'DELETE' });
  assert.equal(cancelResponse.status, 200);
  assert.equal((await cancelResponse.json()).status, 'cancelled');
  assert.equal(jobs.get(jobId).status, 'cancelled');
  assert.equal(fs.existsSync(workDir), false);

  const progressResponse = await fetch(`${base}/api/youtube/imports/${jobId}/progress`);
  const body = await progressResponse.text();
  assert.match(body, /"status":"cancelled"/);
});

test('YouTube API rejects and cleans results above 1 GB', async (t) => {
  const queue = new JobQueue(1);
  const createdIds = [];
  const fakeDownload = ({ workDir }) => {
    fs.mkdirSync(workDir, { recursive: true });
    const outputPath = path.join(workDir, 'source.mp4');
    fs.writeFileSync(outputPath, 'fixture');
    fs.truncateSync(outputPath, MAX_YOUTUBE_FILE_BYTES + 1);
    return Promise.resolve({
      outputPath,
      outputName: 'Too large.mp4',
      title: 'Too large',
      mimeType: 'video/mp4',
      size: MAX_YOUTUBE_FILE_BYTES + 1,
    });
  };

  const app = express();
  app.use(express.json());
  app.use('/api/youtube', createYouTubeRouter({
    runDownload: fakeDownload,
    getHealth: () => ({ available: true, version: 'fixture', path: 'fixture-yt-dlp' }),
    queue,
    ffmpegPath: path.join(os.tmpdir(), 'ffmpeg'),
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => {
    createdIds.forEach((id) => {
      const job = jobs.get(id);
      if (job) cleanupJobFiles(job);
      deleteJob(id);
    });
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/youtube/imports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: ['https://youtu.be/toolarge001'], maxHeight: 2160 }),
  });
  const payload = await response.json();
  const jobId = payload.jobs[0].id;
  createdIds.push(jobId);

  const progressResponse = await fetch(`${base}/api/youtube/imports/${jobId}/progress`);
  const body = await progressResponse.text();
  assert.match(body, /"status":"error"/);
  assert.match(body, /1 GB file limit/);
  assert.equal(fs.existsSync(jobs.get(jobId).workDir), false);
});
