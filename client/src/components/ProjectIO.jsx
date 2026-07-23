import { useRef, useState } from 'react';

export default function ProjectIO({ onSave, onLoad, compact }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

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
      <div className="flex items-center gap-1">
        <button onClick={handleSave}
          className="px-2 py-1 rounded text-[10px] font-medium text-neutral-400 hover:text-neutral-200 hover:bg-editor-surface transition-colors"
          title="Save project">
          💾
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded text-[10px] font-medium text-neutral-400 hover:text-neutral-200 hover:bg-editor-surface transition-colors"
          title="Load project">
          📂
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoad} className="hidden" />
        {error && <span className="text-[9px] text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 rounded-lg bg-editor-surface hover:bg-editor-hover text-xs font-medium text-neutral-200 transition-colors border border-editor-border"
        >
          Save Project
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-2 rounded-lg bg-editor-surface hover:bg-editor-hover text-xs font-medium text-neutral-200 transition-colors border border-editor-border"
        >
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
