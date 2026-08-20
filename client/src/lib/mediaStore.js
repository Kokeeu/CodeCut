const DB_NAME = 'codecut-media';
const DB_VERSION = 1;
const STORE = 'files';
const MAX_FILE_BYTES = 200 * 1024 * 1024;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('name', 'name', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

export async function putMediaFile(id, file) {
  if (!id || !file) return false;
  if (file.size > MAX_FILE_BYTES) return false;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      id,
      name: file.name || '',
      type: file.type || 'video/mp4',
      size: file.size || 0,
      blob: file,
      savedAt: Date.now(),
    });
    await txDone(tx);
    db.close();
    return true;
  } catch (err) {
    console.warn('[mediaStore] put failed:', err?.message || err);
    return false;
  }
}

export async function getMediaFile(id) {
  if (!id) return null;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    const row = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return row;
  } catch {
    return null;
  }
}

export async function getMediaFileByName(name) {
  if (!name) return null;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('name').getAll(name);
    const rows = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!rows.length) return null;
    rows.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    return rows[0];
  } catch {
    return null;
  }
}

export async function deleteMediaFile(id) {
  if (!id) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
    db.close();
  } catch {
    // ignore
  }
}

export async function clearMediaStore() {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    await txDone(tx);
    db.close();
  } catch {
    // ignore
  }
}

export function blobToFile(blob, name, type) {
  if (!blob) return null;
  try {
    return new File([blob], name || 'video.mp4', { type: type || blob.type || 'video/mp4' });
  } catch {
    blob.name = name || 'video.mp4';
    return blob;
  }
}
