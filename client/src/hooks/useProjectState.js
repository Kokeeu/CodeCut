import { useCallback, useMemo, useState } from 'react';
import useUndoableState from './useUndoableState.js';
import {
  DEFAULT_AUDIO,
  DEFAULT_META,
  DEFAULT_PIP,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TRANSFORM,
  DEFAULT_TRANSITION,
  PROJECT_VERSION,
  makeClip,
  nextId,
} from '../lib/projectDefaults.js';
import { sanitizeTransition } from '../lib/transitions.js';
import {
  blobToFile,
  clearMediaStore,
  getMediaFile,
  getMediaFileByName,
  putMediaFile,
} from '../lib/mediaStore.js';

function normalizeTransitions(raw, clipCount) {
  const next = (raw || []).map((t) => sanitizeTransition(t));
  if (clipCount > 0) {
    while (next.length < clipCount - 1) next.push({ ...DEFAULT_TRANSITION });
    next.length = Math.max(0, clipCount - 1);
  } else {
    next.length = 0;
  }
  return next;
}

function base64ToBlobUrl(base64) {
  if (!base64) return null;
  try {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([ab], { type: mimeString }));
  } catch (err) {
    console.error('Error converting base64 to blob:', err);
    return null;
  }
}

function probeDuration(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(0);
      return;
    }
    const v = document.createElement('video');
    v.preload = 'metadata';
    const done = (value) => {
      v.removeAttribute('src');
      v.load();
      resolve(value);
    };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => done(0);
    v.src = url;
  });
}

function hydrateMediaRecord(row, fallbackId) {
  if (!row || !row.blob) return null;
  const file = blobToFile(row.blob, row.name, row.type);
  if (!file) return null;
  return {
    id: fallbackId || row.id,
    file,
    url: URL.createObjectURL(row.blob),
    name: row.name || file.name,
    duration: 0,
    thumbnail: null,
    waveform: null,
    filmstrip: null,
    filmstripBase64: null,
  };
}

const emptyDocument = {
  clips: [],
  transitions: [],
  meta: { ...DEFAULT_META },
};

export default function useProjectState() {
  const [files, setFiles] = useState([]);
  const [doc, setDoc, undo] = useUndoableState(emptyDocument);
  const { clips, transitions, meta } = doc;
  const [activeClipId, setActiveClipId] = useState(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [selectedTextId, setSelectedTextId] = useState(null);

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

  const pendingFiles = useMemo(() => files.filter((f) => f._pending || !f.file), [files]);

  const setClips = useCallback((updater, tag) => {
    setDoc((prev) => ({
      ...prev,
      clips: typeof updater === 'function' ? updater(prev.clips) : updater,
    }), tag);
  }, [setDoc]);

  const setTransitions = useCallback((updater, tag) => {
    setDoc((prev) => ({
      ...prev,
      transitions: typeof updater === 'function' ? updater(prev.transitions) : updater,
    }), tag);
  }, [setDoc]);

  const setMeta = useCallback((updater, tag) => {
    setDoc((prev) => ({
      ...prev,
      meta: typeof updater === 'function' ? updater(prev.meta) : updater,
    }), tag);
  }, [setDoc]);

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

    newFiles.forEach((f) => {
      if (f.file) putMediaFile(f.id, f.file);
    });

    setFiles((prev) => {
      const pending = prev.filter((f) => f._pending);
      const regular = prev.filter((f) => !f._pending);

      const updatedPending = pending.map((pf) => {
        const match = newFiles.find((nf) => nf.name === pf.name);
        if (match) {
          if (pf.url) URL.revokeObjectURL(pf.url);
          if (match.file) putMediaFile(pf.id, match.file);
          return { ...match, id: pf.id, _pending: false };
        }
        return pf;
      });

      const unmatchedNew = newFiles.filter((nf) => !pending.some((pf) => pf.name === nf.name));
      return [...regular, ...updatedPending, ...unmatchedNew].slice(0, 10);
    });

    setDoc((prev) => {
      if (prev.clips.length > 0) return prev;
      const first = newFiles.find((f) => f.duration > 0);
      if (!first) return prev;
      const clip = makeClip(first.id, first.duration);
      setActiveClipId(clip.id);
      return { ...prev, clips: [clip] };
    }, 'add-first-clip');
  }, [setDoc]);

  const handleAddClip = useCallback((fileId) => {
    const f = fileById[fileId];
    if (!f || !f.duration || f._pending) return;
    const clip = makeClip(fileId, f.duration - 0.01);
    setDoc((prev) => ({
      ...prev,
      clips: [...prev.clips, clip],
      transitions: prev.clips.length === 0 ? [] : [...prev.transitions, { ...DEFAULT_TRANSITION }],
    }), 'add-clip');
    setActiveClipId(clip.id);
    setCurrentOffset(0);
  }, [fileById, setDoc]);

  const handleDeleteClip = useCallback((clipId) => {
    setDoc((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === clipId);
      if (idx < 0 || prev.clips.length <= 1) return prev;
      const nextClips = prev.clips.filter((c) => c.id !== clipId);
      const nextTransitions = [...prev.transitions];
      nextTransitions.splice(idx === 0 ? 0 : idx - 1, 1);
      const newActive = nextClips[Math.min(idx, nextClips.length - 1)] || null;
      setActiveClipId(newActive ? newActive.id : null);
      setCurrentOffset(0);
      return { ...prev, clips: nextClips, transitions: nextTransitions };
    }, 'delete-clip');
  }, [setDoc]);

  const handleDuplicateClip = useCallback((clipId) => {
    setDoc((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return prev;
      const source = prev.clips[idx];
      const dup = {
        ...source,
        id: nextId('clip'),
        texts: (source.texts || []).map((t) => ({ ...t, id: nextId('text') })),
        transform: { ...(source.transform || DEFAULT_TRANSFORM) },
        audio: { ...(source.audio || DEFAULT_AUDIO) },
        pip: { ...(source.pip || DEFAULT_PIP) },
      };
      const nextClips = [...prev.clips];
      nextClips.splice(idx + 1, 0, dup);
      const nextTransitions = [...prev.transitions];
      nextTransitions.splice(idx, 0, { ...DEFAULT_TRANSITION });
      setActiveClipId(dup.id);
      return { ...prev, clips: nextClips, transitions: nextTransitions };
    }, 'duplicate-clip');
  }, [setDoc]);

  const handleReorder = useCallback((newClips) => {
    setDoc((prev) => {
      const oldIds = prev.clips.map((c) => c.id);
      const newIds = newClips.map((c) => c.id);
      if (oldIds.length !== newIds.length) {
        return { ...prev, clips: newClips };
      }
      const newTransitions = [];
      for (let i = 0; i < newIds.length - 1; i++) {
        const oldIdx = oldIds.indexOf(newIds[i]);
        const nextOldIdx = oldIds.indexOf(newIds[i + 1]);
        if (oldIdx >= 0 && nextOldIdx >= 0 && oldIdx === nextOldIdx - 1 && oldIdx < prev.transitions.length) {
          newTransitions.push(prev.transitions[oldIdx] || { ...DEFAULT_TRANSITION });
        } else {
          newTransitions.push({ ...DEFAULT_TRANSITION });
        }
      }
      return { ...prev, clips: newClips, transitions: newTransitions };
    }, 'reorder');
  }, [setDoc]);

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
  }, [activeClipId, fileById, setClips]);

  const handleTransformChange = useCallback((transform) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, transform } : c))
    , 'transform');
  }, [activeClipId, setClips]);

  const handleSpeedChange = useCallback((speed) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, speed } : c))
    , 'speed');
  }, [activeClipId, setClips]);

  const handleAudioChange = useCallback((audio) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, audio } : c))
    , 'audio');
  }, [activeClipId, setClips]);

  const handlePipChange = useCallback((pip) => {
    setClips((prev) =>
      prev.map((c) => (c.id === activeClipId ? { ...c, pip } : c))
    , 'pip');
  }, [activeClipId, setClips]);

  const handleAddText = useCallback(() => {
    if (!activeClipId) return;
    const id = nextId('text');
    const t = {
      id, text: 'New text', x: 540, y: 920, size: 60,
      font: 'inter', color: '#ffffff', align: 'center',
      startOffset: 0,
      endOffset: activeClipDuration,
      animation: null,
      ...DEFAULT_TEXT_STYLE,
    };
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeClipId
          ? { ...c, texts: [...(c.texts || []), t] }
          : c
      )
    , 'add-text');
    setSelectedTextId(id);
  }, [activeClipId, activeClipDuration, setClips]);

  const handleUpdateText = useCallback((id, partial) => {
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeClipId
          ? { ...c, texts: (c.texts || []).map((t) => (t.id === id ? { ...t, ...partial } : t)) }
          : c
      )
    , 'text-update');
  }, [activeClipId, setClips]);

  const handleDeleteText = useCallback((id) => {
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeClipId
          ? { ...c, texts: (c.texts || []).filter((t) => t.id !== id) }
          : c
      )
    , 'delete-text');
    setSelectedTextId((sel) => (sel === id ? null : sel));
  }, [activeClipId, setClips]);

  const handleSplit = useCallback(() => {
    if (!activeClip) return;
    const clipDur = activeClip.sourceEnd - activeClip.sourceStart;
    if (currentOffset <= 0.05 || currentOffset >= clipDur - 0.05) return;
    const cut = activeClip.sourceStart + Math.min(currentOffset, clipDur - 0.1);
    setDoc((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === activeClip.id);
      if (idx < 0) return prev;
      const source = prev.clips[idx];
      const clipA = { ...source, sourceEnd: cut, texts: [...(source.texts || [])] };
      const clipB = {
        id: nextId('clip'),
        fileId: source.fileId,
        sourceStart: cut,
        sourceEnd: source.sourceEnd,
        speed: source.speed || 1,
        transform: { ...(source.transform || DEFAULT_TRANSFORM) },
        audio: { ...(source.audio || DEFAULT_AUDIO) },
        pip: { ...(source.pip || DEFAULT_PIP) },
        texts: (source.texts || []).map((t) => ({
          ...t,
          id: nextId('text'),
          endOffset: t.endOffset != null ? t.endOffset : (source.sourceEnd - cut),
        })),
      };
      const nextClips = [...prev.clips];
      nextClips.splice(idx, 1, clipA, clipB);
      const nextTransitions = [...prev.transitions];
      nextTransitions.splice(idx, 0, { ...DEFAULT_TRANSITION });
      setActiveClipId(clipB.id);
      setCurrentOffset(0);
      return { ...prev, clips: nextClips, transitions: nextTransitions };
    }, 'split');
  }, [activeClip, currentOffset, setDoc]);

  const handleTransitionChange = useCallback((index, value) => {
    setTransitions((prev) => {
      const t = [...prev];
      t[index] = sanitizeTransition(value);
      return t;
    }, 'transition');
  }, [setTransitions]);

  const handleSelectClip = useCallback((clipId, sourceOffset = 0) => {
    setActiveClipId(clipId);
    setCurrentOffset(typeof sourceOffset === 'number' ? Math.max(0, sourceOffset) : 0);
    setSelectedTextId(null);
  }, []);

  const handleApplyTemplate = useCallback((template) => {
    if (!template) return;
    setDoc((prev) => {
      if (prev.clips.length === 0) return prev;
      return {
        ...prev,
        clips: prev.clips.map((c) => {
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
        }),
        meta: { ...prev.meta, blur: template.blur, blurEnabled: template.blurEnabled },
      };
    }, 'apply-template');
  }, [setDoc]);

  const handleReset = useCallback(() => {
    files.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });
    setFiles([]);
    undo.reset({ ...emptyDocument, meta: { ...DEFAULT_META } });
    setActiveClipId(null);
    setCurrentOffset(0);
    setSelectedTextId(null);
    clearMediaStore();
  }, [files, undo]);

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
        pip: c.pip ? { ...c.pip, fileName: fileNames[c.pip.fileId] || '' } : { ...DEFAULT_PIP },
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

  const applyLoadedProject = useCallback((data, loadedFiles) => {
    const newClips = (data.clips || []).map((c) => {
      const fileId = loadedFiles.find((f) => f.name === c.fileName)?.id;
      const pipFileId = c.pip?.fileName
        ? loadedFiles.find((f) => f.name === c.pip.fileName)?.id
        : (c.pip?.fileId || null);
      return {
        id: nextId('clip'),
        fileId: fileId || nextId('file'),
        sourceStart: c.sourceStart,
        sourceEnd: c.sourceEnd,
        speed: c.speed || 1,
        transform: c.transform || { ...DEFAULT_TRANSFORM },
        audio: c.audio || { ...DEFAULT_AUDIO },
        pip: {
          ...(c.pip || DEFAULT_PIP),
          fileId: pipFileId || null,
        },
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
    const newTransitions = normalizeTransitions(data.transitions, newClips.length);
    undo.reset({
      clips: newClips,
      transitions: newTransitions,
      meta: data.meta || { ...DEFAULT_META },
    });
    if (newClips.length > 0) setActiveClipId(newClips[0].id);
    else setActiveClipId(null);
    setCurrentOffset(0);
    setSelectedTextId(null);
  }, [undo]);

  const handleLoadProject = useCallback(async (data) => {
    if (!data || !data.clips) return;

    files.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });

    const fileIdMap = {};
    const newFiles = [];
    for (const c of data.clips || []) {
      if (!c.fileName || fileIdMap[c.fileName]) continue;
      const id = nextId('file');
      fileIdMap[c.fileName] = id;
      const stored = await getMediaFileByName(c.fileName);
      const hydrated = hydrateMediaRecord(stored, id);
      if (hydrated) {
        const duration = await probeDuration(hydrated.url);
        newFiles.push({ ...hydrated, id, name: c.fileName, duration });
      } else {
        newFiles.push({
          id,
          name: c.fileName,
          file: null,
          url: null,
          duration: 0,
          thumbnail: null,
          waveform: null,
          _pending: true,
        });
      }
    }

    setFiles(newFiles);
    applyLoadedProject({
      ...data,
      clips: (data.clips || []).map((c) => ({
        ...c,
        fileName: c.fileName,
      })),
    }, newFiles);
  }, [files, applyLoadedProject]);

  const handleRestore = useCallback(async (data) => {
    if (!data) return;
    files.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });

    const newFiles = [];
    for (const f of data.files || []) {
      const stored = (await getMediaFile(f.id)) || (await getMediaFileByName(f.name));
      const hydrated = hydrateMediaRecord(stored, f.id);
      if (hydrated) {
        const duration = f.duration || (await probeDuration(hydrated.url)) || 0;
        newFiles.push({
          ...hydrated,
          id: f.id,
          name: f.name,
          duration,
          waveform: f.waveform || null,
          filmstrip: f.filmstripBase64 ? base64ToBlobUrl(f.filmstripBase64) : null,
          filmstripBase64: f.filmstripBase64 || null,
        });
      } else {
        newFiles.push({
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
        });
      }
    }

    setFiles(newFiles);
    const restoredClips = data.clips || [];
    const restoredTransitions = normalizeTransitions(data.transitions, restoredClips.length);
    undo.reset({
      clips: restoredClips,
      transitions: restoredTransitions,
      meta: data.meta || { ...DEFAULT_META },
    });
    if ((data.clips || []).length > 0) setActiveClipId(data.clips[0].id);
    setCurrentOffset(0);
    setSelectedTextId(null);
  }, [files, undo]);

  return {
    files,
    clips,
    transitions,
    meta,
    setMeta,
    activeClipId,
    setActiveClipId,
    currentOffset,
    setCurrentOffset,
    selectedTextId,
    setSelectedTextId,
    fileById,
    activeClip,
    activeFile,
    activeClipDuration,
    pendingFiles,
    undo,
    handleFilesAdded,
    handleAddClip,
    handleDeleteClip,
    handleDuplicateClip,
    handleReorder,
    handleTrimChange,
    handleTransformChange,
    handleSpeedChange,
    handleAudioChange,
    handlePipChange,
    handleAddText,
    handleUpdateText,
    handleDeleteText,
    handleSplit,
    handleTransitionChange,
    handleSelectClip,
    handleApplyTemplate,
    handleReset,
    handleSaveProject,
    handleLoadProject,
    handleRestore,
  };
}
