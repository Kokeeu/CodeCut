import { useEffect, useRef, useState } from 'react';

export const TRANSITION_TYPES = [
  { value: 'none', label: 'Cut (none)' },
  { value: 'fade', label: 'Fade' },
  { value: 'fadeblack', label: 'Fade to black' },
  { value: 'fadewhite', label: 'Fade to white' },
  { value: 'wipeleft', label: 'Wipe left' },
  { value: 'wiperight', label: 'Wipe right' },
  { value: 'slideleft', label: 'Slide left' },
  { value: 'slideright', label: 'Slide right' },
  { value: 'circleopen', label: 'Circle open' },
  { value: 'circleclose', label: 'Circle close' },
];

export default function TransitionPicker({ value, maxDuration, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const isNone = !value || value.type === 'none';
  const dur = Math.min(Number(value?.durationSec) || 0, maxDuration);

  const setType = (type) => {
    if (type === 'none') {
      onChange({ type: 'none', durationSec: 0 });
    } else {
      onChange({ type, durationSec: dur > 0 ? dur : Math.min(0.5, maxDuration) });
    }
  };

  const setDuration = (d) => {
    const safeDuration = Math.max(0.1, Math.min(maxDuration, d));
    onChange({ type: value.type, durationSec: safeDuration });
  };

  return (
    <div ref={rootRef} className="relative flex items-center shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'mx-0.5 my-2 w-7 h-14 rounded-md text-xs flex items-center justify-center border',
          isNone
            ? 'bg-editor-surface border-editor-border text-neutral-500 hover:border-neutral-600'
            : 'bg-accent/80 border-accent text-white',
        ].join(' ')}
        title={isNone ? 'Add transition' : `${value.type} · ${dur.toFixed(1)}s`}
      >
        {isNone ? '⋮' : '≈'}
      </button>
      {open && (
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 w-52 p-3 rounded-lg bg-editor-panel border border-editor-border shadow-xl">
          <label className="block text-[11px] text-neutral-400 mb-1">Transition</label>
          <select
            value={value.type}
            onChange={(e) => setType(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 rounded text-xs"
          >
            {TRANSITION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {!isNone && (
            <>
              <label className="block text-[11px] text-neutral-400 mb-1">
                Duration: {dur.toFixed(1)}s
              </label>
              <input
                type="range"
                min="0.1"
                max={Math.max(0.1, maxDuration).toFixed(1)}
                step="0.1"
                value={dur || 0.1}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
