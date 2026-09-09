const colorMap = {
	alive: {
		bg: "bg-alive/10",
		border: "border-alive/40",
		text: "text-alive",
		dot: "bg-alive",
		glow: "shadow-[0_0_15px_rgba(200,255,0,0.15)]",
	},
	warn: {
		bg: "bg-warn/10",
		border: "border-warn/40",
		text: "text-warn",
		dot: "bg-warn",
		glow: "shadow-[0_0_15px_rgba(255,149,0,0.15)]",
	},
	dead: {
		bg: "bg-dead/10",
		border: "border-dead/40",
		text: "text-dead",
		dot: "bg-dead",
		glow: "shadow-[0_0_15px_rgba(255,59,48,0.15)]",
	},
};

export function StatusBadge({ tier, label, color = "alive", genre, isPlaying }) {
	const c = colorMap[color] || colorMap.alive;
	const isLive = tier === "LIVE" || isPlaying;
	const isGhostMode = !isLive && (tier === "QUIET" || tier === "STILL HERE" || tier === "CHECK ON HIM" || tier === "UNKNOWN");

	return (
		<div className="flex flex-wrap gap-2 items-center">
			{/* Main Status Pill */}
			<div
				className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] ${c.bg} ${c.border} ${c.glow} ${
					isGhostMode ? "animate-[pulse_3s_ease-in-out_infinite]" : ""
				}`}
			>
				<span className="relative flex h-2 w-2">
					{isLive ? (
						<>
							<span
								className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-75`}
							/>
							<span
								className={`animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute -inset-1 rounded-full ${c.dot} opacity-30`}
							/>
						</>
					) : (
						<span
							className={`animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-40`}
						/>
					)}
					<span
						className={`relative inline-flex rounded-full h-2 w-2 ${c.dot} shadow-[0_0_8px_currentColor]`}
					/>
				</span>
				<span
					className={`text-[11px] font-mono font-semibold uppercase tracking-widest ${c.text}`}
				>
					{isGhostMode && label === "quiet" ? "Dormant / Quiet" : label}
				</span>
			</div>
			
			{/* Sleep / Dormant Sub-tag */}
			{isGhostMode && (
				<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase border border-warn/30 bg-warn/5 text-warn/90 backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
					<span>💤 probably sleeping</span>
				</div>
			)}

			{/* Dominant Genre Pill */}
			{genre && genre !== 'unknown' && !isGhostMode && (
				<div
					title="Current dominant genre"
					className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase border border-white/10 bg-white/[0.03] text-muted-light backdrop-blur-sm transition-all hover:border-white/20 hover:text-text cursor-default shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
				>
					<span className="opacity-50 mr-1">#</span>{genre}
				</div>
			)}
		</div>
	);
}
