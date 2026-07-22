import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import FilePool from './components/FilePool.jsx';
import VideoPreview from './components/VideoPreview.jsx';
import ClipTrack from './components/ClipTrack.jsx';
import ClipTrim from './components/ClipTrim.jsx';
import CardMetadata from './components/CardMetadata.jsx';
import CardTemplateGrid from './components/CardTemplateGrid.jsx';
import ExportButton from './components/ExportButton.jsx';
import ProjectSummary from './components/ProjectSummary.jsx';

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

const DEFAULT_TRANSITION = { type: 'none', durationSec: 0 };
const DEFAULT_TRANSFORM = { x: 0, y: 0, scale: 1 };
const DEFAULT_META = { blur: 30, blurEnabled: true };

const EXAMPLE_CARDS = [
  { headerText: 'Openings favs', animeTitle: "Cruel Angel's Thesis", openingNumber: 'Ep 1', songName: "A Cruel Angel's Thesis", artistName: 'Yoko Takahashi', font: 'inter', color: '#ffffff', blur: 30, blurEnabled: true, transform: { x: 0, y: 0, scale: 1 } },
  { headerText: 'Openings favs', animeTitle: 'Unravel', openingNumber: 'Ep 1', songName: 'Unravel', artistName: 'TK from Ling Tosite Sigure', font: 'montserrat', color: '#ffeb3b', blur: 40, blurEnabled: true, transform: { x: 0, y: 0, scale: 1 } },
  { headerText: 'Openings favs', animeTitle: 'THE HERO!!', openingNumber: 'Ep 1', songName: 'THE HERO!! ~Ikareru Ken ni Honō o Tsukero~', artistName: 'JAM Project', font: 'bebasneue', color: '#ff5252', blur: 35, blurEnabled: true, transform: { x: 0, y: 0, scale: 1 } },
  { headerText: 'Openings favs', animeTitle: 'Gurenge', openingNumber: 'Ep 1', songName: 'Gurenge', artistName: 'LiSA', font: 'inter', color: '#e040fb', blur: 45, blurEnabled: true, transform: { x: 0, y: 0, scale: 1 } },
];

export default function App() {
  const [files, setFiles] = useState([]);
  const [clips, setClips] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [activeClipId, setActiveClipId] = useState(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [selectedTextId, setSelectedTextId] = useState(null);
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

  const activeClipDuration = useMemo(() => {
    if (!activeClip) return 0;
    return Math.max(0, activeClip.sourceEnd - activeClip.sourceStart);
  }, [activeClip]);

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
        const clip = { id: nextId('clip'), fileId: first.id, sourceStart: 0, sourceEnd: first.duration, transform: { ...DEFAULT_TRANSFORM }, texts: [] };
        setClips([clip]);
        setActiveClipId(clip.id);
      }
    }
  }, [clips.length]);

  const handleAddClip = useCallback((fileId) => {
    const f = fileById[fileId];
    if (!f || !f.duration) return;
    const clip = { id: nextId('clip'), fileId, sourceStart: 0, sourceEnd: f.duration, transform: { ...DEFAULT_TRANSFORM }, texts: [] };
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

  const handleTransformChange = useCallback((transform) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, transform } : c))
    );
  }, [activeClipId]);

  const handleAddText = useCallback(() => {
    if (!activeClipId) return;
    const id = nextId('text');
    const clipDur = activeClipDuration;
    const t = {
      id, text: 'New text', x: 290, y: 920, size: 60,
      font: 'inter', color: '#ffffff',
      startOffset: 0,
      endOffset: clipDur,
    };
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeClipId
          ? { ...c, texts: [...(c.texts || []), t] }
          : c
      )
    );
    setSelectedTextId(id);
  }, [activeClipId, activeClipDuration]);

  const handleUpdateText = useCallback((id, partial) => {
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeClipId
          ? { ...c, texts: (c.texts || []).map((t) => (t.id === id ? { ...t, ...partial } : t)) }
          : c
      )
    );
  }, [activeClipId]);

  const handleDeleteText = useCallback((id) => {
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeClipId
          ? { ...c, texts: (c.texts || []).filter((t) => t.id !== id) }
          : c
      )
    );
    setSelectedTextId((sel) => (sel === id ? null : sel));
  }, [activeClipId]);

  const handleSplit = useCallback(() => {
    if (!activeClip) return;
    const clipDur = activeClip.sourceEnd - activeClip.sourceStart;
    if (currentOffset <= 0.05 || currentOffset >= clipDur - 0.05) return;
    const cut = activeClip.sourceStart + currentOffset;
    const idx = clips.findIndex((c) => c.id === activeClip.id);
    if (idx < 0) return;
    const clipA = { ...activeClip, sourceEnd: cut, texts: [...(activeClip.texts || [])] };
    const clipB = {
      id: nextId('clip'),
      fileId: activeClip.fileId,
      sourceStart: cut,
      sourceEnd: activeClip.sourceEnd,
      transform: { ...(activeClip.transform || DEFAULT_TRANSFORM) },
      texts: (activeClip.texts || []).map((t) => ({ ...t, id: t.id, endOffset: t.endOffset ? t.endOffset : (activeClip.sourceEnd - cut) })),
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
    setSelectedTextId(null);
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
      setSelectedTextId(null);
    } else {
      setIsPlaying(false);
      if (clips.length > 0) {
        setActiveClipId(clips[0].id);
        setCurrentOffset(0);
        setSelectedTextId(null);
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
    setSelectedTextId(null);
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
        <div className="text-xs text-slate-500 font-mono">v0.6 · per-clip texts</div>
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
                meta={meta}
                onTransformChange={handleTransformChange}
                selectedTextId={selectedTextId}
                onSelectText={setSelectedTextId}
                onUpdateText={handleUpdateText}
                currentOffset={currentOffset}
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

              <CardMetadata
                meta={meta}
                onMetaChange={setMeta}
                activeClip={activeClip}
                selectedTextId={selectedTextId}
                onSelectText={setSelectedTextId}
                onAddText={handleAddText}
                onUpdateText={handleUpdateText}
                onDeleteText={handleDeleteText}
              />

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
                  <ExportButton files={files} clips={clips} transitions={transitions} meta={meta} />
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

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Card Gallery</h2>
            <CardTemplateGrid
              items={clips.length > 0 ? clips.map((c) => {
                const f = fileById[c.fileId];
                const t = (c.texts || [])[0] || {};
                return {
                  videoUrl: f?.url,
                  headerText: t.text || '',
                  animeTitle: '',
                  openingNumber: '',
                  songName: '',
                  artistName: '',
                  font: t.font || 'inter',
                  color: t.color || '#ffffff',
                  blur: meta.blur,
                  blurEnabled: meta.blurEnabled,
                  transform: c.transform,
                };
              }) : EXAMPLE_CARDS}
              activeIndex={clips.length > 0 ? clips.findIndex((c) => c.id === activeClipId) : 0}
              onActiveChange={clips.length > 0 ? (i) => {
                const c = clips[i];
                if (c) {
                  setActiveClipId(c.id);
                  setCurrentOffset(0);
                  setSelectedTextId(null);
                }
              } : undefined}
              height={400}
            />
          </div>
        </main>
      )}
    </div>
  );
}
