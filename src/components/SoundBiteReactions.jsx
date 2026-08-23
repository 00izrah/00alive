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
      <div className="border border-border rounded-2xl p-4 h-full animate-pulse flex flex-col justify-between">
        <div className="h-3 bg-surface rounded w-20 mb-2" />
        <div className="h-10 bg-surface rounded w-full" />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl p-4 h-full flex flex-col justify-between relative overflow-hidden bg-surface/20 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted text-xs tracking-widest font-mono">
          valid?
        </p>
        <button
          onClick={handleMuteToggle}
          title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          className={`px-1 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
            muted
              ? 'border-border text-muted hover:text-text hover:border-border/80 bg-void/50'
              : 'border-alive/40 text-alive bg-alive/10 hover:bg-alive/20 shadow-[0_0_10px_rgba(200,255,0,0.1)]'
          }`}
        >
          <span>{muted ? '🔇 Muted' : '🔊 Sound On'}</span>
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2 pt-1 h-full items-center justify-items-center">
        {REACTION_OPTIONS.map((item) => {
          const isActive = activeButton === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTrigger(item)}
              title="React with sound effect"
              className="group relative flex items-center justify-center p-2 transition-all duration-200 cursor-pointer bg-transparent border-none outline-none select-none hover:-translate-y-1 active:scale-90"
            >
              <span
                className={`text-3xl leading-none transition-all duration-200 group-hover:scale-125 filter drop-shadow-sm ${
                  isActive
                    ? 'scale-125 drop-shadow-[0_0_12px_rgba(200,255,0,0.8)]'
                    : 'opacity-85 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(200,255,0,0.4)]'
                }`}
              >
                {item.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

