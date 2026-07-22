const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const OUTPUT_W = 1080;
const OUTPUT_H = 1920;
const OUTPUT_FPS = 30;
const AUDIO_RATE = 44100;

const BG_BRIGHTNESS = -0.05;
const BG_SATURATION = 0.5;

const MAIN_Y = 300;

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REGISTRY = {
  inter: path.join(FONTS_DIR, 'Inter-Bold.ttf'),
  montserrat: path.join(FONTS_DIR, 'Montserrat-Bold.ttf'),
  bebasneue: path.join(FONTS_DIR, 'BebasNeue-Regular.ttf'),
};
const FONT_FALLBACK = (() => {
  const candidates = [
    'C:\\Windows\\Fonts\\arialbd.ttf',
    'C:\\Windows\\Fonts\\Arial Bold.ttf',
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\Arial.ttf',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
})();

const FONT_PICKER_OPTIONS = [
  { value: 'inter', label: 'Inter' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'bebasneue', label: 'Bebas Neue' },
  { value: 'arial', label: 'Arial (system)' },
];

function safeUnlink(file) {
  if (file && fs.existsSync(file)) {
    try { fs.unlinkSync(file); } catch (_) { /* ignore */ }
  }
}

function escapeFilterPath(p) {
  return String(p).replace(/\\/g, '/').replace(/:/g, '\\:');
}

function normalizeTransform(t) {
  const n = t && typeof t === 'object' ? t : {};
  const clamp = (v, min, max, def) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
  };
  return {
    x: clamp(n.x, -4000, 4000, 0),
    y: clamp(n.y, -4000, 4000, 0),
    scale: clamp(n.scale, 0.05, 5, 1),
  };
}

function fmtSigned(v) {
  const r = Math.round(v);
  return r >= 0 ? `+${r}` : `${r}`;
}

function colorToHex(color) {
  if (!color) return '0xFFFFFF';
  const v = String(color).trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(v)) return '0x' + v.toUpperCase();
  return '0xFFFFFF';
}

function resolveFont(family) {
  if (family && FONT_REGISTRY[family]) return FONT_REGISTRY[family];
  return FONT_FALLBACK;
}

function writeTextFiles(clips, runId) {
  const map = {};
  clips.forEach((clip, ci) => {
    (clip.texts || []).forEach((t, ti) => {
      const content = t && t.text != null ? String(t.text) : '';
      if (!content.trim()) return;
      const key = `c${ci}-t${ti}`;
      const p = path.join(TEMP_DIR, `text-${runId}-${key}.txt`);
      fs.writeFileSync(p, content, 'utf8');
      map[key] = p;
    });
  });
  return map;
}

function cleanupTextFiles(map) {
  Object.values(map).forEach((p) => { if (p) safeUnlink(p); });
}

function buildFilterGraph(clips, transitions, meta, textFiles) {
  const filters = [];
  const outV = 'vout';
  const outA = 'aout';
  const blurSigma = Math.max(0, Math.min(200, Number(meta && meta.blur) || 0));
  const blurEnabled = !(meta && meta.blurEnabled === false);

  const MAIN_MAX_W = OUTPUT_W;

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const s = Number(c.sourceStart).toFixed(3);
    const e = Number(c.sourceEnd).toFixed(3);
    filters.push(
      `[${i}:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS,fps=${OUTPUT_FPS},format=yuv420p[s${i}raw]`
    );
    filters.push(
      `[${i}:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,aresample=${AUDIO_RATE}[a${i}]`
    );
    const tr = normalizeTransform(c.transform);
    const mainW = Math.max(2, Math.round(MAIN_MAX_W * tr.scale));
    const xExpr = `(W-w)/2${fmtSigned(tr.x)}`;
    const yExpr = `${MAIN_Y}${fmtSigned(tr.y)}`;
    if (blurEnabled) {
      filters.push(`[s${i}raw]split=2[m${i}][bgr${i}]`);
      filters.push(`[m${i}]scale=${mainW}:-2:flags=lanczos,setsar=1[m${i}f]`);
      const bgBlur = blurSigma > 0 ? `,gblur=sigma=${blurSigma}` : '';
      filters.push(
        `[bgr${i}]scale=${OUTPUT_W}:${OUTPUT_H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${OUTPUT_W}:${OUTPUT_H}${bgBlur},eq=brightness=${BG_BRIGHTNESS}:saturation=${BG_SATURATION}[bg${i}]`
      );
    } else {
      filters.push(`[s${i}raw]scale=${mainW}:-2:flags=lanczos,setsar=1[m${i}f]`);
      filters.push(
        `color=c=black:s=${OUTPUT_W}x${OUTPUT_H}:r=${OUTPUT_FPS}:d=${(c.sourceEnd - c.sourceStart).toFixed(3)}[bg${i}]`
      );
    }
    filters.push(`[bg${i}][m${i}f]overlay=x=${xExpr}:y=${yExpr}[c${i}]`);
  }

  const composedStart = [];
  if (clips.length === 1) {
    composedStart.push(0);
    filters.push(`[c0]null[vc]`);
    filters.push(`[a0]anull[ac]`);
  } else {
    let curV = 'c0';
    let curA = 'a0';
    let cumDuration = 0;
    composedStart.push(0);

    for (let i = 0; i < clips.length - 1; i++) {
      const nextV = `c${i + 1}`;
      const nextA = `a${i + 1}`;
      const t = transitions[`${clips[i].id}|${clips[i + 1].id}`];
      const isLast = i === clips.length - 2;
      const vLabel = isLast ? 'vc' : `vc${i}`;
      const aLabel = isLast ? 'ac' : `ac${i}`;
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
        const offset = Math.max(0, cumDuration + clips[i].duration - effDur).toFixed(3);
        filters.push(
          `[${curV}][${nextV}]xfade=transition=${t.type}:duration=${dur}:offset=${offset}[${vLabel}]`
        );
        filters.push(
          `[${curA}][${nextA}]acrossfade=d=${dur}:c1=tri:c2=tri[${aLabel}]`
        );
      }

      curV = vLabel;
      curA = aLabel;
      cumDuration += clips[i].duration;
      if (hasTransition) cumDuration -= effDur;
      composedStart.push(cumDuration);
    }
  }

  let prevLabel = 'vc';
  clips.forEach((clip, ci) => {
    const clipStart = composedStart[ci];
    let ti = 0;
    (clip.texts || []).forEach((t) => {
      const content = t && t.text != null ? String(t.text) : '';
      if (!content.trim()) { ti++; return; }
      const key = `c${ci}-t${ti}`;
      ti++;
      const fp = textFiles && textFiles[key];
      if (!fp) return;
      const size = Math.max(8, Math.min(400, Number(t.size) || 60));
      const tx = Math.round(Number(t.x) || 0);
      const ty = Math.round(Number(t.y) || 0);
      const fcolor = colorToHex(t.color);
      const ffile = escapeFilterPath(resolveFont(t.font));
      const out = `vt${ti}`;
      const startOff = Number(t.startOffset) || 0;
      const endOff = Number(t.endOffset) || (clip.sourceEnd - clip.sourceStart);
      const enableStart = (clipStart + startOff).toFixed(3);
      const enableEnd = (clipStart + endOff).toFixed(3);
      filters.push(
        `[${prevLabel}]drawtext=textfile='${escapeFilterPath(fp)}':x=${tx}:y=${ty}:fontsize=${size}:fontcolor=${fcolor}:fontfile='${ffile}':shadowcolor=black@0.75:shadowx=3:shadowy=3:enable='between(t,${enableStart},${enableEnd})'[${out}]`
      );
      prevLabel = out;
    });
  });

  if (prevLabel !== outV) {
    filters.push(`[${prevLabel}]null[${outV}]`);
  }
  filters.push(`[ac]anull[${outA}]`);

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

function runPipeline({ inputPaths, clips, transitions, meta, outputPath, onLog }) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const textFiles = writeTextFiles(clips, runId);
  const filterGraph = buildFilterGraph(clips, transitions, meta, textFiles);

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
        cleanupTextFiles(textFiles);
        reject(err);
      })
      .on('end', () => {
        if (onLog) onLog('end', null);
        console.log('[pipeline] done ->', outputPath);
        cleanupTextFiles(textFiles);
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
  FONT_PICKER_OPTIONS,
  resolveFont,
};
