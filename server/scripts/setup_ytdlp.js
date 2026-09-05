const crypto = require('crypto');
const { spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download';
const BIN_DIR = path.join(__dirname, '..', 'bin');
const MARKER_PATH = path.join(BIN_DIR, 'yt-dlp.json');

function detectMusl() {
  if (process.platform !== 'linux') return false;
  try {
    return !process.report?.getReport()?.header?.glibcVersionRuntime;
  } catch (_) {
    return false;
  }
}

function selectAsset(platform = process.platform, arch = process.arch, isMusl = detectMusl()) {
  if (platform === 'win32') {
    if (arch === 'x64') return 'yt-dlp.exe';
    if (arch === 'arm64') return 'yt-dlp_arm64.exe';
    if (arch === 'ia32') return 'yt-dlp_x86.exe';
  }
  if (platform === 'darwin' && (arch === 'x64' || arch === 'arm64')) return 'yt-dlp_macos';
  if (platform === 'linux') {
    if (arch === 'x64') return isMusl ? 'yt-dlp_musllinux' : 'yt-dlp_linux';
    if (arch === 'arm64') return isMusl ? 'yt-dlp_musllinux_aarch64' : 'yt-dlp_linux_aarch64';
  }
  throw new Error(`Unsupported yt-dlp platform: ${platform}/${arch}${isMusl ? ' (musl)' : ''}`);
}

function parseChecksums(text) {
  const checksums = new Map();
  String(text || '').split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (match) checksums.set(match[2].trim(), match[1].toLowerCase());
  });
  return checksums;
}

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) {
      reject(new Error('Too many redirects while downloading yt-dlp.'));
      return;
    }
    const request = https.get(url, { headers: { 'User-Agent': 'Codecut-yt-dlp-setup' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).toString();
        fetchBuffer(nextUrl, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with HTTP ${response.statusCode}: ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), finalUrl: url }));
    });
    request.setTimeout(60000, () => request.destroy(new Error('yt-dlp download timed out.')));
    request.on('error', reject);
  });
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function verifyChecksum(filePath, expected) {
  const actual = sha256(fs.readFileSync(filePath));
  if (actual !== String(expected || '').toLowerCase()) {
    throw new Error(`yt-dlp checksum mismatch: expected ${expected}, received ${actual}`);
  }
  return true;
}

function readInstalledVersion(filePath) {
  const result = spawnSync(filePath, ['--version'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || '').trim() || null;
}

async function install({ force = false } = {}) {
  const configuredPath = process.env.YT_DLP_PATH;
  if (configuredPath) {
    const resolved = path.resolve(configuredPath);
    if (!fs.existsSync(resolved)) throw new Error(`YT_DLP_PATH does not exist: ${resolved}`);
    console.log(`[yt-dlp] Using YT_DLP_PATH: ${resolved}`);
    return resolved;
  }

  const asset = selectAsset();
  const targetName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const targetPath = path.join(BIN_DIR, targetName);
  if (!force && fs.existsSync(targetPath) && fs.existsSync(MARKER_PATH)) {
    try {
      const marker = JSON.parse(fs.readFileSync(MARKER_PATH, 'utf8'));
      const installedVersion = readInstalledVersion(targetPath);
      if (installedVersion && marker.version !== installedVersion) {
        fs.writeFileSync(MARKER_PATH, JSON.stringify({ ...marker, version: installedVersion }, null, 2));
      }
    } catch (_) {}
    console.log(`[yt-dlp] Ready: ${targetPath}`);
    return targetPath;
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });
  console.log(`[yt-dlp] Downloading ${asset} from the official nightly release...`);
  const [binary, checksumFile] = await Promise.all([
    fetchBuffer(`${RELEASE_BASE}/${asset}`),
    fetchBuffer(`${RELEASE_BASE}/SHA2-256SUMS`),
  ]);
  const expected = parseChecksums(checksumFile.buffer.toString('utf8')).get(asset);
  if (!expected) throw new Error(`No SHA-256 checksum was published for ${asset}.`);
  const actual = sha256(binary.buffer);
  if (actual !== expected) throw new Error(`yt-dlp checksum mismatch: expected ${expected}, received ${actual}`);

  const tempPath = `${targetPath}.download`;
  fs.writeFileSync(tempPath, binary.buffer);
  if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
  fs.renameSync(tempPath, targetPath);
  if (process.platform !== 'win32') fs.chmodSync(targetPath, 0o755);

  const versionMatch = binary.finalUrl.match(/\/releases\/download\/([^/]+)\//);
  const installedVersion = readInstalledVersion(targetPath);
  fs.writeFileSync(MARKER_PATH, JSON.stringify({
    asset,
    channel: 'nightly',
    version: installedVersion || (versionMatch ? decodeURIComponent(versionMatch[1]) : 'latest'),
    sha256: actual,
    installedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`[yt-dlp] Installed and verified: ${targetPath}`);
  return targetPath;
}

if (require.main === module) {
  install({ force: process.argv.includes('--force') }).catch((error) => {
    console.error(`[yt-dlp] Setup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { detectMusl, selectAsset, parseChecksums, sha256, verifyChecksum, readInstalledVersion, install };
