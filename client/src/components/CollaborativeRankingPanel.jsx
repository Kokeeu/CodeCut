import { useState } from 'react';
import { MAX_COLLABORATIVE_PARTICIPANTS, clampRating, formatRating, resizeParticipantImage } from '../lib/collaborativeRanking.js';
import { PARTICIPANT_ACCENTS, nextId } from '../lib/projectDefaults.js';

function ParticipantAvatar({ participant, onImageChange }) {
  return (
    <label className="relative w-14 h-14 rounded-full shrink-0 cursor-pointer group">
      <span
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-editor-surface text-lg font-bold text-white"
        style={{ border: `2px solid ${participant.accent || '#a855f7'}` }}
      >
        {participant.image ? (
          <img src={participant.image} alt="" className="w-full h-full object-cover" />
        ) : (
          (participant.name || '?').trim().charAt(0).toUpperCase() || '?'
        )}
      </span>
      <span className="absolute inset-0 rounded-full bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-semibold text-white transition-opacity">
        Foto
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImageChange(file);
          event.target.value = '';
        }}
      />
    </label>
  );
}

export default function CollaborativeRankingPanel({ meta, activeClip, onMetaChange, onRatingChange }) {
  const [error, setError] = useState(null);
  const ranking = meta?.collaborativeRanking;
  const participants = ranking?.participants || [];
  const rating = activeClip?.collaborativeRating;

  if (!ranking?.enabled) {
    return (
      <div className="p-3 rounded-xl bg-glass-panel border border-dashed border-glass-border text-center">
        <p className="text-[11px] text-neutral-400">Aplica la plantilla Top Colaborativo para configurar participantes y notas.</p>
      </div>
    );
  }

  const updateRanking = (partial) => {
    onMetaChange({
      ...meta,
      collaborativeRanking: { ...ranking, ...partial },
    }, 'collaborative-participants');
  };

  const updateParticipant = (id, partial) => {
    updateRanking({
      participants: participants.map((participant) => (
        participant.id === id ? { ...participant, ...partial } : participant
      )),
    });
  };

  const handleImageChange = async (participant, file) => {
    setError(null);
    try {
      const image = await resizeParticipantImage(file);
      updateParticipant(participant.id, { image, imageName: file.name });
    } catch (imageError) {
      setError(imageError.message || 'No se pudo cargar la imagen.');
    }
  };

  const addParticipant = () => {
    if (participants.length >= MAX_COLLABORATIVE_PARTICIPANTS) return;
    const index = participants.length;
    updateRanking({
      participants: [
        ...participants,
        {
          id: nextId('participant'),
          name: `Participante ${index + 1}`,
          image: null,
          accent: PARTICIPANT_ACCENTS[index % PARTICIPANT_ACCENTS.length],
        },
      ],
    });
  };

  const removeParticipant = (id) => {
    if (participants.length <= 2) return;
    updateRanking({ participants: participants.filter((participant) => participant.id !== id) });
  };

  const updateScore = (participantId, value) => {
    const nextValue = value === '' ? '' : String(clampRating(value));
    onRatingChange?.({
      scores: { ...(rating?.scores || {}), [participantId]: nextValue },
    });
  };

  const normalizeScore = (participantId) => {
    onRatingChange?.({
      scores: { ...(rating?.scores || {}), [participantId]: formatRating(rating?.scores?.[participantId]) },
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="p-2.5 rounded-xl bg-glass-panel border border-glass-border">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Participantes</div>
            <div className="text-[9px] text-neutral-500 mt-0.5">La foto y el nombre se reutilizan en todo el proyecto.</div>
          </div>
          <button
            type="button"
            onClick={addParticipant}
            disabled={participants.length >= MAX_COLLABORATIVE_PARTICIPANTS}
            className="px-2 py-1 rounded-md bg-accent/15 border border-accent/25 text-accent text-[10px] font-semibold hover:bg-accent/25 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            + Añadir
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {participants.map((participant, index) => (
            <div key={participant.id} className="p-2 rounded-lg bg-black/15 border border-glass-border">
              <div className="flex items-center gap-2">
                <ParticipantAvatar participant={participant} onImageChange={(file) => handleImageChange(participant, file)} />
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={participant.name || ''}
                    maxLength={24}
                    onChange={(event) => updateParticipant(participant.id, { name: event.target.value })}
                    placeholder={`Participante ${index + 1}`}
                    className="w-full px-2 py-1.5 rounded-md text-[11px]"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="color"
                      value={participant.accent || PARTICIPANT_ACCENTS[index % PARTICIPANT_ACCENTS.length]}
                      onChange={(event) => updateParticipant(participant.id, { accent: event.target.value })}
                      className="w-7 h-6 rounded cursor-pointer bg-transparent"
                      title="Color del participante"
                    />
                    <span className="text-[9px] text-neutral-500 truncate flex-1">
                      {participant.imageName || 'Haz clic en el círculo para subir una foto'}
                    </span>
                    {participants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.id)}
                        className="text-[9px] text-red-400 hover:text-red-300"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400">
                Nota de este clip
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating?.scores?.[participant.id] ?? '0.0'}
                  onChange={(event) => updateScore(participant.id, event.target.value)}
                  onBlur={() => normalizeScore(participant.id)}
                  className="ml-auto w-20 px-2 py-1.5 rounded-md text-right font-mono text-[11px]"
                />
              </label>
            </div>
          ))}
        </div>
        <div className="text-[9px] text-neutral-500 mt-2 text-right">
          {participants.length}/{MAX_COLLABORATIVE_PARTICIPANTS} participantes
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-glass-panel border border-glass-border">
        <label className="flex items-center gap-2 text-[11px] text-neutral-300">
          Promedio de este clip
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={rating?.average ?? ''}
            onChange={(event) => onRatingChange?.({ average: event.target.value === '' ? '' : String(clampRating(event.target.value)) })}
            onBlur={() => onRatingChange?.({ average: formatRating(rating?.average) })}
            className="ml-auto w-20 px-2 py-1.5 rounded-md text-right font-mono text-[11px]"
          />
        </label>
        <label className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400 cursor-pointer">
          <input
            type="checkbox"
            checked={rating?.enabled !== false}
            onChange={(event) => onRatingChange?.({ enabled: event.target.checked })}
            className="rounded"
          />
          Mostrar calificaciones en este clip
        </label>
      </div>

      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
