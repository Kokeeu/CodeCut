import { useState, useEffect, useRef } from 'react';

export default function useLazyImage(src, options = {}) {
  const { rootMargin = '100px', threshold = 0.01 } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, rootMargin, threshold]);

  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsLoaded(true);
    img.src = src;
  }, [isVisible, src]);

  return { imgRef, isLoaded, isVisible };
}
