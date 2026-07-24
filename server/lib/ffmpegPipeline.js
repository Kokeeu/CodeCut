const { getAtempoChain } = require('./speed.js');
const { getAnimation } = require('./textAnimations.js');

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

const MAIN_Y = 360;

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REGISTRY = {
  inter: path.join(FONTS_DIR, 'Inter-Bold.ttf'),
  montserrat: path.join(FONTS_DIR, 'Montserrat-Bold.ttf'),
  bebasneue: path.join(FONTS_DIR, 'BebasNeue-Regular.ttf'),
  poppins: path.join(FONTS_DIR, 'Poppins-Bold.ttf'),
  oswald: path.join(FONTS_DIR, 'Oswald-Bold.ttf'),
  pacifico: path.join(FONTS_DIR, 'Pacifico-Regular.ttf'),
  anton: path.join(FONTS_DIR, 'Anton-Regular.ttf'),
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
  { value: 'poppins', label: 'Poppins' },
  { value: 'oswald', label: 'Oswald' },
  { value: 'pacifico', label: 'Pacifico' },
  { value: 'anton', label: 'Anton' },
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

function buildFilterGraph(clips, transitions, meta, textFiles, exportConfig) {
  const filters = [];
  const outV = 'vout';
  const outA = 'aout';
  const blurSigma = Math.max(0, Math.min(200, Number(meta && meta.blur) || 0));
  const blurEnabled = !(meta && meta.blurEnabled === false);

  const resolution = exportConfig?.resolution || '1080';
  const OUTPUT_W_DYN = resolution === '720' ? 720 : 1080;
  const OUTPUT_H_DYN = resolution === '720' ? 1280 : 1920;
  const MAIN_Y_DYN = resolution === '720' ? 240 : 360;
  const MAIN_MAX_W = OUTPUT_W_DYN;

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const s = Number(c.sourceStart).toFixed(3);
    const e = Number(c.sourceEnd).toFixed(3);
    const speed = Number(c.speed) || 1;

    let videoFilter = `[${i}:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS`;
    if (speed !== 1) {
      videoFilter += `,setpts=PTS/${speed}`;
    }
    videoFilter += `,fps=${OUTPUT_FPS},format=yuv420p[s${i}raw]`;
    filters.push(videoFilter);

    const audio = c.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 };
    const clipDur = (Number(c.sourceEnd) - Number(c.sourceStart)) / speed;
    
    let audioFilter = `[${i}:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,aresample=${AUDIO_RATE}`;
    if (speed !== 1) {
      const atempoChain = getAtempoChain(speed);
      if (atempoChain.length > 0) {
        audioFilter += `,${atempoChain.join(',')}`;
      }
    }
    if (audio.mute) {
      audioFilter += `,volume=0`;
    } else {
      if (audio.volume !== 1) {
        const safeVolume = Math.max(0, Math.min(1, audio.volume));
        audioFilter += `,volume=${safeVolume}`;
      }
      if (audio.fadeIn > 0) {
        const safeFadeIn = Math.min(audio.fadeIn, clipDur / 2);
        audioFilter += `,afade=t=in:st=0:d=${safeFadeIn.toFixed(3)}`;
      }
      if (audio.fadeOut > 0) {
        const safeFadeOut = Math.min(audio.fadeOut, clipDur / 2);
        const fadeStart = Math.max(0, clipDur - safeFadeOut);
        audioFilter += `,afade=t=out:st=${fadeStart.toFixed(3)}:d=${safeFadeOut.toFixed(3)}`;
      }
    }
    audioFilter += `[a${i}]`;
    filters.push(audioFilter);

    const tr = normalizeTransform(c.transform);
    const mainW = Math.max(2, Math.round(MAIN_MAX_W * tr.scale));
    const xExpr = `(W-w)/2${fmtSigned(tr.x)}`;
    const yExpr = `${MAIN_Y_DYN}${fmtSigned(tr.y)}`;
    if (blurEnabled) {
      filters.push(`[s${i}raw]split=2[m${i}][bgr${i}]`);
      filters.push(`[m${i}]scale=${mainW}:-2:flags=lanczos,setsar=1[m${i}f]`);
      const bgBlur = blurSigma > 0 ? `,gblur=sigma=${blurSigma}` : '';
      filters.push(
        `[bgr${i}]scale=${OUTPUT_W_DYN}:${OUTPUT_H_DYN}:force_original_aspect_ratio=increase:flags=lanczos,crop=${OUTPUT_W_DYN}:${OUTPUT_H_DYN}${bgBlur},eq=brightness=${BG_BRIGHTNESS}:saturation=${BG_SATURATION}[bg${i}]`
      );
    } else {
      filters.push(`[s${i}raw]scale=${mainW}:-2:flags=lanczos,setsar=1[m${i}f]`);
      filters.push(
        `color=c=black:s=${OUTPUT_W_DYN}x${OUTPUT_H_DYN}:r=${OUTPUT_FPS}:d=${clipDur.toFixed(3)}[bg${i}]`
      );
    }
    filters.push(`[bg${i}][m${i}f]overlay=x=${xExpr}:y=${yExpr}[c${i}]`);
  }

  const composedStart = [];
  const clipDurations = clips.map((c) => (Number(c.sourceEnd) - Number(c.sourceStart)) / (Number(c.speed) || 1));

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
      const maxDur = Math.max(0, Math.min(clipDurations[i], clipDurations[i + 1]) - 0.02);
      const reqDur = t && t.type && t.type !== 'none' ? Number(t.durationSec) || 0 : 0;
      const effDur = Math.min(reqDur, maxDur);
      const hasTransition = t && t.type && t.type !== 'none' && effDur > 0;

      if (!hasTransition) {
        filters.push(
          `[${curV}][${curA}][${nextV}][${nextA}]concat=n=2:v=1:a=1[${vLabel}][${aLabel}]`
        );
      } else {
        const dur = effDur.toFixed(3);
        const offset = Math.max(0, cumDuration + clipDurations[i] - effDur).toFixed(3);
        filters.push(
          `[${curV}][${nextV}]xfade=transition=${t.type}:duration=${dur}:offset=${offset}[${vLabel}]`
        );
        filters.push(
          `[${curA}][${nextA}]acrossfade=d=${dur}:c1=tri:c2=tri[${aLabel}]`
        );
      }

      curV = vLabel;
      curA = aLabel;
      cumDuration += clipDurations[i];
      if (hasTransition) cumDuration -= effDur;
      composedStart.push(cumDuration);
    }
  }

  let prevLabel = 'vc';
  const scaleFactor = OUTPUT_W_DYN / 1080;
  clips.forEach((clip, ci) => {
    const clipStart = composedStart[ci];
    const speed = Number(clip.speed) || 1;
    let ti = 0;
    (clip.texts || []).forEach((t) => {
      const content = t && t.text != null ? String(t.text) : '';
      if (!content.trim()) { ti++; return; }
      const key = `c${ci}-t${ti}`;
      ti++;
      const fp = textFiles && textFiles[key];
      if (!fp) return;
      const size = Math.max(8, Math.min(400, Number(t.size) || 60)) * scaleFactor;
      const tx = Math.round((Number(t.x) || 0) * scaleFactor);
      const ty = Math.round((Number(t.y) || 0) * scaleFactor);
      const fcolor = colorToHex(t.color);
      const ffile = escapeFilterPath(resolveFont(t.font));
      const out = `vt${ti}`;
      const startOff = (Number(t.startOffset) || 0) / speed;
      const endOff = (Number(t.endOffset) || (clip.sourceEnd - clip.sourceStart)) / speed;
      const enableStart = (clipStart + startOff).toFixed(3);
      const enableEnd = (clipStart + endOff).toFixed(3);
      const align = t.align || 'left';

      let xExpr = align === 'center' ? '(w-text_w)/2' : String(tx);
      let yExpr = String(ty);
      let sizeExpr = String(size);
      let alphaExpr = '1';

      if (t.animation && t.animation.type) {
        const animDur = Number(t.animation.duration) || 0.5;
        const animDef = getAnimation(t.animation.type);
        const sExpr = enableStart;

        if (animDef.getFfmpegY) {
          yExpr = animDef.getFfmpegY(ty, animDur);
        }
        if (animDef.getFfmpegX) {
          xExpr = animDef.getFfmpegX(tx, animDur);
        }
        if (animDef.getFfmpegFontSize) {
          sizeExpr = animDef.getFfmpegFontSize(size, animDur);
        }
        if (animDef.getFfmpegEnable) {
          alphaExpr = animDef.getFfmpegEnable(animDur);
        }
      }

      const enableExpr = `between(t,${enableStart},${enableEnd})`;
      const fullEnable = alphaExpr !== '1'
        ? `if(${enableExpr},${alphaExpr},0)`
        : enableExpr;

      let drawtextOpts = `textfile='${escapeFilterPath(fp)}':x=${xExpr}:y=${yExpr}:fontsize=${sizeExpr}:fontcolor=${fcolor}:fontfile='${ffile}':text_align=${align}:alpha='${fullEnable}'`;

      if (t.strokeEnabled && t.strokeWidth > 0) {
        drawtextOpts += `:borderw=${Math.round((Number(t.strokeWidth) || 2) * scaleFactor)}:bordercolor=${colorToHex(t.strokeColor)}`;
      } else {
        drawtextOpts += `:shadowcolor=black@0.75:shadowx=${Math.round(3 * scaleFactor)}:shadowy=${Math.round(3 * scaleFactor)}`;
      }

      if (t.bgEnabled) {
        const bgPadding = Math.round((Number(t.bgPadding) || 12) * scaleFactor);
        const bgOpacity = Number(t.bgOpacity ?? 0.7);
        const bgColorHex = colorToHex(t.bgColor).replace('0x', '');
        const bgAlpha = Math.round(bgOpacity * 255).toString(16).padStart(2, '0');
        drawtextOpts += `:box=1:boxborderw=${bgPadding}:boxcolor=0x${bgColorHex}${bgAlpha}`;
      }

      if (t.rotation) {
        const angleRad = (Number(t.rotation) || 0) * Math.PI / 180;
        drawtextOpts += `:angle=${angleRad.toFixed(4)}`;
      }

      filters.push(`[${prevLabel}]drawtext=${drawtextOpts}[${out}]`);
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

function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseFloat(parts[0]) || 0;
  const minutes = parseFloat(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function runPipeline({ inputPaths, clips, transitions, meta, outputPath, onLog, onProgress, exportConfig }) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const textFiles = writeTextFiles(clips, runId);
  const filterGraph = buildFilterGraph(clips, transitions, meta, textFiles, exportConfig);

  const totalDuration = clips.reduce((sum, c) => {
    return sum + (Number(c.sourceEnd) - Number(c.sourceStart)) / (Number(c.speed) || 1);
  }, 0);

  const resolution = exportConfig?.resolution || '1080';
  const fps = exportConfig?.fps || 30;
  const quality = exportConfig?.quality || 'high';
  const crfMap = { medium: 23, high: 20, ultra: 16 };
  const crf = crfMap[quality] || 20;

  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    inputPaths.forEach((p) => command.input(p));

    command
      .complexFilter(filterGraph, ['vout', 'aout'])
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        `-crf ${crf}`,
        `-r ${fps}`,
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
        
        if (onProgress && totalDuration > 0) {
          const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
          if (timeMatch) {
            const currentTime = parseTimeToSeconds(timeMatch[1]);
            const progress = Math.min(1, currentTime / totalDuration);
            onProgress(progress);
          }
        }
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
        if (onProgress) onProgress(1);
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
