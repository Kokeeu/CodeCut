import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyClipTemplate, sliceClipTexts } from './clipTemplates.js';
import { TEMPLATES, makeClip } from './projectDefaults.js';

const discovery = TEMPLATES.find((template) => template.id === 'tpl-music-discovery');
const collaborative = TEMPLATES.find((template) => template.id === 'tpl-top-musical-colaborativo');

test('the first clip is a full-length intro and retains its source media', () => {
  const source = makeClip('file', 40, { sourceStart: 10, speed: 2 });
  const clip = applyClipTemplate(source, discovery, 0);
  assert.equal(clip.videoLayout, 'cover');
  assert.equal(clip.introEnd, undefined);
  assert.equal(clip.sourceStart, 10);
  assert.equal(clip.sourceEnd, 40);
  assert.equal(clip.id, source.id);
  assert.equal(clip.audio, source.audio);
  assert.deepEqual(clip.texts.map((text) => text.text), ['Canciones que tal vez', 'no conocías', 'Hoy:']);
  assert.ok(clip.texts.every((text) => text.startOffset === 0 && text.endOffset === 30));
  assert.ok(clip.texts.every((text) => text.font === 'bebasneue' && text.color === '#ffffff'));
  assert.equal(new Set(clip.texts.map((text) => text.id)).size, 3);
});

test('a short or single clip stays an intro without an automatic song handoff', () => {
  const clip = applyClipTemplate(makeClip('file', 1), discovery);
  assert.equal(clip.videoLayout, 'cover');
  assert.equal(clip.texts.length, 3);
  assert.ok(clip.texts.every((text) => text.startOffset === 0 && text.endOffset === 1));
});

test('the second and later clips show only song information for their full duration', () => {
  for (const index of [1, 2, 5]) {
    for (const speed of [0.5, 1, 2]) {
      const clip = applyClipTemplate(makeClip('song', 4, { sourceStart: 3, speed }), discovery, index);
      assert.equal(clip.videoLayout, undefined);
      assert.equal(clip.introEnd, undefined);
      assert.equal(clip.texts.length, 1);
      assert.equal(clip.texts[0].text, 'Nombre de la canción — Artista');
      assert.equal(clip.texts[0].startOffset, 0);
      assert.equal(clip.texts[0].endOffset, 1);
    }
  }
});

test('reapplying is stable and switching templates removes the intro', () => {
  const clip = applyClipTemplate(makeClip('file', 12), discovery);
  const reapplied = applyClipTemplate(clip, discovery);
  assert.equal(reapplied.videoLayout, 'cover');
  assert.equal(reapplied.texts.length, 3);
  assert.notEqual(reapplied.texts[0].id, clip.texts[0].id);
  const opening = applyClipTemplate(clip, TEMPLATES[0]);
  assert.equal(opening.introEnd, undefined);
  assert.equal(opening.videoLayout, undefined);
  assert.equal(opening.texts.length, TEMPLATES[0].texts.length);
  assert.ok(opening.texts.every((text) => text.startOffset === 0 && text.endOffset === 12));
});

test('reapplying uses the current clip order and replaces the legacy timed intro', () => {
  const clips = [makeClip('intro', 12), makeClip('song', 8), makeClip('song2', 6)]
    .map((clip, index) => applyClipTemplate({ ...clip, introEnd: 3 }, discovery, index));
  assert.deepEqual(clips.map((clip) => clip.texts.length), [3, 1, 1]);
  assert.ok(clips.every((clip) => clip.introEnd === undefined));
  const reordered = [clips[1], clips[0], clips[2]]
    .map((clip, index) => applyClipTemplate(clip, discovery, index));
  assert.deepEqual(reordered.map((clip) => clip.fileId), ['song', 'intro', 'song2']);
  assert.deepEqual(reordered.map((clip) => clip.videoLayout), ['cover', undefined, undefined]);
  assert.deepEqual(reordered.map((clip) => clip.texts.length), [3, 1, 1]);
  assert.equal(new Set(reordered.flatMap((clip) => clip.texts.map((text) => text.id))).size, 5);
});

test('splitting retains the text of that clip without introducing another phase', () => {
  for (const index of [0, 1]) {
    const clip = applyClipTemplate(makeClip('file', 12), discovery, index);
    const firstHalf = sliceClipTexts(clip.texts, 0, 5);
    const secondHalf = sliceClipTexts(clip.texts, 5, 12);
    assert.deepEqual(firstHalf.map((text) => text.text), clip.texts.map((text) => text.text));
    assert.deepEqual(secondHalf.map((text) => text.text), clip.texts.map((text) => text.text));
    assert.ok(firstHalf.every((text) => text.startOffset === 0 && text.endOffset === 5));
    assert.ok(secondHalf.every((text) => text.startOffset === 0 && text.endOffset === 7));
  }
});

test('the collaborative template assigns manual scores to every participant', () => {
  const participants = [
    { id: 'ana', name: 'Ana' },
    { id: 'mateo', name: 'Mateo' },
    { id: 'leo', name: 'Leo' },
  ];
  const clip = applyClipTemplate(makeClip('song', 12), collaborative, 0, participants);
  assert.equal(clip.collaborativeRating.enabled, true);
  assert.equal(clip.collaborativeRating.average, '8.8');
  assert.deepEqual(clip.collaborativeRating.scores, { ana: '8.5', mateo: '9.0', leo: '0.0' });
  assert.equal(clip.texts.length, 4);
});

test('switching away from the collaborative template removes its rating panel', () => {
  const participant = { id: 'ana', name: 'Ana' };
  const collaborativeClip = applyClipTemplate(makeClip('song', 12), collaborative, 0, [participant]);
  const regularClip = applyClipTemplate(collaborativeClip, TEMPLATES[0]);
  assert.equal(regularClip.collaborativeRating, null);
});
