const assert = require('node:assert/strict');
const test = require('node:test');
const { buildFilterGraph } = require('../lib/ffmpegPipeline');

function makeClip(id, sourceEnd = 2) {
  return {
    id,
    sourceStart: 0,
    sourceEnd,
    speed: 1,
    hasAudio: false,
    transform: { x: 0, y: 0, scale: 1 },
    texts: [],
  };
}

test('normalizes both xfade inputs so chained transitions share timebase', () => {
  const clips = [makeClip('clip-1'), makeClip('clip-2'), makeClip('clip-3')];
  const transitions = {
    'clip-1|clip-2': { type: 'fade', durationSec: 0.5 },
    'clip-2|clip-3': { type: 'fade', durationSec: 0.5 },
  };

  const graph = buildFilterGraph(clips, transitions, { blurEnabled: false }, {}, { fps: 30 });

  const xfadeMatches = [...graph.matchAll(/\[([^\]]+)\]\[([^\]]+)\]xfade=/g)];
  assert.equal(xfadeMatches.length, 2);

  for (const [, first, second] of xfadeMatches) {
    assert.ok(first.startsWith('xf'), `xfade first input should be normalized, got [${first}]`);
    assert.ok(second.startsWith('xf'), `xfade second input should be normalized, got [${second}]`);
  }

  assert.match(graph, /\[c0\]settb=AVTB,fps=30,format=yuv420p,setsar=1\[xf0a\]/);
  assert.match(graph, /\[c1\]settb=AVTB,fps=30,format=yuv420p,setsar=1\[xf0b\]/);
  assert.match(graph, /\[vc0\]settb=AVTB,fps=30,format=yuv420p,setsar=1\[xf1a\]/);
  assert.match(graph, /\[c2\]settb=AVTB,fps=30,format=yuv420p,setsar=1\[xf1b\]/);
  assert.doesNotMatch(graph, /\[c0\]\[c1\]xfade=/);
  assert.doesNotMatch(graph, /\[vc0\]\[c2\]xfade=/);
});

test('uses the configured fps in xfade normalization', () => {
  const clips = [makeClip('clip-1'), makeClip('clip-2')];
  const transitions = {
    'clip-1|clip-2': { type: 'fade', durationSec: 0.5 },
  };

  const graph = buildFilterGraph(
    clips,
    transitions,
    { blurEnabled: false },
    {},
    { resolution: '1080', fps: 24, quality: 'high' }
  );

  assert.match(graph, /settb=AVTB,fps=24,format=yuv420p,setsar=1\[xf0a\]/);
  assert.match(graph, /settb=AVTB,fps=24,format=yuv420p,setsar=1\[xf0b\]/);
  assert.match(graph, /\[xf0a\]\[xf0b\]xfade=transition=fade:duration=0\.500:offset=1\.500/);
});
