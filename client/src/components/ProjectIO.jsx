import { useRef, useState, useEffect } from 'react';

function SaveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M3 2h7l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 2v3h4V2M5 13V9h4v4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function LoadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M3 2h7l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 8l2 2 2-2M7 5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProjectIO({ onSave, onLoad, compact }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSave = () => {
    const data = onSave();
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codecut-project-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLoad = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.clips) {
        throw new Error('Invalid project file');
      }
      onLoad(data);
    } catch (err) {
      setError(err.message || 'Failed to load project');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleSave}
          title="Save project"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-all duration-150"
        >
          <SaveIcon />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Load project"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-all duration-150"
        >
          <LoadIcon />
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoad} className="hidden" />
        {error && (
          <span className="absolute top-full mt-1 right-0 px-2 py-1 rounded-md text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 whitespace-nowrap">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-glass-panel border border-glass-border hover:border-white/20 text-xs font-medium text-neutral-200 transition-all duration-150"
        >
          <SaveIcon />
          Save Project
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-glass-panel border border-glass-border hover:border-white/20 text-xs font-medium text-neutral-200 transition-all duration-150"
        >
          <LoadIcon />
          Load Project
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleLoad}
          className="hidden"
        />
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
