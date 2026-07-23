export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

export const SPEED_LABELS = {
  0.25: '0.25x',
  0.5: '0.5x',
  0.75: '0.75x',
  1: '1x',
  1.5: '1.5x',
  2: '2x',
  3: '3x',
};

export function getAtempoChain(speed) {
  const s = Number(speed) || 1;
  if (s === 1) return [];
  if (s >= 0.5 && s <= 2) return [`atempo=${s}`];
  if (s < 0.5) {
    const chain = [];
    let remaining = s;
    while (remaining < 0.5) {
      chain.push('atempo=0.5');
      remaining /= 0.5;
    }
    if (remaining !== 1) chain.push(`atempo=${remaining.toFixed(6)}`);
    return chain;
  }
  const chain = [];
  let remaining = s;
  while (remaining > 2) {
    chain.push('atempo=2.0');
    remaining /= 2;
  }
  if (remaining !== 1) chain.push(`atempo=${remaining.toFixed(6)}`);
  return chain;
}
