import { useEffect, useRef, useState } from 'react';
import {
  extractMediaMetadata,
  MAX_MEDIA_FILES,
  PERSISTENT_MEDIA_MAX_BYTES,
  validateMediaFile,
} from '../lib/mediaImport.js';
import {
  filenameFromResponse,
  mimeForFileName,
  parseYouTubeInput,
  YOUTUBE_QUALITY_OPTIONS,
} from '../lib/youtubeImport.js';

const TERMINAL_STATUSES = new Set(['prepared', 'imported', 'error', 'cancelled']);

const STATUS_LABELS = {
  queued: 'En cola',
  downloading: 'Descargando',
  processing: 'Uniendo audio y video',
  fetching: 'Transfiriendo al editor',
  preparing: 'Preparando preview',
  prepared: 'Listo para agregar',
  imported: 'Importado',
  error: 'Error',
  cancelled: 'Cancelado',
};

function YouTubeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="5" fill="currentColor" opacity="0.9" />
      <path d="M10 9l5 3-5 3V9z" fill="white" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function statusColor(status) {
  if (status === 'imported') return 'text-emerald-400';
  if (status === 'error') return 'text-red-400';
  if (status === 'cancelled') return 'text-neutral-500';
  return 'text-accent';
}

export default function YouTubeImporter({ onFilesAdded, currentFileCount = 0, compact = false }) {
  const [open, setOpen] = useState(false);
  const [urlsText, setUrlsText] = useState('');
  const [maxHeight, setMaxHeight] = useState(1080);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState({ checking: false, available: null, version: null });
  const rowsRef = useRef([]);
  const sourcesRef = useRef(new Map());
  const abortersRef = useRef(new Map());
  const metadataRef = useRef(new Map());
  const processingChainRef = useRef(Promise.resolve());
  const finalizingRef = useRef(false);
  const onFilesAddedRef = useRef(onFilesAdded);
  onFilesAddedRef.current = onFilesAdded;

  const remainingSlots = Math.max(0, MAX_MEDIA_FILES - currentFileCount);

  const replaceRows = (next) => {
    rowsRef.current = next;
    setRows(next);
  };

  const patchRow = (id, patch) => {
    replaceRows(rowsRef.current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const finalizeBatchIfReady = () => {
    const allDone = rowsRef.current.length > 0 && rowsRef.current.every((row) => TERMINAL_STATUSES.has(row.status));
    if (!allDone || finalizingRef.current) return;
    finalizingRef.current = true;
    const preparedRows = rowsRef.current.filter((row) => row.status === 'prepared').sort((a, b) => a.index - b.index);
    const metadata = preparedRows.map((row) => metadataRef.current.get(row.id)).filter(Boolean);
    const result = metadata.length > 0 ? onFilesAddedRef.current(metadata) : { added: 0, rejected: 0 };
    let accepted = result?.added ?? metadata.length;
    replaceRows(rowsRef.current.map((row) => {
      if (row.status !== 'prepared') return row;
      if (accepted > 0) {
        accepted -= 1;
        return { ...row, status: 'imported' };
      }
      return { ...row, status: 'error', error: 'El media pool se llenó antes de terminar la importación.' };
    }));
    metadataRef.current.clear();
    setRunning(false);
  };

  const checkHealth = async () => {
    setHealth({ checking: true, available: null, version: null });
    try {
      const response = await fetch('/api/youtube/health');
      const data = await response.json();
      setHealth({ checking: false, available: !!data.available, version: data.version || null, error: data.error || null });
    } catch (_) {
      setHealth({ checking: false, available: false, version: null, error: 'No se pudo contactar al servidor.' });
    }
  };

  const openDialog = () => {
    if (remainingSlots <= 0) return;
    setUrlsText('');
    setRows([]);
    rowsRef.current = [];
    metadataRef.current.clear();
    finalizingRef.current = false;
    setError(null);
    setRunning(false);
    setOpen(true);
    checkHealth();
  };

  const prepareDownloadedFile = async (jobId) => {
    const row = rowsRef.current.find((item) => item.id === jobId);
    if (!row || row.status === 'cancelled') return;
    patchRow(jobId, { status: 'fetching', progress: 1 });
    const controller = new AbortController();
    abortersRef.current.set(jobId, controller);
    try {
      const response = await fetch(`/api/youtube/imports/${encodeURIComponent(jobId)}/file`, { signal: controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `No se pudo transferir el archivo (${response.status}).`);
      }
      const name = filenameFromResponse(response);
      const blob = await response.blob();
      const type = mimeForFileName(name, blob.type);
      const file = new File([blob], name, { type });
      const validationError = validateMediaFile(file);
      if (validationError) throw new Error(validationError);
      if (rowsRef.current.find((item) => item.id === jobId)?.status === 'cancelled') return;
      patchRow(jobId, { status: 'preparing', name, large: file.size > PERSISTENT_MEDIA_MAX_BYTES });
      const metadata = await extractMediaMetadata(file);
      if (!metadata) throw new Error('El navegador no pudo leer el video descargado.');
      if (rowsRef.current.find((item) => item.id === jobId)?.status === 'cancelled') {
        URL.revokeObjectURL(metadata.url);
        return;
      }
      metadataRef.current.set(jobId, metadata);
      patchRow(jobId, { status: 'prepared', name, progress: 1 });
    } catch (downloadError) {
      if (downloadError.name !== 'AbortError' && rowsRef.current.find((item) => item.id === jobId)?.status !== 'cancelled') {
        patchRow(jobId, { status: 'error', error: downloadError.message || 'No se pudo importar el video.' });
      }
    } finally {
      abortersRef.current.delete(jobId);
      finalizeBatchIfReady();
    }
  };

  const enqueuePreparation = (jobId) => {
    processingChainRef.current = processingChainRef.current
      .then(() => prepareDownloadedFile(jobId))
      .catch(() => {});
  };

  const connectToJob = (job) => {
    const source = new EventSource(`/api/youtube/imports/${encodeURIComponent(job.id)}/progress`);
    sourcesRef.current.set(job.id, source);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'ready') {
          source.close();
          sourcesRef.current.delete(job.id);
          patchRow(job.id, { title: data.title || null, status: 'fetching', progress: 1 });
          enqueuePreparation(job.id);
          return;
        }
        if (data.status === 'error' || data.status === 'cancelled') {
          source.close();
          sourcesRef.current.delete(job.id);
          patchRow(job.id, { status: data.status, error: data.error || null, progress: data.progress || 0 });
          finalizeBatchIfReady();
          return;
        }
        patchRow(job.id, {
          status: data.status || 'queued',
          title: data.title || null,
          progress: Number.isFinite(Number(data.progress)) ? Number(data.progress) : 0,
        });
      } catch (_) {
        patchRow(job.id, { status: 'error', error: 'El servidor envió una actualización inválida.' });
        source.close();
        sourcesRef.current.delete(job.id);
        finalizeBatchIfReady();
      }
    };
    source.onerror = () => {
      const current = rowsRef.current.find((row) => row.id === job.id);
      if (!current || ['fetching', 'preparing', 'imported', 'error', 'cancelled'].includes(current.status)) return;
      source.close();
      sourcesRef.current.delete(job.id);
      patchRow(job.id, { status: 'error', error: 'Se perdió la conexión con el servidor.' });
      finalizeBatchIfReady();
    };
  };

  const startImport = async () => {
    let urls;
    try {
      urls = parseYouTubeInput(urlsText, remainingSlots);
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const response = await fetch('/api/youtube/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, maxHeight }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `No se pudo iniciar la importación (${response.status}).`);
      const nextRows = data.jobs.map((job, index) => ({
        id: job.id,
        sourceUrl: job.sourceUrl,
        index,
        status: 'queued',
        progress: 0,
        title: null,
        error: null,
      }));
      replaceRows(nextRows);
      data.jobs.forEach(connectToJob);
    } catch (startError) {
      setRunning(false);
      setError(startError.message || 'No se pudo iniciar la importación.');
    }
  };

  const cancelJob = (id) => {
    const current = rowsRef.current.find((row) => row.id === id);
    if (!current || TERMINAL_STATUSES.has(current.status)) return;
    sourcesRef.current.get(id)?.close();
    sourcesRef.current.delete(id);
    abortersRef.current.get(id)?.abort();
    abortersRef.current.delete(id);
    patchRow(id, { status: 'cancelled', error: null });
    fetch(`/api/youtube/imports/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    finalizeBatchIfReady();
  };

  const cancelAll = () => {
    rowsRef.current.forEach((row) => cancelJob(row.id));
  };

  const closeDialog = () => {
    if (running) return;
    setOpen(false);
  };

  useEffect(() => () => {
    sourcesRef.current.forEach((source) => source.close());
    abortersRef.current.forEach((controller) => controller.abort());
  }, []);

  const triggerClass = compact
    ? 'inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 text-xs text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-ring'
    : 'inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/[0.07] hover:bg-red-500/10 hover:border-red-500/45 text-sm font-semibold text-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-ring';

  return (
    <>
      <button onClick={openDialog} disabled={remainingSlots <= 0} className={triggerClass}>
        <YouTubeIcon size={compact ? 14 : 18} />
        {remainingSlots <= 0 ? 'Media pool lleno' : 'Importar desde YouTube'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
          <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeDialog} aria-label="Cerrar importador" />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-editor-panel border border-glass-border shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-glass-border">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <YouTubeIcon size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-neutral-100">Importar desde YouTube</h2>
                <p className="text-[11px] text-neutral-500">{remainingSlots} espacio{remainingSlots === 1 ? '' : 's'} disponible{remainingSlots === 1 ? '' : 's'} · máximo 1 GB por video</p>
              </div>
              <button onClick={closeDialog} disabled={running} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-neutral-500 hover:text-neutral-100 hover:bg-white/5 disabled:opacity-30" aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin">
              {rows.length === 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1.5">Enlaces — uno por línea</label>
                    <textarea
                      value={urlsText}
                      onChange={(event) => setUrlsText(event.target.value)}
                      disabled={running}
                      rows={6}
                      placeholder={'https://www.youtube.com/watch?v=...\nhttps://youtu.be/...'}
                      className="w-full resize-none rounded-xl bg-editor-surface border border-editor-border px-3 py-2.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1.5">Calidad máxima</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {YOUTUBE_QUALITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setMaxHeight(option.value)}
                          className={[
                            'px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                            maxHeight === option.value
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-editor-border bg-editor-surface text-neutral-400 hover:border-neutral-600',
                          ].join(' ')}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-yellow-500/[0.06] border border-yellow-500/15 p-3 text-[11px] leading-relaxed text-yellow-100/70">
                    Importa únicamente videos propios, de dominio público o para los que tengas permiso. No se admiten playlists completas, directos ni contenido que requiera iniciar sesión.
                  </div>
                  {health.checking && <p className="text-[11px] text-neutral-500">Comprobando yt-dlp…</p>}
                  {health.available && <p className="text-[11px] text-emerald-400">yt-dlp {health.version || ''} listo.</p>}
                  {health.available === false && <p className="text-[11px] text-red-400">{health.error}</p>}
                  {error && <p className="text-[11px] text-red-400">{error}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.map((row, index) => (
                    <div key={row.id} className="rounded-xl bg-editor-surface border border-editor-border p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-white/5 text-[10px] font-mono text-neutral-400 flex items-center justify-center shrink-0">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-200 font-medium truncate" title={row.title || row.sourceUrl}>{row.title || row.sourceUrl}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[10px] font-medium ${statusColor(row.status)}`}>{STATUS_LABELS[row.status] || row.status}</span>
                            {!TERMINAL_STATUSES.has(row.status) && (
                              <button onClick={() => cancelJob(row.id)} className="text-[10px] text-neutral-500 hover:text-red-400">Cancelar</button>
                            )}
                          </div>
                          {!TERMINAL_STATUSES.has(row.status) && (
                            <div className="h-1.5 bg-editor-border rounded-full overflow-hidden mt-2">
                              <div className="h-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-200" style={{ width: `${Math.round((row.progress || 0) * 100)}%` }} />
                            </div>
                          )}
                          {row.error && <p className="text-[10px] text-red-400 mt-1.5 leading-relaxed">{row.error}</p>}
                          {row.status === 'imported' && row.large && <p className="text-[10px] text-yellow-400/80 mt-1.5">Archivo grande: no se conservará en la caché tras recargar.</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-glass-border">
              {running ? (
                <button onClick={cancelAll} className="px-4 py-2 rounded-lg border border-red-500/25 text-xs font-medium text-red-300 hover:bg-red-500/10">Cancelar todo</button>
              ) : rows.length > 0 ? (
                <button onClick={closeDialog} className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white">Cerrar</button>
              ) : (
                <button onClick={startImport} disabled={health.available !== true || !urlsText.trim()} className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white disabled:bg-editor-surface disabled:text-neutral-500 disabled:cursor-not-allowed">
                  Importar videos
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
