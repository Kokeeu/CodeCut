import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CollaborativeRankingPanel from './CollaborativeRankingPanel.jsx';
import { formatCollaborativeTotal } from '../lib/collaborativeRanking.js';
import {
  buildFilenameRows,
  getCollaborativeFields,
  isEmptySongField,
  parseCollaborativePaste,
} from '../lib/collaborativeProject.js';

const INPUT_CLASS = 'w-full rounded-lg border border-glass-border bg-editor-surface px-2.5 py-2 text-sm text-neutral-100 focus-ring disabled:opacity-45';
const BUTTON_CLASS = 'rounded-lg border border-glass-border px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-glass-strong focus-ring disabled:opacity-40 disabled:cursor-not-allowed';

export default function CollaborativeTopDialog({ clips, fileById, meta, activeClipId, onUpdate, onMetaChange, onPrepareMissing, onClose, undo }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [paste, setPaste] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [notice, setNotice] = useState(null);
  const ranking = meta.collaborativeRanking;
  const commonArtist = ranking.defaultArtist || '';
  const participants = ranking.participants || [];
  const songs = useMemo(() => clips.filter((clip) => clip.collaborativeRating).map((clip) => ({
    clip,
    fields: getCollaborativeFields(clip),
    fileName: fileById[clip.fileId]?.name || 'Archivo no disponible',
  })), [clips, fileById]);
  const title = ranking.title ?? songs[0]?.fields.heading?.text ?? 'TOP DE CANCIONES';
  const rankOrder = ranking.rankOrder || 'manual';
  const filenameFormat = ranking.filenameFormat || 'artist-song';
  const sourceClip = clips.find((clip) => clip.id === activeClipId);
  const canCopyStyle = sourceClip && Object.keys(getCollaborativeFields(sourceClip)).length > 0;
  const parsedPaste = useMemo(() => {
    if (!paste.trim()) return { rows: [], error: null };
    try {
      return { rows: parseCollaborativePaste(paste, songs.map(({ clip }) => clip), participants), error: null };
    } catch (error) {
      return { rows: [], error: error.message };
    }
  }, [paste, songs, participants]);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const updateField = useCallback((clipId, field, value) => {
    onUpdate({ rows: [{ clipId, fields: { [field]: value } }] }, `top-${clipId}-${field}`);
  }, [onUpdate]);

  const updateScore = useCallback((clipId, participantId, value) => {
    onUpdate({ rows: [{ clipId, scores: { [participantId]: value } }] }, `top-${clipId}-${participantId}`);
  }, [onUpdate]);

  const fillFromFiles = useCallback(() => {
    const rows = buildFilenameRows(clips, fileById, filenameFormat, replaceExisting, commonArtist);
    const changed = rows.filter((row) => Object.keys(row.fields).length > 0);
    if (changed.length) onUpdate({ rows: changed });
    setNotice(changed.length ? `Se completaron datos de ${changed.length} canciones.` : 'No hay campos pendientes que se puedan completar con los nombres de archivo.');
  }, [clips, fileById, filenameFormat, replaceExisting, commonArtist, onUpdate]);

  const fillArtist = useCallback(() => {
    const rows = songs.filter(({ fields }) => fields.artist && isEmptySongField('artist', fields.artist.text))
      .map(({ clip }) => ({ clipId: clip.id, fields: { artist: commonArtist.trim() } }));
    if (rows.length) onUpdate({ rows });
    setNotice(rows.length ? `Artista completado en ${rows.length} canciones.` : 'Todas las canciones ya tienen artista.');
  }, [songs, commonArtist, onUpdate]);

  const applyPaste = useCallback(() => {
    if (!parsedPaste.rows.length || parsedPaste.error) return;
    onUpdate({ rows: parsedPaste.rows });
    setNotice(`Se aplicaron ${parsedPaste.rows.length} filas. Las celdas vacías conservaron sus valores anteriores.`);
    setPaste('');
  }, [parsedPaste, onUpdate]);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (!(event.ctrlKey || event.metaKey) || event.target.closest('input,textarea,select,[contenteditable]')) return;
        const key = event.key.toLowerCase();
        if (key === 'z' || key === 'y') {
          event.preventDefault();
          if (key === 'y' || event.shiftKey) undo.redo();
          else undo.undo();
        }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-6xl max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-2xl border border-glass-border bg-editor-panel p-0 text-neutral-100 shadow-panel-lg backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">Datos del Top</h2>
            <p className="mt-1 text-xs text-neutral-400">Un título y un grupo de participantes para las {songs.length} canciones. Los cambios se aplican al editar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar datos del Top" className={`${BUTTON_CLASS} shrink-0`}>Cerrar</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs text-neutral-400">
            <span>Título compartido en todos los clips</span>
            <input autoFocus value={title} onChange={(event) => onUpdate({ settings: { title: event.target.value } }, 'top-title')} className={INPUT_CLASS} />
          </label>
          <label className="space-y-1.5 text-xs text-neutral-400">
            <span>Puestos según el orden del timeline</span>
            <select value={rankOrder} onChange={(event) => onUpdate({ settings: { rankOrder: event.target.value } })} className={INPUT_CLASS}>
              <option value="descending">Cuenta regresiva: {songs.length} → 1</option>
              <option value="ascending">Ascendente: 1 → {songs.length}</option>
              <option value="manual">Editar puestos manualmente</option>
            </select>
          </label>
        </div>

        <details className="rounded-xl border border-glass-border p-3">
          <summary className="cursor-pointer text-sm font-medium focus-ring">Participantes compartidos · {participants.map((participant) => participant.name).join(', ')}</summary>
          <div className="mt-3 max-w-xl">
            <CollaborativeRankingPanel meta={meta} onMetaChange={onMetaChange} participantsOnly />
          </div>
        </details>

        <div className="rounded-xl border border-glass-border bg-glass-panel p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-48 space-y-1.5 text-xs text-neutral-400">
              <span>Formato de los nombres de archivo</span>
              <select value={filenameFormat} onChange={(event) => onUpdate({ settings: { filenameFormat: event.target.value } })} className={INPUT_CLASS}>
                <option value="artist-song">Artista - Canción.mp4</option>
                <option value="song-artist">Canción - Artista.mp4</option>
                <option value="song">Solo canción.mp4</option>
              </select>
            </label>
            <button type="button" onClick={fillFromFiles} className={BUTTON_CLASS}>{replaceExisting ? 'Releer nombres de archivo' : 'Completar desde archivos'}</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
            Reemplazar canción y artista ya escritos al releer archivos
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-48 space-y-1.5 text-xs text-neutral-400">
              <span>Artista predeterminado para canciones sin artista</span>
              <input value={commonArtist} onChange={(event) => onUpdate({ settings: { defaultArtist: event.target.value } }, 'top-default-artist')} placeholder="Nombre del artista" className={INPUT_CLASS} />
            </label>
            <button type="button" disabled={!commonArtist.trim()} onClick={fillArtist} className={BUTTON_CLASS}>Completar artistas</button>
          </div>
          <p className="text-[11px] text-neutral-500">Los clips nuevos heredan este formato y el artista predeterminado cuando el archivo no lo indica.</p>
        </div>

        <div>
          {songs.length < clips.length && (
            <div className="mb-3 rounded-lg border border-glass-border p-3 text-xs text-neutral-400">
              <p>{clips.length - songs.length} clips aún no tienen la plantilla. Puedes prepararlos conservando los datos de las canciones que ya configuraste. Los textos de los clips pendientes se reemplazarán por los de la plantilla.</p>
              <button type="button" onClick={onPrepareMissing} className={`${BUTTON_CLASS} mt-2`}>Preparar clips pendientes</button>
            </div>
          )}
          <p className="mb-2 text-xs text-neutral-400">Edita canción, artista y notas sin cambiar de clip. Los puestos automáticos se ajustan al añadir, borrar o reordenar clips.</p>
          <div className="overflow-x-auto rounded-xl border border-glass-border">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Canciones y calificaciones en el orden de la línea de tiempo</caption>
              <thead className="bg-editor-surface text-neutral-400">
                <tr>
                  {['Clip', 'Canción', 'Artista', 'Puesto', ...participants.map((participant) => participant.name), 'Total'].map((label, index) => (
                    <th key={index} scope="col" className="px-3 py-2 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {songs.map(({ clip, fields, fileName }, index) => (
                  <tr key={clip.id} className={`border-t border-glass-border ${clip.id === activeClipId ? 'bg-accent/5' : ''}`}>
                    <th scope="row" className="max-w-40 px-3 py-2 font-normal">
                      <span className="font-mono text-signal">{index + 1}</span>
                      <span className="mt-1 block w-28 truncate text-[10px] text-neutral-500" title={fileName}>{fileName}</span>
                    </th>
                    {['song', 'artist', 'position'].map((field) => (
                      <td key={field} className="px-2 py-2">
                        <input
                          value={fields[field]?.text || ''}
                          onChange={(event) => updateField(clip.id, field, event.target.value)}
                          disabled={!fields[field] || (field === 'position' && rankOrder !== 'manual')}
                          aria-label={`${field === 'song' ? 'Canción' : field === 'artist' ? 'Artista' : 'Puesto'} del clip ${index + 1}`}
                          title={!fields[field] ? 'Este texto fue eliminado o no se pudo reconocer. Vuelve a aplicar Top Colaborativo para recuperarlo.' : undefined}
                          className={`${INPUT_CLASS} ${field === 'position' ? 'min-w-20' : 'min-w-48'}`}
                        />
                      </td>
                    ))}
                    {participants.map((participant) => (
                      <td key={participant.id} className="px-2 py-2">
                        <input
                          type="number" min="0" max="10" step="0.1"
                          value={clip.collaborativeRating.scores?.[participant.id] ?? ''}
                          onChange={(event) => updateScore(clip.id, participant.id, event.target.value)}
                          aria-label={`Nota de ${participant.name} para el clip ${index + 1}`}
                          placeholder="0–10"
                          className={`${INPUT_CLASS} min-w-20 font-mono`}
                        />
                      </td>
                    ))}
                    <td className="min-w-24 px-3 py-2 font-mono text-signal">
                      {formatCollaborativeTotal(participants, clip.collaborativeRating.scores, clip.collaborativeRating.total)}
                      {clip.collaborativeRating.total !== undefined && clip.collaborativeRating.total !== null && clip.collaborativeRating.total !== '' && (
                        <button type="button" onClick={() => onUpdate({ rows: [{ clipId: clip.id, automaticTotal: true }] })} className="mt-1 block text-[10px] text-neutral-400 underline focus-ring">Manual · usar suma</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <details className="rounded-xl border border-glass-border p-3">
          <summary className="cursor-pointer text-sm font-medium focus-ring">Pegar una lista desde Excel o Google Sheets</summary>
          <p className="mt-3 text-xs text-neutral-400">Columnas: canción, artista{participants.map((participant) => `, nota de ${participant.name}`).join('')}. Una fila por clip, empezando por el primero. Las celdas vacías conservan sus valores; los datos escritos reemplazan los actuales.</p>
          <textarea aria-label="Datos de canciones separados por tabulaciones" value={paste} onChange={(event) => setPaste(event.target.value)} rows={4} className={`${INPUT_CLASS} mt-3 font-mono`} placeholder={'Canción\tArtista\t8,5\t9\nOtra canción\tOtro artista\t7\t8'} />
          {parsedPaste.error && <p role="alert" className="mt-2 text-xs text-flare">{parsedPaste.error}</p>}
          <button type="button" onClick={applyPaste} disabled={!parsedPaste.rows.length || !!parsedPaste.error} className={`${BUTTON_CLASS} mt-2`}>Aplicar {parsedPaste.rows.length || ''} filas</button>
        </details>

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!canCopyStyle} onClick={() => { onUpdate({ styleSourceClipId: activeClipId }); setNotice('Diseño de los textos aplicado a todas las canciones.'); }} title="Copia posición, fuente, tamaño y colores de los textos del clip activo. Conserva el contenido y los tiempos de cada canción." className={BUTTON_CLASS}>Aplicar diseño del clip activo a todos</button>
          <button type="button" onClick={() => onUpdate({ automaticTotals: true })} className={BUTTON_CLASS}>Usar suma automática en todos</button>
        </div>
        {notice && <p role="status" className="text-xs text-signal">{notice}</p>}
        <div className="flex flex-wrap justify-between gap-3 border-t border-glass-border pt-4">
          <div className="flex gap-2">
            <button type="button" disabled={!undo.canUndo} onClick={undo.undo} className={BUTTON_CLASS}>Deshacer</button>
            <button type="button" disabled={!undo.canRedo} onClick={undo.redo} className={BUTTON_CLASS}>Rehacer</button>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-accent/30 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25 focus-ring">Listo</button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}
