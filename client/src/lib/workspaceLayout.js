export const WORKSPACE_LAYOUT_STORAGE_KEY = 'codecut-workspace-layout-v1';

export const WORKSPACE_LAYOUT_DEFAULTS = Object.freeze({
  leftWidth: 288,
  rightWidth: 344,
  timelineHeight: 240,
  leftOpen: true,
  rightOpen: true,
});

export const WORKSPACE_LAYOUT_LIMITS = Object.freeze({
  leftWidth: Object.freeze({ min: 240, max: 380 }),
  rightWidth: Object.freeze({ min: 300, max: 440 }),
  timelineHeight: Object.freeze({ min: 180, max: 420 }),
});

export function clampLayoutValue(key, value) {
  const limits = WORKSPACE_LAYOUT_LIMITS[key];
  const fallback = WORKSPACE_LAYOUT_DEFAULTS[key];
  if (!limits || !Number.isFinite(Number(value))) return fallback;
  return Math.min(limits.max, Math.max(limits.min, Number(value)));
}

export function sanitizeWorkspaceLayout(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    leftWidth: clampLayoutValue('leftWidth', source.leftWidth),
    rightWidth: clampLayoutValue('rightWidth', source.rightWidth),
    timelineHeight: clampLayoutValue('timelineHeight', source.timelineHeight),
    leftOpen: typeof source.leftOpen === 'boolean' ? source.leftOpen : WORKSPACE_LAYOUT_DEFAULTS.leftOpen,
    rightOpen: typeof source.rightOpen === 'boolean' ? source.rightOpen : WORKSPACE_LAYOUT_DEFAULTS.rightOpen,
  };
}

export function readWorkspaceLayout(storage) {
  if (!storage) return { ...WORKSPACE_LAYOUT_DEFAULTS };
  try {
    const saved = storage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    return saved ? sanitizeWorkspaceLayout(JSON.parse(saved)) : { ...WORKSPACE_LAYOUT_DEFAULTS };
  } catch {
    return { ...WORKSPACE_LAYOUT_DEFAULTS };
  }
}

export function writeWorkspaceLayout(storage, layout) {
  if (!storage) return;
  storage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(sanitizeWorkspaceLayout(layout)));
}
