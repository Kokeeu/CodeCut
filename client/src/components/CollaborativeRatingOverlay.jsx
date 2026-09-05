import { formatRating, getCollaborativeCardRect, getCollaborativeLayout } from '../lib/collaborativeRanking.js';

export default function CollaborativeRatingOverlay({ participants = [], rating, scale = 1 }) {
  const visibleParticipants = participants.slice(0, 6);
  if (!rating?.enabled || visibleParticipants.length === 0) return null;
  const layout = getCollaborativeLayout(visibleParticipants.length);
  const compact = visibleParticipants.length > 4;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 18 }}>
      {visibleParticipants.map((participant, index) => {
        const rect = getCollaborativeCardRect(index, layout);
        const accent = participant.accent || '#a855f7';
        const avatarX = compact ? 24 : (rect.width - layout.avatarSize) / 2;
        const avatarY = compact ? (rect.height - layout.avatarSize) / 2 : 24;
        return (
          <div
            key={participant.id}
            className="absolute"
            style={{
              left: rect.x * scale,
              top: rect.y * scale,
              width: rect.width * scale,
              height: rect.height * scale,
              borderRadius: 28 * scale,
              border: `${Math.max(1, 4 * scale)}px solid ${accent}`,
              background: 'rgba(5, 10, 28, 0.9)',
              boxShadow: `0 ${8 * scale}px ${24 * scale}px rgba(0,0,0,0.45)`,
              overflow: 'hidden',
            }}
          >
            <div
              className="absolute overflow-hidden flex items-center justify-center text-white font-extrabold"
              style={{
                left: avatarX * scale,
                top: avatarY * scale,
                width: layout.avatarSize * scale,
                height: layout.avatarSize * scale,
                borderRadius: '50%',
                border: `${Math.max(1, 5 * scale)}px solid ${accent}`,
                background: '#111827',
                fontSize: layout.avatarSize * 0.42 * scale,
              }}
            >
              {participant.image ? (
                <img src={participant.image} alt="" className="w-full h-full object-cover" />
              ) : (
                (participant.name || '?').trim().charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div
              className="absolute text-white font-extrabold uppercase truncate"
              style={compact ? {
                left: (avatarX + layout.avatarSize + 22) * scale,
                right: 16 * scale,
                top: 38 * scale,
                fontSize: layout.nameSize * scale,
                lineHeight: 1.1,
              } : {
                left: 16 * scale,
                right: 16 * scale,
                top: (avatarY + layout.avatarSize + 20) * scale,
                fontSize: layout.nameSize * scale,
                lineHeight: 1.1,
                textAlign: 'center',
              }}
            >
              {participant.name || `Participante ${index + 1}`}
            </div>
            <div
              className="absolute text-white font-extrabold"
              style={compact ? {
                left: (avatarX + layout.avatarSize + 22) * scale,
                top: 88 * scale,
                fontSize: layout.scoreSize * scale,
                lineHeight: 1,
              } : {
                left: 0,
                right: 0,
                bottom: 20 * scale,
                fontSize: layout.scoreSize * scale,
                lineHeight: 1,
                textAlign: 'center',
              }}
            >
              {formatRating(rating.scores?.[participant.id])}
            </div>
          </div>
        );
      })}
      <div
        className="absolute text-white font-extrabold flex items-center justify-center"
        style={{
          left: 270 * scale,
          top: Math.min(layout.averageY, 1761) * scale,
          width: 540 * scale,
          height: 104 * scale,
          borderRadius: 52 * scale,
          border: `${Math.max(1, 5 * scale)}px solid #c084fc`,
          background: 'rgba(10, 8, 30, 0.96)',
          boxShadow: `0 0 ${28 * scale}px rgba(168,85,247,0.55)`,
          fontSize: 49 * scale,
          lineHeight: 1,
        }}
      >
        PROMEDIO {formatRating(rating.average)}
      </div>
    </div>
  );
}
