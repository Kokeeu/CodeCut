const os = require('os');

const MAX_CONCURRENT = Math.min(2, os.cpus().length);

class JobQueue {
  constructor() {
    this.queue = [];
    this.activeJobs = new Set();
    this.onJobComplete = null;
  }

  async enqueue(jobId, jobFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        jobId,
        jobFn,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeJobs.size >= MAX_CONCURRENT) {
      return;
    }

    while (this.queue.length > 0 && this.activeJobs.size < MAX_CONCURRENT) {
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
      maxConcurrent: MAX_CONCURRENT,
    };
  }

  getPositionInQueue(jobId) {
    const index = this.queue.findIndex(j => j.jobId === jobId);
    return index === -1 ? null : index + 1;
  }
}

const jobQueue = new JobQueue();

module.exports = { jobQueue, MAX_CONCURRENT };
