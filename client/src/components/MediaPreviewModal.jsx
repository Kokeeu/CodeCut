import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function MediaPreviewModal({ file, onClose }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const titleId = useId();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    dialog.showModal();
    return () => {
      video.pause();
      dialog.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-4xl max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-2xl border border-glass-border bg-editor-panel p-0 text-neutral-100 shadow-panel-lg backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">Vista previa</h2>
            <p className="mt-1 break-words text-sm text-neutral-400">{file.name}</p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-neutral-100 focus-ring"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <video
          ref={videoRef}
          src={file.url}
          controls
          playsInline
          preload="metadata"
          aria-label={`Vista previa de ${file.name}`}
          onError={() => setFailed(true)}
          className="block max-h-[70dvh] w-full rounded-xl bg-black object-contain focus-ring"
        />
        {failed && (
          <p role="alert" className="mt-3 text-sm text-flare">
            No se pudo reproducir este video. Comprueba que el archivo esté disponible y que su formato sea compatible con el navegador.
          </p>
        )}
      </div>
    </dialog>,
    document.body
  );
}
