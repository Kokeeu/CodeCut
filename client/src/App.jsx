import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import FilePool from './components/FilePool.jsx';
import VideoPreview from './components/VideoPreview.jsx';
import ClipTrack from './components/ClipTrack.jsx';
import ClipTrim from './components/ClipTrim.jsx';
import ExportButton from './components/ExportButton.jsx';
import ProjectSummary from './components/ProjectSummary.jsx';

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

const DEFAULT_TRANSITION = { type: 'none', durationSec: 0 };

export default function App() {
  const [files, setFiles] = useState([]);
  const [clips, setClips] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [activeClipId, setActiveClipId] = useState(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewRef = useRef(null);

  const fileById = useMemo(() => {
    const m = {};
    files.forEach((f) => { m[f.id] = f; });
    return m;
  }, [files]);

  const activeClip = useMemo(
    () => clips.find((c) => c.id === activeClipId) || null,
    [clips, activeClipId]
  );
  const activeFile = activeClip ? fileById[activeClip.fileId] : null;

  const totalDuration = useMemo(() => {
    let total = clips.reduce((s, c) => s + (c.sourceEnd - c.sourceStart), 0);
    transitions.forEach((t) => {
      if (t && t.type && t.type !== 'none') total -= Number(t.durationSec) || 0;
    });
    return Math.max(0, total);
  }, [clips, transitions]);

  const handleFilesAdded = useCallback((metas) => {
    const newFiles = metas.map((m) => ({
      id: nextId('file'),
      file: m.file,
      url: m.url,
      name: m.file.name,
      duration: m.duration || 0,
      thumbnail: m.thumbnail || null,
    }));
    if (newFiles.length === 0) return;
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    if (clips.length === 0) {
      const first = newFiles.find((f) => f.duration > 0);
      if (first) {
        const clip = { id: nextId('clip'), fileId: first.id, sourceStart: 0, sourceEnd: first.duration };
        setClips([clip]);
        setActiveClipId(clip.id);
      }
    }
  }, [clips.length]);

  const handleAddClip = useCallback((fileId) => {
    const f = fileById[fileId];
    if (!f || !f.duration) return;
    const clip = { id: nextId('clip'), fileId, sourceStart: 0, sourceEnd: f.duration };
    setClips((prev) => [...prev, clip]);
    setTransitions((prev) => [...prev, { ...DEFAULT_TRANSITION }]);
    setActiveClipId(clip.id);
    setCurrentOffset(0);
  }, [fileById]);

  const handleDeleteClip = useCallback((clipId) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    if (idx < 0 || clips.length <= 1) return;
    const next = clips.filter((c) => c.id !== clipId);
    setClips(next);
    setTransitions((tPrev) => {
      const t = [...tPrev];
      t.splice(idx === 0 ? 0 : idx - 1, 1);
      return t;
    });
    if (activeClipId === clipId) {
      const newActive = next[Math.min(idx, next.length - 1)] || null;
      setActiveClipId(newActive ? newActive.id : null);
      setCurrentOffset(0);
    }
  }, [clips, activeClipId]);

  const handleReorder = useCallback((newClips) => {
    setClips(newClips);
  }, []);

  const handleTrimChange = useCallback(({ sourceStart, sourceEnd }) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, sourceStart, sourceEnd } : c))
    );
  }, [activeClipId]);

  const handleSplit = useCallback(() => {
    if (!activeClip) return;
    const clipDur = activeClip.sourceEnd - activeClip.sourceStart;
    if (currentOffset <= 0.05 || currentOffset >= clipDur - 0.05) return;
    const cut = activeClip.sourceStart + currentOffset;
    const idx = clips.findIndex((c) => c.id === activeClip.id);
    if (idx < 0) return;
    const clipA = { ...activeClip, sourceEnd: cut };
    const clipB = {
      id: nextId('clip'),
      fileId: activeClip.fileId,
      sourceStart: cut,
      sourceEnd: activeClip.sourceEnd,
    };
    const next = [...clips];
    next.splice(idx, 1, clipA, clipB);
    setClips(next);
    setTransitions((prev) => {
      const t = [...prev];
      t.splice(idx, 0, { ...DEFAULT_TRANSITION });
      return t;
    });
    setActiveClipId(clipB.id);
    setCurrentOffset(0);
  }, [activeClip, currentOffset, clips]);

  const handleTransitionChange = useCallback((index, value) => {
    setTransitions((prev) => {
      const t = [...prev];
      t[index] = value;
      return t;
    });
  }, []);

  const handleSelectClip = useCallback((clipId) => {
    setActiveClipId(clipId);
    setCurrentOffset(0);
  }, []);

  const handleSeek = useCallback((offsetWithinClip) => {
    previewRef.current?.seekTo(offsetWithinClip);
    setCurrentOffset(offsetWithinClip);
  }, []);

  const handleClipEnded = useCallback(() => {
    const idx = clips.findIndex((c) => c.id === activeClipId);
    if (idx >= 0 && idx < clips.length - 1) {
      setActiveClipId(clips[idx + 1].id);
      setCurrentOffset(0);
    } else {
      setIsPlaying(false);
      if (clips.length > 0) {
        setActiveClipId(clips[0].id);
        setCurrentOffset(0);
        previewRef.current?.seekTo(0);
      }
    }
  }, [clips, activeClipId]);

  const handleReset = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
    setClips([]);
    setTransitions([]);
    setActiveClipId(null);
    setCurrentOffset(0);
    setIsPlaying(false);
  }, [files]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplit();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSplit]);

  return (
    <div className="min-h-full p-6 md:p-8">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Codecut 9:16</h1>
          <p className="text-sm text-slate-400">
            Multi-clip vertical editor · split, reorder, transitions, export 1080×1920.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">v0.2 · multi-clip</div>
      </header>

      {files.length === 0 ? (
        <main className="max-w-5xl mx-auto">
          <VideoUploader onFilesAdded={handleFilesAdded} compact={false} />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-2xl mb-1">1</div>
              <div className="font-semibold text-slate-200">Upload</div>
              <p>Sube uno o varios videos (hasta 10, 500 MB c/u).</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-2xl mb-1">2</div>
              <div className="font-semibold text-slate-200">Edit</div>
              <p>Corta con <span className="font-mono text-slate-200">S</span>, reordena arrastrando, ajusta trim y transiciones.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-2xl mb-1">3</div>
              <div className="font-semibold text-slate-200">Export</div>
              <p>FFmpeg compone todo a un MP4 vertical 1080×1920.</p>
            </div>
          </div>
        </main>
      ) : (
        <main className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
            <section>
              <VideoPreview
                ref={previewRef}
                clip={activeClip}
                fileUrl={activeFile ? activeFile.url : null}
                isPlaying={isPlaying}
                onTimeUpdate={setCurrentOffset}
                onClipEnded={handleClipEnded}
                onPlayStateChange={setIsPlaying}
              />
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium"
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                  onClick={handleSplit}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                  title="Split active clip at playhead (S)"
                >
                  ✂ Split
                </button>
                <button
                  onClick={() => activeClip && handleDeleteClip(activeClip.id)}
                  disabled={clips.length <= 1}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🗑 Delete clip
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium"
                >
                  Reset project
                </button>
              </div>
            </section>

            <section className="flex flex-col gap-4 min-w-0">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Media pool</h2>
                <FilePool files={files} onAddClip={handleAddClip} onFilesAdded={handleFilesAdded} />
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Trim active clip</h2>
                {activeClip && activeFile ? (
                  <ClipTrim
                    clip={activeClip}
                    fileDuration={activeFile.duration}
                    currentOffset={currentOffset}
                    onChange={handleTrimChange}
                    onSeek={handleSeek}
                  />
                ) : (
                  <p className="text-xs text-slate-500">Select a clip in the timeline.</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Export</h2>
                <ProjectSummary files={files} clips={clips} totalDuration={totalDuration} />
                <div className="mt-3">
                  <ExportButton files={files} clips={clips} transitions={transitions} />
                </div>
              </div>
            </section>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Timeline</h2>
              <span className="text-xs text-slate-500">Drag clips to reorder · click seam for transitions</span>
            </div>
            <ClipTrack
              clips={clips}
              activeClipId={activeClipId}
              transitions={transitions}
              fileById={fileById}
              onSelect={handleSelectClip}
              onDelete={handleDeleteClip}
              onReorder={handleReorder}
              onTransitionChange={handleTransitionChange}
            />
          </div>
        </main>
      )}
    </div>
  );
}
