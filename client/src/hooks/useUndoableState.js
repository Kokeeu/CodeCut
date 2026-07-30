import { useCallback, useRef, useState } from 'react';

const BATCH_WINDOW_MS = 500;

export default function useUndoableState(initialValue) {
  const [state, setState] = useState(initialValue);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const skipRef = useRef(false);
  const lastTagRef = useRef(null);
  const lastTimeRef = useRef(0);

  const set = useCallback((updater, tag) => {
    if (skipRef.current) {
      skipRef.current = false;
      setState(updater);
      return;
    }
    const now = Date.now();
    const shouldBatch = tag && tag === lastTagRef.current && (now - lastTimeRef.current) < BATCH_WINDOW_MS;
    lastTagRef.current = tag || null;
    lastTimeRef.current = now;

    setState((prev) => {
      if (shouldBatch && pastRef.current.length > 0) {
        pastRef.current[pastRef.current.length - 1] = prev;
      } else {
        pastRef.current = [...pastRef.current, prev];
      }
      futureRef.current = [];
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setState((prev) => {
      const next = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [prev, ...futureRef.current];
      skipRef.current = true;
      lastTagRef.current = null;
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setState((prev) => {
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      pastRef.current = [...pastRef.current, prev];
      skipRef.current = true;
      lastTagRef.current = null;
      return next;
    });
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return [state, set, { undo, redo, canUndo, canRedo }];
}
