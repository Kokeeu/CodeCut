import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeYouTubeUrl, parseYouTubeInput } from './youtubeImport.js';

test('normalizes individual YouTube links', () => {
  assert.equal(normalizeYouTubeUrl('https://youtu.be/YE7VzlLtp-4?t=4'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=YE7VzlLtp-4&list=ignored'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/shorts/YE7VzlLtp-4'), 'https://www.youtube.com/watch?v=YE7VzlLtp-4');
});

test('rejects unsupported sources and non-video YouTube pages', () => {
  assert.throws(() => normalizeYouTubeUrl('https://example.com/video'), /YouTube/);
  assert.throws(() => normalizeYouTubeUrl('https://www.youtube.com/playlist?list=abc'), /individual/);
  assert.throws(() => normalizeYouTubeUrl('http://youtu.be/YE7VzlLtp-4'), /HTTPS/);
});

test('parses one URL per line, deduplicates and respects remaining capacity', () => {
  assert.deepEqual(parseYouTubeInput([
    'https://youtu.be/YE7VzlLtp-4',
    'https://www.youtube.com/watch?v=YE7VzlLtp-4',
  ].join('\n'), 2), ['https://www.youtube.com/watch?v=YE7VzlLtp-4']);
  assert.throws(() => parseYouTubeInput('https://youtu.be/YE7VzlLtp-4\nhttps://youtu.be/abcdefghijk', 1), /1 video/);
  assert.throws(() => parseYouTubeInput('', 10), /al menos/);
});
