import { DEFAULT_TEXT_STYLE, nextId } from './projectDefaults.js';
import { getCollaborativeFields, isEmptySongField, parseSongFilename } from './collaborativeProject.js';

export function applyClipTemplate(clip, template, clipIndex = 0, participants = [], options = {}) {
  const duration = clip.sourceEnd - clip.sourceStart;
  const sequence = template.clipSequence;
  const phase = sequence?.[Math.min(clipIndex, sequence.length - 1)];
  const texts = phase ? template.texts.filter((text) => text.phase === phase) : template.texts;
  const previousFields = template.collaborativeRanking ? getCollaborativeFields(clip) : {};
  const song = template.collaborativeRanking ? parseSongFilename(options.fileName, options.filenameFormat) : {};
  if (template.collaborativeRanking && !song.artist) song.artist = options.defaultArtist || '';
  return {
    ...clip,
    introEnd: undefined,
    videoLayout: phase === 'intro' ? 'cover' : undefined,
    collaborativeRating: template.collaborativeRanking
      ? {
          enabled: true,
          ...clip.collaborativeRating,
          scores: Object.fromEntries(participants.map((participant) => [
            participant.id,
            clip.collaborativeRating?.scores?.[participant.id] ?? '',
          ])),
        }
      : null,
    transform: template.transform ? { ...template.transform } : clip.transform,
    texts: texts.map((text) => ({
      ...DEFAULT_TEXT_STYLE,
      id: nextId('text'),
      text: ['song', 'artist'].includes(text.collaborativeField) && isEmptySongField(text.collaborativeField, previousFields[text.collaborativeField]?.text)
        ? (song[text.collaborativeField] || text.text)
        : (previousFields[text.collaborativeField]?.text ?? text.text),
      ...(text.collaborativeField ? { collaborativeField: text.collaborativeField } : {}),
      x: text.x,
      y: text.y,
      size: text.size,
      font: text.font || template.font,
      color: text.color || template.color,
      align: text.align || 'left',
      startOffset: 0,
      endOffset: duration,
      animation: null,
    })),
  };
}

export function sliceClipTexts(texts, start, end) {
  return (texts || []).map((text) => ({
    ...text,
    id: nextId('text'),
    startOffset: Math.max(0, (text.startOffset ?? 0) - start),
    endOffset: Math.min(end - start, (text.endOffset ?? end) - start),
  })).filter((text) => text.endOffset > text.startOffset);
}
