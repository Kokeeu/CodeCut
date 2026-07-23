import { useCallback, useRef, useState } from 'react';
import { extractWaveform } from '../lib/waveform.js';

const MAX_SIZE_MB = 500;
const MAX_FILES = 10;

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
      try {
        waveform = await extractWaveform(url, 200);
      } catch (_) {}
      
      resolve({ file, url, duration, thumbnail, waveform });
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
      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 rounded-lg border border-dashed border-editor-border hover:border-accent text-xs text-neutral-300 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Loading…' : '+ Add videos'}
        </button>
        <input ref={inputRef} type="file" accept="video/*" multiple onChange={onChange} className="hidden" />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
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
          'cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          isDragging ? 'border-accent bg-accent/10' : 'border-editor-border bg-editor-panel hover:border-neutral-600',
        ].join(' ')}
      >
        <div className="text-4xl mb-3">🎬</div>
        <p className="text-lg font-semibold">{busy ? 'Reading videos…' : 'Drag your videos here'}</p>
        <p className="text-sm text-neutral-400 mt-1">or click to select (multiple allowed)</p>
        <p className="text-xs text-neutral-500 mt-4">MP4, MOV, WebM, MKV · up to {MAX_FILES} files · {MAX_SIZE_MB} MB each</p>
        <input ref={inputRef} type="file" accept="video/*" multiple onChange={onChange} className="hidden" />
      </div>
      {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}
    </div>
  );
}
