import CardTemplate from './CardTemplate.jsx';

function SparkleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 1v3M5 6v3M1 5h3M6 5h3M2 2l2 2M6 6l2 2M8 2L6 4M4 6L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function TemplatesPanel({ templates, onApply, hasClips, vertical }) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="group rounded-xl bg-glass-panel border border-glass-border overflow-hidden card-hover"
          >
            <div className="pointer-events-none flex justify-center py-2 bg-gradient-to-b from-white/[0.02] to-transparent">
              <CardTemplate
                texts={tpl.texts}
                font={tpl.font}
                color={tpl.color}
                blur={tpl.blur}
                blurEnabled={tpl.blurEnabled}
                height={150}
                showPlaceholder={false}
              />
            </div>
            <div className="flex items-center justify-between px-2.5 py-2 border-t border-glass-border">
              <span className="text-[11px] font-medium text-neutral-200">{tpl.name}</span>
              <button
                onClick={() => onApply(tpl)}
                disabled={!hasClips}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/25 hover:border-accent/40 disabled:bg-glass-panel disabled:border-glass-border disabled:text-neutral-600 disabled:cursor-not-allowed transition-all duration-150"
              >
                <SparkleIcon />
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-neutral-200">Templates</h2>
        <span className="text-[10px] text-neutral-500">
          {hasClips ? 'Apply to all clips' : 'Upload videos first'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {templates.map((tpl) => (
          <div key={tpl.id} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="pointer-events-none rounded-xl overflow-hidden ring-1 ring-glass-border hover:ring-white/20 transition-all">
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
              <span className="text-[10px] font-medium text-neutral-200">{tpl.name}</span>
              <button
                onClick={() => onApply(tpl)}
                disabled={!hasClips}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/25 hover:border-accent/40 disabled:bg-glass-panel disabled:border-glass-border disabled:text-neutral-600 disabled:cursor-not-allowed transition-all duration-150"
              >
                <SparkleIcon />
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
