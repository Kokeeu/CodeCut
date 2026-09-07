import { DEFAULT_META, DEFAULT_TRANSITION } from './projectDefaults.js';
import { sanitizeTransition } from './transitions.js';

export function createEmptyDocument() {
  return {
    clips: [],
    transitions: [],
    meta: { ...DEFAULT_META },
  };
}

export function normalizeTransitions(raw, clipCount) {
  const transitions = (raw || []).map((transition) => sanitizeTransition(transition));
  const expected = Math.max(0, clipCount - 1);
  while (transitions.length < expected) transitions.push({ ...DEFAULT_TRANSITION });
  transitions.length = expected;
  return transitions;
}

function updateClip(clips, clipId, update) {
  return clips.map((clip) => (
    clip.id === clipId ? { ...clip, ...update } : clip
  ));
}

export function reduceProjectDocument(document, action) {
  switch (action.type) {
    case 'meta/replaced':
      return { ...document, meta: action.meta };

    case 'clip/first-added':
      if (document.clips.length > 0) return document;
      return { ...document, clips: [action.clip], transitions: [] };

    case 'clip/added':
      return {
        ...document,
        clips: [...document.clips, action.clip],
        transitions: document.clips.length === 0
          ? []
          : [...document.transitions, { ...DEFAULT_TRANSITION }],
      };

    case 'clip/deleted': {
      const index = document.clips.findIndex((clip) => clip.id === action.clipId);
      if (index < 0 || document.clips.length <= 1) return document;
      const clips = document.clips.filter((clip) => clip.id !== action.clipId);
      const transitions = [...document.transitions];
      transitions.splice(index === 0 ? 0 : index - 1, 1);
      return { ...document, clips, transitions };
    }

    case 'clip/duplicated': {
      const index = document.clips.findIndex((clip) => clip.id === action.sourceClipId);
      if (index < 0) return document;
      const clips = [...document.clips];
      clips.splice(index + 1, 0, action.clip);
      const transitions = [...document.transitions];
      transitions.splice(index, 0, { ...DEFAULT_TRANSITION });
      return { ...document, clips, transitions };
    }

    case 'clips/reordered': {
      const oldIds = document.clips.map((clip) => clip.id);
      const newIds = action.clips.map((clip) => clip.id);
      if (oldIds.length !== newIds.length) {
        return {
          ...document,
          clips: action.clips,
          transitions: normalizeTransitions(document.transitions, action.clips.length),
        };
      }
      const transitions = [];
      for (let index = 0; index < newIds.length - 1; index += 1) {
        const oldIndex = oldIds.indexOf(newIds[index]);
        const nextOldIndex = oldIds.indexOf(newIds[index + 1]);
        if (oldIndex >= 0 && oldIndex === nextOldIndex - 1 && oldIndex < document.transitions.length) {
          transitions.push(document.transitions[oldIndex] || { ...DEFAULT_TRANSITION });
        } else {
          transitions.push({ ...DEFAULT_TRANSITION });
        }
      }
      return { ...document, clips: action.clips, transitions };
    }

    case 'clip/updated':
      return {
        ...document,
        clips: updateClip(document.clips, action.clipId, action.patch),
      };

    case 'clip/trimmed': {
      const maximum = Number.isFinite(action.maxDuration) ? action.maxDuration : action.sourceEnd;
      const sourceStart = Math.max(0, Math.min(action.sourceStart, maximum - 0.1));
      const sourceEnd = Math.max(sourceStart + 0.05, Math.min(action.sourceEnd, maximum));
      return {
        ...document,
        clips: updateClip(document.clips, action.clipId, { sourceStart, sourceEnd }),
      };
    }

    case 'clip/rating-updated':
      return {
        ...document,
        clips: document.clips.map((clip) => (
          clip.id === action.clipId
            ? {
                ...clip,
                collaborativeRating: {
                  enabled: true,
                  average: '0.0',
                  scores: {},
                  ...(clip.collaborativeRating || {}),
                  ...action.patch,
                },
              }
            : clip
        )),
      };

    case 'text/added':
      return {
        ...document,
        clips: document.clips.map((clip) => (
          clip.id === action.clipId
            ? { ...clip, texts: [...(clip.texts || []), action.text] }
            : clip
        )),
      };

    case 'text/updated':
      return {
        ...document,
        clips: document.clips.map((clip) => (
          clip.id === action.clipId
            ? {
                ...clip,
                texts: (clip.texts || []).map((text) => (
                  text.id === action.textId ? { ...text, ...action.patch } : text
                )),
              }
            : clip
        )),
      };

    case 'text/deleted':
      return {
        ...document,
        clips: document.clips.map((clip) => (
          clip.id === action.clipId
            ? { ...clip, texts: (clip.texts || []).filter((text) => text.id !== action.textId) }
            : clip
        )),
      };

    case 'clip/split': {
      const index = document.clips.findIndex((clip) => clip.id === action.clipId);
      if (index < 0) return document;
      const clips = [...document.clips];
      clips.splice(index, 1, action.leftClip, action.rightClip);
      const transitions = [...document.transitions];
      transitions.splice(index, 0, { ...DEFAULT_TRANSITION });
      return { ...document, clips, transitions };
    }

    case 'transition/updated': {
      if (action.index < 0 || action.index >= Math.max(0, document.clips.length - 1)) return document;
      const transitions = [...document.transitions];
      transitions[action.index] = sanitizeTransition(action.transition);
      return { ...document, transitions };
    }

    case 'template/applied':
      return { ...document, clips: action.clips, meta: action.meta };

    case 'document/replaced':
      return {
        clips: action.document.clips || [],
        transitions: normalizeTransitions(
          action.document.transitions,
          (action.document.clips || []).length
        ),
        meta: action.document.meta || { ...DEFAULT_META },
      };

    default:
      return document;
  }
}
