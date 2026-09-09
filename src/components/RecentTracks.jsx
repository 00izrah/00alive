export function RecentTracks({ tracks, isLoading }) {
  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-5 mt-8 space-y-3 animate-pulse">
        <div className="h-3 bg-surface-elevated rounded w-28 mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-10 h-10 bg-surface-elevated rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-surface-elevated rounded w-3/5" />
              <div className="h-2.5 bg-surface-elevated rounded w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="glass-panel-interactive rounded-2xl p-5 mt-6 relative select-none">
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted text-[11px] tracking-widest font-mono uppercase font-semibold flex items-center gap-1.5">
          <span>⏮</span>
          <span>Recent History</span>
        </p>
        <span className="text-[9px] font-mono text-muted/60">
          Last {tracks.length} tracks
        </span>
      </div>

      <div className="space-y-1.5">
        {tracks.map((item, idx) => (
          <a
            key={`${item.trackId || idx}-${item.playedAt}`}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 items-center group/track p-2 rounded-xl transition-all hover:bg-white/[0.04] border border-transparent hover:border-white/10"
          >
            {/* Track Index */}
            <span className="text-[10px] font-mono text-muted/50 w-4 text-center group-hover/track:text-alive transition-colors">
              {String(idx + 1).padStart(2, '0')}
            </span>

            {/* Thumbnail */}
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-surface-elevated shadow-sm">
              <img 
                src={item.albumArt} 
                alt="Album art" 
                className="w-full h-full object-cover grayscale-[0.2] group-hover/track:grayscale-0 group-hover/track:scale-105 transition-all duration-300"
              />
            </div>

            {/* Track details */}
            <div className="flex-1 min-w-0">
              <p className="text-text font-mono text-xs font-semibold truncate group-hover/track:text-alive transition-colors">
                {item.track}
              </p>
              <p className="text-muted-light text-[11px] font-mono truncate mt-0.5">
                {item.artist}
              </p>
            </div>

            {/* Slide-in link chevron */}
            <div className="text-muted opacity-0 group-hover/track:opacity-100 -translate-x-1 group-hover/track:translate-x-0 transition-all text-alive shrink-0 pr-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
