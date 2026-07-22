import CardTemplate from './CardTemplate.jsx';

export default function TemplatesPanel({ templates, onApply, hasClips }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200">Templates</h2>
        <span className="text-[10px] text-slate-500">
          {hasClips ? 'Apply to all clips' : 'Upload videos first'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
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
              <span className="text-[10px] font-medium text-slate-200">{tpl.name}</span>
              <button
                onClick={() => onApply(tpl)}
                disabled={!hasClips}
                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-[10px] font-medium"
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
