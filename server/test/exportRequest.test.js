const test = require('node:test');
const assert = require('node:assert/strict');
const { parseExportRequest } = require('../lib/exportRequest');

function bodyWith(clips, extra = {}) {
  return {
    clips: JSON.stringify(clips),
    ...extra,
  };
}

test('parses and defaults a valid export request', () => {
  const request = parseExportRequest(bodyWith([
    { id: 'clip-1', fileIndex: 0, sourceStart: 0, sourceEnd: 2, speed: 1 },
  ]), 1);

  assert.equal(request.meta.blur, 30);
  assert.equal(request.meta.blurEnabled, true);
  assert.deepEqual(request.transitions, {});
  assert.deepEqual(request.exportConfig, {});
});

test('rejects malformed JSON and invalid finite clip ranges', () => {
  assert.throws(
    () => parseExportRequest({ clips: '[' }, 1),
    /Invalid JSON in clips/
  );
  assert.throws(
    () => parseExportRequest(bodyWith([
      { id: 'clip-1', fileIndex: 0, sourceStart: 0, sourceEnd: null },
    ]), 1),
    /finite numbers/
  );
});

test('rejects unsupported speed and missing media references', () => {
  assert.throws(
    () => parseExportRequest(bodyWith([
      { id: 'clip-1', fileIndex: 0, sourceStart: 0, sourceEnd: 2, speed: -1 },
    ]), 1),
    /unsupported speed/
  );
  assert.throws(
    () => parseExportRequest(bodyWith([
      {
        id: 'clip-1',
        fileIndex: 0,
        sourceStart: 0,
        sourceEnd: 2,
        pip: { enabled: true },
      },
    ]), 1),
    /Invalid PIP fileIndex/
  );
});

test('validates rating overlay references independently of video files', () => {
  const clips = [{
    id: 'clip-1',
    fileIndex: 0,
    sourceStart: 0,
    sourceEnd: 2,
    ratingOverlayFileIndex: 0,
  }];

  assert.doesNotThrow(() => parseExportRequest(bodyWith(clips), 1, 1));
  assert.throws(
    () => parseExportRequest(bodyWith(clips), 1, 0),
    /Invalid rating overlay fileIndex/
  );
});
