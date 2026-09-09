import { useState } from 'react';

const FUN_MESSAGES = [
  "VIBIN' 🔥",
  "HE COOKIN' 🍳",
  "LIL BRO GROOVIN' 🕺",
  "CERTIFIED BANGER 💿",
  "FEELIN' THE BASS 🔊",
  "CAN'T STOP ⚡",
  "ABSOLUTE CINEMA 🎬"
];

export function GroovePet({ bpm = 80, isPlaying = false, energy = 0.5, ekgColor = '#c8ff00' }) {
  const [clickCount, setClickCount] = useState(0);
  const [specialMove, setSpecialMove] = useState(false);
  const [bubbleText, setBubbleText] = useState(null);

  // Derive animation cycle speed from BPM (60 / BPM)
  const currentBpm = Math.min(200, Math.max(50, Math.round(bpm || 80)));
  const bounceDuration = isPlaying ? `${(60 / currentBpm).toFixed(2)}s` : '3s';

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    setSpecialMove(true);

    const randomMsg = isPlaying
      ? FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)]
      : "5 MORE MINUTES... 💤";

    setBubbleText(randomMsg);

    setTimeout(() => {
      setSpecialMove(false);
    }, 900);

    setTimeout(() => {
      setBubbleText(null);
    }, 2200);
  };

  return (
    <div
      onClick={handleClick}
      className="glass-panel-interactive rounded-2xl p-4 h-full flex flex-col justify-between relative overflow-hidden group cursor-pointer select-none transition-all duration-300 hover:border-alive/40"
    >
      {/* Subtle ambient light from the stage */}
      {isPlaying && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-20 rounded-full blur-2xl opacity-25 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: ekgColor }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{isPlaying ? "🎧" : "💤"}</span>
          <p className="text-muted text-[11px] tracking-widest font-mono uppercase font-semibold">
            — gbedu
          </p>
        </div>
        <span
          className="text-[9px] font-mono uppercase px-2.5 py-0.5 rounded-full border transition-colors shadow-sm"
          style={{
            borderColor: isPlaying ? `${ekgColor}50` : 'rgba(255,255,255,0.1)',
            backgroundColor: isPlaying ? `${ekgColor}15` : 'rgba(255,255,255,0.03)',
            color: isPlaying ? ekgColor : '#888',
          }}
        >
          {isPlaying ? `${currentBpm} BPM` : 'resting'}
        </span>
      </div>

      {/* Floating Speech Bubble */}
      {bubbleText && (
        <div className="absolute top-9 left-1/2 -translate-x-1/2 z-30 bg-surface-elevated/95 border border-alive/50 text-alive text-[10px] font-mono font-bold px-3 py-1 rounded-full shadow-[0_0_15px_rgba(200,255,0,0.3)] animate-in fade-in zoom-in duration-150 whitespace-nowrap backdrop-blur-md">
          {bubbleText}
        </div>
      )}

      {/* Center Stage: The Dancing Stickman */}
      <div className="relative flex items-center justify-center py-2 h-24">
        {/* DJ stage ring platform */}
        <div className="absolute bottom-2 w-20 h-4 rounded-[100%] border border-white/[0.08] bg-white/[0.02] shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)] pointer-events-none flex items-center justify-center">
          {isPlaying && (
            <div
              className="w-12 h-2 rounded-[100%] blur-sm opacity-60 animate-pulse"
              style={{ backgroundColor: ekgColor }}
            />
          )}
        </div>

        <svg
          viewBox="0 0 100 100"
          className={`w-20 h-20 overflow-visible transition-transform duration-300 relative z-10 ${
            specialMove ? 'rotate-[360deg] scale-110' : ''
          }`}
          style={{
            animation: isPlaying
              ? `grooveBounce ${bounceDuration} ease-in-out infinite`
              : `sleepBreathe 3.5s ease-in-out infinite`,
          }}
        >
          {/* SNOOZING STATE (Not Playing) */}
          {!isPlaying ? (
            <g>
              {/* Head */}
              <circle cx="50" cy="40" r="12" fill="none" stroke="#666" strokeWidth="2.5" />
              {/* Sleepy closed eyes */}
              <path d="M43,39 Q46,42 49,39" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M51,39 Q54,42 57,39" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
              {/* Sleeping cap */}
              <path d="M40,32 Q50,22 62,28 Q54,34 40,32 Z" fill="#444" stroke="#666" strokeWidth="1.5" />
              <circle cx="62" cy="28" r="3" fill="#888" />
              {/* Body lying down / slouched */}
              <line x1="50" y1="52" x2="50" y2="72" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="60" x2="38" y2="68" stroke="#555" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="50" y1="60" x2="62" y2="68" stroke="#555" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="50" y1="72" x2="42" y2="88" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="72" x2="58" y2="88" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
              {/* Animated ZZZs */}
              <text x="64" y="26" fill="#888" fontSize="9" fontFamily="monospace" className="animate-pulse">z</text>
              <text x="72" y="18" fill="#aaa" fontSize="11" fontFamily="monospace" className="animate-pulse">Z</text>
            </g>
          ) : (
            /* DANCING & GROOVING STATE (Playing) */
            <g>
              {/* Head */}
              <circle
                cx="50"
                cy="32"
                r="13"
                fill="#121212"
                stroke={ekgColor}
                strokeWidth="2.5"
                className="transition-colors duration-300"
              />

              {/* Glowing Rave Sunglasses */}
              <rect x="41" y="28" width="8" height="5" rx="1.5" fill={ekgColor} />
              <rect x="51" y="28" width="8" height="5" rx="1.5" fill={ekgColor} />
              <line x1="49" y1="30.5" x2="51" y2="30.5" stroke={ekgColor} strokeWidth="1.5" />

              {/* Big DJ Headphones */}
              <path d="M35,32 C35,18 65,18 65,32" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="33" y="27" width="5" height="10" rx="2" fill={ekgColor} />
              <rect x="62" y="27" width="5" height="10" rx="2" fill={ekgColor} />

              {/* Body */}
              <line x1="50" y1="45" x2="50" y2="68" stroke="#fff" strokeWidth="3" strokeLinecap="round" />

              {/* Left Arm (Pumping up in rhythm) */}
              <path
                d={energy > 0.6 ? "M50,50 L34,40 L30,24" : "M50,52 L36,46 L30,36"}
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Right Arm (Waving to the beat) */}
              <path
                d={energy > 0.6 ? "M50,50 L66,40 L72,24" : "M50,52 L64,58 L72,50"}
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Left Leg (Bouncing) */}
              <path
                d="M50,68 L40,78 L36,92"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Right Leg (Stepping) */}
              <path
                d="M50,68 L60,78 L64,92"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Music notes floating on sides */}
              <text x="18" y="28" fill={ekgColor} fontSize="12" className="animate-bounce">♪</text>
              <text x="76" y="22" fill={ekgColor} fontSize="14" className="animate-pulse">♫</text>
            </g>
          )}
        </svg>
      </div>

      {/* Footer / Interaction prompt */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[9px] font-mono text-muted relative z-10">
        <span className="group-hover:text-text/80 transition-colors">
          {isPlaying ? "click to hype" : "click to wake"}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-alive border border-alive/20">
          {clickCount > 0 ? `⚡ ${clickCount}` : "tap →"}
        </span>
      </div>

      {/* Inline styles for custom bouncing keyframes */}
      <style>{`
        @keyframes grooveBounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-7px) rotate(-3deg) scaleY(1.04); }
          50% { transform: translateY(2px) rotate(0deg) scaleY(0.96); }
          75% { transform: translateY(-7px) rotate(3deg) scaleY(1.04); }
        }
        @keyframes sleepBreathe {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.7; }
          50% { transform: translateY(3px) scale(0.97); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
