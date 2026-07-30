import useLazyImage from '../hooks/useLazyImage.js';

export default function LazyImage({ src, alt, className, placeholder, placeholderClass }) {
  const { imgRef, isLoaded, isVisible } = useLazyImage(src);

  return (
    <div ref={imgRef} className={className}>
      {isVisible && isLoaded ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        placeholder || <div className="w-full h-full bg-editor-border flex items-center justify-center text-2xl">🎞</div>
      )}
    </div>
  );
}
