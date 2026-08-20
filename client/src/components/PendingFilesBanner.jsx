export default function PendingFilesBanner({ files }) {
  if (!files || files.length === 0) return null;
  const names = files.map((f) => f.name).filter(Boolean);
  const label = names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
      <p className="text-[11px] text-yellow-100 leading-snug">
        Re-upload to restore media and export: <span className="font-medium text-yellow-50">{label}</span>.
        Drop files with the same names in the media panel.
      </p>
    </div>
  );
}
