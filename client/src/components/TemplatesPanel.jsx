import CardTemplate from './CardTemplate.jsx';

const SAMPLE_PARTICIPANTS = [
  { id: 'sample-1', name: 'Ana', accent: '#fb7185' },
  { id: 'sample-2', name: 'Mateo', accent: '#22d3ee' },
];

const SAMPLE_RATING = {
  enabled: true,
  average: '8.8',
  scores: { 'sample-1': '8.5', 'sample-2': '9.0' },
};

function TemplatePreview({ template, height }) {
  const phases = template.clipSequence || [null];
  return (
    <div className="flex justify-center gap-3">
      {phases.map((phase) => (
        <div key={phase || 'card'} className="flex flex-col items-center gap-1">
          <CardTemplate
            texts={phase ? template.texts.filter((text) => text.phase === phase) : template.texts}
            font={template.font}
            color={template.color}
            blur={template.blur}
            blurEnabled={template.blurEnabled}
            height={height}
            showPlaceholder={false}
            videoPlaceholder={phase === 'intro' ? 'cover' : phase === 'main' || template.collaborativeRanking ? 'card' : undefined}
            participants={template.collaborativeRanking ? SAMPLE_PARTICIPANTS : undefined}
            collaborativeRating={template.collaborativeRanking ? SAMPLE_RATING : undefined}
          />
          {phase && <span className="text-[9px] text-neutral-400">{phase === 'intro' ? 'Clip 1 · Intro' : 'Clip 2+ · Canción'}</span>}
        </div>
      ))}
    </div>
  );
}

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
              <TemplatePreview template={tpl} height={150} />
            </div>
            {tpl.description && <p className="px-2.5 pb-2 text-[10px] text-neutral-400">{tpl.description}</p>}
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
              <TemplatePreview template={tpl} height={220} />
            </div>
            {tpl.description && <p className="text-[10px] text-neutral-400">{tpl.description}</p>}
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
