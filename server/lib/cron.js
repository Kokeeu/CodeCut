const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const JOBS_DIR = path.join(TEMP_DIR, 'jobs');
const YOUTUBE_DIR = path.join(TEMP_DIR, 'youtube');
const MAX_AGE_MS = 60 * 60 * 1000;

function removeOldEntries(directory, now) {
  if (!fs.existsSync(directory)) return 0;
  let deleted = 0;
  for (const file of fs.readdirSync(directory)) {
    const filePath = path.join(directory, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs <= MAX_AGE_MS) continue;
      if (stat.isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
      else fs.unlinkSync(filePath);
      deleted++;
    } catch (err) {
      console.error(`[cron] Error deleting ${file}:`, err.message);
    }
  }
  return deleted;
}

function cleanupOldTempFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    
    const now = Date.now();
    let deleted = removeOldEntries(YOUTUBE_DIR, now);
    const rootFiles = fs.readdirSync(TEMP_DIR)
      .filter((file) => path.join(TEMP_DIR, file) !== JOBS_DIR && path.join(TEMP_DIR, file) !== YOUTUBE_DIR);
    for (const file of rootFiles) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile() && now - stat.mtimeMs > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch (err) {
        console.error(`[cron] Error deleting ${file}:`, err.message);
      }
    }
    
    if (deleted > 0) {
      console.log(`[cron] Cleaned ${deleted} old temp files`);
    }
  } catch (err) {
    console.error('[cron] Cleanup error:', err.message);
  }
}

function startCleanupCron() {
  cron.schedule('0 * * * *', () => {
    console.log('[cron] Running temp file cleanup...');
    cleanupOldTempFiles();
  });
  
  console.log('[cron] Temp file cleanup scheduled (every hour)');
}

module.exports = { startCleanupCron, cleanupOldTempFiles, removeOldEntries };
