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
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}\n${stderr}`)));
  });
}

function postMultipart({ files, fields }) {
  return new Promise((resolve, reject) => {
    const boundary = '----opencode' + Date.now();
    const parts = [];
    for (const [name, value] of Object.entries(fields || {})) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
    }
    for (const f of files) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="videos"; filename="${path.basename(f.path)}"\r\nContent-Type: video/mp4\r\n\r\n`));
      parts.push(fs.readFileSync(f.path));
      parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = http.request({ host: 'localhost', port: 4000, path: '/api/trim', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } },
      (res) => { const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c) })); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testCase(label, clips, transitions) {
  const v1 = path.join(OUT, 'a.mp4');
  const v2 = path.join(OUT, 'b.mp4');
  const res = await postMultipart({
    files: [{ path: v1 }, { path: v2 }],
    fields: { clips: JSON.stringify(clips), transitions: JSON.stringify(transitions) },
  });
  const ok = res.status === 200 && res.body.length > 1000;
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${label} -> status=${res.status} bytes=${res.body.length}`);
  if (ok) {
    const out = path.join(OUT, `out-${label.replace(/\W+/g, '_')}.mp4`);
    fs.writeFileSync(out, res.body);
    await runFfmpeg(['-i', out, '-f', 'null', '-']);
  } else {
    console.log('  body:', res.body.toString('utf8'));
  }
  return ok;
}

async function main() {
  // Case 1: single clip
  await testCase('single_clip', [
    { id: 'c1', fileIndex: 0, sourceStart: 0.5, sourceEnd: 2.5, duration: 2 },
  ], {});
  // Case 2: 2 clips, no transitions
  await testCase('two_clips_none', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1.5, duration: 1.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5, duration: 2 },
  ], {});
  // Case 3: 2 clips, fade transition
  await testCase('two_clips_fade', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1.5, duration: 1.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5, duration: 2 },
  ], { 'c1|c2': { type: 'fade', durationSec: 0.5 } });
  // Case 4: 3 clips, mix of transitions
  await testCase('three_clips_mix', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1, duration: 1 },
    { id: 'c2', fileIndex: 1, sourceStart: 1, sourceEnd: 2, duration: 1 },
    { id: 'c3', fileIndex: 0, sourceStart: 1.5, sourceEnd: 2.5, duration: 1 },
  ], { 'c1|c2': { type: 'fade', durationSec: 0.3 }, 'c2|c3': { type: 'none', durationSec: 0 } });
  // Case 5: transition longer than the clip (should be clamped, not crash)
  await testCase('excessive_transition', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 0.5, duration: 0.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 1, sourceEnd: 2, duration: 1 },
  ], { 'c1|c2': { type: 'fade', durationSec: 5 } });
  // Case 6: no duration field sent (backend must normalize)
  await testCase('no_duration_field', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5 },
  ], { 'c1|c2': { type: 'wipeleft', durationSec: 0.4 } });
}

main().catch((e) => { console.error(e); process.exit(1); });
