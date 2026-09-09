import { FireIcon, RadioIcon, MusicIcon } from './Icons';

export function ArtistLoyalty({ topArtists = [], isLoading }) {
    if (isLoading) {
        return <div className="glass-panel rounded-2xl p-5 h-48 animate-pulse" />;
    }

    if (!topArtists || topArtists.length === 0) {
        return (
            <div className="glass-panel rounded-2xl p-5 mb-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2">
                        <FireIcon className="w-3.5 h-3.5 text-alive" />
                        Heavy Rotation
                    </h3>
                    <span className="text-[9px] font-mono text-muted uppercase tracking-widest">
                        Last 4 Weeks
                    </span>
                </div>
                <p className="text-muted text-xs font-mono">
                    Aggregating rotation telemetry...
                </p>
            </div>
        );
    }

    const rankColors = [
        "text-alive border-alive/40 bg-alive/10 shadow-[0_0_8px_rgba(200,255,0,0.2)]",
        "text-neutral-200 border-white/30 bg-white/10",
        "text-warn border-warn/30 bg-warn/10",
        "text-muted border-white/10 bg-white/[0.02]",
        "text-muted border-white/10 bg-white/[0.02]",
    ];

    return (
        <div className="glass-panel-interactive rounded-2xl p-5 mb-8 relative overflow-hidden select-none">
            <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2">
                    <RadioIcon className="w-3.5 h-3.5 text-alive" />
                    <span>Heavy Rotation</span>
                </h3>
                <span className="text-[9px] font-mono text-muted-light uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.02]">
                    4-Week Telemetry
                </span>
            </div>

            <div className="space-y-4 relative z-10">
                {topArtists.map((artist, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 group/item p-1 -mx-1 rounded-xl transition-colors hover:bg-white/[0.03]"
                    >
                        {/* Rank Badge */}
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${rankColors[idx] || rankColors[3]}`}>
                            {idx + 1}
                        </div>

                        {/* Artist Avatar */}
                        {artist.image ? (
                            <img 
                                src={artist.image} 
                                alt={artist.name} 
                                className="w-9 h-9 rounded-full object-cover border border-white/15 group-hover/item:border-alive/60 group-hover/item:scale-105 transition-all shadow-sm"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-muted">
                                <MusicIcon className="w-4 h-4 text-muted/60" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                                <span className="text-xs font-mono font-semibold text-text/90 group-hover/item:text-alive transition-colors truncate">
                                    {artist.name}
                                </span>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                    {artist.genre && (
                                        <span className="text-[9px] font-mono text-muted uppercase tracking-wider truncate hidden sm:inline opacity-75">
                                            {artist.genre}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-mono text-alive font-bold">
                                        {artist.affinity}%
                                    </span>
                                </div>
                            </div>

                            {/* Affinity Bar */}
                            <div className="h-1.5 bg-surface-elevated w-full relative overflow-hidden rounded-full border border-white/5">
                                <div
                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-alive/70 to-alive rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(200,255,0,0.3)]"
                                    style={{
                                        width: `${artist.affinity}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}