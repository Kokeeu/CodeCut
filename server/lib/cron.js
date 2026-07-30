const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const MAX_AGE_MS = 60 * 60 * 1000;

function cleanupOldTempFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    let deleted = 0;
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > MAX_AGE_MS) {
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

module.exports = { startCleanupCron, cleanupOldTempFiles };
