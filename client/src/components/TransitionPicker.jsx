import { useEffect, useRef, useState, useLayoutEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';

export const TRANSITION_TYPES = [
  { value: 'none', label: 'Cut (none)' },
  { value: 'fade', label: 'Fade' },
  { value: 'fadeblack', label: 'Fade to black' },
  { value: 'fadewhite', label: 'Fade to white' },
  { value: 'wipeleft', label: 'Wipe left' },
  { value: 'wiperight', label: 'Wipe right' },
  { value: 'slideleft', label: 'Slide left' },
  { value: 'slideright', label: 'Slide right' },
  { value: 'circleopen', label: 'Circle open' },
  { value: 'circleclose', label: 'Circle close' },
];

function TransitionPreview({ type, isHover }) {
  const isPlaying = isHover;
  const baseStyle = 'absolute inset-0';
  const speed = '1.6s';

  return (
    <div className={['relative w-12 h-8 rounded-md overflow-hidden bg-glass-strong ring-1 ring-glass-border', isPlaying ? 'shadow-glow-accent-sm' : ''].join(' ')}>
      <div className={['absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-br from-violet-500/80 to-purple-700/80', baseStyle].join(' ')} />
      <div className={['absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-br from-cyan-500/80 to-blue-700/80', baseStyle].join(' ')} />

      {type === 'fade' && (
        <div
          className="absolute inset-0 bg-black"
          style={{ animation: isPlaying ? `tpFade ${speed} ease-in-out infinite` : 'none', opacity: 0 }}
        />
      )}
      {type === 'fadeblack' && (
        <div
          className="absolute inset-0 bg-black"
          style={{ animation: isPlaying ? `tpFadeFull ${speed} ease-in-out infinite` : 'none' }}
        />
      )}
      {type === 'fadewhite' && (
        <div
          className="absolute inset-0 bg-white"
          style={{ animation: isPlaying ? `tpFadeFull ${speed} ease-in-out infinite` : 'none' }}
        />
      )}
      {type === 'wipeleft' && (
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-r from-transparent to-cyan-400/90"
          style={{
            animation: isPlaying ? `tpWipeLeft ${speed} ease-in-out infinite` : 'none',
            width: '0%',
            transformOrigin: 'right',
          }}
        />
      )}
      {type === 'wiperight' && (
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-l from-transparent to-cyan-400/90"
          style={{
            animation: isPlaying ? `tpWipeRight ${speed} ease-in-out infinite` : 'none',
            width: '0%',
            transformOrigin: 'left',
          }}
        />
      )}
      {type === 'slideleft' && (
        <>
          <div
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-cyan-500/80 to-blue-700/80"
            style={{ animation: isPlaying ? `tpSlideLeftOut ${speed} ease-in-out infinite` : 'none' }}
          />
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-violet-500/80 to-purple-700/80"
            style={{ animation: isPlaying ? `tpSlideLeftIn ${speed} ease-in-out infinite` : 'none' }}
          />
        </>
      )}
      {type === 'slideright' && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-violet-500/80 to-purple-700/80"
            style={{ animation: isPlaying ? `tpSlideRightOut ${speed} ease-in-out infinite` : 'none' }}
          />
          <div
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-cyan-500/80 to-blue-700/80"
            style={{ animation: isPlaying ? `tpSlideRightIn ${speed} ease-in-out infinite` : 'none' }}
          />
        </>
      )}
      {type === 'circleopen' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(168,85,247,0.6) 31%, rgba(168,85,247,0.6) 100%)',
            animation: isPlaying ? `tpCircleOpen ${speed} ease-in-out infinite` : 'none',
          }}
        />
      )}
      {type === 'circleclose' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(168,85,247,0.6) 0%, rgba(168,85,247,0.6) 100%, transparent 100%)',
            animation: isPlaying ? `tpCircleClose ${speed} ease-in-out infinite` : 'none',
          }}
        />
      )}
    </div>
  );
}

const SHORT_LABELS = {
  none: 'None',
  fade: 'Fade',
  fadeblack: 'Fade B',
  fadewhite: 'Fade W',
  wipeleft: 'Wipe L',
  wiperight: 'Wipe R',
  slideleft: 'Slide L',
  slideright: 'Slide R',
  circleopen: 'Circle ⊕',
  circleclose: 'Circle ⊖',
};

const POPOVER_WIDTH = 288;
const POPOVER_MAX_HEIGHT = 380;
const VIEWPORT_PADDING = 8;

const TransitionPicker = memo(function TransitionPicker({ value, maxDuration, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoveredType, setHoveredType] = useState(null);
  const [popoverRect, setPopoverRect] = useState(null);
  const [popoverPlacement, setPopoverPlacement] = useState('top');
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();

    const desiredLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING, desiredLeft)
    );

    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const placement = spaceBelow >= Math.min(POPOVER_MAX_HEIGHT, spaceAbove) && spaceBelow > spaceAbove
      ? 'bottom'
      : 'top';
    setPopoverPlacement(placement);

    const gap = 8;
    const arrowLeft = rect.left + rect.width / 2 - left;
    if (placement === 'top') {
      setPopoverRect({
        left,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.max(160, Math.min(POPOVER_MAX_HEIGHT, spaceAbove - gap)),
        arrowLeft,
      });
    } else {
      setPopoverRect({
        left,
        top: rect.bottom + gap,
        maxHeight: Math.max(160, Math.min(POPOVER_MAX_HEIGHT, spaceBelow - gap)),
        arrowLeft,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverRect(null);
      return undefined;
    }
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const inRoot = rootRef.current && rootRef.current.contains(e.target);
      const inPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!inRoot && !inPopover) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isNone = !value || value.type === 'none';
  const dur = Math.min(Number(value?.durationSec) || 0, maxDuration);
  const currentType = isNone ? 'none' : value.type;

  const setType = (type) => {
    if (type === 'none' || maxDuration < 0.05) {
      onChange({ type: 'none', durationSec: 0 });
    } else {
      onChange({ type, durationSec: dur > 0 ? Math.min(dur, maxDuration) : Math.min(0.5, maxDuration) });
    }
  };

  const setDuration = (d) => {
    const safeDuration = Math.max(0.05, Math.min(maxDuration, d));
    onChange({ type: value.type, durationSec: safeDuration });
  };

  const popover = open && popoverRect ? (
    <div
      ref={popoverRef}
      className={[
        'fixed z-[60] w-72 p-3 glass-floating rounded-2xl shadow-panel-lg',
        popoverPlacement === 'top' ? 'animate-slide-up' : 'animate-slide-down',
      ].join(' ')}
      style={{
        left: popoverRect.left,
        maxHeight: popoverRect.maxHeight,
        overflowY: 'auto',
        ...(popoverPlacement === 'top'
          ? { bottom: popoverRect.bottom }
          : { top: popoverRect.top }),
      }}
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="absolute w-2.5 h-2.5 rotate-45 bg-glass-strong border-glass-border"
        style={{
          left: popoverRect.arrowLeft,
          marginLeft: -5,
          ...(popoverPlacement === 'top'
            ? { bottom: '-5px', borderRight: '1px solid', borderBottom: '1px solid' }
            : { top: '-5px', borderLeft: '1px solid', borderTop: '1px solid' }),
        }}
      />

      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] font-semibold text-neutral-200">Transition</div>
        <div className="text-[10px] font-mono text-neutral-500 tracking-tight">{SHORT_LABELS[currentType]}</div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {TRANSITION_TYPES.filter((t) => t.value !== 'none').map((t) => {
          const active = currentType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              onMouseEnter={() => setHoveredType(t.value)}
              onMouseLeave={() => setHoveredType(null)}
              className={[
                'group flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-150',
                active
                  ? 'bg-accent/15 border border-accent/40 shadow-glow-accent-sm'
                  : 'bg-glass-panel border border-glass-border hover:border-white/20 hover:bg-glass-strong',
              ].join(' ')}
              title={t.label}
            >
              <TransitionPreview type={t.value} isHover={hoveredType === t.value} />
              <span className={['text-[8px] font-medium leading-none tracking-tight truncate w-full text-center', active ? 'text-accent' : 'text-neutral-400 group-hover:text-neutral-200'].join(' ')}>
                {SHORT_LABELS[t.value]}
              </span>
            </button>
          );
        })}
      </div>

      {!isNone && (
        <div className="pt-2.5 border-t border-glass-border space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium text-neutral-400">Duration</label>
            <span className="text-[10px] font-mono text-accent font-semibold">{dur.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0.05"
            max={Math.max(0.05, maxDuration).toFixed(2)}
            step="0.05"
            value={dur || 0.05}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] font-mono text-neutral-500">
            <span>0.05s</span>
            <span>max {maxDuration.toFixed(1)}s</span>
          </div>
          <button
            onClick={() => setType('none')}
            className="w-full mt-1 px-2 py-1 rounded-md text-[10px] font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Remove transition
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative flex items-center shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={[
          'group relative mx-1 my-1 w-7 min-h-[72px] rounded-md text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5',
          'border transition-all duration-150 focus-ring',
          isNone
            ? 'bg-glass-panel border-dashed border-glass-border text-neutral-500 hover:border-accent/50 hover:text-accent hover:bg-accent/5'
            : 'bg-gradient-to-b from-accent-dim/80 to-accent/80 border-accent text-white shadow-glow-accent-sm',
        ].join(' ')}
        title={isNone ? 'Add transition' : `${value.type} · ${dur.toFixed(1)}s`}
      >
        {isNone ? (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            <span className="leading-none tracking-tight">{SHORT_LABELS[value.type] || value.type.slice(0, 6)}</span>
            <span className="text-[8px] font-mono opacity-80 leading-none">{dur.toFixed(1)}s</span>
          </>
        )}
      </button>
      {popover && createPortal(popover, document.body)}
    </div>
  );
});

export default TransitionPicker;
