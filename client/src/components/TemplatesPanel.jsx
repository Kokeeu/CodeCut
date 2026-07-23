import CardTemplate from './CardTemplate.jsx';

export default function TemplatesPanel({ templates, onApply, hasClips, vertical }) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-lg bg-editor-surface border border-editor-border overflow-hidden">
            <div className="pointer-events-none flex justify-center py-2">
              <CardTemplate
                texts={tpl.texts}
                font={tpl.font}
                color={tpl.color}
                blur={tpl.blur}
                blurEnabled={tpl.blurEnabled}
                height={160}
                showPlaceholder={false}
              />
            </div>
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[10px] font-medium text-neutral-300">{tpl.name}</span>
              <button
                onClick={() => onApply(tpl)}
                disabled={!hasClips}
                className="px-2 py-0.5 rounded bg-accent hover:bg-accent-hover disabled:bg-editor-border disabled:text-neutral-500 disabled:cursor-not-allowed text-[9px] font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-editor-panel border border-editor-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-neutral-300">Templates</h2>
        <span className="text-[10px] text-neutral-500">
          {hasClips ? 'Apply to all clips' : 'Upload videos first'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="pointer-events-none">
              <CardTemplate
                texts={tpl.texts}
                font={tpl.font}
                color={tpl.color}
                blur={tpl.blur}
                blurEnabled={tpl.blurEnabled}
                height={220}
                showPlaceholder={false}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-neutral-300">{tpl.name}</span>
              <button
                onClick={() => onApply(tpl)}
                disabled={!hasClips}
                className="px-2 py-1 rounded bg-accent hover:bg-accent-hover disabled:bg-editor-border disabled:text-neutral-500 disabled:cursor-not-allowed text-[10px] font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
