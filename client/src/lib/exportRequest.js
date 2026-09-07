import { sanitizeTransition } from './transitions.js';

export function buildExportClips(files, clips, ratingOverlayBlobs = []) {
  const fileIndexById = Object.fromEntries(files.map((file, index) => [file.id, index]));
  let ratingOverlayFileIndex = 0;

  return clips.map((clip, clipIndex) => ({
    id: clip.id,
    fileIndex: fileIndexById[clip.fileId],
    sourceStart: clip.sourceStart,
    sourceEnd: clip.sourceEnd,
    introEnd: clip.introEnd,
    videoLayout: clip.videoLayout,
    speed: clip.speed || 1,
    duration: (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1),
    transform: clip.transform || { x: 0, y: 0, scale: 1 },
    audio: clip.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 },
    pip: clip.pip?.enabled && Number.isInteger(fileIndexById[clip.pip.fileId])
      ? {
          enabled: true,
          fileIndex: fileIndexById[clip.pip.fileId],
          position: clip.pip.position || 'bottom-right',
          size: clip.pip.size || 30,
          opacity: clip.pip.opacity ?? 1,
          border: clip.pip.border ?? true,
          borderWidth: clip.pip.borderWidth || 4,
          borderRadius: clip.pip.borderRadius || 8,
        }
      : null,
    collaborativeRating: clip.collaborativeRating || null,
    ratingOverlayFileIndex: ratingOverlayBlobs[clipIndex]
      ? ratingOverlayFileIndex++
      : null,
    texts: (clip.texts || []).map((text) => ({
      ...text,
      animation: text.animation || null,
    })),
  }));
}

export function buildExportTransitions(clips, transitions) {
  const result = {};
  for (let index = 0; index < clips.length - 1; index += 1) {
    const transition = sanitizeTransition(transitions[index]);
    result[`${clips[index].id}|${clips[index + 1].id}`] = {
      type: transition.type,
      durationSec: transition.durationSec,
    };
  }
  return result;
}

export function sanitizeExportMeta(meta) {
  const collaborativeRanking = meta?.collaborativeRanking
    ? {
        ...meta.collaborativeRanking,
        participants: (meta.collaborativeRanking.participants || []).map(
          ({ image: _image, ...participant }) => participant
        ),
      }
    : undefined;

  return {
    ...(meta || {}),
    ...(collaborativeRanking ? { collaborativeRanking } : {}),
  };
}

export function createExportFormData({
  files,
  clips,
  transitions,
  meta,
  exportConfig,
  ratingOverlayBlobs = [],
}) {
  const form = new FormData();
  files.forEach((file) => form.append('videos', file.file, file.name));
  ratingOverlayBlobs.forEach((blob, index) => {
    if (blob) form.append('ratingOverlays', blob, `rating-overlay-${index}.png`);
  });
  form.append('clips', JSON.stringify(buildExportClips(files, clips, ratingOverlayBlobs)));
  form.append('transitions', JSON.stringify(buildExportTransitions(clips, transitions)));
  form.append('meta', JSON.stringify(sanitizeExportMeta(meta)));
  form.append('exportConfig', JSON.stringify(exportConfig));
  return form;
}
