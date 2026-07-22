import { useRef } from 'react';
import CardTemplate from './CardTemplate.jsx';

export default function CardTemplateGrid({
  items = [],
  activeIndex = 0,
  onActiveChange,
  onToggleSelect,
  height = 520,
  gap = 16,
}) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const cardW = height * (9 / 16) + gap;
    scrollRef.current.scrollBy({ left: dir * cardW, behavior: 'smooth' });
  };

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        No items to display.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white text-sm flex items-center justify-center"
        style={{ left: '-12px' }}
      >
        ←
      </button>
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white text-sm flex items-center justify-center"
        style={{ right: '-12px' }}
      >
        →
      </button>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto scroll-smooth pb-2"
        style={{
          gap: `${gap}px`,
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`.card-grid-scroll::-webkit-scrollbar { display: none; }`}</style>
        {items.map((item, i) => {
          const isSelected = !!item.selected;
          return (
            <div
              key={item.id || i}
              className="relative"
              style={{ scrollSnapAlign: 'center' }}
            >
              {onToggleSelect && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(i); }}
                  className={[
                    'absolute -top-2 -left-2 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-colors',
                    isSelected
                      ? 'bg-indigo-500 border-indigo-300 text-white'
                      : 'bg-slate-800/80 border-slate-500 text-slate-400 hover:border-slate-300',
                  ].join(' ')}
                  title={isSelected ? 'Deselect' : 'Select for template'}
                >
                  {isSelected ? '✓' : ''}
                </button>
              )}
              <CardTemplate
                videoUrl={item.videoUrl}
                texts={item.texts}
                headerText={item.headerText}
                animeTitle={item.animeTitle}
                openingNumber={item.openingNumber}
                songName={item.songName}
                artistName={item.artistName}
                font={item.font}
                color={item.color}
                blur={item.blur}
                blurEnabled={item.blurEnabled}
                transform={item.transform}
                height={height}
                isActive={i === activeIndex}
                onClick={() => onActiveChange?.(i)}
                showPlaceholder={false}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              onActiveChange?.(i);
              if (!scrollRef.current) return;
              const cardW = height * (9 / 16) + gap;
              scrollRef.current.scrollTo({ left: i * cardW, behavior: 'smooth' });
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === activeIndex ? 'bg-indigo-400' : 'bg-slate-600 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
