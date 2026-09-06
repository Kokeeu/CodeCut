import assert from 'node:assert/strict';
import test from 'node:test';
import { getExportEncodingSummary } from './exportSettings.js';

test('uses the high 1080p TikTok defaults', () => {
  const settings = getExportEncodingSummary();

  assert.equal(settings.width, 1080);
  assert.equal(settings.height, 1920);
  assert.equal(settings.fps, 30);
  assert.equal(settings.crf, 19);
  assert.equal(settings.maxVideoBitrateKbps, 12000);
  assert.equal(settings.audioBitrateKbps, 192);
});

test('scales the bitrate ceiling for maximum 9:16 resolution at 60 fps', () => {
  const settings = getExportEncodingSummary({ resolution: '2304', fps: 60, quality: 'ultra' });

  assert.equal(settings.width, 2304);
  assert.equal(settings.height, 4096);
  assert.equal(settings.maxVideoBitrateKbps, 97200);
  assert.equal(settings.crf, 16);
});

test('falls back safely when settings are unsupported', () => {
  const settings = getExportEncodingSummary({ resolution: '9999', fps: 120, quality: 'unknown' });

  assert.equal(settings.width, 1080);
  assert.equal(settings.fps, 30);
  assert.equal(settings.quality, 'high');
});
