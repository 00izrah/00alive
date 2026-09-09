import { useEffect, useRef, useState } from "react";

// Standard ECG rhythm with P-wave, sharp QRS complex, and T-wave
const ECG_WAVE_PATH =
  "M0,50 L20,50 C24,50 26,45 28,45 C30,45 32,50 36,50 L40,50 L43,56 L47,12 L52,86 L56,50 L60,50 C65,50 68,36 74,36 C80,36 83,50 88,50 L110,50 C114,50 116,45 118,45 C120,45 122,50 126,50 L130,50 L133,56 L137,12 L142,86 L146,50 L150,50 C155,50 158,36 164,36 C170,36 173,50 178,50 L200,50";

const FLATLINE_PATH =
  "M0,50 L200,50";

export function EKG({
  bpm = 80,
  energy = 0.5,
  valence = 0.5,
  status,
  color = "#c8ff00",
}) {
  const pathRef = useRef(null);
  const [leadingPoint, setLeadingPoint] = useState({ x: 0, y: 50 });
  const [pulsePeak, setPulsePeak] = useState(false);

  const isDead = status === "CHECK ON HIM" || status === "UNKNOWN";
  const displayPath = isDead ? FLATLINE_PATH : ECG_WAVE_PATH;

  // Clamped real BPM
  const currentBpm = isDead ? 0 : Math.min(220, Math.max(45, Math.round(bpm || 80)));

  // Cycle interval in seconds directly tied to track BPM (60 / BPM * 2 for dual-complex path)
  const beatIntervalSec = currentBpm > 0 ? (60 / currentBpm) * 2 : 3;

  // Telemetry status description
  const tempoLabel = isDead
    ? "FLATLINE"
    : currentBpm > 135
      ? "HYPERDRIVE"
      : currentBpm > 105
        ? "ELEVATED"
        : currentBpm > 75
          ? "ACTIVE"
          : "RESTING";

  useEffect(() => {
    const path = pathRef.current;
    if (!path || isDead) return;

    let rafId = 0;
    let startTime = null;

    function animate(timestamp) {
      if (!pathRef.current) return;
      if (!startTime) startTime = timestamp;

      const elapsed = (timestamp - startTime) / 1000;
      const cycleProgress = (elapsed % beatIntervalSec) / beatIntervalSec;

      const pathLength = pathRef.current.getTotalLength();
      if (pathLength > 0) {
        // Draw trailing illuminated segment
        const currentLength = pathLength * cycleProgress;
        pathRef.current.style.strokeDasharray = `${pathLength}`;
        pathRef.current.style.strokeDashoffset = `${pathLength * (1 - cycleProgress)}`;

        // Get coordinates for the leading scan head
        try {
          const pt = pathRef.current.getPointAtLength(currentLength);
          setLeadingPoint({ x: pt.x, y: pt.y });

          // Detect when passing the main QRS contraction spike (sharp peak y < 25)
          setPulsePeak(pt.y < 25);
        } catch {
          // Ignore SVG measurement edge cases
        }
      }

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [currentBpm, isDead, beatIntervalSec, displayPath]);

  return (
    <div className="w-full relative select-none">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between mb-2.5 px-1 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          {/* Heart icon that beats in rhythm */}
          <div className="relative flex items-center justify-center">
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-150 ${pulsePeak && !isDead ? 'scale-125' : 'scale-100'}`}
              viewBox="0 0 24 24"
              fill={isDead ? "#ff3b30" : color}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span
              className={`absolute -inset-1 rounded-full opacity-40 blur-[4px] pointer-events-none transition-all ${pulsePeak && !isDead ? 'scale-150 opacity-80' : 'scale-75 opacity-0'}`}
              style={{ backgroundColor: color }}
            />
          </div>

          <div className="flex items-baseline gap-1.5">
            <span
              className="text-xs font-bold tracking-widest text-text drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            >
              {isDead ? "00" : currentBpm}
            </span>
            <span className="text-[9px] text-muted tracking-wider">BPM</span>
          </div>

          <span
            className="px-2 py-0.5 rounded text-[8px] tracking-wider uppercase font-semibold border transition-colors"
            style={{
              borderColor: `${color}30`,
              backgroundColor: `${color}12`,
              color: isDead ? '#ff3b30' : color,
            }}
          >
            {tempoLabel}
          </span>
        </div>

        {/* Energy & Valence Mini Meters */}
        <div className="flex items-center gap-3 text-[9px] text-muted">
          <div className="flex items-center gap-1">
            <span className="text-muted/70">NRG</span>
            <div className="w-8 h-1.5 bg-surface border border-white/10 rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((energy || 0.5) * 100)}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted/70">VAL</span>
            <div className="w-8 h-1.5 bg-surface border border-white/10 rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-700 bg-white/70"
                style={{
                  width: `${Math.round((valence || 0.5) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SVG Cardiac Waveform Viewport (Oscilloscope HUD) */}
      <div className="w-full h-[4.5rem] relative bg-void/60 border border-white/[0.08] rounded-xl overflow-hidden backdrop-blur-md flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
        {/* Corner HUD Reticle Accents */}
        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-white/20 pointer-events-none" />
        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-white/20 pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-white/20 pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-white/20 pointer-events-none" />

        {/* Voltage Reference Scale (Right Edge) */}
        <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between py-1 text-[7px] font-mono text-muted/40 pointer-events-none select-none z-20">
          <span>+1.0mV</span>
          <span className="opacity-50">0.0</span>
          <span>-1.0mV</span>
        </div>

        {/* Oscilloscope Grid */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Center zero-axis guideline */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/[0.04] pointer-events-none" />

        <svg
          viewBox="0 0 200 100"
          className="w-full h-full relative z-10"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="ekgGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isDead ? "#ff3b30" : color} stopOpacity="0.2" />
              <stop offset="70%" stopColor={isDead ? "#ff3b30" : color} stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Faint static guide baseline */}
          <path
            d={displayPath}
            fill="none"
            stroke={isDead ? "#ff3b30" : color}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-20"
          />

          {/* Dynamic scanning wave */}
          <path
            ref={pathRef}
            d={displayPath}
            fill="none"
            stroke={isDead ? "#ff3b30" : color}
            strokeWidth={pulsePeak ? "2.6" : "1.8"}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: isDead ? "none" : "url(#ekgGlow)",
              transition: "stroke-width 0.1s ease",
            }}
          />

          {/* Glowing Beacon Scan Head Dot */}
          {!isDead && leadingPoint && (
            <>
              <circle
                cx={leadingPoint.x}
                cy={leadingPoint.y}
                r="3.5"
                fill="#ffffff"
                style={{
                  filter: "drop-shadow(0 0 8px " + color + ")",
                }}
              />
              <circle
                cx={leadingPoint.x}
                cy={leadingPoint.y}
                r={pulsePeak ? "10" : "6"}
                fill={color}
                opacity={pulsePeak ? "0.6" : "0.25"}
                className="transition-all duration-100"
              />
            </>
          )}
        </svg>

        {/* Ambient CRT Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_51%)] bg-[size:100%_4px] pointer-events-none opacity-40" />
      </div>
    </div>
  );
}
