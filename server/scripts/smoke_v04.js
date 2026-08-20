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
    p.on('exit', (code) => code === 0 ? resolve(stderr) : reject(new Error(`ffmpeg exit ${code}\n${stderr}`)));
  });
}

async function testCase(label, clips, transitions, meta = {}) {
  const v1 = path.join(OUT, 'a.mp4');
  const v2 = path.join(OUT, 'b.mp4');
  const dest = path.join(OUT, `out-${label.replace(/\W+/g, '_')}.mp4`);
  try {
    await exportProject({
      files: [{ path: v1 }, { path: v2 }],
      fields: {
        clips: JSON.stringify(clips),
        transitions: JSON.stringify(transitions),
        meta: JSON.stringify(meta),
      },
      destPath: dest,
    });
    const probe = await runFfmpeg(['-i', dest, '-f', 'null', '-']);
    const m = probe.match(/Duration: (\d+:\d+:\d+\.\d+)/);
    const r = probe.match(/Stream #\d+:\d+.*?Video:.*?(\d{3,4}x\d{3,4})/);
    console.log(`[OK] ${label} duration=${m && m[1]} resolution=${r && r[1]}`);
    return true;
  } catch (err) {
    console.log(`[FAIL] ${label} -> ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('== card pipeline (blur + drawtext) ==');
  const text = {
    text: 'Openings favs',
    x: 540,
    y: 180,
    size: 64,
    font: 'inter',
    color: '#ffffff',
    align: 'center',
    startOffset: 0,
    endOffset: 2,
  };

  const ok = [];
  ok.push(await testCase('card_with_text', [
    {
      id: 'c1',
      fileIndex: 0,
      sourceStart: 0,
      sourceEnd: 1.5,
      duration: 1.5,
      texts: [text, { ...text, text: "Cruel Angel's Thesis", y: 1080, align: 'left', x: 70 }],
    },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5, duration: 2, texts: [text] },
  ], { 'c1|c2': { type: 'fade', durationSec: 0.5 } }, { blur: 30, blurEnabled: true }));

  ok.push(await testCase('card_single_clip', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 2, duration: 2, texts: [text] },
  ], {}, { blur: 40, blurEnabled: true }));

  ok.push(await testCase('card_no_meta', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1, duration: 1 },
  ], {}, {}));

  const failed = ok.filter((v) => !v).length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
