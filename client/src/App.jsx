import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import FilePool from './components/FilePool.jsx';
import VideoPreview from './components/VideoPreview.jsx';
import ClipTrack from './components/ClipTrack.jsx';
import ClipTrim from './components/ClipTrim.jsx';
import CardMetadata from './components/CardMetadata.jsx';
import TemplatesPanel from './components/TemplatesPanel.jsx';
import ExportButton from './components/ExportButton.jsx';
import ProjectSummary from './components/ProjectSummary.jsx';
import TimelineScrubber from './components/TimelineScrubber.jsx';
import ProjectIO from './components/ProjectIO.jsx';
import TopBar from './components/TopBar.jsx';
import LeftSidebar from './components/LeftSidebar.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import TransportBar from './components/TransportBar.jsx';
import TimelineRuler from './components/TimelineRuler.jsx';
import RestoreBanner from './components/RestoreBanner.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import ShortcutOverlay from './components/ShortcutOverlay.jsx';
import MobileDrawer from './components/MobileDrawer.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import useUndoableState from './hooks/useUndoableState.js';
import useEditor from './hooks/useEditor.js';
import useProjectAutosave from './hooks/useProjectAutosave.js';
import useExitConfirmation from './hooks/useExitConfirmation.js';
import { getTrackWidth, clampZoom } from './lib/timelineScale.js';

const idCounter = { value: 0 };
function nextId(prefix) {
  idCounter.value += 1;
  const uniq = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${uniq}-${idCounter.value.toString(36)}`;
}

const DEFAULT_TRANSITION = { type: 'none', durationSec: 0 };
const DEFAULT_TRANSFORM = { x: 0, y: 0, scale: 1 };
const DEFAULT_AUDIO = { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 };
const DEFAULT_PIP = { enabled: false, fileId: null, position: 'bottom-right', size: 30, opacity: 1, border: true, borderWidth: 4, borderRadius: 8 };
const DEFAULT_META = { blur: 30, blurEnabled: true };
const DEFAULT_TEXT_STYLE = { bgEnabled: false, bgColor: '#000000', bgPadding: 12, bgRadius: 8, bgOpacity: 0.7, strokeEnabled: false, strokeColor: '#000000', strokeWidth: 2, rotation: 0 };
const PROJECT_VERSION = '0.11';

const TEMPLATES = [
  {
    id: 'tpl-opening-anime',
    name: 'Opening Anime',
    font: 'inter',
    color: '#ffffff',
    blur: 30,
    blurEnabled: true,
    texts: [
      { id: 'tpl-1-text-1', text: 'Openings favs', x: 285, y: 180, size: 75, align: 'center' },
      { id: 'tpl-1-text-2', text: 'ANIME TITLE', x: 70, y: 980, size: 67, align: 'left' },
      { id: 'tpl-1-text-3', text: 'Opening: 1', x: 70, y: 1080, size: 67, align: 'left' },
      { id: 'tpl-1-text-4', text: 'Canción: Song', x: 70, y: 1180, size: 67, align: 'left' },
      { id: 'tpl-1-text-5', text: 'Artistas: Artist', x: 70, y: 1280, size: 67, align: 'left' },
    ],
  },
  {
    id: 'tpl-neon-style',
    name: 'Neon Style',
    font: 'bebasneue',
    color: '#ffeb3b',
    blur: 40,
    blurEnabled: true,
    texts: [
      { id: 'tpl-2-text-1', text: 'OPENINGS', x: 540, y: 120, size: 84, align: 'center' },
      { id: 'tpl-2-text-2', text: 'ANIME TITLE', x: 70, y: 1080, size: 67, align: 'left' },
      { id: 'tpl-2-text-3', text: 'Song — Artist', x: 70, y: 1200, size: 60, align: 'left' },
    ],
  },
  {
    id: 'tpl-dark-mode',
    name: 'Dark Mode',
    font: 'montserrat',
    color: '#ffffff',
    blur: 60,
    blurEnabled: true,
    texts: [
      { id: 'tpl-3-text-1', text: 'Openings favs', x: 540, y: 130, size: 56, align: 'center' },
      { id: 'tpl-3-text-2', text: 'ANIME TITLE', x: 70, y: 1080, size: 67, align: 'left' },
      { id: 'tpl-3-text-3', text: 'Ep 1', x: 70, y: 1180, size: 67, align: 'left' },
    ],
  },
  {
    id: 'tpl-editorial',
    name: 'Editorial',
    font: 'inter',
    color: '#ffffff',
    blur: 25,
    blurEnabled: true,
    texts: [
      { id: 'tpl-4-text-1', text: 'ANIME TITLE', x: 70, y: 1080, size: 67, align: 'left' },
      { id: 'tpl-4-text-2', text: 'Ep 1 · Song — Artist', x: 70, y: 1180, size: 60, align: 'left' },
    ],
  },
];

export default function App() {
  const [files, setFiles] = useState([]);
  const [clips, setClipsRaw, undo] = useUndoableState([]);
  const [transitions, setTransitionsRaw] = useUndoableState([]);
  const [meta, setMetaRaw] = useUndoableState(DEFAULT_META);
  const setClips = setClipsRaw;
  const setTransitions = setTransitionsRaw;
  const setMeta = setMetaRaw;
  const [activeClipId, setActiveClipId] = useState(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [exportConfig, setExportConfig] = useState({ resolution: '1080', fps: 30, quality: 'high', platform: 'tiktok' });
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [timelineContainer, setTimelineContainer] = useState(null);
  const previewRef = useRef(null);
  const shuttleRef = useRef({ direction: 0, level: 0 });

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

  const { totalDuration, cumulativeStarts, snapPoints, currentGlobalTime: getGlobalTime } = useEditor(clips, transitions);

  const trackWidth = useMemo(
    () => getTrackWidth(clips, timelineZoom),
    [clips, timelineZoom]
  );

  const currentGlobalTime = useMemo(() => {
    return getGlobalTime(activeClipId) + currentOffset;
  }, [getGlobalTime, activeClipId, currentOffset]);

  const base64ToBlobUrl = (base64) => {
    if (!base64) return null;
    try {
      const byteString = atob(base64.split(',')[1]);
      const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error converting base64 to blob:', err);
      return null;
    }
  };

  const handleFilesAdded = useCallback((metas) => {
    const newFiles = metas.map((m) => ({
      id: nextId('file'),
      file: m.file,
      url: m.url,
      name: m.file.name,
      duration: m.duration || 0,
      thumbnail: m.thumbnail || null,
      waveform: m.waveform || null,
      filmstrip: m.filmstrip ? base64ToBlobUrl(m.filmstrip) : null,
      filmstripBase64: m.filmstrip || null,
    }));
    if (newFiles.length === 0) return;
    
    setFiles((prev) => {
      const pendingFiles = prev.filter((f) => f._pending);
      const regularFiles = prev.filter((f) => !f._pending);
      
      const updatedPending = pendingFiles.map((pf) => {
        const match = newFiles.find((nf) => nf.name === pf.name);
        if (match) {
          if (pf.url) URL.revokeObjectURL(pf.url);
          return { ...match, id: pf.id };
        }
        return pf;
      });
      
      const unmatchedNew = newFiles.filter((nf) => !pendingFiles.some((pf) => pf.name === nf.name));
      
      return [...regularFiles, ...updatedPending, ...unmatchedNew].slice(0, 10);
    });
    
    if (clips.length === 0) {
      const first = newFiles.find((f) => f.duration > 0);
      if (first) {
        const clip = {
          id: nextId('clip'),
          fileId: first.id,
          sourceStart: 0,
          sourceEnd: first.duration,
          speed: 1,
          transform: { ...DEFAULT_TRANSFORM },
          audio: { ...DEFAULT_AUDIO },
          pip: { ...DEFAULT_PIP },
          texts: [],
        };
        setClips([clip], 'add-first-clip');
        setActiveClipId(clip.id);
      }
    }
  }, [clips.length]);

  const handleAddClip = useCallback((fileId) => {
    const f = fileById[fileId];
    if (!f || !f.duration) return;
    const clip = {
      id: nextId('clip'),
      fileId,
      sourceStart: 0,
      sourceEnd: f.duration - 0.01,
      speed: 1,
      transform: { ...DEFAULT_TRANSFORM },
      audio: { ...DEFAULT_AUDIO },
      pip: { ...DEFAULT_PIP },
      texts: [],
    };
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

  const handleDuplicateClip = useCallback((clipId) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    if (idx < 0) return;
    const source = clips[idx];
    const dup = {
      ...source,
      id: nextId('clip'),
      texts: (source.texts || []).map((t) => ({ ...t, id: nextId('text') })),
      transform: { ...(source.transform || DEFAULT_TRANSFORM) },
      audio: { ...(source.audio || DEFAULT_AUDIO) },
      pip: { ...(source.pip || DEFAULT_PIP) },
    };
    const next = [...clips];
    next.splice(idx + 1, 0, dup);
    setClips(next);
    setTransitions((prev) => {
      const t = [...prev];
      t.splice(idx, 0, { ...DEFAULT_TRANSITION });
      return t;
    });
    setActiveClipId(dup.id);
  }, [clips]);

  const handleReorder = useCallback((newClips) => {
    setClips(newClips);
    const oldIds = clips.map((c) => c.id);
    const newIds = newClips.map((c) => c.id);
    if (oldIds.length !== newIds.length) return;
    const oldTransitions = [...transitions];
    const newTransitions = [];
    for (let i = 0; i < newIds.length - 1; i++) {
      const oldIdx = oldIds.indexOf(newIds[i]);
      const nextOldIdx = oldIds.indexOf(newIds[i + 1]);
      if (oldIdx >= 0 && nextOldIdx >= 0 && oldIdx < oldTransitions.length) {
        newTransitions.push(oldTransitions[oldIdx] || { ...DEFAULT_TRANSITION });
      } else {
        newTransitions.push({ ...DEFAULT_TRANSITION });
      }
    }
    setTransitions(newTransitions, 'reorder');
  }, [clips, transitions]);

  const handleTrimChange = useCallback(({ sourceStart, sourceEnd }) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== activeClipId) return c;
        const f = fileById[c.fileId];
        const maxDur = f?.duration ? f.duration - 0.01 : sourceEnd;
        const safeStart = Math.max(0, Math.min(sourceStart, maxDur - 0.1));
        const safeEnd = Math.max(safeStart + 0.05, Math.min(sourceEnd, maxDur));
        return { ...c, sourceStart: safeStart, sourceEnd: safeEnd };
      })
    , 'trim');
  }, [activeClipId, fileById]);

  const handleTransformChange = useCallback((transform) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, transform } : c))
    , 'transform');
  }, [activeClipId]);

  const handleSpeedChange = useCallback((speed) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, speed } : c))
    , 'speed');
  }, [activeClipId]);

  const handleAudioChange = useCallback((audio) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, audio } : c))
    , 'audio');
  }, [activeClipId]);

  const handlePipChange = useCallback((pip) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, pip } : c))
    , 'pip');
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
      animation: null,
      ...DEFAULT_TEXT_STYLE,
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
    , 'text-update');
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
    const cut = activeClip.sourceStart + Math.min(currentOffset, clipDur - 0.1);
    const idx = clips.findIndex((c) => c.id === activeClip.id);
    if (idx < 0) return;
    const clipA = { ...activeClip, sourceEnd: cut, texts: [...(activeClip.texts || [])] };
    const clipB = {
      id: nextId('clip'),
      fileId: activeClip.fileId,
      sourceStart: cut,
      sourceEnd: activeClip.sourceEnd,
      speed: activeClip.speed || 1,
      transform: { ...(activeClip.transform || DEFAULT_TRANSFORM) },
      audio: { ...(activeClip.audio || DEFAULT_AUDIO) },
      pip: { ...(activeClip.pip || DEFAULT_PIP) },
      texts: (activeClip.texts || []).map((t) => ({
        ...t,
        id: nextId('text'),
        endOffset: t.endOffset != null ? t.endOffset : (activeClip.sourceEnd - cut),
      })),
    };
    const next = [...clips];
    next.splice(idx, 1, clipA, clipB);
    setClips(next, 'split');
    setTransitions((prev) => {
      const t = [...prev];
      t.splice(idx, 0, { ...DEFAULT_TRANSITION });
      return t;
    }, 'split');
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

  const handleTimelineZoomChange = useCallback((zoom) => {
    setTimelineZoom(clampZoom(zoom));
  }, []);

  const handleApplyTemplate = useCallback((template) => {
    if (!template || clips.length === 0) return;
    setClips((prev) =>
      prev.map((c) => {
        const dur = c.sourceEnd - c.sourceStart;
        return {
          ...c,
          texts: template.texts.map((t) => ({
            id: nextId('text'),
            text: t.text,
            x: t.x,
            y: t.y,
            size: t.size,
            font: template.font,
            color: template.color,
            align: t.align || 'left',
            startOffset: 0,
            endOffset: dur,
            animation: null,
            ...DEFAULT_TEXT_STYLE,
          })),
        };
      })
    );
    setMeta((m) => ({ ...m, blur: template.blur, blurEnabled: template.blurEnabled }));
  }, [clips.length]);

  const handleSeek = useCallback((offsetWithinClip) => {
    previewRef.current?.seekTo(offsetWithinClip);
    setCurrentOffset(offsetWithinClip);
  }, []);

  const handleGlobalSeek = useCallback((globalTime) => {
    let cum = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipDur = (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1);
      if (globalTime <= cum + clipDur || i === clips.length - 1) {
        const offsetInClip = Math.max(0, Math.min(clipDur, globalTime - cum));
        setActiveClipId(clip.id);
        setCurrentOffset(offsetInClip);
        previewRef.current?.seekTo(offsetInClip);
        return;
      }
      cum += clipDur;
      if (i < clips.length - 1) {
        const t = transitions[i];
        if (t && t.type && t.type !== 'none') {
          cum -= Number(t.durationSec) || 0;
        }
      }
    }
  }, [clips, transitions]);

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
    files.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });
    setFiles([]);
    setClips([]);
    setTransitions([]);
    setActiveClipId(null);
    setCurrentOffset(0);
    setIsPlaying(false);
    setSelectedTextId(null);
  }, [files]);

  const handleSaveProject = useCallback(() => {
    const fileNames = {};
    files.forEach((f) => { fileNames[f.id] = f.name; });
    return {
      version: PROJECT_VERSION,
      meta,
      clips: clips.map((c) => ({
        fileName: fileNames[c.fileId] || '',
        sourceStart: c.sourceStart,
        sourceEnd: c.sourceEnd,
        speed: c.speed || 1,
        transform: c.transform || { ...DEFAULT_TRANSFORM },
        audio: c.audio || { ...DEFAULT_AUDIO },
        texts: (c.texts || []).map((t) => ({
          text: t.text,
          x: t.x,
          y: t.y,
          size: t.size,
          font: t.font,
          color: t.color,
          align: t.align,
          startOffset: t.startOffset,
          endOffset: t.endOffset,
          animation: t.animation || null,
          bgEnabled: t.bgEnabled,
          bgColor: t.bgColor,
          bgPadding: t.bgPadding,
          bgRadius: t.bgRadius,
          bgOpacity: t.bgOpacity,
          strokeEnabled: t.strokeEnabled,
          strokeColor: t.strokeColor,
          strokeWidth: t.strokeWidth,
          rotation: t.rotation,
        })),
      })),
      transitions: transitions.map((t) => ({ type: t.type, durationSec: t.durationSec })),
    };
  }, [files, clips, transitions, meta]);

  const handleLoadProject = useCallback((data) => {
    if (!data || !data.clips) return;
    
    const newFiles = [];
    const fileIdMap = {};
    const newClips = (data.clips || []).map((c) => {
      let fileId = fileIdMap[c.fileName];
      if (!fileId) {
        fileId = nextId('file');
        fileIdMap[c.fileName] = fileId;
        newFiles.push({ id: fileId, name: c.fileName, _pending: true });
      }
      return {
        id: nextId('clip'),
        fileId,
        sourceStart: c.sourceStart,
        sourceEnd: c.sourceEnd,
        speed: c.speed || 1,
        transform: c.transform || { ...DEFAULT_TRANSFORM },
        audio: c.audio || { ...DEFAULT_AUDIO },
        pip: c.pip || { ...DEFAULT_PIP },
        texts: (c.texts || []).map((t) => ({
          id: nextId('text'),
          text: t.text,
          x: t.x,
          y: t.y,
          size: t.size,
          font: t.font || 'inter',
          color: t.color || '#ffffff',
          align: t.align || 'left',
          startOffset: t.startOffset,
          endOffset: t.endOffset,
          animation: t.animation || null,
          ...DEFAULT_TEXT_STYLE,
          bgEnabled: t.bgEnabled,
          bgColor: t.bgColor,
          bgPadding: t.bgPadding,
          bgRadius: t.bgRadius,
          bgOpacity: t.bgOpacity,
          strokeEnabled: t.strokeEnabled,
          strokeColor: t.strokeColor,
          strokeWidth: t.strokeWidth,
          rotation: t.rotation,
        })),
      };
    });
    const newTransitions = (data.transitions || []).map((t) => ({
      type: t.type || 'none',
      durationSec: t.durationSec || 0,
    }));

    files.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });
    setFiles(newFiles.map((f) => ({
      ...f,
      file: null,
      url: null,
      duration: 0,
      thumbnail: null,
    })));
    setClips(newClips, 'load-project');
    setTransitions(newTransitions, 'load-project');
    setMeta(data.meta || { ...DEFAULT_META });
    if (newClips.length > 0) setActiveClipId(newClips[0].id);
  }, [files]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undo.redo();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplit();
      } else if (e.key === ' ') {
        e.preventDefault();
        shuttleRef.current = { direction: 0, level: 0 };
        previewRef.current?.stopRewind();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isPlaying) previewRef.current?.stepFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!isPlaying) previewRef.current?.stepFrame(1);
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const s = shuttleRef.current;
        previewRef.current?.stopRewind();
        if (s.direction === -1) {
          s.level = Math.min(4, s.level + 1);
        } else {
          s.direction = -1;
          s.level = 1;
        }
        setIsPlaying(false);
        previewRef.current?.startRewind(s.level);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        shuttleRef.current = { direction: 0, level: 0 };
        previewRef.current?.stopRewind();
        previewRef.current?.setPlaybackSpeed(1);
        setIsPlaying(false);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const s = shuttleRef.current;
        previewRef.current?.stopRewind();
        if (s.direction === 1) {
          s.level = Math.min(4, s.level + 1);
          previewRef.current?.setPlaybackSpeed(Math.pow(2, s.level - 1));
        } else {
          s.direction = 1;
          s.level = 1;
          setIsPlaying(true);
          previewRef.current?.setPlaybackSpeed(1);
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSplit, undo, isPlaying]);

  const hasFiles = files.length > 0;

  const { showConfirm, confirmExit, cancelExit } = useExitConfirmation(hasFiles);

  const autosaveState = useProjectAutosave({
    files: files.map((f) => ({ id: f.id, name: f.name, duration: f.duration, waveform: f.waveform, filmstripBase64: f.filmstripBase64 })),
    clips,
    transitions,
    meta,
  });

  const handleRestore = useCallback(() => {
    const data = autosaveState.restore();
    if (!data) return;
    const newFiles = (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      duration: f.duration || 0,
      waveform: f.waveform || null,
      filmstrip: f.filmstripBase64 ? base64ToBlobUrl(f.filmstripBase64) : null,
      filmstripBase64: f.filmstripBase64 || null,
      file: null,
      url: null,
      thumbnail: null,
      _pending: true,
    }));
    setFiles(newFiles);
    setClips(data.clips || [], 'restore');
    setTransitions(data.transitions || [], 'restore');
    setMeta(data.meta || { ...DEFAULT_META });
    if ((data.clips || []).length > 0) setActiveClipId(data.clips[0].id);
  }, [autosaveState]);

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <RestoreBanner onRestore={handleRestore} onDismiss={autosaveState.dismiss} hasData={autosaveState.hasSavedData} />
      <TopBar
        files={files}
        clips={clips}
        transitions={transitions}
        meta={meta}
        totalDuration={totalDuration}
        onSave={handleSaveProject}
        onLoad={handleLoadProject}
        exportConfig={exportConfig}
        onExportConfigChange={setExportConfig}
        canUndo={undo.canUndo}
        canRedo={undo.canRedo}
        onUndo={undo.undo}
        onRedo={undo.redo}
        onToggleLeftSidebar={() => setMobileLeftOpen(true)}
        onToggleRightSidebar={() => setMobileRightOpen(true)}
        onToggleLeftCollapse={() => setLeftCollapsed((v) => !v)}
        onToggleRightCollapse={() => setRightCollapsed((v) => !v)}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        hasFiles={hasFiles}
      />

      {!hasFiles ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-lg flex flex-col gap-6 animate-fade-in">
            <VideoUploader onFilesAdded={handleFilesAdded} compact={false} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-neutral-400">
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <div className="text-xl mb-1 text-gradient-accent font-bold">1</div>
                <div className="font-semibold text-neutral-200 text-xs">Upload</div>
                <p className="text-[11px] mt-1">Sube uno o varios videos (hasta 10, 500 MB c/u).</p>
              </div>
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <div className="text-xl mb-1 text-gradient-accent font-bold">2</div>
                <div className="font-semibold text-neutral-200 text-xs">Edit</div>
                <p className="text-[11px] mt-1">Corta con <span className="font-mono text-neutral-200">S</span>, reordena, ajusta trim y transiciones.</p>
              </div>
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <div className="text-xl mb-1 text-gradient-accent font-bold">3</div>
                <div className="font-semibold text-neutral-200 text-xs">Export</div>
                <p className="text-[11px] mt-1">FFmpeg compone todo a un MP4 vertical 1080x1920.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          <div className={['hidden md:flex shrink-0', leftCollapsed ? 'md:w-14' : 'md:w-[280px]'].join(' ')}>
            <LeftSidebar
              files={files}
              onAddClip={handleAddClip}
              onFilesAdded={handleFilesAdded}
              templates={TEMPLATES}
              onApplyTemplate={handleApplyTemplate}
              hasClips={clips.length > 0}
              onAddText={handleAddText}
              activeClip={activeClip}
              collapsed={leftCollapsed}
              onToggleCollapse={() => setLeftCollapsed((v) => !v)}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 flex items-center justify-center bg-editor-bg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-radial from-accent/[0.04] via-transparent to-transparent pointer-events-none" />
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
                files={files}
                showGuides={showGuides}
              />
            </div>

            <TransportBar
              isPlaying={isPlaying}
              onPlayPause={() => {
                shuttleRef.current = { direction: 0, level: 0 };
                previewRef.current?.stopRewind();
                setIsPlaying((p) => !p);
              }}
              onSplit={handleSplit}
              onDelete={() => {
                if (activeClip && clips.length > 1) {
                  setConfirmAction({
                    title: 'Delete clip',
                    message: `Are you sure you want to delete clip #${clips.findIndex(c => c.id === activeClip.id) + 1}?`,
                    onConfirm: () => { handleDeleteClip(activeClip.id); setConfirmAction(null); },
                  });
                }
              }}
              onReset={() => {
                setConfirmAction({
                  title: 'Reset project',
                  message: 'This will remove all clips and files. Are you sure?',
                  onConfirm: () => { handleReset(); setConfirmAction(null); },
                });
              }}
              onOpenProperties={() => setMobileRightOpen(true)}
              onOpenMedia={() => setMobileLeftOpen(true)}
              currentOffset={currentOffset}
              totalDuration={activeClipDuration}
              clipsCount={clips.length}
              canDelete={clips.length > 1}
              showGuides={showGuides}
              onToggleGuides={() => setShowGuides((g) => !g)}
            />

            <div className="h-48 md:h-52 flex flex-col bg-editor-panel/60 border-t border-glass-border shrink-0 backdrop-blur-md">
              <TimelineRuler
                totalDuration={totalDuration}
                onSeek={handleGlobalSeek}
                currentGlobalTime={currentGlobalTime}
                timelineZoom={timelineZoom}
                trackWidth={trackWidth}
                scrollContainer={timelineContainer}
                snapPoints={snapPoints}
                clips={clips}
                transitions={transitions}
              />
              <div className="flex-1 overflow-y-hidden px-2 py-2">
                <ClipTrack
                  ref={setTimelineContainer}
                  clips={clips}
                  activeClipId={activeClipId}
                  transitions={transitions}
                  fileById={fileById}
                  onSelect={handleSelectClip}
                  onDelete={handleDeleteClip}
                  onDuplicate={handleDuplicateClip}
                  onReorder={handleReorder}
                  onTransitionChange={handleTransitionChange}
                  timelineZoom={timelineZoom}
                  trackWidth={trackWidth}
                  onTimelineZoomChange={handleTimelineZoomChange}
                  currentGlobalTime={currentGlobalTime}
                  isPlaying={isPlaying}
                />
              </div>
            </div>
          </div>

          <div className={['hidden lg:flex shrink-0', rightCollapsed ? 'lg:w-14' : 'lg:w-[320px]'].join(' ')}>
            <PropertiesPanel
              meta={meta}
              onMetaChange={setMeta}
              activeClip={activeClip}
              activeFile={activeFile}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              onDeleteText={handleDeleteText}
              onSpeedChange={handleSpeedChange}
              onAudioChange={handleAudioChange}
              onPipChange={handlePipChange}
              onTrimChange={handleTrimChange}
              onTransformChange={handleTransformChange}
              onSeek={handleSeek}
              files={files}
              currentOffset={currentOffset}
              collapsed={rightCollapsed}
              onToggleCollapse={() => setRightCollapsed((v) => !v)}
            />
          </div>
        </div>
      )}

      {hasFiles && (
        <>
          <MobileDrawer
            open={mobileLeftOpen}
            onClose={() => setMobileLeftOpen(false)}
            side="left"
            title="Media & Tools"
          >
            <LeftSidebar
              files={files}
              onAddClip={handleAddClip}
              onFilesAdded={handleFilesAdded}
              templates={TEMPLATES}
              onApplyTemplate={handleApplyTemplate}
              hasClips={clips.length > 0}
              onAddText={handleAddText}
              activeClip={activeClip}
              embedded
            />
          </MobileDrawer>

          <BottomSheet
            open={mobileRightOpen}
            onClose={() => setMobileRightOpen(false)}
            title="Properties"
          >
            <PropertiesPanel
              meta={meta}
              onMetaChange={setMeta}
              activeClip={activeClip}
              activeFile={activeFile}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              onDeleteText={handleDeleteText}
              onSpeedChange={handleSpeedChange}
              onAudioChange={handleAudioChange}
              onPipChange={handlePipChange}
              onTrimChange={handleTrimChange}
              onTransformChange={handleTransformChange}
              onSeek={handleSeek}
              files={files}
              currentOffset={currentOffset}
              embedded
            />
          </BottomSheet>
        </>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={showConfirm}
        title="Leave editor?"
        message="You have unsaved work in the editor. If you leave, your changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={confirmExit}
        onCancel={cancelExit}
        variant="danger"
      />
      <ShortcutOverlay isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ToastContainer />
    </div>
  );
}
