const assert = require('node:assert/strict');
const test = require('node:test');
const {
  deleteJob,
  getJob,
  setJob,
  subscribeToJob,
  updateJob,
} = require('../lib/jobs');

test('job subscribers receive state changes without polling', () => {
  const id = `job-event-test-${Date.now()}`;
  const updates = [];
  const unsubscribe = subscribeToJob(id, (job) => updates.push(job));

  setJob({ id, status: 'queued', progress: 0, createdAt: Date.now() });
  updateJob(id, { status: 'processing', progress: 0.25 });
  updateJob(id, { status: 'ready', progress: 1 });
  deleteJob(id);
  unsubscribe();

  assert.equal(getJob(id), null);
  assert.deepEqual(updates.map((job) => job?.status || null), [
    'queued',
    'processing',
    'ready',
    null,
  ]);
});
