import { useState } from 'react';
import { isMuted, toggleMute, playHapticClick } from '../lib/audioSynth';

const REACTION_OPTIONS = [
  { id: 'fire',  emoji: '🔥', label: '',  sound: 'fire' },
  { id: 'skull', emoji: '💀', label: '',  sound: 'skull' },
  { id: 'heart', emoji: '❤️', label: '', sound: 'heart' },
  { id: 'cyber', emoji: '⚡', label: '',  sound: 'cyber' },
  { id: 'sonar', emoji: '🔊', label: '', sound: 'sonar', isVoicePing: true },
];

export function SoundBiteReactions({ onReaction, isLoading }) {
  const [muted, setLocalMuted] = useState(isMuted());
  const [activeButton, setActiveButton] = useState(null);

  const handleMuteToggle = (e) => {
    e.stopPropagation();
    const next = toggleMute();
    setLocalMuted(next);
    if (!next) {
      playHapticClick();
    }
  };

  const handleTrigger = (reaction) => {
    setActiveButton(reaction.id);
    setTimeout(() => setActiveButton(null), 250);

    if (onReaction) {
      onReaction({
        emoji: reaction.emoji,
        soundType: reaction.sound,
        isVoicePing: Boolean(reaction.isVoicePing),
        label: reaction.label,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-4 h-full animate-pulse flex flex-col justify-between">
        <div className="h-3 bg-surface-elevated rounded w-20 mb-2" />
        <div className="h-10 bg-surface-elevated rounded w-full" />
      </div>
    );
  }

  return (
    <div className="glass-panel-interactive rounded-2xl p-4 h-full flex flex-col justify-between relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <p className="text-muted text-[11px] tracking-widest font-mono uppercase font-semibold">
          — soundboard
        </p>
        <button
          onClick={handleMuteToggle}
          title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          className={`px-2.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
            muted
              ? 'border-white/10 text-muted hover:text-text hover:border-white/20 bg-white/[0.02]'
              : 'border-alive/40 text-alive bg-alive/10 hover:bg-alive/20 shadow-[0_0_12px_rgba(200,255,0,0.15)]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: muted ? '#666' : '#c8ff00' }} />
          <span>{muted ? 'Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Tactile Sound Pad Buttons */}
      <div className="grid grid-cols-5 gap-1.5 pt-1 h-full items-center justify-items-center">
        {REACTION_OPTIONS.map((item) => {
          const isActive = activeButton === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTrigger(item)}
              title={`Trigger ${item.sound} sound`}
              className={`group relative w-10 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer outline-none border active:scale-90 ${
                isActive
                  ? 'bg-alive/20 border-alive shadow-[0_0_15px_rgba(200,255,0,0.4)] scale-105'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-alive/40 hover:-translate-y-0.5 shadow-sm'
              }`}
            >
              <span
                className={`text-xl leading-none transition-transform duration-150 group-hover:scale-110 ${
                  isActive ? 'scale-125' : ''
                }`}
              >
                {item.emoji}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer prompt */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[9px] font-mono text-muted relative z-10">
        <span className="text-muted/70">haptic synth</span>
        <span className="text-muted/50">5 fx</span>
      </div>
    </div>
  );
}

