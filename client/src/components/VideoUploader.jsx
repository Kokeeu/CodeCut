import { useCallback, useRef, useState } from 'react';
import { extractWaveform } from '../lib/waveform.js';
import FullscreenLoader from './FullscreenLoader.jsx';

const MAX_SIZE_MB = 500;
const MAX_FILES = 10;

function generateFilmstrip(videoUrl, duration, numFrames = 20) {
  return new Promise((resolve) => {
    if (!duration || duration <= 0 || numFrames <= 0) { resolve(null); return; }
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.src = videoUrl;

    const timeout = setTimeout(() => resolve(null), 15000);

    video.onloadedmetadata = async () => {
      try {
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (!vw || !vh) { clearTimeout(timeout); resolve(null); return; }
        const frameW = 96;
        const frameH = Math.round((vh / vw) * frameW);
        const canvas = document.createElement('canvas');
        canvas.width = numFrames * frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        const interval = duration / numFrames;

        for (let i = 0; i < numFrames; i++) {
          const t = Math.min(i * interval + interval / 2, Math.max(0, duration - 0.05));
          video.currentTime = Math.max(0, t);
          await new Promise((res) => { video.onseeked = res; });
          ctx.drawImage(video, i * frameW, 0, frameW, frameH);
        }
        clearTimeout(timeout);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } catch (_) {
        clearTimeout(timeout);
        resolve(null);
      }
    };
    video.onerror = () => { clearTimeout(timeout); resolve(null); };
  });
}

function extractMeta(file) {
  return new Promise(async (resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;

    let done = false;
    const finish = async (duration, thumbnail) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      
      let waveform = null;
      let filmstrip = null;
      try {
        waveform = await extractWaveform(url, 200);
      } catch (_) {}
      try {
        filmstrip = await generateFilmstrip(url, duration, 20);
      } catch (_) {}
      
      resolve({ file, url, duration, thumbnail, waveform, filmstrip });
    };

    const timer = setTimeout(() => finish(0, null), 5000);

    const captureFrame = (duration) => {
      try {
        const canvas = document.createElement('canvas');
        const w = 160;
        const h = video.videoWidth > 0 ? Math.round((video.videoHeight / video.videoWidth) * w) : 90;
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        finish(duration, canvas.toDataURL('image/jpeg', 0.6));
      } catch (_) {
        finish(duration, null);
      }
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const t = Math.min(0.5, duration / 2 || 0);
      if (t > 0.01) {
        try {
          video.currentTime = t;
          video.onseeked = () => captureFrame(duration);
        } catch (_) {
          finish(duration, null);
        }
      } else {
        captureFrame(duration);
      }
    };
    video.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      if (!done) { done = true; resolve(null); }
    };
  });
}

export default function VideoUploader({ onFilesAdded, compact }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const validate = (file) => {
    if (!file.type.startsWith('video/')) return `"${file.name}" is not a video.`;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) return `"${file.name}" is too large (${sizeMb.toFixed(0)} MB). Max ${MAX_SIZE_MB} MB.`;
    return null;
  };

  const handleFiles = useCallback(async (fileList) => {
    const list = Array.from(fileList || []).slice(0, MAX_FILES);
    if (list.length === 0) return;
    for (const f of list) {
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setBusy(true);
    try {
      const metas = (await Promise.all(list.map(extractMeta))).filter(Boolean);
      if (metas.length > 0) onFilesAdded(metas);
    } finally {
      setBusy(false);
    }
  }, [onFilesAdded]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="group inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border border-dashed border-glass-border hover:border-accent/50 hover:bg-accent/5 text-xs text-neutral-300 disabled:opacity-50 transition-all duration-150 focus-ring"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-accent/70 group-hover:text-accent transition-colors">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {busy ? 'Loading…' : 'Add videos'}
        </button>
        <input ref={inputRef} type="file" accept="video/*" multiple onChange={onChange} className="hidden" />
        {error && (
          <p className="mt-1.5 text-[11px] text-red-400 px-1 leading-snug">{error}</p>
        )}
        {busy && <FullscreenLoader message="Processing videos…" />}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={[
          'group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-12 text-center transition-all duration-200 overflow-hidden',
          isDragging
            ? 'border-accent bg-accent/10 shadow-glow-accent'
            : 'border-glass-border bg-glass-panel hover:border-accent/40 hover:bg-glass-strong',
        ].join(' ')}
      >
        <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent-soft border border-accent/20 mb-4 group-hover:scale-110 transition-transform duration-300">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-accent">
              <rect x="3" y="6" width="22" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M11 11l6 3-6 3v-6z" fill="currentColor" />
              <path d="M19 19l3 2M19 21l3-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <p className="text-base sm:text-lg font-semibold text-neutral-100">
            {busy ? 'Reading videos…' : 'Drop your videos here'}
          </p>
          <p className="text-sm text-neutral-400 mt-1.5">
            or click to select · multiple files allowed
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-neutral-500">
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">MP4</span>
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">MOV</span>
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">WebM</span>
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">MKV</span>
            <span className="mx-1 text-neutral-700">·</span>
            <span>up to {MAX_FILES} files · {MAX_SIZE_MB} MB each</span>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="video/*" multiple onChange={onChange} className="hidden" />
      </div>
      {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}
      {busy && <FullscreenLoader message="Processing videos…" />}
    </div>
  );
}
