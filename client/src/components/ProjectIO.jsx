import { useRef, useState } from 'react';

export default function ProjectIO({ onSave, onLoad }) {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
        >
          Save Project
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
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
