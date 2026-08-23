// Native Web Audio Synthesizer for 00ALIVE Sound-Bite Reactions & Voice Pings
let audioCtx = null;
let masterGain = null;
let isAudioMuted = false;

// Initialize or resume AudioContext safely on user gesture
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(isAudioMuted ? 0 : 0.2, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function isMuted() {
  return isAudioMuted;
}

export function setMuted(muted) {
  isAudioMuted = muted;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(muted ? 0 : 0.2, audioCtx.currentTime);
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('00alive_audio_muted', muted ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }
}

export function toggleMute() {
  const next = !isAudioMuted;
  setMuted(next);
  return next;
}

// Initialize mute preference from storage
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('00alive_audio_muted');
    if (saved === 'true') {
      isAudioMuted = true;
    }
  } catch {
    // Ignore
  }
}

// ── 1. Fire / Heat Reaction (Sparkling arpeggio) ───────────────────────────
export function playFireSynth() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = now + idx * 0.045;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteStart);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteStart + 0.08);

    gain.gain.setValueAtTime(0.001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(noteStart);
    osc.stop(noteStart + 0.13);
  });
}

// ── 2. Skull / Dead Reaction (Sub-bass drop) ──────────────────────────────
export function playSkullDrop() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.3);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.36);
}

// ── 3. Heartbeat Reaction (Dual resonant kick) ─────────────────────────────
export function playHeartbeatPulse() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;

  // Lub
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(75, now);
  osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  gain1.gain.setValueAtTime(0.22, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.14);

  // Dub (0.13s later)
  const dubTime = now + 0.13;
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(65, dubTime);
  osc2.frequency.exponentialRampToValueAtTime(35, dubTime + 0.14);
  gain2.gain.setValueAtTime(0.25, dubTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.15);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(dubTime);
  osc2.stop(dubTime + 0.16);
}

// ── 4. Cyber Zap Reaction (High-tech FM chirp) ────────────────────────────
export function playCyberZap() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();

  mod.frequency.setValueAtTime(300, now);
  mod.frequency.linearRampToValueAtTime(80, now + 0.12);
  modGain.gain.setValueAtTime(250, now);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);

  mod.connect(modGain);
  modGain.connect(osc.frequency);

  // Lowpass filter to keep it pleasant and crisp
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  mod.start(now);
  osc.start(now);
  mod.stop(now + 0.15);
  osc.stop(now + 0.15);
}

// ── 5. Sonar Radar Voice Ping (Resonant bell / sonar ping) ─────────────────
export function playSonarPing() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const gain = ctx.createGain();
  const harmonicGain = ctx.createGain();

  // Fundamental frequency at 1046.5Hz (C6)
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046.5, now);
  osc.frequency.exponentialRampToValueAtTime(1038, now + 0.8);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.24, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  // Harmonic overtone
  oscHarmonic.type = 'sine';
  oscHarmonic.frequency.setValueAtTime(2093, now);
  harmonicGain.gain.setValueAtTime(0.08, now);
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  osc.connect(gain);
  gain.connect(masterGain);

  oscHarmonic.connect(harmonicGain);
  harmonicGain.connect(masterGain);

  osc.start(now);
  oscHarmonic.start(now);
  osc.stop(now + 0.95);
  oscHarmonic.stop(now + 0.45);
}

// ── 6. UI Haptic Click / Blip ──────────────────────────────────────────────
export function playHapticClick() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.02);

  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.025);
}

// Map emoji/type to synth function
export function playReactionSound(type) {
  switch (type) {
    case 'fire':
    case '🔥':
      playFireSynth();
      break;
    case 'skull':
    case '💀':
      playSkullDrop();
      break;
    case 'heart':
    case '❤️':
      playHeartbeatPulse();
      break;
    case 'cyber':
    case '⚡':
      playCyberZap();
      break;
    case 'sonar':
    case 'radar':
    case '🔊':
      playSonarPing();
      break;
    default:
      playHapticClick();
      break;
  }
}
