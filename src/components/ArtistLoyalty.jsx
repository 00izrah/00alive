export function ArtistLoyalty({ topArtists = [], isLoading }) {
    if (isLoading) {
        return <div className="bg-surface/30 border border-border/50 rounded-xl p-6 h-48 animate-pulse" />;
    }

    if (!topArtists || topArtists.length === 0) {
        return (
            <div className="bg-surface/30 border border-border/50 rounded-xl p-6 mb-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2">
                        <svg
                            className="w-4 h-4 text-text/50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                        </svg>
                        Heavy Rotation
                    </h3>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
                        Last 4 Weeks
                    </span>
                </div>
                <p className="text-muted text-xs font-mono">
                    Aggregating rotation telemetry...
                </p>
            </div>
        );
    }


    return (
        <div className="bg-surface/30 border border-border/50 rounded-xl p-6 mb-8 relative overflow-hidden group hover:border-alive/30 transition-colors">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2">
                    <svg
                        className="w-4 h-4 text-text/50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                    </svg>
                    Heavy Rotation
                </h3>
                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
                    Last 4 Weeks
                </span>
            </div>

            <div className="space-y-4">
                {topArtists.map((artist, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 group/item"
                    >
                        {/* Artist Avatar */}
                        {artist.image ? (
                            <img 
                                src={artist.image} 
                                alt={artist.name} 
                                className="w-8 h-8 rounded-full object-cover border border-border/50 group-hover/item:border-alive/50 transition-colors"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-surface border border-border/50" />
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-mono text-text/90 group-hover/item:text-alive transition-colors truncate">
                                    {idx + 1}. {artist.name}
                                </span>
                                <span className="text-[9px] font-mono text-muted uppercase tracking-wider truncate ml-2">
                                    {artist.genre}
                                </span>
                            </div>

                            {/* Affinity Bar */}
                            <div className="h-[2px] bg-border/50 w-full relative overflow-hidden rounded-full">
                                <div
                                    className="absolute left-0 top-0 h-full bg-alive/70 transition-all duration-1000"
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