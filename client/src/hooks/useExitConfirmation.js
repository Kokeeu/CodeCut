import { useEffect, useRef, useState } from 'react';

export default function useExitConfirmation(enabled) {
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    history.replaceState({ exitGuard: true }, '', location.href);

    const handlePopState = () => {
      if (confirmedRef.current) return;
      setShowConfirm(true);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);

  const confirmExit = () => {
    confirmedRef.current = true;
    setShowConfirm(false);
    history.back();
  };

  const cancelExit = () => {
    setShowConfirm(false);
    history.forward();
  };

  return { showConfirm, confirmExit, cancelExit };
}
