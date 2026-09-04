import { useState, useEffect, useRef } from 'react';
import { sanitizeTransition } from '../lib/transitions.js';

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
  const eventSourceRef = useRef(null);
  const jobIdRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

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

  const resetExport = () => {
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  const cancelExport = () => {
    if (jobIdRef.current) {
      fetch(`/api/trim/${jobIdRef.current}`, { method: 'DELETE' }).catch(() => {});
      jobIdRef.current = null;
    }
    resetExport();
  };

  const handleDownload = (jobId) => {
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
          resetExport();
        }, 2500);
      })
      .catch((err) => {
        console.error('Download error:', err);
        setError(err.message || 'Download failed');
        resetExport();
      });
  };

  const setupEventSource = (jobId) => {
    setStatus('processing');
    setProgress(0);

    const eventSource = new EventSource(`/api/trim/progress/${jobId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newProgress = Number(data.progress);
        if (Number.isFinite(newProgress)) {
          setProgress(newProgress);
        }

        if (data.status === 'ready') {
          eventSource.close();
          eventSourceRef.current = null;
          jobIdRef.current = null;
          handleDownload(jobId);
        } else if (data.status === 'error') {
          eventSource.close();
          eventSourceRef.current = null;
          jobIdRef.current = null;
          setError(data.error || 'Processing failed');
          resetExport();
        }
      } catch (err) {
        console.error('Error parsing progress data:', err);
      }
    };

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        return;
      }
      eventSource.close();
      eventSourceRef.current = null;
      jobIdRef.current = null;
      setError('Connection lost');
      resetExport();
    };
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
        pip: c.pip?.enabled && Number.isInteger(fileIndexById[c.pip.fileId])
          ? {
              enabled: true,
              fileIndex: fileIndexById[c.pip.fileId],
              position: c.pip.position || 'bottom-right',
              size: c.pip.size || 30,
              opacity: c.pip.opacity ?? 1,
              border: c.pip.border ?? true,
              borderWidth: c.pip.borderWidth || 4,
              borderRadius: c.pip.borderRadius || 8,
            }
          : null,
        texts: (c.texts || []).map((t) => ({
          ...t,
          animation: t.animation || null,
        })),
      }));

      const transitionsMap = {};
      clips.forEach((c, i) => {
        if (i < clips.length - 1) {
          const t = sanitizeTransition(transitions[i]);
          transitionsMap[`${c.id}|${clips[i + 1].id}`] = {
            type: t.type,
            durationSec: t.durationSec,
          };
        }
      });

      form.append('clips', JSON.stringify(clipsPayload));
      form.append('transitions', JSON.stringify(transitionsMap));
      form.append('meta', JSON.stringify(meta || {}));
      form.append('exportConfig', JSON.stringify(config));

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
      jobIdRef.current = jobId;
      setupEventSource(jobId);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Export failed');
      resetExport();
    }
  };

  const labels = {
    idle: `Export ${config.resolution}p ${config.fps}fps`,
    uploading: 'Uploading...',
    processing: `Processing... ${Math.round(progress * 100)}%`,
    downloading: 'Preparing download...',
    done: 'Done ✓',
  };

  const renderProgressBar = (showLabel = true) => (
    <div className="w-full">
      <div className="relative h-2 bg-editor-border rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-neutral-400">
          <span>{status === 'uploading' ? 'Uploading' : 'Processing'}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}
    </div>
  );

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
          {(status === 'uploading' || status === 'processing') ? `${Math.round(progress * 100)}%` : labels[status] || labels.idle}
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

        {(status === 'uploading' || status === 'processing') && (
          <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-editor-panel border border-editor-border shadow-2xl z-50">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-semibold text-neutral-200">
                {status === 'uploading' ? 'Uploading' : 'Processing'}
              </div>
              <div className="text-[11px] font-mono text-accent">
                {Math.round(progress * 100)}%
              </div>
            </div>
            <div className="relative h-1.5 bg-editor-border rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <button
              onClick={cancelExport}
              className="mt-2.5 w-full py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-[11px] font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Cancel Export
            </button>
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

      {(status === 'uploading' || status === 'processing') && (
        <div className="w-full max-w-md">
          {renderProgressBar(true)}
          <button
            onClick={cancelExport}
            className="mt-2 w-full px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-xs text-white font-medium transition-colors"
          >
            Cancel Export
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 max-w-md text-center">{error}</p>}
    </div>
  );
}
