export default function FullscreenLoader({ message = 'Loading…' }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-floating rounded-2xl p-8 w-full max-w-sm flex flex-col items-center text-center animate-scale-in">
        <div className="relative w-14 h-14 mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-accent border-r-accent/30 border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-accent/10 blur-md" />
        </div>
        <p className="text-sm font-semibold text-neutral-100">{message}</p>
        <p className="text-xs text-neutral-500 mt-1">Please don&apos;t close this window.</p>
      </div>
    </div>
  );
}
