function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ProjectSummary({ files, clips, totalDuration }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="p-2 rounded-lg bg-slate-800/60">
        <div className="text-lg font-semibold text-slate-100">{files.length}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">videos</div>
      </div>
      <div className="p-2 rounded-lg bg-slate-800/60">
        <div className="text-lg font-semibold text-slate-100">{clips.length}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">clips</div>
      </div>
      <div className="p-2 rounded-lg bg-slate-800/60">
        <div className="text-lg font-semibold text-slate-100 font-mono">{formatTime(totalDuration)}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">total</div>
      </div>
    </div>
  );
}
