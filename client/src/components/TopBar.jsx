import ExportButton from './ExportButton.jsx';
import ProjectIO from './ProjectIO.jsx';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TopBar({ files, clips, transitions, meta, totalDuration, onSave, onLoad }) {
  return (
    <div className="h-12 bg-editor-panel border-b border-editor-border flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎬</span>
        <span className="text-sm font-bold tracking-tight text-neutral-100">Codecut</span>
        <span className="text-[10px] text-neutral-500 font-mono">9:16</span>
      </div>

      <div className="w-px h-5 bg-editor-border" />

      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <span>{files.length} videos</span>
        <span>{clips.length} clips</span>
        <span className="font-mono">{formatTime(totalDuration)}</span>
      </div>

      <div className="flex-1" />

      <ProjectIO onSave={onSave} onLoad={onLoad} compact />

      <div className="w-px h-5 bg-editor-border" />

      <ExportButton files={files} clips={clips} transitions={transitions} meta={meta} compact />
    </div>
  );
}
