import { useEffect } from 'react';

export function FloatingReactions({ reactions = [], onComplete }) {
  useEffect(() => {
    if (reactions.length === 0) return;

    const timers = reactions.map(r => {
      return setTimeout(() => {
        if (onComplete) onComplete(r.id);
      }, 2400);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [reactions, onComplete]);

  if (reactions.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none">
      {reactions.map((r) => {
        const leftPercent = r.x !== undefined ? Math.max(10, Math.min(90, r.x)) : 50;
        const drift = r.driftX ?? 0;
        const rotation = r.rot ?? 0;


        return (
          <div
            key={r.id}
            className="absolute bottom-24 flex flex-col items-center justify-center will-change-transform"
            style={{
              left: `${leftPercent}%`,
              '--drift-x': `${drift}px`,
              '--rot': `${rotation}deg`,
              animation: 'floatUpReaction 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="text-3xl md:text-4xl filter drop-shadow-[0_0_12px_rgba(200,255,0,0.3)]">
                {r.emoji}
              </span>
              {r.isVoicePing && (
                <span className="absolute -top-3 -right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-alive"></span>
                </span>
              )}
            </div>

            {r.label && (
              <span className="mt-1 px-2 py-0.5 rounded-full bg-surface/90 border border-border/80 text-[9px] font-mono text-muted whitespace-nowrap shadow-lg">
                {r.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
