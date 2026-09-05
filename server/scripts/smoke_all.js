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

async function ensureFixtures() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const v1 = path.join(OUT, 'a.mp4');
  const v2 = path.join(OUT, 'b.mp4');
  const noAudio = path.join(OUT, 'no-audio.mp4');
  const portraitStereo = path.join(OUT, 'portrait-stereo-48k.mp4');
  const ratingOverlay = path.join(OUT, 'rating-overlay.png');
  if (!fs.existsSync(v1)) {
    await runFfmpeg([
      '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=1280x720:d=3:r=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest', v1,
    ]);
  }
  if (!fs.existsSync(v2)) {
    await runFfmpeg([
      '-y', '-f', 'lavfi', '-i', 'color=c=red:s=1280x720:d=3:r=30',
      '-f', 'lavfi', '-i', 'sine=frequency=880:duration=3',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest', v2,
    ]);
  }
  if (!fs.existsSync(noAudio)) {
    await runFfmpeg([
      '-y', '-f', 'lavfi', '-i', 'color=c=green:s=854x480:d=3:r=30',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', noAudio,
    ]);
  }
  if (!fs.existsSync(portraitStereo)) {
    await runFfmpeg([
      '-y', '-f', 'lavfi', '-i', 'color=c=purple:s=720x1280:d=3:r=30',
      '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=3',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-ac', '2', '-shortest', portraitStereo,
    ]);
  }
  if (!fs.existsSync(ratingOverlay)) {
    await runFfmpeg([
      '-y', '-f', 'lavfi', '-i', 'color=c=black@0.0:s=1080x1920,format=rgba,drawbox=x=60:y=1270:w=460:h=340:color=0xFB7185@0.9:t=fill:replace=1,drawbox=x=560:y=1270:w=460:h=340:color=0x22D3EE@0.9:t=fill:replace=1,drawbox=x=270:y=1680:w=540:h=104:color=0xA855F7@0.95:t=fill:replace=1',
      '-frames:v', '1', ratingOverlay,
    ]);
  }
  return { v1, v2, noAudio, portraitStereo, ratingOverlay };
}

async function testCase(label, clips, transitions, extraFields = {}, inputFiles = null) {
  const { v1, v2 } = await ensureFixtures();
  const dest = path.join(OUT, `out-${label.replace(/\W+/g, '_')}.mp4`);
  try {
    await exportProject({
      files: inputFiles || [{ path: v1 }, { path: v2 }],
      fields: {
        clips: JSON.stringify(clips),
        transitions: JSON.stringify(transitions),
        ...extraFields,
      },
      destPath: dest,
    });
    const stat = fs.statSync(dest);
    if (stat.size < 1000) throw new Error(`Output too small (${stat.size} bytes)`);
    await runFfmpeg(['-i', dest, '-f', 'null', '-']);
    console.log(`[OK] ${label} -> ${stat.size} bytes`);
    return true;
  } catch (err) {
    console.log(`[FAIL] ${label} -> ${err.message}`);
    return false;
  }
}

async function main() {
  const fixtures = await ensureFixtures();
  const results = [];
  const { TEMPLATES } = await import('../../client/src/lib/projectDefaults.js');
  const { applyClipTemplate } = await import('../../client/src/lib/clipTemplates.js');
  const discovery = TEMPLATES.find((template) => template.id === 'tpl-music-discovery');
  const discoveryClips = [0, 1].map((index) => applyClipTemplate({
    id: `discovery-${index}`, fileIndex: index, sourceStart: 0, sourceEnd: 3, speed: 1,
  }, discovery, index));

  results.push(await testCase('music_discovery', discoveryClips, {}, {
    meta: JSON.stringify({ blur: discovery.blur, blurEnabled: discovery.blurEnabled }),
  }));
  results.push(await testCase('music_discovery_720_fast', discoveryClips.map((clip) => ({ ...clip, speed: 2 })), {}, {
    exportConfig: JSON.stringify({ resolution: '720' }),
  }));

  results.push(await testCase('single_clip', [
    { id: 'c1', fileIndex: 0, sourceStart: 0.5, sourceEnd: 2.5, duration: 2 },
  ], {}));

  results.push(await testCase('collaborative_rating_overlay', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 2, ratingOverlayFileIndex: 0 },
  ], {}, {}, [
    { path: fixtures.v1 },
    { path: fixtures.ratingOverlay, fieldName: 'ratingOverlays', contentType: 'image/png' },
  ]));

  results.push(await testCase('two_clips_none', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1.5, duration: 1.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5, duration: 2 },
  ], {}));

  results.push(await testCase('two_clips_fade', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1.5, duration: 1.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5, duration: 2 },
  ], { 'c1|c2': { type: 'fade', durationSec: 0.5 } }));

  results.push(await testCase('three_clips_mix', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1, duration: 1 },
    { id: 'c2', fileIndex: 1, sourceStart: 1, sourceEnd: 2, duration: 1 },
    { id: 'c3', fileIndex: 0, sourceStart: 1.5, sourceEnd: 2.5, duration: 1 },
  ], { 'c1|c2': { type: 'fade', durationSec: 0.3 }, 'c2|c3': { type: 'none', durationSec: 0 } }));

  results.push(await testCase('excessive_transition', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 0.5, duration: 0.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 1, sourceEnd: 2, duration: 1 },
  ], { 'c1|c2': { type: 'fade', durationSec: 5 } }));

  results.push(await testCase('no_duration_field', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1.5 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 2.5 },
  ], { 'c1|c2': { type: 'wipeleft', durationSec: 0.4 } }));

  results.push(await testCase('karaoke_text', [
    {
      id: 'c1',
      fileIndex: 0,
      sourceStart: 0,
      sourceEnd: 2,
      texts: [{
        text: 'Hello world\nSecond line',
        x: 540,
        y: 200,
        size: 64,
        font: 'inter',
        color: '#ffffff',
        align: 'center',
        startOffset: 0,
        endOffset: 2,
        animation: { type: 'karaoke', duration: 1.2 },
      }],
    },
  ], {}));

  results.push(await testCase('multiline_text', [
    {
      id: 'c1',
      fileIndex: 0,
      sourceStart: 0,
      sourceEnd: 2,
      texts: [{
        text: 'Primera línea\nSegunda línea',
        x: 540,
        y: 200,
        size: 64,
        font: 'inter',
        color: '#ffffff',
        align: 'center',
        startOffset: 0,
        endOffset: 2,
      }],
    },
  ], {}));

  results.push(await testCase('typewriter_multiline_text', [
    {
      id: 'c1',
      fileIndex: 0,
      sourceStart: 0,
      sourceEnd: 2,
      texts: [{
        text: 'First line\nSecond line',
        x: 540,
        y: 200,
        size: 64,
        font: 'inter',
        color: '#ffffff',
        align: 'center',
        startOffset: 0,
        endOffset: 2,
        animation: { type: 'typewriter', duration: 1.2 },
      }],
    },
  ], {}));

  results.push(await testCase('pip_overlay', [
    {
      id: 'c1',
      fileIndex: 0,
      sourceStart: 0,
      sourceEnd: 2,
      pip: { enabled: true, fileIndex: 1, position: 'bottom-right', size: 30, opacity: 1, border: true, borderWidth: 4, borderRadius: 8 },
    },
  ], {}));

  results.push(await testCase('mixed_media_audio_normalization', [
    { id: 'c1', fileIndex: 0, sourceStart: 0, sourceEnd: 1 },
    { id: 'c2', fileIndex: 1, sourceStart: 0.5, sourceEnd: 1.5 },
    { id: 'c3', fileIndex: 2, sourceStart: 1, sourceEnd: 2 },
  ], {}, {}, [
    { path: fixtures.v1 },
    { path: fixtures.noAudio },
    { path: fixtures.portraitStereo },
  ]));

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
