import { useCallback, useMemo, useRef, useState } from 'react';
import useUndoableState from './useUndoableState.js';
import {
  DEFAULT_AUDIO,
  DEFAULT_META,
  DEFAULT_PIP,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TRANSFORM,
  PROJECT_VERSION,
  makeDefaultParticipants,
  makeClip,
  nextId,
} from '../lib/projectDefaults.js';
import { applyClipTemplate, sliceClipTexts } from '../lib/clipTemplates.js';
import {
  createEmptyDocument,
  normalizeTransitions,
  reduceProjectDocument,
} from '../lib/projectDocument.js';
import { MAX_MEDIA_FILES } from '../lib/mediaImport.js';
import {
  blobToFile,
  clearMediaStore,
  getMediaFile,
  getMediaFileByName,
  putMediaFile,
} from '../lib/mediaStore.js';

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

export default function useProjectState() {
  const [files, setFiles] = useState([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const [doc, setDoc, undo] = useUndoableState(createEmptyDocument());
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

  const dispatchDocument = useCallback((action, tag) => {
    setDoc((previous) => reduceProjectDocument(previous, action), tag);
  }, [setDoc]);

  const setMeta = useCallback((nextMeta, tag) => {
    const resolved = typeof nextMeta === 'function' ? nextMeta(meta) : nextMeta;
    dispatchDocument({ type: 'meta/replaced', meta: resolved }, tag);
  }, [dispatchDocument, meta]);

  const handleFilesAdded = useCallback((metas) => {
    const currentFiles = filesRef.current;
    const pendingNames = new Set(currentFiles.filter((f) => f._pending).map((f) => f.name));
    const replacements = metas.filter((m) => pendingNames.has(m.file?.name));
    const additions = metas.filter((m) => !pendingNames.has(m.file?.name));
    const availableSlots = Math.max(0, MAX_MEDIA_FILES - currentFiles.length);
    const acceptedMetas = [...replacements, ...additions.slice(0, availableSlots)];
    const rejectedMetas = additions.slice(availableSlots);
    rejectedMetas.forEach((m) => {
      if (m.url) URL.revokeObjectURL(m.url);
    });

    const newFiles = acceptedMetas.map((m) => ({
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
    if (newFiles.length === 0) return { added: 0, rejected: rejectedMetas.length };

    newFiles.forEach((f) => {
      if (f.file) putMediaFile(f.id, f.file);
    });

    const pending = currentFiles.filter((f) => f._pending);
    const regular = currentFiles.filter((f) => !f._pending);
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
    const nextFiles = [...regular, ...updatedPending, ...unmatchedNew];
    filesRef.current = nextFiles;
    setFiles(nextFiles);

    const first = newFiles.find((file) => file.duration > 0);
    if (clips.length === 0 && first) {
      const clip = makeClip(first.id, first.duration);
      dispatchDocument({ type: 'clip/first-added', clip }, 'add-first-clip');
      setActiveClipId(clip.id);
    }
    return { added: newFiles.length, rejected: rejectedMetas.length };
  }, [clips.length, dispatchDocument]);

  const handleAddClip = useCallback((fileId) => {
    const f = fileById[fileId];
    if (!f || !f.duration || f._pending) return;
    const clip = makeClip(fileId, f.duration - 0.01);
    dispatchDocument({ type: 'clip/added', clip }, 'add-clip');
    setActiveClipId(clip.id);
    setCurrentOffset(0);
  }, [fileById, dispatchDocument]);

  const handleDeleteClip = useCallback((clipId) => {
    const index = clips.findIndex((clip) => clip.id === clipId);
    if (index < 0 || clips.length <= 1) return;
    const nextClips = clips.filter((clip) => clip.id !== clipId);
    const nextActive = nextClips[Math.min(index, nextClips.length - 1)] || null;
    dispatchDocument({ type: 'clip/deleted', clipId }, 'delete-clip');
    setActiveClipId(nextActive?.id || null);
    setCurrentOffset(0);
  }, [clips, dispatchDocument]);

  const handleDuplicateClip = useCallback((clipId) => {
    const source = clips.find((clip) => clip.id === clipId);
    if (!source) return;
    const duplicate = {
      ...source,
      id: nextId('clip'),
      texts: (source.texts || []).map((text) => ({ ...text, id: nextId('text') })),
      transform: { ...(source.transform || DEFAULT_TRANSFORM) },
      audio: { ...(source.audio || DEFAULT_AUDIO) },
      pip: { ...(source.pip || DEFAULT_PIP) },
      collaborativeRating: source.collaborativeRating
        ? { ...source.collaborativeRating, scores: { ...(source.collaborativeRating.scores || {}) } }
        : null,
    };
    dispatchDocument({ type: 'clip/duplicated', sourceClipId: clipId, clip: duplicate }, 'duplicate-clip');
    setActiveClipId(duplicate.id);
  }, [clips, dispatchDocument]);

  const handleReorder = useCallback((newClips) => {
    dispatchDocument({ type: 'clips/reordered', clips: newClips }, 'reorder');
  }, [dispatchDocument]);

  const handleTrimChange = useCallback(({ sourceStart, sourceEnd }) => {
    if (!activeClipId) return;
    const clip = clips.find((candidate) => candidate.id === activeClipId);
    const file = clip ? fileById[clip.fileId] : null;
    dispatchDocument({
      type: 'clip/trimmed',
      clipId: activeClipId,
      sourceStart,
      sourceEnd,
      maxDuration: file?.duration ? file.duration - 0.01 : sourceEnd,
    }, 'trim');
  }, [activeClipId, clips, fileById, dispatchDocument]);

  const handleTransformChange = useCallback((transform) => {
    dispatchDocument({ type: 'clip/updated', clipId: activeClipId, patch: { transform } }, 'transform');
  }, [activeClipId, dispatchDocument]);

  const handleSpeedChange = useCallback((speed) => {
    dispatchDocument({ type: 'clip/updated', clipId: activeClipId, patch: { speed } }, 'speed');
  }, [activeClipId, dispatchDocument]);

  const handleAudioChange = useCallback((audio) => {
    dispatchDocument({ type: 'clip/updated', clipId: activeClipId, patch: { audio } }, 'audio');
  }, [activeClipId, dispatchDocument]);

  const handlePipChange = useCallback((pip) => {
    dispatchDocument({ type: 'clip/updated', clipId: activeClipId, patch: { pip } }, 'pip');
  }, [activeClipId, dispatchDocument]);

  const handleCollaborativeRatingChange = useCallback((partial) => {
    dispatchDocument({
      type: 'clip/rating-updated',
      clipId: activeClipId,
      patch: partial,
    }, 'collaborative-rating');
  }, [activeClipId, dispatchDocument]);

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
    dispatchDocument({ type: 'text/added', clipId: activeClipId, text: t }, 'add-text');
    setSelectedTextId(id);
  }, [activeClipId, activeClipDuration, dispatchDocument]);

  const handleUpdateText = useCallback((id, partial) => {
    dispatchDocument({
      type: 'text/updated',
      clipId: activeClipId,
      textId: id,
      patch: partial,
    }, 'text-update');
  }, [activeClipId, dispatchDocument]);

  const handleDeleteText = useCallback((id) => {
    dispatchDocument({ type: 'text/deleted', clipId: activeClipId, textId: id }, 'delete-text');
    setSelectedTextId((sel) => (sel === id ? null : sel));
  }, [activeClipId, dispatchDocument]);

  const handleSplit = useCallback(() => {
    if (!activeClip) return;
    const clipDur = activeClip.sourceEnd - activeClip.sourceStart;
    if (currentOffset <= 0.05 || currentOffset >= clipDur - 0.05) return;
    const cut = activeClip.sourceStart + Math.min(currentOffset, clipDur - 0.1);
    const splitOffset = cut - activeClip.sourceStart;
    const leftClip = {
      ...activeClip,
      sourceEnd: cut,
      texts: sliceClipTexts(activeClip.texts, 0, splitOffset),
    };
    const rightClip = {
      id: nextId('clip'),
      fileId: activeClip.fileId,
      sourceStart: cut,
      sourceEnd: activeClip.sourceEnd,
      introEnd: activeClip.introEnd,
      videoLayout: activeClip.videoLayout,
      speed: activeClip.speed || 1,
      transform: { ...(activeClip.transform || DEFAULT_TRANSFORM) },
      audio: { ...(activeClip.audio || DEFAULT_AUDIO) },
      pip: { ...(activeClip.pip || DEFAULT_PIP) },
      collaborativeRating: activeClip.collaborativeRating
        ? { ...activeClip.collaborativeRating, scores: { ...(activeClip.collaborativeRating.scores || {}) } }
        : null,
      texts: sliceClipTexts(activeClip.texts, splitOffset, activeClip.sourceEnd - activeClip.sourceStart),
    };
    dispatchDocument({
      type: 'clip/split',
      clipId: activeClip.id,
      leftClip,
      rightClip,
    }, 'split');
    setActiveClipId(rightClip.id);
    setCurrentOffset(0);
  }, [activeClip, currentOffset, dispatchDocument]);

  const handleTransitionChange = useCallback((index, value) => {
    dispatchDocument({ type: 'transition/updated', index, transition: value }, 'transition');
  }, [dispatchDocument]);

  const handleSelectClip = useCallback((clipId, sourceOffset = 0) => {
    setActiveClipId(clipId);
    setCurrentOffset(typeof sourceOffset === 'number' ? Math.max(0, sourceOffset) : 0);
    setSelectedTextId(null);
  }, []);

  const handleApplyTemplate = useCallback((template) => {
    if (!template) return;
    if (clips.length === 0) return;
    const currentParticipants = meta?.collaborativeRanking?.participants || [];
    const participants = template.collaborativeRanking
      ? (currentParticipants.length >= 2 ? currentParticipants : makeDefaultParticipants())
      : currentParticipants;
    const collaborativeRanking = template.collaborativeRanking
      ? { enabled: true, participants }
      : meta?.collaborativeRanking
        ? { ...meta.collaborativeRanking, enabled: false }
        : undefined;
    const nextClips = clips.map((clip, index) => applyClipTemplate(clip, template, index, participants));
    const nextMeta = {
      ...meta,
      blur: template.blur,
      blurEnabled: template.blurEnabled,
      ...(collaborativeRanking ? { collaborativeRanking } : {}),
    };
    dispatchDocument({ type: 'template/applied', clips: nextClips, meta: nextMeta }, 'apply-template');
    setSelectedTextId(null);
  }, [clips, meta, dispatchDocument]);

  const handleReset = useCallback(() => {
    files.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url); });
    setFiles([]);
    undo.reset(createEmptyDocument());
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
        introEnd: c.introEnd,
        videoLayout: c.videoLayout,
        speed: c.speed || 1,
        transform: c.transform || { ...DEFAULT_TRANSFORM },
        audio: c.audio || { ...DEFAULT_AUDIO },
        pip: c.pip ? { ...c.pip, fileName: fileNames[c.pip.fileId] || '' } : { ...DEFAULT_PIP },
        collaborativeRating: c.collaborativeRating
          ? { ...c.collaborativeRating, scores: { ...(c.collaborativeRating.scores || {}) } }
          : null,
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
        introEnd: c.introEnd,
        videoLayout: c.videoLayout,
        speed: c.speed || 1,
        transform: c.transform || { ...DEFAULT_TRANSFORM },
        audio: c.audio || { ...DEFAULT_AUDIO },
        pip: {
          ...(c.pip || DEFAULT_PIP),
          fileId: pipFileId || null,
        },
        collaborativeRating: c.collaborativeRating
          ? { ...c.collaborativeRating, scores: { ...(c.collaborativeRating.scores || {}) } }
          : null,
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
    handleCollaborativeRatingChange,
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
