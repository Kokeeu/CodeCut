import { useEffect, useState } from 'react';

export default function RestoreBanner({ onRestore, onDismiss, hasData }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasData) setVisible(true);
  }, [hasData]);

  if (!visible) return null;

  return (
    <div className="bg-accent/10 border-b border-accent/30 px-4 py-2 flex items-center gap-3 text-sm">
      <span className="text-neutral-300">Hay un proyecto guardado. ¿Restaurar?</span>
      <div className="flex-1" />
      <button
        onClick={() => { onRestore(); setVisible(false); }}
        className="px-3 py-1 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
      >
        Restaurar
      </button>
      <button
        onClick={() => { onDismiss(); setVisible(false); }}
        className="px-3 py-1 rounded bg-editor-surface hover:bg-editor-hover text-neutral-300 text-xs font-medium transition-colors"
      >
        Descartar
      </button>
    </div>
  );
}
