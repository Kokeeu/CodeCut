const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const OUTPUT_W = 1080;
const OUTPUT_H = 1920;
const OUTPUT_FPS = 30;
const AUDIO_RATE = 44100;

function safeUnlink(file) {
  if (file && require('fs').existsSync(file)) {
    try { require('fs').unlinkSync(file); } catch (_) { /* ignore */ }
  }
}

function buildFilterGraph(clips, transitions) {
  const outV = 'vout';
  const outA = 'aout';
  const filters = [];

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const s = Number(c.sourceStart).toFixed(3);
    const e = Number(c.sourceEnd).toFixed(3);
    filters.push(
      `[${i}:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS,crop=in_h*9/16:in_h,scale=${OUTPUT_W}:${OUTPUT_H}:flags=lanczos,setsar=1,fps=${OUTPUT_FPS},format=yuv420p[v${i}]`
    );
    filters.push(
      `[${i}:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,aresample=${AUDIO_RATE}[a${i}]`
    );
  }

  if (clips.length === 1) {
    filters.push(`[v0]null[${outV}]`);
    filters.push(`[a0]anull[${outA}]`);
    return filters.join(';');
  }

  let curV = 'v0';
  let curA = 'a0';
  let cumDuration = clips[0].duration;

  for (let i = 0; i < clips.length - 1; i++) {
    const nextV = `v${i + 1}`;
    const nextA = `a${i + 1}`;
    const t = transitions[`${clips[i].id}|${clips[i + 1].id}`];
    const isLast = i === clips.length - 2;
    const vLabel = isLast ? outV : `vc${i}`;
    const aLabel = isLast ? outA : `ac${i}`;
    const maxDur = Math.max(0, Math.min(clips[i].duration, clips[i + 1].duration) - 0.02);
    const reqDur = t && t.type && t.type !== 'none' ? Number(t.durationSec) || 0 : 0;
    const effDur = Math.min(reqDur, maxDur);
    const hasTransition = t && t.type && t.type !== 'none' && effDur > 0;

    if (!hasTransition) {
      filters.push(
        `[${curV}][${curA}][${nextV}][${nextA}]concat=n=2:v=1:a=1[${vLabel}][${aLabel}]`
      );
    } else {
      const dur = effDur.toFixed(3);
      const offset = Math.max(0, cumDuration - effDur).toFixed(3);
      filters.push(
        `[${curV}][${nextV}]xfade=transition=${t.type}:duration=${dur}:offset=${offset}[${vLabel}]`
      );
      filters.push(
        `[${curA}][${nextA}]acrossfade=d=${dur}:c1=tri:c2=tri[${aLabel}]`
      );
    }

    curV = vLabel;
    curA = aLabel;
    cumDuration += clips[i + 1].duration;
    if (hasTransition) {
      cumDuration -= effDur;
    }
  }

  return filters.join(';');
}

function validateClips(clips) {
  if (!Array.isArray(clips) || clips.length === 0) {
    return 'At least one clip is required.';
  }
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    if (typeof c.sourceStart !== 'number' || typeof c.sourceEnd !== 'number') {
      return `Clip ${i}: sourceStart and sourceEnd must be numbers.`;
    }
    if (c.sourceStart < 0) return `Clip ${i}: sourceStart must be >= 0.`;
    if (c.sourceEnd <= c.sourceStart) return `Clip ${i}: sourceEnd must be greater than sourceStart.`;
  }
  return null;
}

function runPipeline({ inputPaths, clips, transitions, outputPath, onLog }) {
  const filterGraph = buildFilterGraph(clips, transitions);

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    inputPaths.forEach((p) => command.input(p));

    command
      .complexFilter(filterGraph, ['vout', 'aout'])
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 20',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-shortest',
      ])
      .on('start', (cmd) => {
        if (onLog) onLog('start', cmd);
        console.log('[pipeline] ffmpeg start:', cmd);
      })
      .on('stderr', (line) => {
        if (onLog) onLog('stderr', line);
      })
      .on('error', (err) => {
        if (onLog) onLog('error', err.message);
        console.error('[pipeline] ffmpeg error:', err.message);
        console.error('[pipeline] filter graph:', filterGraph);
        reject(err);
      })
      .on('end', () => {
        if (onLog) onLog('end', null);
        console.log('[pipeline] done ->', outputPath);
        resolve();
      })
      .save(outputPath);
  });
}

module.exports = {
  buildFilterGraph,
  validateClips,
  runPipeline,
  safeUnlink,
  OUTPUT_W,
  OUTPUT_H,
};
