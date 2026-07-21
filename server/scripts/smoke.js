// Smoke test: generate 2 test videos and POST them to /api/trim
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const FFMPEG = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
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

function postMultipart({ files, fields, host = 'localhost', port = 4000, pathName = '/api/trim' }) {
  return new Promise((resolve, reject) => {
    const boundary = '----opencode' + Date.now();
    const parts = [];

    for (const [name, value] of Object.entries(fields || {})) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      ));
    }

    for (const f of files) {
      const filename = path.basename(f.path);
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="videos"; filename="${filename}"\r\nContent-Type: video/mp4\r\n\r\n`
      ));
      parts.push(fs.readFileSync(f.path));
      parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const req = http.request({
      host, port, path: pathName, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buf });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
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

  console.log('POSTing to /api/trim...');
  const res = await postMultipart({
    files: [{ path: v1 }, { path: v2 }],
    fields: {
      clips: JSON.stringify(clips),
      transitions: JSON.stringify(transitions),
    },
  });

  console.log('status:', res.status);
  console.log('content-type:', res.headers['content-type']);
  console.log('body bytes:', res.body.length);

  if (res.status === 200 && res.body.length > 1000) {
    const out = path.join(OUT, 'out.mp4');
    fs.writeFileSync(out, res.body);
    console.log('saved to', out);
    // Probe the result
    await runFfmpeg(['-i', out, '-f', 'null', '-']);
    console.log('OK: probed without error');
  } else {
    console.log('FAIL: body preview:', res.body.toString('utf8').slice(0, 500));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
