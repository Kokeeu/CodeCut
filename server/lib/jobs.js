const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const JOBS_DIR = path.join(TEMP_DIR, 'jobs');
const JOB_TTL_MS = 5 * 60 * 1000;

if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

const jobs = new Map();
const ffmpegProcesses = new Map();

function jobPath(id) {
  return path.join(JOBS_DIR, `${id}.json`);
}

function persistJob(job) {
  if (!job || !job.id) return;
  try {
    const payload = {
      id: job.id,
      status: job.status,
      progress: job.progress || 0,
      outputPath: job.outputPath,
      outputName: job.outputName,
      inputPaths: job.inputPaths || [],
      createdAt: job.createdAt,
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
    status: job.status,
    progress: job.progress || 0,
    outputPath: job.outputPath,
    outputName: job.outputName,
    inputPaths: job.inputPaths || [],
    createdAt: job.createdAt,
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
  const progressBucketChanged = Math.round((job.progress || 0) * 20) !== Math.round(prevProgress * 20);
  if (job.status !== prevStatus || patch.error || progressBucketChanged) {
    persistJob(job);
  }
  return job;
}

function deleteJob(id) {
  jobs.delete(id);
  ffmpegProcesses.delete(id);
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
        if (now - (job.createdAt || 0) > JOB_TTL_MS) {
          fs.unlinkSync(full);
          continue;
        }
        if (job.status === 'queued' || job.status === 'processing') {
          job.status = 'error';
          job.error = 'Server restarted while this export was running. Please export again.';
        }
        if (job.status === 'ready' && job.outputPath && !fs.existsSync(job.outputPath)) {
          job.status = 'error';
          job.error = 'Export file is no longer available. Please export again.';
        }
        jobs.set(job.id, job);
        persistJob(job);
      } catch {
        try { fs.unlinkSync(full); } catch { /* ignore */ }
      }
    }
  } catch (err) {
    console.warn('[jobs] load failed:', err.message);
  }
}

function expireJobLater(id) {
  setTimeout(() => {
    const job = jobs.get(id);
    if (!job) return;
    if (job.status === 'ready' && job.outputPath) {
      try {
        if (fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
      } catch {
        // ignore
      }
    }
    deleteJob(id);
  }, JOB_TTL_MS);
}

loadJobsFromDisk();

module.exports = {
  jobs,
  ffmpegProcesses,
  JOB_TTL_MS,
  setJob,
  getJob,
  updateJob,
  deleteJob,
  persistJob,
  expireJobLater,
  toPublic,
};
