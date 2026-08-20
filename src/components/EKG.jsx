import { useEffect, useRef } from "react";

const BEAT_PATH =
	"M0,50 C10,50 15,10 25,50 C35,90 40,50 50,50 C60,50 65,10 75,50 C85,90 90,50 100,50 C110,50 115,10 125,50 C135,90 140,50 150,50 C160,50 165,10 175,50 C185,90 190,50 200,50";
const MELLOW_PATH =
	"M0,50 C25,40 25,60 50,50 C75,40 75,60 100,50 C125,40 125,60 150,50 C175,40 175,60 200,50";
const ERRATIC_PATH =
	"M0,50 C10,-10 15,110 25,50 C35,-10 40,110 50,50 C60,-10 65,110 75,50 C85,-10 90,110 100,50 C110,-10 115,110 125,50 C135,-10 140,110 150,50 C160,-10 165,110 175,50 C185,-10 190,110 200,50";
const FLAT_PATH = "M0,50 C50,50 100,50 150,50 C175,50 190,50 200,50";

export function EKG({
	bpm = 80,
	energy = 0.5,
	valence = 0.5,
	status,
	color = "#c8ff00",
}) {
	const pathRef = useRef(null);

	const isDead = status === "CHECK ON HIM" || status === "UNKNOWN";

	let displayPath = BEAT_PATH;
	let strokeW = "1.5";
	let isMellow = false;

	if (isDead) {
		displayPath = FLAT_PATH;
	} else if (energy < 0.45) {
		displayPath = MELLOW_PATH;
		strokeW = "2.5";
		isMellow = true;
	} else if (energy >= 0.6 && valence < 0.4) {
		displayPath = ERRATIC_PATH;
		strokeW = "2.0";
	}

	const duration = (60 / Math.max(bpm, 40)) * (isMellow ? 1.5 : 1);

	useEffect(() => {
		const path = pathRef.current;
		if (!path) return;

		let rafId = 0;
		let startTime = null;

		if (isDead) {
			path.style.strokeDashoffset = "0";
			path.style.strokeDasharray = "none";
			return;
		}

		function step(timestamp) {
			if (!pathRef.current) return;
			if (!startTime) startTime = timestamp;
			const elapsed = timestamp - startTime;
			const cycleMs = duration * 1000;
			const progress = (elapsed % cycleMs) / cycleMs;

			const length = pathRef.current.getTotalLength();
			if (length > 0) {
				pathRef.current.style.strokeDasharray = `${length}`;
				pathRef.current.style.strokeDashoffset = `${length * (1 - progress)}`;
			}

			rafId = requestAnimationFrame(step);
		}

		const t = setTimeout(() => {
			if (!pathRef.current) return;
			const length = pathRef.current.getTotalLength();
			if (!length) return;

			pathRef.current.style.strokeDasharray = `${length}`;
			pathRef.current.style.strokeDashoffset = `${length}`;
			rafId = requestAnimationFrame(step);
		}, 50);

		return () => {
			clearTimeout(t);
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [bpm, isDead, duration, displayPath]);

	return (
		<div className="w-full overflow-hidden" style={{ height: "60px" }}>
			<svg
				viewBox="0 0 200 100"
				className="w-full h-full"
				preserveAspectRatio="none"
			>
				<defs>
					<filter
						id="glow"
						x="-50%"
						y="-50%"
						width="200%"
						height="200%"
					>
						<feGaussianBlur stdDeviation="3" result="coloredBlur" />
						<feMerge>
							<feMergeNode in="coloredBlur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				{energy > 0.7 && !isDead && (
					<path
						d={displayPath}
						fill="none"
						stroke={color}
						strokeWidth="4"
						strokeLinecap="round"
						strokeLinejoin="round"
						style={{
							opacity: 0.15,
							filter: "blur(2px)",
							transition: "d 0.5s ease-in-out",
						}}
					/>
				)}

				<path
					ref={pathRef}
					d={displayPath}
					fill="none"
					stroke={isDead ? "#ff3b30" : color}
					strokeWidth={strokeW}
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{
						opacity: isDead ? 0.4 : 0.9,
						filter: isMellow && !isDead ? `url(#glow)` : "none",
						transition:
							"d 0.5s ease-in-out, stroke 0.3s ease, stroke-width 0.5s ease, opacity 0.3s ease",
					}}
				/>
			</svg>
		</div>
	);
}
