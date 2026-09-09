import { useEffect } from 'react';
import { FireIcon, SkullIcon, HeartIcon, BoltIcon, SonarIcon, MusicIcon } from './Icons';

function ReactionGlyph({ r }) {
  const type = r.reactionId || r.soundType || r.emoji;
  if (type === 'fire' || type === '🔥') {
    return <FireIcon className="w-9 h-9 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]" />;
  }
  if (type === 'skull' || type === '💀') {
    return <SkullIcon className="w-9 h-9 text-neutral-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />;
  }
  if (type === 'heart' || type === '❤️') {
    return <HeartIcon className="w-9 h-9 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.7)]" />;
  }
  if (type === 'cyber' || type === '⚡') {
    return <BoltIcon className="w-9 h-9 text-alive drop-shadow-[0_0_15px_rgba(200,255,0,0.8)]" />;
  }
  if (type === 'sonar' || type === '🔊') {
    return <SonarIcon className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />;
  }
  if (type === 'music' || type === '🎵') {
    return <MusicIcon className="w-9 h-9 text-alive drop-shadow-[0_0_15px_rgba(200,255,0,0.8)]" />;
  }
  return (
    <span className="text-3xl md:text-4xl filter drop-shadow-[0_0_12px_rgba(200,255,0,0.3)]">
      {r.emoji}
    </span>
  );
}

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
              <ReactionGlyph r={r} />
              {r.isVoicePing && (
                <span className="absolute -top-3 -right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-alive" />
                </span>
              )}
            </div>

            {r.label && (
              <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-void/90 border border-white/15 text-[9px] font-mono text-muted-light whitespace-nowrap shadow-lg backdrop-blur-md">
                {r.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

