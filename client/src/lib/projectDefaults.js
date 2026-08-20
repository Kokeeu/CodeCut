export const DEFAULT_TRANSITION = { type: 'none', durationSec: 0 };
export const DEFAULT_TRANSFORM = { x: 0, y: 0, scale: 1 };
export const DEFAULT_AUDIO = { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 };
export const DEFAULT_PIP = {
  enabled: false,
  fileId: null,
  position: 'bottom-right',
  size: 30,
  opacity: 1,
  border: true,
  borderWidth: 4,
  borderRadius: 8,
};
export const DEFAULT_META = { blur: 30, blurEnabled: true };
export const DEFAULT_TEXT_STYLE = {
  bgEnabled: false,
  bgColor: '#000000',
  bgPadding: 12,
  bgRadius: 8,
  bgOpacity: 0.7,
  strokeEnabled: false,
  strokeColor: '#000000',
  strokeWidth: 2,
  rotation: 0,
};
export const PROJECT_VERSION = '0.12';

export const BG_BRIGHTNESS = -0.05;
export const BG_SATURATION = 0.5;

const idCounter = { value: 0 };
export function nextId(prefix) {
  idCounter.value += 1;
  const uniq = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${uniq}-${idCounter.value.toString(36)}`;
}

export function makeClip(fileId, duration, extras = {}) {
  return {
    id: nextId('clip'),
    fileId,
    sourceStart: 0,
    sourceEnd: duration,
    speed: 1,
    transform: { ...DEFAULT_TRANSFORM },
    audio: { ...DEFAULT_AUDIO },
    pip: { ...DEFAULT_PIP },
    texts: [],
    ...extras,
  };
}

export const TEMPLATES = [
  {
    id: 'tpl-opening-anime',
    name: 'Opening Anime',
    font: 'inter',
    color: '#ffffff',
    blur: 30,
    blurEnabled: true,
    texts: [
      { id: 'tpl-1-text-1', text: 'Openings favs', x: 540, y: 180, size: 75, align: 'center' },
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
