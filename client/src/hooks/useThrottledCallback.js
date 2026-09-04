import { useRef, useCallback, useEffect } from 'react';

export default function useThrottledCallback(callback, delay) {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    } else {
      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        lastCallRef.current = Date.now();
        callbackRef.current(...args);
      }, delay - timeSinceLastCall);
    }
  }, [delay, cancel]);

  throttledCallback.cancel = cancel;

  useEffect(() => cancel, [cancel]);

  return throttledCallback;
}
