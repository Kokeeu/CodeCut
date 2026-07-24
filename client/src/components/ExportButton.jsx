import { useState, useEffect, useRef } from 'react';

const PLATFORM_PRESETS = {
  tiktok: { label: 'TikTok', resolution: '1080', fps: 30, icon: '📱' },
  reels: { label: 'Reels', resolution: '1080', fps: 30, icon: '📸' },
  shorts: { label: 'Shorts', resolution: '1080', fps: 60, icon: '▶️' },
  custom: { label: 'Custom', resolution: '1080', fps: 30, icon: '⚙️' },
};

const RESOLUTIONS = [
  { value: '720', label: '720p (720x1280)' },
  { value: '1080', label: '1080p (1080x1920)' },
];

const FPS_OPTIONS = [
  { value: 24, label: '24 fps' },
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
];

const QUALITY_OPTIONS = [
  { value: 'medium', label: 'Medium (smaller file)' },
  { value: 'high', label: 'High (recommended)' },
  { value: 'ultra', label: 'Ultra (best quality)' },
];

export default function ExportButton({ files, clips, transitions, meta, exportConfig, onExportConfigChange, compact }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef(null);

  const disabled = clips.length === 0 || files.length === 0;
  const config = exportConfig || { resolution: '1080', fps: 30, quality: 'high', platform: 'tiktok' };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  const updateConfig = (partial) => {
    const next = { ...config, ...partial };
    onExportConfigChange?.(next);
  };

  const applyPreset = (platform) => {
    const preset = PLATFORM_PRESETS[platform];
    if (preset && platform !== 'custom') {
      updateConfig({ platform, resolution: preset.resolution, fps: preset.fps });
    } else {
      updateConfig({ platform });
    }
  };

  const onExport = async () => {
    if (disabled) return;
    setShowSettings(false);

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
      form.append('exportConfig', JSON.stringify(config));

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
              a.download = `codecut-${config.resolution}p-${Date.now()}.mp4`;
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
    idle: `Export ${config.resolution}p ${config.fps}fps`,
    uploading: 'Uploading...',
    processing: `Processing... ${Math.round(progress * 100)}%`,
    downloading: 'Preparing download...',
    done: 'Done ✓',
  };

  if (compact) {
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setShowSettings((s) => !s)}
          disabled={disabled || status !== 'idle'}
          className={[
            'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
            'bg-accent hover:bg-accent-hover text-white',
            'disabled:bg-editor-surface disabled:text-neutral-500 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {status === 'processing' ? `${Math.round(progress * 100)}%` : labels[status] || labels.idle}
        </button>

        {showSettings && status === 'idle' && (
          <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-editor-panel border border-editor-border shadow-2xl z-50">
            <div className="text-[11px] font-semibold text-neutral-200 mb-2">Export settings</div>

            <div className="mb-2">
              <div className="text-[9px] text-neutral-500 mb-1">Platform</div>
              <div className="grid grid-cols-4 gap-1">
                {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={[
                      'px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors border',
                      config.platform === key
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-editor-border bg-editor-surface text-neutral-400 hover:border-neutral-600',
                    ].join(' ')}
                  >
                    <div className="text-base">{preset.icon}</div>
                    <div className="truncate">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-[9px] text-neutral-500 mb-0.5">Resolution</div>
                <select
                  value={config.resolution}
                  onChange={(e) => { updateConfig({ resolution: e.target.value, platform: 'custom' }); }}
                  className="w-full px-2 py-1 rounded text-[10px]"
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[9px] text-neutral-500 mb-0.5">Frame rate</div>
                <select
                  value={config.fps}
                  onChange={(e) => { updateConfig({ fps: Number(e.target.value), platform: 'custom' }); }}
                  className="w-full px-2 py-1 rounded text-[10px]"
                >
                  {FPS_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-[9px] text-neutral-500 mb-0.5">Quality</div>
              <select
                value={config.quality}
                onChange={(e) => updateConfig({ quality: e.target.value })}
                className="w-full px-2 py-1 rounded text-[10px]"
              >
                {QUALITY_OPTIONS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={onExport}
              disabled={disabled}
              className="w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="absolute left-0 right-0 top-full mt-1">
            <div className="relative h-1 bg-editor-border rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-accent transition-all duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3">
      <button
        onClick={() => setShowSettings((s) => !s)}
        disabled={disabled || status !== 'idle'}
        className={[
          'px-6 py-3 rounded-xl font-semibold transition-all',
          'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20',
          'disabled:bg-editor-surface disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none',
        ].join(' ')}
      >
        {labels[status] || labels.idle}
      </button>

      {showSettings && status === 'idle' && (
        <div className="w-full max-w-md p-4 rounded-xl bg-editor-panel border border-editor-border">
          <div className="text-xs font-semibold text-neutral-200 mb-3">Export settings</div>

          <div className="mb-3">
            <div className="text-[10px] text-neutral-500 mb-1.5">Platform preset</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={[
                    'px-2 py-2 rounded-lg text-xs font-medium transition-colors border',
                    config.platform === key
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-editor-border bg-editor-surface text-neutral-400 hover:border-neutral-600',
                  ].join(' ')}
                >
                  <div className="text-lg">{preset.icon}</div>
                  <div>{preset.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[10px] text-neutral-500 mb-1">Resolution</div>
              <select
                value={config.resolution}
                onChange={(e) => { updateConfig({ resolution: e.target.value, platform: 'custom' }); }}
                className="w-full px-3 py-1.5 rounded text-xs"
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 mb-1">Frame rate</div>
              <select
                value={config.fps}
                onChange={(e) => { updateConfig({ fps: Number(e.target.value), platform: 'custom' }); }}
                className="w-full px-3 py-1.5 rounded text-xs"
              >
                {FPS_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[10px] text-neutral-500 mb-1">Quality</div>
            <select
              value={config.quality}
              onChange={(e) => updateConfig({ quality: e.target.value })}
              className="w-full px-3 py-1.5 rounded text-xs"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onExport}
            disabled={disabled}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Export
          </button>
        </div>
      )}

      {status === 'processing' && (
        <div className="w-full max-w-md">
          <div className="relative h-2 bg-editor-border rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-neutral-400">
            <span>Processing video</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400 max-w-md text-center">{error}</p>}
    </div>
  );
}
