import { useState } from "react";

export function PingModal({ isOpen, onClose }) {
	const [name, setName] = useState("");
	const [message, setMessage] = useState("");
	const [status, setStatus] = useState("idle"); // idle, loading, success, error

	if (!isOpen) return null;

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name.trim()) return;

		setStatus("loading");
		try {
			const res = await fetch("/api/ping", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, message }),
			});

			if (!res.ok) throw new Error("Failed to send");

			setStatus("success");
			setTimeout(() => {
				onClose();
				setStatus("idle");
				setName("");
				setMessage("");
			}, 2000);
		} catch {
			setStatus("error");
			setTimeout(() => setStatus("idle"), 3000);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
			<div className="w-full max-w-sm bg-surface border border-border/50 rounded-xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<div className="mb-6">
					<h2 className="text-lg font-mono font-bold text-text uppercase tracking-wider mb-2">
						Check on Izrah
					</h2>
					<p className="text-xs text-muted font-mono leading-relaxed">
						Send a direct ping to his phone. Let him know you love
						him.
					</p>
				</div>

				{status === "success" ? (
					<div className="bg-alive/10 border border-alive/20 p-4 rounded-lg text-center flex flex-col items-center justify-center">
						<div className="w-8 h-8 bg-alive/20 rounded-full flex items-center justify-center mb-3">
							<svg
								className="w-5 h-5 text-alive"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<p className="text-alive font-mono text-xs uppercase tracking-widest">
							Sent!
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1">
								Your Name <span className="text-alive">*</span>
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								disabled={status === "loading"}
								className="w-full bg-void border border-border/50 rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-alive/50 transition-colors disabled:opacity-50"
								placeholder="such a darling🙈"
							/>
						</div>

						<div>
							<label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1">
								Message{" "}
								<span className="opacity-50">(Optional)</span>
							</label>
							<textarea
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								disabled={status === "loading"}
								className="w-full bg-void border border-border/50 rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-alive/50 transition-colors h-24 resize-none disabled:opacity-50"
								placeholder="izrah youre so sexy i love you and i want to be like you..."
							/>
						</div>

						<button
							type="submit"
							disabled={status === "loading" || !name.trim()}
							className="w-full mt-2 bg-text text-void hover:bg-alive hover:text-void font-mono font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden flex items-center justify-center"
						>
							{status === "loading" ? (
								<span className="flex items-center gap-2">
									<svg
										className="animate-spin h-4 w-4"
										viewBox="0 0 24 24"
										fill="none"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										></path>
									</svg>
									Sending...
								</span>
							) : status === "error" ? (
								<span>Error! Try again.</span>
							) : (
								<span>Send Ping</span>
							)}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
