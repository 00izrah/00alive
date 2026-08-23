const colorMap = {
	alive: {
		bg: "bg-alive/10",
		border: "border-alive/30",
		text: "text-alive",
		dot: "bg-alive",
	},
	warn: {
		bg: "bg-warn/10",
		border: "border-warn/30",
		text: "text-warn",
		dot: "bg-warn",
	},
	dead: {
		bg: "bg-dead/10",
		border: "border-dead/30",
		text: "text-dead",
		dot: "bg-dead",
	},
};

export function StatusBadge({ tier, label, color = "alive", genre, isPlaying }) {
	const c = colorMap[color] || colorMap.alive;
	const isLive = tier === "LIVE" || isPlaying;
	const isGhostMode = !isLive && (tier === "QUIET" || tier === "STILL HERE" || tier === "CHECK ON HIM" || tier === "UNKNOWN");

	return (
		<div className="flex flex-wrap gap-2 items-center">
			<div
				className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-700 ${c.bg} ${c.border} ${
					isGhostMode ? "animate-[pulse_3s_ease-in-out_infinite] shadow-[0_0_15px_rgba(255,149,0,0.1)]" : ""
				}`}
			>
				<span className="relative flex h-2 w-2">
					{isLive ? (
						<span
							className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-75`}
						/>
					) : (
						<span
							className={`animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-40`}
						/>
					)}
					<span
						className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`}
					/>
				</span>
				<span
					className={`text-xs font-mono uppercase tracking-widest ${c.text}`}
				>
					{isGhostMode && label === "quiet" ? "Dormant / Quiet" : label}
				</span>
			</div>
			
			{isGhostMode && (
				<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-mono tracking-widest uppercase border border-warn/30 bg-warn/5 text-warn/80">
					<span>💤 probably sleeping</span>
				</div>
			)}

			{genre && genre !== 'unknown' && !isGhostMode && (
				<div title="Current dominant genre" className="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-mono tracking-widest uppercase border border-border/60 text-muted transition-colors hover:border-text/50 hover:text-text cursor-default">
					{genre}
				</div>
			)}
		</div>
	);
}
