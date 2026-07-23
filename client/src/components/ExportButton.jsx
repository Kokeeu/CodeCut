import { useState } from 'react';

export default function ExportButton({ files, clips, transitions, meta }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

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
    setProgress(0);

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
        pip: c.pip || null,
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

      const { jobId } = await res.json();

      const eventSource = new EventSource(`/api/trim/progress/${jobId}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgress(data.progress);
        
        if (data.status === 'ready') {
          eventSource.close();
          setStatus('downloading');
          
          fetch(`/api/trim/download/${jobId}`)
            .then((dlRes) => {
              if (!dlRes.ok) throw new Error('Download failed');
              return dlRes.blob();
            })
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `codecut-9x16-${Date.now()}.mp4`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              setStatus('done');
              setTimeout(() => {
                setStatus('idle');
                setProgress(0);
              }, 2500);
            })
            .catch((err) => {
              throw err;
            });
        } else if (data.status === 'error') {
          eventSource.close();
          throw new Error(data.error || 'Processing failed');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        throw new Error('Connection lost');
      };
    } catch (e) {
      console.error(e);
      setError(e.message || 'Export failed');
      setStatus('idle');
      setProgress(0);
    }
  };

  const labels = {
    idle: 'Export 9:16 MP4',
    uploading: 'Uploading...',
    processing: `Processing... ${Math.round(progress * 100)}%`,
    downloading: 'Preparing download...',
    done: 'Done ✓',
  };

  return (
    <div className="flex flex-col items-center gap-3">
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
      
      {status === 'processing' && (
        <div className="w-full max-w-md">
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-400">
            <span>Processing video</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
        </div>
      )}
      
      {error && <p className="text-sm text-red-400 max-w-md text-center">{error}</p>}
    </div>
  );
}
