import { DEFAULT_TEXT_STYLE, nextId } from './projectDefaults.js';

export function applyClipTemplate(clip, template, clipIndex = 0, participants = []) {
  const duration = clip.sourceEnd - clip.sourceStart;
  const sequence = template.clipSequence;
  const phase = sequence?.[Math.min(clipIndex, sequence.length - 1)];
  const texts = phase ? template.texts.filter((text) => text.phase === phase) : template.texts;
  return {
    ...clip,
    introEnd: undefined,
    videoLayout: phase === 'intro' ? 'cover' : undefined,
    collaborativeRating: template.collaborativeRanking
      ? {
          enabled: true,
          average: '8.8',
          scores: Object.fromEntries(participants.map((participant, index) => [
            participant.id,
            index === 0 ? '8.5' : index === 1 ? '9.0' : '0.0',
          ])),
        }
      : null,
    transform: template.transform ? { ...template.transform } : clip.transform,
    texts: texts.map((text) => ({
      ...DEFAULT_TEXT_STYLE,
      id: nextId('text'),
      text: text.text,
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
