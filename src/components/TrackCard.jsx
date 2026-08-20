import { useState, useEffect } from 'react';

function timeAgo(isoString) {
	const diff = Date.now() - new Date(isoString).getTime();
	const mins = Math.floor(diff / 60000);
	const hrs = Math.floor(mins / 60);

	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
	return `${Math.floor(hrs / 24)}d ${hrs % 24}h ago`;
}

const SOUNDBAR_HEIGHTS = ['60%', '100%', '80%'];

export function TrackCard({ track, isLoading, ekgColor }) {
	const [, setTick] = useState(0);

	useEffect(() => {
		if (!track || track.isPlaying) return;
		
		const interval = setInterval(() => {
			setTick(t => t + 1);
		}, 60000);
		
		return () => clearInterval(interval);
	}, [track]);

	if (isLoading) {
		return (
			<div className="bg-surface/50 border border-border/80 backdrop-blur-md rounded-[1.25rem] p-5 space-y-4 animate-pulse">
				<div className="flex gap-4">
					<div className="w-16 h-16 bg-border/50 rounded-xl" />
					<div className="flex-1 space-y-3 pt-1">
						<div className="h-4 bg-border/50 rounded w-3/4" />
						<div className="h-3 bg-border/50 rounded w-1/2" />
					</div>
				</div>
			</div>
		);
	}

	if (!track) return null;

	const activeTimeAgo = track && !track.isPlaying && track.playedAt ? timeAgo(track.playedAt) : "";

	return (
		<a
			href={track?.url || '#'}
			target="_blank"
			rel="noopener noreferrer"
			className="block relative group bg-surface/30 border border-border/60 hover:border-border backdrop-blur-sm rounded-[1.25rem] p-5 overflow-hidden transition-all duration-500"
		>
			{/* subtle hover glow on the card */}
			{track.isPlaying && (
				<div className="absolute inset-0 bg-gradient-to-tr from-alive/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
			)}
			
			<div className="flex justify-between items-center mb-4">
				<p className="text-muted text-[10px] uppercase font-semibold tracking-[0.2em] relative z-10">
					{track.isPlaying ? "— NOW LISTENING TO" : "— LAST PLAYED"}
				</p>
				{track.isPlaying && (
					<div className="flex gap-[3px] h-3 items-end">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="w-[3px] animate-[pulse_1s_ease-in-out_infinite]"
								style={{
									backgroundColor: ekgColor || 'rgb(var(--color-alive))',
									height: SOUNDBAR_HEIGHTS[i],
									animationDelay: `${i * 0.15}s`,
								}}
							/>
						))}
					</div>
				)}
			</div>

			<div className="flex gap-4 items-center relative z-10">
				{track.albumArt && (
					<div className="relative shrink-0">
						<img
							src={track.albumArt}
							alt={track.album}
							className={`w-16 h-16 rounded-xl object-cover shadow-xl transition-all duration-700 ${!track.isPlaying ? 'grayscale-[0.5] group-hover:grayscale-0' : 'rotate-0 group-hover:rotate-2 group-hover:scale-105'}`}
						/>
						{track.isPlaying && (
							<div className="absolute inset-0 rounded-xl shadow-[0_0_20px_rgba(200,255,0,0.15)] pointer-events-none" />
						)}
					</div>
				)}
				<div className="min-w-0 flex-1">
					<p className="text-text font-mono text-[15px] font-bold truncate tracking-tight group-hover:text-white transition-colors duration-300">
						{track.name}
					</p>
					<p className="text-muted text-[12px] truncate mt-0.5 group-hover:text-text/80 transition-colors duration-300">
						{track.artist}
					</p>
					{!track.isPlaying && (
						<p className="text-muted/60 text-[10px] mt-1.5 uppercase tracking-wider font-mono">
							{activeTimeAgo}
						</p>
					)}
				</div>
			</div>

			{/* Progress bar for currently playing */}
			{track.isPlaying && track.progressMs && track.durationMs && (
				<div className="mt-5 h-[3px] bg-border/40 rounded-full overflow-hidden relative">
					<div
						className="absolute top-0 bottom-0 left-0 bg-alive rounded-full shadow-[0_0_10px_#c8ff00] transition-all duration-1000 ease-linear"
						style={{
							width: `${(track.progressMs / track.durationMs) * 100}%`,
						}}
					/>
				</div>
			)}
		</a>
	);
}