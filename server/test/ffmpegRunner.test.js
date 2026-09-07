const assert = require('node:assert/strict');
const test = require('node:test');
const { buildFfmpegArgs } = require('../lib/ffmpegRunner');
const { parseFfmpegProgress, parseTimestamp } = require('../lib/ffmpegProgress');
const { parseFrameRate } = require('../lib/videoInfo');

const encoding = {
  preset: 'medium',
  crf: 20,
  maxRateKbps: 12000,
  bufferSizeKbps: 24000,
  fps: 30,
  audioBitrateKbps: 192,
};

test('builds FFmpeg arguments as separate tokens without a shell', () => {
  const args = buildFfmpegArgs({
    inputPaths: ['C:\\video files\\one.mp4', 'input;two.mp4'],
    filterGraph: '[0:v]null[vout];anullsrc[aout]',
    outputPath: 'C:\\output files\\result.mp4',
    encoding,
    audioRate: 48000,
  });

  assert.deepEqual(args.slice(0, 7), [
    '-hide_banner', '-y', '-i', 'C:\\video files\\one.mp4', '-i', 'input;two.mp4', '-filter_complex',
  ]);
  assert.equal(args[args.indexOf('-map') + 1], '[vout]');
  assert.equal(args.at(-1), 'C:\\output files\\result.mp4');
});

test('parses FFmpeg timestamps and monotonic progress inputs', () => {
  assert.equal(parseTimestamp('01:02:03.5'), 3723.5);
  assert.equal(parseFfmpegProgress('frame=  45 time=00:00:01.500', 10, 300), 0.15);
  assert.equal(parseFfmpegProgress('unrelated output', 10, 300), null);
});

test('parses rational frame rates without evaluating input', () => {
  assert.equal(parseFrameRate('30000/1001').toFixed(3), '29.970');
  assert.equal(parseFrameRate('process.exit()/1'), 0);
  assert.equal(parseFrameRate('30/0'), 0);
});
