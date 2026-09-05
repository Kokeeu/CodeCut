const os = require('os');

const MAX_CONCURRENT = Math.min(2, os.cpus().length);

class JobQueue {
  constructor(maxConcurrent = MAX_CONCURRENT) {
    this.queue = [];
    this.activeJobs = new Set();
    this.maxConcurrent = maxConcurrent;
    this.sequence = 0;
  }

  async enqueue(jobId, jobFn, { priority = 0 } = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        jobId,
        jobFn,
        priority,
        sequence: this.sequence++,
        resolve,
        reject,
      });
      this.queue.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
      this.processQueue();
    });
  }

  cancel(jobId) {
    const index = this.queue.findIndex((job) => job.jobId === jobId);
    if (index < 0) return false;
    const [job] = this.queue.splice(index, 1);
    job.resolve({ cancelled: true });
    return true;
  }

  async processQueue() {
    if (this.activeJobs.size >= this.maxConcurrent) {
      return;
    }

    while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrent) {
      const job = this.queue.shift();
      this.activeJobs.add(job.jobId);

      try {
        const result = await job.jobFn();
        job.resolve(result);
      } catch (err) {
        job.reject(err);
      } finally {
        this.activeJobs.delete(job.jobId);
        this.processQueue();
      }
    }
  }

  getQueueStatus() {
    return {
      queued: this.queue.length,
      active: this.activeJobs.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  getPositionInQueue(jobId) {
    const index = this.queue.findIndex(j => j.jobId === jobId);
    return index === -1 ? null : index + 1;
  }
}

const jobQueue = new JobQueue();

module.exports = { JobQueue, jobQueue, MAX_CONCURRENT };
