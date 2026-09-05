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
export const PROJECT_VERSION = '0.13';

export const PARTICIPANT_ACCENTS = [
  '#fb7185',
  '#22d3ee',
  '#a78bfa',
  '#fbbf24',
  '#34d399',
  '#f472b6',
];

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

export function makeDefaultParticipants() {
  return [
    { id: nextId('participant'), name: 'Participante 1', image: null, accent: PARTICIPANT_ACCENTS[0] },
    { id: nextId('participant'), name: 'Participante 2', image: null, accent: PARTICIPANT_ACCENTS[1] },
  ];
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
    font: 'bebasneue',
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
    id: 'tpl-top-musical',
    name: 'Top Musical',
    font: 'bebasneue',
    color: '#ffffff',
    blur: 30,
    blurEnabled: true,
    texts: [
      { id: 'tpl-2-text-1', text: 'TOP MUSICAL', x: 540, y: 120, size: 88, align: 'center' },
      { id: 'tpl-2-text-2', text: '#01', x: 70, y: 1000, size: 144, align: 'left' },
      { id: 'tpl-2-text-3', text: 'TÍTULO DE LA\nCANCIÓN', x: 70, y: 1190, size: 68, align: 'left' },
      { id: 'tpl-2-text-4', text: 'ARTISTA', x: 70, y: 1380, size: 52, align: 'left' },
      { id: 'tpl-2-text-5', text: 'TOP 10 • SEMANA 01', x: 70, y: 1490, size: 36, align: 'left' },
    ],
  },
  {
    id: 'tpl-top-musical-colaborativo',
    name: 'Top Colaborativo',
    description: 'Fotos, nombres, notas manuales y promedio por canción',
    font: 'bebasneue',
    color: '#ffffff',
    blur: 30,
    blurEnabled: true,
    collaborativeRanking: true,
    texts: [
      { id: 'tpl-collab-text-1', text: 'TOP DE CANCIONES', x: 540, y: 105, size: 78, align: 'center' },
      { id: 'tpl-collab-text-2', text: '#01', x: 540, y: 205, size: 118, align: 'center', color: '#c084fc' },
      { id: 'tpl-collab-text-3', text: 'TÍTULO DE LA CANCIÓN', x: 540, y: 1010, size: 62, align: 'center' },
      { id: 'tpl-collab-text-4', text: 'ARTISTA', x: 540, y: 1100, size: 44, align: 'center', color: '#c4b5fd' },
    ],
  },
  {
    id: 'tpl-music-discovery',
    name: 'Descubre música',
    description: 'Clip 1: intro completa · clips siguientes: canción + artista',
    font: 'bebasneue',
    color: '#ffffff',
    blur: 30,
    blurEnabled: true,
    clipSequence: ['intro', 'main'],
    transform: { x: 0, y: 0, scale: 1 },
    texts: [
      { id: 'tpl-discovery-1', text: 'Canciones que tal vez', x: 540, y: 790, size: 76, align: 'center', phase: 'intro' },
      { id: 'tpl-discovery-2', text: 'no conocías', x: 540, y: 885, size: 76, align: 'center', phase: 'intro' },
      { id: 'tpl-discovery-3', text: 'Hoy:', x: 540, y: 980, size: 76, align: 'center', phase: 'intro' },
      { id: 'tpl-discovery-4', text: 'Nombre de la canción — Artista', x: 540, y: 1160, size: 58, align: 'center', phase: 'main' },
    ],
  },
];
