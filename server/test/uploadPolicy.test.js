const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  acceptUpload,
  getUploadLimits,
  validateUploadSet,
} = require('../lib/uploadPolicy');

function applyFilter(file) {
  return new Promise((resolve) => {
    acceptUpload({}, file, (error, accepted) => resolve({ error, accepted }));
  });
}

test('upload policy bounds multipart fields and parts', () => {
  const limits = getUploadLimits();
  assert.equal(limits.fields, 4);
  assert.equal(limits.files, 20);
  assert.equal(limits.parts, 24);
  assert.ok(limits.fieldSize <= 2 * 1024 * 1024);
});

test('upload filter accepts videos and only PNG rating overlays', async () => {
  assert.equal((await applyFilter({ fieldname: 'videos', mimetype: 'video/mp4' })).accepted, true);
  assert.equal((await applyFilter({ fieldname: 'videos', mimetype: 'text/html' })).error.status, 415);
  assert.equal((await applyFilter({ fieldname: 'ratingOverlays', mimetype: 'image/png' })).accepted, true);
  assert.equal((await applyFilter({ fieldname: 'ratingOverlays', mimetype: 'image/jpeg' })).error.status, 415);
});

test('upload validation checks the PNG file signature', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'codecut-upload-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const validPath = path.join(directory, 'valid');
  const invalidPath = path.join(directory, 'invalid');
  await fs.promises.writeFile(validPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  await fs.promises.writeFile(invalidPath, 'not png');

  assert.equal(await validateUploadSet([], [{ path: validPath, size: 8 }]), null);
  assert.deepEqual(
    await validateUploadSet([], [{ path: invalidPath, size: 7 }]),
    { status: 415, error: 'A rating overlay does not contain a valid PNG signature.' }
  );
});
