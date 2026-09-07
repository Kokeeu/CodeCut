import assert from 'node:assert/strict';
import test from 'node:test';
import { exportJobReducer, INITIAL_EXPORT_STATE } from './exportJobState.js';
import {
  buildExportClips,
  buildExportTransitions,
  sanitizeExportMeta,
} from './exportRequest.js';

test('builds a stable server clip contract including PIP and overlays', () => {
  const files = [
    { id: 'main' },
    { id: 'pip' },
  ];
  const clips = [{
    id: 'clip-1',
    fileId: 'main',
    sourceStart: 1,
    sourceEnd: 5,
    speed: 2,
    pip: { enabled: true, fileId: 'pip', opacity: 0.5 },
    texts: [{ id: 'text-1', text: 'Hello' }],
  }];
  const result = buildExportClips(files, clips, [{}]);

  assert.equal(result[0].fileIndex, 0);
  assert.equal(result[0].duration, 2);
  assert.equal(result[0].pip.fileIndex, 1);
  assert.equal(result[0].pip.opacity, 0.5);
  assert.equal(result[0].ratingOverlayFileIndex, 0);
  assert.equal(result[0].texts[0].animation, null);
});

test('keys transitions by adjacent clip IDs and sanitizes invalid values', () => {
  const result = buildExportTransitions(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [{ type: 'fade', durationSec: 0.5 }, { type: 'invalid', durationSec: 99 }]
  );

  assert.deepEqual(result['a|b'], { type: 'fade', durationSec: 0.5 });
  assert.equal(result['b|c'].type, 'fade');
  assert.equal(result['b|c'].durationSec, 99);
});

test('removes browser-only participant images from export metadata', () => {
  const result = sanitizeExportMeta({
    collaborativeRanking: {
      participants: [{ id: 'p1', name: 'One', image: 'data:image/png;base64,abc' }],
    },
  });

  assert.deepEqual(result.collaborativeRanking.participants, [{ id: 'p1', name: 'One' }]);
});

test('export job state prevents progress regression and resets atomically', () => {
  let state = exportJobReducer(INITIAL_EXPORT_STATE, { type: 'start' });
  state = exportJobReducer(state, { type: 'processing', progress: 0.2 });
  state = exportJobReducer(state, { type: 'progress', progress: 0.6 });
  state = exportJobReducer(state, { type: 'progress', progress: 0.4 });
  assert.deepEqual(state, { status: 'processing', progress: 0.6, error: null });

  state = exportJobReducer(state, { type: 'progress', progress: 2 });
  assert.equal(state.progress, 1);

  state = exportJobReducer(state, { type: 'fail', error: 'network' });
  assert.deepEqual(state, { status: 'idle', progress: 0, error: 'network' });
});
