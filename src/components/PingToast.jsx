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
      <div className="glass-panel border-alive/40 rounded-2xl p-4 shadow-[0_10px_35px_rgba(200,255,0,0.18)] flex items-start gap-3 relative overflow-hidden select-none">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-alive shadow-[0_0_12px_#c8ff00]" />

        <div className="w-8 h-8 rounded-full bg-alive/15 border border-alive/40 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(200,255,0,0.2)]">
          <span className="text-alive text-sm animate-pulse">⚡</span>
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-alive text-[10px] font-mono uppercase tracking-widest font-bold">
              Live Telemetry Ping
            </span>
            <span className="text-muted text-[9px] font-mono">
              just now
            </span>
          </div>
          <p className="text-text font-mono text-xs font-bold truncate">
            {ping.name} <span className="font-normal text-muted">checked in</span>
          </p>
          {ping.message && (
            <p className="text-muted-light text-[11px] font-mono mt-1 italic line-clamp-2 bg-void/60 rounded-lg p-2 border border-white/5">
              &quot;{ping.message}&quot;
            </p>
          )}
        </div>

        <button
          onClick={() => {
            setDismissed(true);
            setTimeout(onClose, 300);
          }}
          className="text-muted hover:text-text p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label="Close notification"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
