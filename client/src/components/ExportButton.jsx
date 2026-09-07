import { useState, useEffect, useRef } from 'react';
import { renderCollaborativeOverlay } from '../lib/collaborativeRanking.js';
import useExportJob from '../hooks/useExportJob.js';
import { createExportFormData } from '../lib/exportRequest.js';
import {
  DEFAULT_EXPORT_CONFIG,
  FPS_OPTIONS,
  PLATFORM_PRESETS,
  QUALITY_OPTIONS,
  RESOLUTIONS,
  getExportEncodingSummary,
} from '../lib/exportSettings.js';

function formatProgress(progress) {
  const percent = Math.max(0, Math.min(100, progress * 100));
  if (percent > 0 && percent < 1) return '<1%';
  if (percent < 10) return `${percent.toFixed(1)}%`;
  return `${Math.round(percent)}%`;
}

export default function ExportButton({ files, clips, transitions, meta, exportConfig, onExportConfigChange, compact }) {
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef(null);

  const disabled = clips.length === 0 || files.length === 0;
  const config = exportConfig || DEFAULT_EXPORT_CONFIG;
  const { status, error, progress, start, cancel: cancelExport, fail } = useExportJob(config);
  const encodingSummary = getExportEncodingSummary(config);
  const progressLabel = formatProgress(progress);

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
      updateConfig({
        platform,
        resolution: preset.resolution,
        fps: preset.fps,
        quality: preset.quality,
      });
    } else {
      updateConfig({ platform });
    }
  };

  const onExport = async () => {
    if (disabled) return;
    setShowSettings(false);

    const missingFiles = files.filter((f) => !f.file);
    if (missingFiles.length > 0) {
      fail(new Error('Some video files are missing. Please re-upload them after loading a project.'));
      return;
    }

    await start(async () => {
      const ratingOverlayBlobs = await Promise.all(
        clips.map((clip) => renderCollaborativeOverlay(meta, clip))
      );
      return createExportFormData({
        files,
        clips,
        transitions,
        meta,
        exportConfig: config,
        ratingOverlayBlobs,
      });
    });
  };

  const labels = {
    idle: `Export ${config.resolution}p ${config.fps}fps`,
    uploading: 'Uploading...',
    processing: `Processing... ${progressLabel}`,
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
          <span>{progressLabel}</span>
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
          {(status === 'uploading' || status === 'processing') ? progressLabel : labels[status] || labels.idle}
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
              {config.platform === 'tiktok' && (
                <div className="mt-1.5 text-[9px] leading-relaxed text-neutral-500">
                  Recommended preset: 1080x1920. TikTok API limit: 2304x4096 at 9:16 and 60 fps.
                </div>
              )}
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
                  <option key={q.value} value={q.value}>{q.label} · {q.description}</option>
                ))}
              </select>
              <div className="mt-1 text-[9px] leading-relaxed text-neutral-500">
                H.264 VBR · CRF {encodingSummary.crf} · up to {encodingSummary.maxVideoBitrateMbps} Mbps · AAC {encodingSummary.audioBitrateKbps} kbps
              </div>
              {encodingSummary.width >= 2160 && (
                <div className="mt-1 text-[9px] leading-relaxed text-amber-400/80">
                  4K CPU export is intensive. Use 1080p High for a much faster TikTok-ready file.
                </div>
              )}
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
                {progressLabel}
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

        {error && status === 'idle' && !showSettings && (
          <div className="absolute right-0 top-full mt-2 w-72 p-2.5 rounded-lg bg-red-950/95 border border-red-800 text-[11px] leading-relaxed text-red-200 shadow-2xl z-50">
            {error}
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
            {config.platform === 'tiktok' && (
              <div className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                Recommended preset: 1080x1920. TikTok accepts up to 2304x4096 at 9:16 and 60 fps through its API.
              </div>
            )}
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
                <option key={q.value} value={q.value}>{q.label} · {q.description}</option>
              ))}
            </select>
            <div className="mt-1.5 text-[10px] leading-relaxed text-neutral-500">
              H.264 constrained VBR · CRF {encodingSummary.crf} · up to {encodingSummary.maxVideoBitrateMbps} Mbps
              {' · '}AAC {encodingSummary.audioBitrateKbps} kbps
              {' · '}≤~{encodingSummary.maxMegabytesPerMinute} MB/min
            </div>
            {encodingSummary.width >= 2160 && (
              <div className="mt-1.5 text-[10px] leading-relaxed text-amber-400/80">
                4K CPU export is intensive and can take several minutes. 1080p High is recommended for TikTok.
              </div>
            )}
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
