import { useEffect, useState } from 'react';

export function PingToast({ ping, onClose }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!ping) return;
    const timer = setTimeout(() => {
      setDismissed(true);
      setTimeout(onClose, 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, [ping, onClose]);

  if (!ping) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] transition-all duration-300 transform ${
        !dismissed ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="bg-surface/95 border border-alive/40 backdrop-blur-md rounded-2xl p-4 shadow-[0_0_30px_rgba(200,255,0,0.15)] flex items-start gap-3 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-alive" />

        <div className="w-8 h-8 rounded-full bg-alive/10 border border-alive/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-alive text-sm animate-pulse">⚡</span>
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-alive text-[10px] font-mono uppercase tracking-widest font-bold">
              Incoming Ping
            </span>
            <span className="text-muted text-[10px] font-mono">
              just now
            </span>
          </div>
          <p className="text-text font-mono text-xs font-bold truncate">
            {ping.name} <span className="font-normal text-muted">checked in</span>
          </p>
          {ping.message && (
            <p className="text-muted text-[11px] font-mono mt-1 italic line-clamp-2 bg-void/50 rounded p-1.5 border border-border/30">
              "{ping.message}"
            </p>
          )}
        </div>

        <button
          onClick={() => {
            setDismissed(true);
            setTimeout(onClose, 300);
          }}
          className="text-muted hover:text-text p-1 transition-colors shrink-0 cursor-pointer"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
