import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSPACE_LAYOUT_DEFAULTS,
  WORKSPACE_LAYOUT_STORAGE_KEY,
  readWorkspaceLayout,
  sanitizeWorkspaceLayout,
  writeWorkspaceLayout,
} from './workspaceLayout.js';

function createStorage(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) values.set(WORKSPACE_LAYOUT_STORAGE_KEY, initialValue);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('workspace layout clamps dimensions and restores boolean visibility', () => {
  assert.deepEqual(sanitizeWorkspaceLayout({
    leftWidth: 20,
    rightWidth: 900,
    timelineHeight: 300,
    leftOpen: false,
    rightOpen: true,
  }), {
    leftWidth: 240,
    rightWidth: 440,
    timelineHeight: 300,
    leftOpen: false,
    rightOpen: true,
  });
});

test('workspace layout falls back safely for invalid persisted data', () => {
  assert.deepEqual(readWorkspaceLayout(createStorage('{invalid')), WORKSPACE_LAYOUT_DEFAULTS);
  assert.deepEqual(readWorkspaceLayout(createStorage(JSON.stringify({ leftWidth: 'wide' }))), WORKSPACE_LAYOUT_DEFAULTS);
});

test('workspace layout writes a normalized snapshot', () => {
  const storage = createStorage();
  writeWorkspaceLayout(storage, { ...WORKSPACE_LAYOUT_DEFAULTS, timelineHeight: 999 });
  assert.equal(readWorkspaceLayout(storage).timelineHeight, 420);
});
