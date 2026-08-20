import { useCallback, useEffect, useState } from 'react';

let toasts = [];
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(toasts));
}

function addToast(message, type = 'info', duration = 3000) {
  const id = Date.now() + Math.random();
  toasts = [...toasts, { id, message, type }];
  emit();
  if (duration > 0) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    }, duration);
  }
  return id;
}

function removeToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export default function useToast() {
  const [list, setList] = useState(toasts);

  useEffect(() => {
    const onChange = (next) => setList(next);
    listeners.add(onChange);
    setList(toasts);
    return () => listeners.delete(onChange);
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), []);
  const error = useCallback((message, duration) => addToast(message, 'error', duration || 5000), []);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), []);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration || 4000), []);

  return {
    toasts: list,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
