import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'codecut-autosave';
const DEBOUNCE_MS = 2000;

export default function useProjectAutosave({ files, clips, transitions, meta }) {
  const [hasSavedData, setHasSavedData] = useState(false);
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.clips && data.clips.length > 0) {
          setHasSavedData(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (clips.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const snapshot = {
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            duration: f.duration,
            waveform: f.waveform,
            filmstrip: f.filmstrip,
          })),
          clips,
          transitions,
          meta,
          savedAt: Date.now(),
        };
        const serialized = JSON.stringify(snapshot);
        if (serialized !== lastSavedRef.current) {
          localStorage.setItem(STORAGE_KEY, serialized);
          lastSavedRef.current = serialized;
          setStatus('saved');
          setTimeout(() => setStatus('idle'), 1500);
        }
      } catch {
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [files, clips, transitions, meta]);

  const restore = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const data = JSON.parse(saved);
      return data;
    } catch {
      return null;
    }
  };

  const dismiss = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedData(false);
    lastSavedRef.current = null;
  };

  return { hasSavedData, status, restore, dismiss };
}
