import { useCallback, useRef, useState } from 'react';

const BATCH_WINDOW_MS = 500;

export default function useUndoableState(initialValue) {
  const [store, setStore] = useState({
    present: initialValue,
    past: [],
    future: [],
  });
  const lastTagRef = useRef(null);
  const lastTimeRef = useRef(0);

  const set = useCallback((updater, tag) => {
    const now = Date.now();
    const shouldBatch = tag && tag === lastTagRef.current && (now - lastTimeRef.current) < BATCH_WINDOW_MS;
    lastTagRef.current = tag || null;
    lastTimeRef.current = now;

    setStore((s) => {
      const next = typeof updater === 'function' ? updater(s.present) : updater;
      if (Object.is(next, s.present)) return s;
      if (shouldBatch) {
        return { present: next, past: s.past, future: [] };
      }
      return { present: next, past: [...s.past, s.present], future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setStore((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      lastTagRef.current = null;
      return {
        present: previous,
        past: s.past.slice(0, -1),
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setStore((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      lastTagRef.current = null;
      return {
        present: next,
        past: [...s.past, s.present],
        future: s.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((next) => {
    lastTagRef.current = null;
    lastTimeRef.current = 0;
    setStore((s) => ({
      present: typeof next === 'function' ? next(s.present) : next,
      past: [],
      future: [],
    }));
  }, []);

  return [
    store.present,
    set,
    {
      undo,
      redo,
      reset,
      canUndo: store.past.length > 0,
      canRedo: store.future.length > 0,
    },
  ];
}
