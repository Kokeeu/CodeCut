const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const { exportProject } = require('./lib/exportClient');

const FFMPEG = ffmpegStatic;
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUT = path.join(TEMP_DIR, 'test');

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}\n${stderr}`));
    });
  });
}

async function main() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const v1 = path.join(OUT, 'a.mp4');
  const v2 = path.join(OUT, 'b.mp4');

  console.log('Generating test video a.mp4 (3s, 1280x720, blue)...');
  await runFfmpeg([
    '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=1280x720:d=3:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', v1,
  ]);

  console.log('Generating test video b.mp4 (3s, 1280x720, red)...');
  await runFfmpeg([
    '-y', '-f', 'lavfi', '-i', 'color=c=red:s=1280x720:d=3:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=880:duration=3',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', v2,
  ]);

  const clips = [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 2, duration: 2 },
    { id: 'c2', fileIndex: 1, sourceStart: 1, sourceEnd: 3, duration: 2 },
  ];
  const transitions = { 'c1|c2': { type: 'fade', durationSec: 0.5 } };
  const dest = path.join(OUT, 'out.mp4');

  console.log('POSTing to /api/trim (async job)...');
  await exportProject({
    files: [{ path: v1 }, { path: v2 }],
    fields: {
      clips: JSON.stringify(clips),
      transitions: JSON.stringify(transitions),
    },
    destPath: dest,
  });

  const size = fs.statSync(dest).size;
  console.log('saved to', dest, `(${size} bytes)`);
  await runFfmpeg(['-i', dest, '-f', 'null', '-']);
  console.log('OK: probed without error');
}

main().catch((e) => { console.error(e); process.exit(1); });
