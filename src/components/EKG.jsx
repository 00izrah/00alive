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
    <div className="w-full relative">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isDead
                ? "bg-dead opacity-60"
                : pulsePeak
                  ? "scale-150 shadow-[0_0_10px_#c8ff00]"
                  : "scale-100"
            }`}
            style={{ backgroundColor: isDead ? "#ff3b30" : color }}
          />
          <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-text">
            {isDead ? "00" : currentBpm} <span className="text-muted font-normal">BPM</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted/70">
            [RHYTHM: <span style={{ color: isDead ? "#ff3b30" : color }}>{tempoLabel}</span>]
          </span>
          <span className="text-[9px] font-mono text-muted/50 hidden sm:inline">
            E:{Math.round((energy || 0.5) * 100)}% V:{Math.round((valence || 0.5) * 100)}%
          </span>
        </div>
      </div>

      {/* SVG Cardiac Waveform Viewport */}
      <div className="w-full h-16 relative bg-void/40 border border-border/40 rounded-xl overflow-hidden backdrop-blur-xs flex items-center justify-center">
        {/* Subtle background oscilloscope grid lines */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <svg
          viewBox="0 0 200 100"
          className="w-full h-full relative z-10"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="ekgGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Faint static guide baseline */}
          <path
            d={displayPath}
            fill="none"
            stroke={isDead ? "#ff3b30" : color}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-15"
          />

          {/* Dynamic scanning wave */}
          <path
            ref={pathRef}
            d={displayPath}
            fill="none"
            stroke={isDead ? "#ff3b30" : color}
            strokeWidth={pulsePeak ? "2.5" : "1.8"}
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
                  filter: "drop-shadow(0 0 6px " + color + ")",
                }}
              />
              <circle
                cx={leadingPoint.x}
                cy={leadingPoint.y}
                r={pulsePeak ? "9" : "6"}
                fill={color}
                opacity={pulsePeak ? "0.6" : "0.3"}
                className="transition-all duration-100"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
