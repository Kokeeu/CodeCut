import { useState } from 'react';

export default function ExportButton({ files, clips, transitions, meta }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const disabled = clips.length === 0 || files.length === 0;

  const onExport = async () => {
    if (disabled) return;
    
    const missingFiles = files.filter((f) => !f.file);
    if (missingFiles.length > 0) {
      setError('Some video files are missing. Please re-upload them after loading a project.');
      return;
    }
    
    setStatus('uploading');
    setError(null);

    try {
      const form = new FormData();
      const fileIndexById = {};
      files.forEach((f, i) => {
        fileIndexById[f.id] = i;
        form.append('videos', f.file, f.name);
      });

      const clipsPayload = clips.map((c) => ({
        id: c.id,
        fileIndex: fileIndexById[c.fileId],
        sourceStart: c.sourceStart,
        sourceEnd: c.sourceEnd,
        speed: c.speed || 1,
        duration: (c.sourceEnd - c.sourceStart) / (c.speed || 1),
        transform: c.transform || { x: 0, y: 0, scale: 1 },
        audio: c.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 },
        texts: (c.texts || []).map((t) => ({
          ...t,
          animation: t.animation || null,
        })),
      }));

      const transitionsMap = {};
      clips.forEach((c, i) => {
        if (i < clips.length - 1) {
          const t = transitions[i] || { type: 'none', durationSec: 0 };
          transitionsMap[`${c.id}|${clips[i + 1].id}`] = {
            type: t.type,
            durationSec: Number(t.durationSec) || 0,
          };
        }
      });

      form.append('clips', JSON.stringify(clipsPayload));
      form.append('transitions', JSON.stringify(transitionsMap));
      form.append('meta', JSON.stringify(meta || {}));

      setStatus('processing');
      const res = await fetch('/api/trim', { method: 'POST', body: form });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Request failed (${res.status})`;
        try {
          const json = JSON.parse(text);
          if (json.error) msg = json.error;
        } catch (_) {
          if (text) msg = text;
        }
        throw new Error(msg);
      }

      setStatus('downloading');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codecut-9x16-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Export failed');
      setStatus('idle');
    }
  };

  const labels = {
    idle: 'Export 9:16 MP4',
    uploading: 'Uploading...',
    processing: 'Composing with FFmpeg...',
    downloading: 'Preparing download...',
    done: 'Done ✓',
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onExport}
        disabled={disabled || status !== 'idle'}
        className={[
          'px-6 py-3 rounded-xl font-semibold transition-all',
          'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-900/40',
          'disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none',
        ].join(' ')}
      >
        {labels[status] || labels.idle}
      </button>
      {error && <p className="mt-2 text-sm text-red-400 max-w-md text-center">{error}</p>}
    </div>
  );
}
