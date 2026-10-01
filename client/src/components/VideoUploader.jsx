import { useCallback, useRef, useState } from 'react';
import {
  extractMediaMetadata,
  MAX_MEDIA_FILE_MB,
  MAX_MEDIA_FILES,
  validateMediaFile,
} from '../lib/mediaImport.js';
import FullscreenLoader from './FullscreenLoader.jsx';
import { collectDroppedFiles, selectFolderVideos } from '../lib/mediaDrop.js';

export default function VideoUploader({ onFilesAdded, compact, remainingSlots = MAX_MEDIA_FILES }) {
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const busyRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = useCallback(async (readFiles) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setBusy(true);
    try {
      if (remainingSlots <= 0) {
        setError(`La biblioteca ya contiene el máximo de ${MAX_MEDIA_FILES} archivos.`);
        return;
      }
      const list = Array.from(await readFiles());
      if (list.length === 0) {
        setError('No se encontraron videos. Prueba con otra carpeta o selecciona los archivos.');
        return;
      }
      if (list.length > remainingSlots) {
        setError(`Se encontraron ${list.length} videos. Solo puedes añadir ${remainingSlots} video${remainingSlots === 1 ? '' : 's'} más. Selecciona menos archivos o una carpeta más pequeña.`);
        return;
      }
      for (const file of list) {
        const err = validateMediaFile(file);
        if (err) {
          setError(err);
          return;
        }
      }
      const results = await Promise.all(list.map(extractMediaMetadata));
      const metas = results.filter(Boolean);
      if (metas.length !== list.length) {
        metas.forEach(({ url }) => URL.revokeObjectURL(url));
        const failedNames = list.filter((_, index) => !results[index]).map((file) => file.name);
        setError(`No se pudo importar el lote. Comprueba el formato de: ${failedNames.join(', ')}.`);
        return;
      }
      if (metas.length > 0) {
        const result = onFilesAdded(metas);
        if (result?.rejected > 0) setError(`No se ${result.rejected === 1 ? 'pudo añadir' : 'pudieron añadir'} ${result.rejected} video${result.rejected === 1 ? '' : 's'} porque la biblioteca está llena.`);
      }
    } catch (_) {
      setError('No se pudieron leer los archivos o la carpeta. Prueba con Seleccionar carpeta o elige los videos directamente.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [onFilesAdded, remainingSlots]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(() => collectDroppedFiles(e.dataTransfer));
  }, [handleFiles]);

  const onChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) handleFiles(() => files);
  };

  const onFolderChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) handleFiles(() => selectFolderVideos(files));
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || remainingSlots <= 0}
          className="group inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border border-dashed border-glass-border hover:border-accent/50 hover:bg-accent/5 text-xs text-neutral-300 disabled:opacity-50 transition-all duration-150 focus-ring"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-accent/70 group-hover:text-accent transition-colors">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {busy ? 'Cargando…' : remainingSlots <= 0 ? 'Biblioteca llena' : 'Añadir videos'}
        </button>
        <input ref={inputRef} type="file" accept="video/*" multiple onChange={onChange} className="hidden" />
        {error && (
          <p className="mt-1.5 text-[11px] text-red-400 px-1 leading-snug">{error}</p>
        )}
        {busy && <FullscreenLoader message="Procesando videos…" />}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label="Seleccionar videos o arrastrar una carpeta"
        aria-disabled={busy}
        onClick={() => { if (!busyRef.current) inputRef.current?.click(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!busyRef.current) inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={[
          'group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-12 text-center transition-all duration-200 overflow-hidden focus-ring',
          isDragging
            ? 'border-accent bg-accent/10 shadow-glow-accent'
            : 'border-glass-border bg-glass-panel hover:border-accent/40 hover:bg-glass-strong',
        ].join(' ')}
      >
        <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent-soft border border-accent/20 mb-4 group-hover:scale-110 transition-transform duration-300">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-accent">
              <rect x="3" y="6" width="22" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M11 11l6 3-6 3v-6z" fill="currentColor" />
              <path d="M19 19l3 2M19 21l3-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <p className="text-base sm:text-lg font-semibold text-neutral-100">
            {busy ? 'Leyendo videos…' : 'Arrastra tus videos o una carpeta aquí'}
          </p>
          <p className="text-sm text-neutral-400 mt-1.5">
            o haz clic para seleccionar videos · incluye videos de subcarpetas
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-neutral-500">
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">MP4</span>
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">MOV</span>
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">WebM</span>
            <span className="px-1.5 py-0.5 rounded bg-glass-panel border border-glass-border font-mono">MKV</span>
            <span className="mx-1 text-neutral-700">·</span>
            <span>hasta {MAX_MEDIA_FILES} archivos · {MAX_MEDIA_FILE_MB} MB por archivo</span>
          </div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="video/*" multiple onChange={onChange} className="hidden" />
      <input ref={folderInputRef} type="file" webkitdirectory="" multiple onChange={onFolderChange} className="hidden" />
      <div className="mt-3 text-center">
        <button
          type="button"
          disabled={busy || remainingSlots <= 0}
          onClick={() => folderInputRef.current?.click()}
          className="px-3 py-2 rounded-xl border border-glass-border text-sm text-accent hover:bg-accent/10 disabled:opacity-50 focus-ring"
        >
          Seleccionar carpeta
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-flare text-center">{error}</p>}
      {busy && <FullscreenLoader message="Procesando videos…" />}
    </div>
  );
}
