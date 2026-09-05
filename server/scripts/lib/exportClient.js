const http = require('http');
const fs = require('fs');
const path = require('path');

function postMultipart({ files, fields, host = 'localhost', port = 4000, pathName = '/api/trim' }) {
  return new Promise((resolve, reject) => {
    const boundary = '----codecut' + Date.now();
    const parts = [];

    for (const [name, value] of Object.entries(fields || {})) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      ));
    }

    for (const f of files) {
      const filename = path.basename(f.path);
      const fieldName = f.fieldName || 'videos';
      const contentType = f.contentType || 'video/mp4';
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
      ));
      parts.push(fs.readFileSync(f.path));
      parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const req = http.request({
      host,
      port,
      path: pathName,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buf });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function waitForJob(jobId, { host = 'localhost', port = 4000, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      host,
      port,
      path: `/api/trim/progress/${jobId}`,
    }, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('Job not found'));
        return;
      }
      let buffer = '';
      const timer = setTimeout(() => {
        req.destroy();
        reject(new Error('Timed out waiting for export job'));
      }, timeoutMs);

      res.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const line = block.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.status === 'ready') {
              clearTimeout(timer);
              res.destroy();
              resolve(data);
              return;
            }
            if (data.status === 'error' || data.status === 'cancelled') {
              clearTimeout(timer);
              res.destroy();
              reject(new Error(data.error || `Job ${data.status}`));
              return;
            }
          } catch {
            // ignore partial JSON
          }
        }
      });
      res.on('end', () => {
        clearTimeout(timer);
      });
      res.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on('error', reject);
  });
}

function downloadJob(jobId, destPath, { host = 'localhost', port = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    http.get({
      host,
      port,
      path: `/api/trim/download/${jobId}`,
    }, (res) => {
      if (res.statusCode !== 200) {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => reject(new Error(`Download failed (${res.statusCode}): ${Buffer.concat(chunks).toString('utf8')}`)));
        return;
      }
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on('finish', () => resolve(destPath));
      out.on('error', reject);
    }).on('error', reject);
  });
}

async function exportProject({ files, fields, destPath, host = 'localhost', port = 4000 }) {
  const res = await postMultipart({ files, fields, host, port });
  if (res.status !== 202) {
    throw new Error(`Expected 202, got ${res.status}: ${res.body.toString('utf8')}`);
  }
  let payload;
  try {
    payload = JSON.parse(res.body.toString('utf8'));
  } catch {
    throw new Error(`Invalid JSON from /api/trim: ${res.body.toString('utf8')}`);
  }
  if (!payload.jobId) throw new Error('Missing jobId in /api/trim response');
  await waitForJob(payload.jobId, { host, port });
  await downloadJob(payload.jobId, destPath, { host, port });
  return { jobId: payload.jobId, destPath, status: 202 };
}

module.exports = { postMultipart, waitForJob, downloadJob, exportProject };
