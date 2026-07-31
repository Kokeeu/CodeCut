import useLazyImage from '../hooks/useLazyImage.js';

export default function LazyImage({ src, alt, className, placeholder, placeholderClass }) {
  const { imgRef, isLoaded, isVisible } = useLazyImage(src);

  return (
    <div ref={imgRef} className={['relative', className].filter(Boolean).join(' ')}>
      {isVisible && isLoaded ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      ) : (
        placeholder || (
          <div
            className={[
              'w-full h-full bg-glass-strong flex items-center justify-center text-neutral-600',
              placeholderClass,
            ].filter(Boolean).join(' ')}
          >
            <div className="w-6 h-6 rounded-full border-2 border-neutral-700 border-t-neutral-400 animate-spin opacity-50" />
          </div>
        )
      )}
    </div>
  );
}
