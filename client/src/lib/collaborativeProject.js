import { clampRating } from './collaborativeRanking.js';

export const COLLABORATIVE_FIELDS = ['heading', 'position', 'song', 'artist'];
const LEGACY_Y = [105, 205, 1010, 1100];
const PLACEHOLDERS = { song: 'TÍTULO DE LA CANCIÓN', artist: 'ARTISTA' };
const STYLE_KEYS = ['x', 'y', 'size', 'font', 'color', 'align', 'bgEnabled', 'bgColor', 'bgPadding', 'bgRadius', 'bgOpacity', 'strokeEnabled', 'strokeColor', 'strokeWidth', 'rotation'];

export function bindCollaborativeFields(clip) {
  if (!clip.collaborativeRating || clip.texts?.some((text) => text.collaborativeField)) return clip;
  let changed = false;
  const texts = (clip.texts || []).map((text) => {
    const index = text.x === 540 ? LEGACY_Y.indexOf(text.y) : -1;
    if (index < 0) return text;
    changed = true;
    return { ...text, collaborativeField: COLLABORATIVE_FIELDS[index] };
  });
  return changed ? { ...clip, texts } : clip;
}

export function getCollaborativeFields(clip) {
  const fields = {};
  for (const text of bindCollaborativeFields(clip).texts || []) {
    if (COLLABORATIVE_FIELDS.includes(text.collaborativeField)) fields[text.collaborativeField] = text;
  }
  return fields;
}

export function copyCollaborativeStyle(clip, source) {
  const styles = getCollaborativeFields(source);
  return {
    ...clip,
    texts: (clip.texts || []).map((text) => {
      const style = styles[text.collaborativeField];
      return style ? {
        ...text,
        ...Object.fromEntries(STYLE_KEYS.filter((key) => style[key] !== undefined).map((key) => [key, style[key]])),
      } : text;
    }),
  };
}

export function parseSongFilename(name, format = 'artist-song') {
  const base = String(name || '').replace(/\.(mp4|mov|webm|mkv|m4v|avi|mpg|mpeg|ogv|3gp|mts|m2ts)$/i, '')
    .replace(/^\d{1,3}\s*[-.)_]\s*/, '').replace(/_/g, ' ').trim();
  if (format === 'song') return { song: base, artist: '' };
  const parts = base.split(/\s+[-–—]\s+/);
  if (parts.length < 2) return { song: base, artist: '' };
  return format === 'song-artist'
    ? { song: parts.slice(0, -1).join(' - '), artist: parts.at(-1) }
    : { artist: parts[0], song: parts.slice(1).join(' - ') };
}

export function isEmptySongField(field, value) {
  return !String(value || '').trim() || String(value).trim().toUpperCase() === PLACEHOLDERS[field];
}

export function buildFilenameRows(clips, fileById, format, replaceExisting = false, defaultArtist = '') {
  return clips.filter((clip) => clip.collaborativeRating).map((clip) => {
    const fields = getCollaborativeFields(clip);
    const parsed = parseSongFilename(fileById[clip.fileId]?.name, format);
    if (!parsed.song) return { clipId: clip.id, fields: {} };
    if (!parsed.artist) parsed.artist = defaultArtist.trim();
    return {
      clipId: clip.id,
      fields: Object.fromEntries(['song', 'artist'].filter((field) => (
        fields[field] && (replaceExisting
          ? parsed[field] !== fields[field].text
          : parsed[field] && isEmptySongField(field, fields[field].text))
      )).map((field) => [field, parsed[field]])),
    };
  });
}

export function syncCollaborativeDocument(document) {
  const ranking = document.meta?.collaborativeRanking;
  if (!ranking?.enabled) return document;
  const count = document.clips.filter((clip) => clip.collaborativeRating).length;
  let index = 0;
  let changed = false;
  const clips = document.clips.map((original) => {
    if (!original.collaborativeRating) return original;
    const clip = bindCollaborativeFields(original);
    index += 1;
    let textChanged = false;
    const texts = (clip.texts || []).map((text) => {
      let value = text.text;
      if (text.collaborativeField === 'heading' && typeof ranking.title === 'string') value = ranking.title;
      if (text.collaborativeField === 'position' && ['ascending', 'descending'].includes(ranking.rankOrder)) {
        value = `#${String(ranking.rankOrder === 'descending' ? count - index + 1 : index).padStart(2, '0')}`;
      }
      if (value === text.text) return text;
      textChanged = true;
      return { ...text, text: value };
    });
    if (clip !== original || textChanged) changed = true;
    return textChanged ? { ...clip, texts } : clip;
  });
  return changed ? { ...document, clips } : document;
}

export function updateCollaborativeDocument(document, { settings = {}, rows = [], styleSourceClipId, automaticTotals = false }) {
  if (!document.meta?.collaborativeRanking?.enabled) return document;
  const ranking = { ...document.meta.collaborativeRanking };
  if (typeof settings.title === 'string') ranking.title = settings.title;
  if (typeof settings.defaultArtist === 'string') ranking.defaultArtist = settings.defaultArtist;
  if (['ascending', 'descending', 'manual'].includes(settings.rankOrder)) ranking.rankOrder = settings.rankOrder;
  if (['artist-song', 'song-artist', 'song'].includes(settings.filenameFormat)) ranking.filenameFormat = settings.filenameFormat;
  const participants = new Set((ranking.participants || []).map((participant) => participant.id));
  const patches = new Map(rows.map((row) => [row.clipId, row]));
  const source = document.clips.find((clip) => clip.id === styleSourceClipId);
  const clips = document.clips.map((original) => {
    if (!original.collaborativeRating) return original;
    const bound = bindCollaborativeFields(original);
    const clip = source ? copyCollaborativeStyle(bound, source) : bound;
    const patch = patches.get(clip.id) || {};
    const scores = { ...clip.collaborativeRating.scores };
    for (const [id, value] of Object.entries(patch.scores || {})) {
      if (participants.has(id)) scores[id] = value === '' ? '' : String(clampRating(value));
    }
    return {
      ...clip,
      texts: (clip.texts || []).map((text) => {
        const field = text.collaborativeField;
        return typeof patch.fields?.[field] === 'string' ? { ...text, text: patch.fields[field] } : text;
      }),
      collaborativeRating: {
        ...clip.collaborativeRating,
        scores,
        ...(automaticTotals || patch.automaticTotal ? { total: null } : {}),
      },
    };
  });
  return syncCollaborativeDocument({ ...document, clips, meta: { ...document.meta, collaborativeRanking: ranking } });
}

function readTsv(value) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = value.replace(/\r\n?/g, '\n');
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && (quoted || cell === '')) {
      if (quoted && input[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && (char === '\t' || char === '\n')) {
      row.push(cell.trim());
      cell = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else cell += char;
  }
  if (quoted) throw new Error('Hay comillas sin cerrar en los datos pegados.');
  row.push(cell.trim());
  rows.push(row);
  while (rows.length && rows.at(-1).every((cellValue) => cellValue === '')) rows.pop();
  return rows;
}

export function parseCollaborativePaste(value, clips, participants) {
  const rows = readTsv(value);
  if (/^(canción|cancion|song|título|titulo)$/i.test(rows[0]?.[0] || '') && /^(artista|artist)$/i.test(rows[0]?.[1] || '')) rows.shift();
  if (!rows.length) throw new Error('Pega al menos una fila con datos.');
  if (rows.length > clips.length) throw new Error(`Hay ${rows.length} filas y solo ${clips.length} canciones en el Top.`);
  return rows.map((cells, index) => {
    if (cells.length > participants.length + 2) throw new Error(`La fila ${index + 1} tiene columnas de más. Usa canción, artista y una nota por participante.`);
    const scores = {};
    cells.slice(2).forEach((value, participantIndex) => {
      if (value === '') return;
      const normalized = value.replace(',', '.');
      if (!/^\d+(\.\d+)?$/.test(normalized) || Number(normalized) > 10) {
        throw new Error(`La nota de ${participants[participantIndex].name} en la fila ${index + 1} debe estar entre 0 y 10.`);
      }
      scores[participants[participantIndex].id] = String(Number(normalized));
    });
    const fields = {};
    if (cells[0]) fields.song = cells[0];
    if (cells[1]) fields.artist = cells[1];
    const existing = getCollaborativeFields(clips[index]);
    if (Object.keys(fields).some((field) => !existing[field])) {
      throw new Error(`El clip ${index + 1} tiene textos eliminados o sin reconocer. Vuelve a aplicar Top Colaborativo para recuperarlos antes de pegar.`);
    }
    return { clipId: clips[index].id, fields, scores };
  });
}
