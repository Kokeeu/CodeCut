const assert = require('node:assert/strict');
const test = require('node:test');
const { getEncodingSettings, normalizeExportConfig } = require('../lib/exportConfig');
const { buildFilterGraph } = require('../lib/ffmpegPipeline');

test('normalizes unsupported export input to safe defaults', () => {
  assert.deepEqual(
    normalizeExportConfig({ resolution: '9999', fps: '120', quality: 'anything' }),
    { resolution: '1080', fps: 30, quality: 'high' }
  );
});

test('builds a constrained VBR profile for TikTok 1080p', () => {
  const settings = getEncodingSettings({ resolution: '1080', fps: 30, quality: 'high' });

  assert.equal(settings.width, 1080);
  assert.equal(settings.height, 1920);
  assert.equal(settings.crf, 19);
  assert.equal(settings.preset, 'medium');
  assert.equal(settings.maxRateKbps, 12000);
  assert.equal(settings.bufferSizeKbps, 24000);
  assert.equal(settings.audioBitrateKbps, 192);
});

test('supports TikTok API maximum 9:16 dimensions and 60 fps', () => {
  const settings = getEncodingSettings({ resolution: '2304', fps: 60, quality: 'ultra' });

  assert.equal(settings.width, 2304);
  assert.equal(settings.height, 4096);
  assert.equal(settings.maxRateKbps, 97200);
});

test('renders the selected frame rate and scales the canvas transform', () => {
  const graph = buildFilterGraph(
    [{
      id: 'clip-1',
      sourceStart: 0,
      sourceEnd: 1,
      speed: 1,
      hasAudio: false,
      transform: { x: 10, y: 20, scale: 1 },
      texts: [],
    }],
    {},
    { blurEnabled: false },
    {},
    { resolution: '2160', fps: 60, quality: 'high' }
  );

  assert.match(graph, /fps=60/);
  assert.match(graph, /s=2160x3840:r=60/);
  assert.match(graph, /overlay=x=\(W-w\)\/2\+20:y=720\+40/);
});
