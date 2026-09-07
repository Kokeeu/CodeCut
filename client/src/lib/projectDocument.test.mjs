import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyDocument, reduceProjectDocument } from './projectDocument.js';

function clip(id, start = 0, end = 5) {
  return { id, fileId: `file-${id}`, sourceStart: start, sourceEnd: end, texts: [] };
}

test('adds and deletes clips while preserving the transition invariant', () => {
  let document = reduceProjectDocument(createEmptyDocument(), {
    type: 'clip/first-added',
    clip: clip('a'),
  });
  document = reduceProjectDocument(document, { type: 'clip/added', clip: clip('b') });
  document = reduceProjectDocument(document, { type: 'clip/added', clip: clip('c') });

  assert.equal(document.transitions.length, 2);
  const result = reduceProjectDocument(document, { type: 'clip/deleted', clipId: 'b' });
  assert.deepEqual(result.clips.map((item) => item.id), ['a', 'c']);
  assert.equal(result.transitions.length, 1);
  assert.equal(document.clips.length, 3);
});

test('duplicates a prepared clip without generating data inside the reducer', () => {
  const original = {
    clips: [clip('a')],
    transitions: [],
    meta: {},
  };
  const duplicate = { ...clip('copy'), fileId: 'file-a' };
  const result = reduceProjectDocument(original, {
    type: 'clip/duplicated',
    sourceClipId: 'a',
    clip: duplicate,
  });

  assert.deepEqual(result.clips.map((item) => item.id), ['a', 'copy']);
  assert.equal(result.transitions.length, 1);
  assert.equal(original.clips.length, 1);
});

test('resets transitions between clips that were not adjacent before reordering', () => {
  const original = {
    clips: [clip('a'), clip('b'), clip('c')],
    transitions: [
      { type: 'fade', durationSec: 0.5 },
      { type: 'wipeleft', durationSec: 0.4 },
    ],
    meta: {},
  };
  const result = reduceProjectDocument(original, {
    type: 'clips/reordered',
    clips: [original.clips[2], original.clips[0], original.clips[1]],
  });

  assert.deepEqual(result.transitions[0], { type: 'none', durationSec: 0 });
  assert.deepEqual(result.transitions[1], original.transitions[0]);
});

test('clamps trim ranges to valid source media bounds', () => {
  const original = { clips: [clip('a')], transitions: [], meta: {} };
  const result = reduceProjectDocument(original, {
    type: 'clip/trimmed',
    clipId: 'a',
    sourceStart: 9.99,
    sourceEnd: 12,
    maxDuration: 10,
  });

  assert.equal(result.clips[0].sourceStart, 9.9);
  assert.equal(result.clips[0].sourceEnd, 10);
});

test('splits a clip and inserts exactly one transition', () => {
  const original = {
    clips: [clip('a', 0, 5), clip('b', 0, 4)],
    transitions: [{ type: 'fade', durationSec: 0.5 }],
    meta: {},
  };
  const result = reduceProjectDocument(original, {
    type: 'clip/split',
    clipId: 'a',
    leftClip: clip('a', 0, 2),
    rightClip: clip('a2', 2, 5),
  });

  assert.deepEqual(result.clips.map((item) => item.id), ['a', 'a2', 'b']);
  assert.deepEqual(result.transitions, [
    { type: 'none', durationSec: 0 },
    { type: 'fade', durationSec: 0.5 },
  ]);
});

test('replaces a document while normalizing missing transitions', () => {
  const result = reduceProjectDocument(createEmptyDocument(), {
    type: 'document/replaced',
    document: { clips: [clip('a'), clip('b')], transitions: [], meta: { blur: 10 } },
  });

  assert.equal(result.transitions.length, 1);
  assert.deepEqual(result.meta, { blur: 10 });
});
