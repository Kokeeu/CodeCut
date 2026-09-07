const crypto = require('node:crypto');
const path = require('node:path');
const { runPipeline, collectPipInputs, safeUnlink } = require('../lib/ffmpegPipeline');
const { validateInputVideos } = require('../lib/validateInputs');
const { jobQueue } = require('../lib/queue');
const {
  setJob,
  getJob,
  updateJob,
  jobCancelers,
  expireJobLater,
} = require('../lib/jobs');
const { ExportRequestError } = require('../lib/exportRequest');

const TEMP_DIR = path.join(__dirname, '..', 'temp');

function safeUnlinkAll(paths) {
  [...new Set((paths || []).filter(Boolean))].forEach((filePath) => safeUnlink(filePath));
}

function buildPipelineInputs(clips, files, ratingOverlayFiles) {
  const clipPaths = clips.map((clip) => files[clip.fileIndex].path);
  const { extraPaths, pipInputIndexByClip } = collectPipInputs(clips, files);
  const ratingOverlayInputIndexByClip = {};
  const ratingOverlayPaths = [];
  let nextInputIndex = clipPaths.length + extraPaths.length;

  clips.forEach((clip, index) => {
    if (!Number.isInteger(clip.ratingOverlayFileIndex)) return;
    const overlay = ratingOverlayFiles[clip.ratingOverlayFileIndex];
    if (!overlay) return;
    ratingOverlayInputIndexByClip[index] = nextInputIndex;
    ratingOverlayPaths.push(overlay.path);
    nextInputIndex += 1;
  });

  return {
    inputPaths: [...clipPaths, ...extraPaths, ...ratingOverlayPaths],
    pipInputIndexByClip,
    ratingOverlayInputIndexByClip,
  };
}

function enqueuePipeline(jobId, pipelineConfig) {
  jobQueue.enqueue(jobId, async () => {
    const job = getJob(jobId);
    if (!job || job.status === 'cancelled') return;
    updateJob(jobId, { status: 'processing', progress: 0 });

    try {
      const pipelinePromise = runPipeline({
        ...pipelineConfig,
        onProgress: (progress) => updateJob(jobId, { progress }),
      });
      jobCancelers.set(jobId, () => pipelinePromise._kill?.());
      await pipelinePromise;
      updateJob(jobId, { status: 'ready', progress: 1 });
      expireJobLater(jobId);
    } catch (error) {
      if (!getJob(jobId)) return;
      updateJob(jobId, { status: 'error', error: error.message || String(error) });
      safeUnlinkAll(pipelineConfig.cleanupPaths || [...pipelineConfig.inputPaths, pipelineConfig.outputPath]);
      expireJobLater(jobId);
    } finally {
      jobCancelers.delete(jobId);
    }
  }, { priority: 10 }).catch((error) => {
    if (!getJob(jobId)) return;
    updateJob(jobId, { status: 'error', error: error.message || String(error) });
    safeUnlinkAll(pipelineConfig.cleanupPaths || [...pipelineConfig.inputPaths, pipelineConfig.outputPath]);
    expireJobLater(jobId);
  });
}

async function startExport({ files, ratingOverlayFiles, request }) {
  const normalizedClips = request.clips.map((clip) => ({
    ...clip,
    duration: (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1),
  }));
  let validation;
  try {
    validation = await validateInputVideos(files, normalizedClips);
  } catch (error) {
    throw new ExportRequestError(`Video validation failed: ${error.message}`);
  }
  if (!validation.valid) throw new ExportRequestError(validation.errors.join('; '));

  const clips = normalizedClips.map((clip) => ({
    ...clip,
    hasAudio: validation.infoByFileIndex?.[clip.fileIndex]?.hasAudio !== false,
  }));
  const inputs = buildPipelineInputs(clips, files, ratingOverlayFiles);
  const uniqueId = crypto.randomUUID();
  const jobId = `job-${uniqueId}`;
  const outputName = `composed-${uniqueId}.mp4`;
  const outputPath = path.join(TEMP_DIR, outputName);
  const cleanupPaths = [
    ...files.map((file) => file.path),
    ...ratingOverlayFiles.map((file) => file.path),
    outputPath,
  ];

  setJob({
    id: jobId,
    status: 'queued',
    progress: 0,
    outputPath,
    outputName,
    inputPaths: inputs.inputPaths,
    cleanupPaths,
    createdAt: Date.now(),
  });

  enqueuePipeline(jobId, {
    inputPaths: inputs.inputPaths,
    clips,
    transitions: request.transitions,
    meta: request.meta,
    outputPath,
    cleanupPaths,
    exportConfig: request.exportConfig,
    pipInputIndexByClip: inputs.pipInputIndexByClip,
    ratingOverlayInputIndexByClip: inputs.ratingOverlayInputIndexByClip,
  });

  return { jobId, status: 'queued' };
}

module.exports = { startExport, buildPipelineInputs, enqueuePipeline };
