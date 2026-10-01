import { isVideoFile } from './mediaImport.js';

export function selectFolderVideos(files) {
  return Array.from(files || []).filter(isVideoFile).sort((a, b) => (
    (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, 'es', { numeric: true })
  ));
}

async function readEntry(entry) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return isVideoFile(file) ? [{ file, path: entry.fullPath }] : [];
  }
  if (!entry.isDirectory) return [];

  const reader = entry.createReader();
  const files = [];
  // Un lector puede devolver el contenido de una carpeta en varios lotes.
  while (true) {
    const entries = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (entries.length === 0) break;
    for (const child of entries) files.push(...await readEntry(child));
  }
  return files;
}

export async function collectDroppedFiles(dataTransfer) {
  // El navegador solo permite capturar las entradas durante el evento drop.
  const items = Array.from(dataTransfer.items || [])
    .filter((item) => item.kind === 'file')
    .map((item) => ({ entry: item.webkitGetAsEntry?.(), file: item.getAsFile() }));
  const fallbackFiles = Array.from(dataTransfer.files || []);
  if (items.length === 0) return fallbackFiles;

  const files = [];
  for (const { entry, file } of items) {
    if (entry?.isDirectory) files.push(...await readEntry(entry));
    else if (file) files.push({ file, path: file.name });
    else if (entry) files.push(...await readEntry(entry));
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'es', { numeric: true }))
    .map(({ file }) => file);
}
