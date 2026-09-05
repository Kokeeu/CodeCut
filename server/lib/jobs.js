const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const JOBS_DIR = path.join(TEMP_DIR, 'jobs');
const JOB_TTL_MS = 15 * 60 * 1000;

if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

const jobs = new Map();
const jobCancelers = new Map();
const expiryTimers = new Map();

function isInsideTemp(candidate) {
  const relative = path.relative(path.resolve(TEMP_DIR), path.resolve(candidate));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function cleanupJobFiles(job) {
  const paths = [...new Set([...(job?.cleanupPaths || []), job?.outputPath].filter(Boolean))];
  paths.forEach((candidate) => {
    try {
      if (!isInsideTemp(candidate) || !fs.existsSync(candidate)) return;
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) fs.rmSync(candidate, { recursive: true, force: true });
      else fs.unlinkSync(candidate);
    } catch (_) {}
  });
}

function jobPath(id) {
  return path.join(JOBS_DIR, `${id}.json`);
}

function persistJob(job) {
  if (!job || !job.id) return;
  try {
    const payload = {
      id: job.id,
      kind: job.kind || 'export',
      status: job.status,
      progress: job.progress || 0,
      stage: job.stage || null,
      outputPath: job.outputPath,
      outputName: job.outputName,
      inputPaths: job.inputPaths || [],
      cleanupPaths: job.cleanupPaths || [],
      sourceUrl: job.sourceUrl || null,
      title: job.title || null,
      mimeType: job.mimeType || null,
      size: job.size || null,
      maxHeight: job.maxHeight || null,
      createdAt: job.createdAt,
      completedAt: job.completedAt || null,
      error: job.error || null,
    };
    fs.writeFileSync(jobPath(job.id), JSON.stringify(payload));
  } catch (err) {
    console.warn('[jobs] persist failed:', err.message);
  }
}

function removePersisted(id) {
  try {
    const p = jobPath(id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}

function toPublic(job) {
  if (!job) return null;
  return {
    id: job.id,
    kind: job.kind || 'export',
    status: job.status,
    progress: job.progress || 0,
    outputName: job.outputName,
    stage: job.stage || null,
    title: job.title || null,
    mimeType: job.mimeType || null,
    size: job.size || null,
    maxHeight: job.maxHeight || null,
    createdAt: job.createdAt,
    completedAt: job.completedAt || null,
    error: job.error || null,
  };
}

function setJob(job) {
  jobs.set(job.id, job);
  persistJob(job);
  return job;
}

function getJob(id) {
  return jobs.get(id) || null;
}

function updateJob(id, patch) {
  const job = jobs.get(id);
  if (!job) return null;
  const prevProgress = job.progress || 0;
  const prevStatus = job.status;
  Object.assign(job, patch);
  if (['ready', 'error', 'cancelled'].includes(job.status) && !job.completedAt) job.completedAt = Date.now();
  const progressBucketChanged = Math.round((job.progress || 0) * 20) !== Math.round(prevProgress * 20);
  if (job.status !== prevStatus || patch.error || progressBucketChanged) {
    persistJob(job);
  }
  return job;
}

function deleteJob(id) {
  jobs.delete(id);
  jobCancelers.delete(id);
  const timer = expiryTimers.get(id);
  if (timer) clearTimeout(timer);
  expiryTimers.delete(id);
  removePersisted(id);
}

function loadJobsFromDisk() {
  try {
    if (!fs.existsSync(JOBS_DIR)) return;
    const now = Date.now();
    for (const file of fs.readdirSync(JOBS_DIR)) {
      if (!file.endsWith('.json')) continue;
      const full = path.join(JOBS_DIR, file);
      try {
        const job = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (!job || !job.id) {
          fs.unlinkSync(full);
          continue;
        }
        const ageBase = job.completedAt || job.createdAt || 0;
        if (now - ageBase > JOB_TTL_MS) {
          cleanupJobFiles(job);
          fs.unlinkSync(full);
          continue;
        }
        if (['queued', 'processing', 'downloading'].includes(job.status)) {
          job.status = 'error';
          job.error = `Server restarted while this ${job.kind === 'youtube' ? 'import' : 'export'} was running. Please try again.`;
          job.completedAt = now;
        }
        if (job.status === 'ready' && job.outputPath && !fs.existsSync(job.outputPath)) {
          job.status = 'error';
          job.error = `${job.kind === 'youtube' ? 'Imported' : 'Exported'} file is no longer available. Please try again.`;
          job.completedAt = now;
        }
        jobs.set(job.id, job);
        persistJob(job);
        expireJobLater(job.id);
      } catch {
        try { fs.unlinkSync(full); } catch { /* ignore */ }
      }
    }
  } catch (err) {
    console.warn('[jobs] load failed:', err.message);
  }
}

function expireJobLater(id) {
  const previous = expiryTimers.get(id);
  if (previous) clearTimeout(previous);
  const job = jobs.get(id);
  if (!job) return;
  const elapsed = Date.now() - (job.completedAt || Date.now());
  const delay = Math.max(0, JOB_TTL_MS - elapsed);
  const timer = setTimeout(() => {
    const job = jobs.get(id);
    if (!job) return;
    cleanupJobFiles(job);
    deleteJob(id);
  }, delay);
  timer.unref?.();
  expiryTimers.set(id, timer);
}

loadJobsFromDisk();

module.exports = {
  jobs,
  jobCancelers,
  JOB_TTL_MS,
  setJob,
  getJob,
  updateJob,
  deleteJob,
  persistJob,
  expireJobLater,
  cleanupJobFiles,
  toPublic,
};
