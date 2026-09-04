import {
  clipAdvanceSourceOffset,
  clipOutputDuration,
  clipSelectSourceOffset,
  getClipStarts,
  getTotalDuration,
  isXfadeType,
  resolvePlayback,
  sanitizeTransition,
  transitionDuration,
} from './transitions.js';

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`[FAIL] ${msg}`);
  } else {
    console.log(`[OK] ${msg}`);
  }
}

function almost(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

const a = { id: 'a', sourceStart: 0, sourceEnd: 2, speed: 1 };
const b = { id: 'b', sourceStart: 0, sourceEnd: 3, speed: 1 };
const c = { id: 'c', sourceStart: 0, sourceEnd: 1, speed: 2 };
const fade = { type: 'fade', durationSec: 0.5 };
const none = { type: 'none', durationSec: 0 };

assert(almost(clipOutputDuration(a), 2), 'clipOutputDuration basic');
assert(almost(clipOutputDuration(c), 0.5), 'clipOutputDuration accounts for speed');

assert(transitionDuration(none, a, b) === 0, 'none transition is 0');
assert(almost(transitionDuration(fade, a, b), 0.5), 'fade uses requested duration');
assert(almost(transitionDuration({ type: 'fade', durationSec: 5 }, a, b), 1.98), 'duration is clamped to shortest clip');
assert(almost(transitionDuration({ type: 'not-real', durationSec: 0.4 }, a, b), 0.4), 'unknown type still overlaps like fade');

assert(sanitizeTransition({ type: 'wipeleft', durationSec: 0.3 }).type === 'wipeleft', 'sanitize keeps valid type');
assert(sanitizeTransition({ type: 'explode', durationSec: 0.3 }).type === 'fade', 'sanitize falls back to fade');
assert(sanitizeTransition({ type: 'none' }).type === 'none', 'sanitize keeps none');
assert(isXfadeType('circleopen') && !isXfadeType('none'), 'xfade type set');

const starts = getClipStarts([a, b], [fade]);
assert(almost(starts[0], 0) && almost(starts[1], 1.5), 'clip B starts 0.5s early because of fade');
assert(almost(getTotalDuration([a, b], [fade]), 4.5), 'total duration subtracts overlap');
assert(almost(getTotalDuration([a, b], [none]), 5), 'cut keeps full duration');

const mid = resolvePlayback([a, b], [fade], 1.6);
assert(mid.index === 0 && mid.incoming, 'playback stays on outgoing clip during fade');
assert(almost(mid.incoming.progress, 0.2), 'incoming progress is 0.2 at 1.6s');
assert(mid.incoming.type === 'fade', 'incoming type is fade');

const after = resolvePlayback([a, b], [fade], 2.1);
assert(after.index === 1 && !after.incoming, 'after fade, playback is clip B only');

const atSeam = resolvePlayback([a, b], [fade], 2);
assert(atSeam.index === 1 && !atSeam.incoming, 'at exact fade end, playback is clip B');

const atBStart = resolvePlayback([a, b], [fade], 1.5);
assert(atBStart.incoming && almost(atBStart.incoming.progress, 0), 'at overlap start progress is 0');

assert(almost(clipSelectSourceOffset([a, b], [fade], 1), 0.5), 'selecting B skips the incoming overlap');
assert(clipSelectSourceOffset([a, b], [fade], 0) === 0, 'selecting first clip starts at 0');
assert(clipSelectSourceOffset([a, b], [none], 1) === 0, 'cut has no incoming skip');

const fastB = { id: 'b2', sourceStart: 0, sourceEnd: 4, speed: 2 };
assert(almost(clipSelectSourceOffset([a, fastB], [fade], 1), 1), 'select offset is in source time');

const advanced = clipAdvanceSourceOffset([a, b], [fade], 1);
assert(advanced > 0.5 && advanced < 0.6, 'advance lands past the fade seam');
const advancedHit = resolvePlayback([a, b], [fade], 1.5 + advanced);
assert(advancedHit.index === 1 && !advancedHit.incoming, 'advanced offset is not pulled back into the fade');

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall passed');
