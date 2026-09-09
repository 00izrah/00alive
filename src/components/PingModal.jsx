import { useState, useEffect } from "react";
import { AlertIcon, MusicIcon, HourglassIcon, CancelIcon } from "./Icons";

function PingModalContent({ onClose, initialTab = "ping", onRecommendationSubmitted }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'ping' | 'recommend'
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  // Recommendation specific state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Live Spotify search with debounce
  useEffect(() => {
    if (activeTab !== "recommend" || !searchQuery.trim() || selectedTrack) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/spotify-search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, selectedTrack]);

  const visibleSearchResults = activeTab === "recommend" && searchQuery.trim() && !selectedTrack ? searchResults : [];

  // Handle direct message ping
  const handlePingSubmit = async (e) => {
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

  // Handle song recommendation drop
  const handleRecommendSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !selectedTrack) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          track: selectedTrack,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit recommendation");
      const data = await res.json();

      if (onRecommendationSubmitted && data.recommendation) {
        onRecommendationSubmitted(data.recommendation);
      }

      setStatus("success");
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setName("");
        setMessage("");
        setSelectedTrack(null);
        setSearchQuery("");
      }, 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] glass-panel rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden select-none">
        {/* Background ambient corner glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-alive/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.08] transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Segmented Tab Navigation */}
        <div className="flex p-1 bg-surface-elevated/80 border border-white/10 rounded-xl mb-6 relative">
          <button
            onClick={() => { setActiveTab("ping"); setStatus("idle"); }}
            className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "ping"
                ? "bg-alive text-void shadow-[0_0_12px_rgba(200,255,0,0.3)]"
                : "text-muted hover:text-text"
            }`}
          >
            <AlertIcon className="w-3.5 h-3.5" />
            <span>Check In</span>
          </button>
          <button
            onClick={() => { setActiveTab("recommend"); setStatus("idle"); }}
            className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "recommend"
                ? "bg-alive text-void shadow-[0_0_12px_rgba(200,255,0,0.3)]"
                : "text-muted hover:text-text"
            }`}
          >
            <MusicIcon className="w-3.5 h-3.5" />
            <span>Drop Song</span>
          </button>
        </div>

        {/* Status: Success */}
        {status === "success" ? (
          <div className="bg-alive/10 border border-alive/30 p-6 rounded-2xl text-center flex flex-col items-center justify-center my-4 shadow-[0_0_20px_rgba(200,255,0,0.15)]">
            <div className="w-12 h-12 bg-alive/20 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(200,255,0,0.3)]">
              <svg className="w-6 h-6 text-alive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-alive font-mono text-sm font-bold uppercase tracking-widest">
              {activeTab === "ping" ? "Check-In Received!" : "Track Dropped!"}
            </p>
            <p className="text-muted text-[11px] font-mono mt-1.5">
              {activeTab === "ping" ? "Delivered straight to his live radar." : "Broadcasted live to the community mixtape."}
            </p>
          </div>
        ) : activeTab === "ping" ? (
          /* ── TAB 1: PING FORM ── */
          <form onSubmit={handlePingSubmit} className="space-y-4">
            <div>
              <p className="text-xs text-muted-light font-mono leading-relaxed mb-4">
                Send a direct presence ping to his dashboard. Let him know you&apos;re tuned in.
              </p>
              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1.5 font-semibold">
                Your Handle / Name <span className="text-alive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={status === "loading"}
                className="w-full bg-void/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-alive focus:ring-1 focus:ring-alive/30 transition-all disabled:opacity-50 placeholder:text-muted/50 shadow-inner"
                placeholder="e.g. daniel, sam, anonymous"
              />
            </div>

            <div>
              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1.5 font-semibold">
                Telemetry Message <span className="opacity-50 text-[9px]">(Optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "loading"}
                className="w-full bg-void/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-alive focus:ring-1 focus:ring-alive/30 transition-all h-20 resize-none disabled:opacity-50 placeholder:text-muted/50 shadow-inner"
                placeholder="izrah you alive? check in when you see this..."
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !name.trim()}
              className="w-full bg-alive text-void hover:bg-alive/90 font-mono font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(200,255,0,0.25)] hover:shadow-[0_0_25px_rgba(200,255,0,0.4)] active:scale-[0.98]"
            >
              {status === "loading" ? "Broadcasting Ping..." : "Send Live Ping"}
            </button>
          </form>
        ) : (
          /* ── TAB 2: DROP A SONG FORM ── */
          <form onSubmit={handleRecommendSubmit} className="space-y-4">
            <div>
              <p className="text-xs text-muted-light font-mono leading-relaxed mb-3">
                Search any song on Spotify and drop it on his community stream.
              </p>

              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1.5 font-semibold">
                Spotify Track Search <span className="text-alive">*</span>
              </label>

              {!selectedTrack ? (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search song or artist..."
                    className="w-full bg-void/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-alive focus:ring-1 focus:ring-alive/30 transition-all placeholder:text-muted/50 shadow-inner"
                  />
                  {isSearching && (
                    <span className="absolute right-3.5 top-3 text-alive">
                      <HourglassIcon className="w-3.5 h-3.5 animate-spin" />
                    </span>
                  )}

                  {/* Autocomplete dropdown results */}
                  {visibleSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 glass-panel rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-30 divide-y divide-white/[0.06] border border-white/15">
                      {visibleSearchResults.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTrack(t);
                            setSearchResults([]);
                          }}
                          className="flex items-center gap-3 p-2.5 hover:bg-alive/15 cursor-pointer transition-colors"
                        >
                          {t.albumArt && (
                            <img src={t.albumArt} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-text font-mono text-xs font-bold truncate">{t.name}</p>
                            <p className="text-muted text-[11px] truncate">{t.artist}</p>
                          </div>
                          <span className="text-alive text-xs font-mono font-bold px-2 py-0.5 rounded bg-alive/10 border border-alive/20">
                            Select
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected track chip */
                <div className="flex items-center justify-between p-3 bg-alive/10 border border-alive/40 rounded-2xl shadow-[0_0_15px_rgba(200,255,0,0.1)]">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedTrack.albumArt && (
                      <img src={selectedTrack.albumArt} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/20" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-alive font-mono text-xs font-bold truncate">{selectedTrack.name}</p>
                      <p className="text-muted-light text-[11px] truncate">{selectedTrack.artist}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedTrack(null); setSearchQuery(""); }}
                    className="text-muted hover:text-text p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors flex items-center justify-center"
                    title="Change track"
                  >
                    <CancelIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1.5 font-semibold">
                Your Name <span className="text-alive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={status === "loading"}
                className="w-full bg-void/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-alive focus:ring-1 focus:ring-alive/30 transition-all disabled:opacity-50 placeholder:text-muted/50 shadow-inner"
                placeholder="who's dropping this banger?"
              />
            </div>

            <div>
              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1.5 font-semibold">
                Note for Izrah <span className="opacity-50 text-[9px]">(Optional)</span>
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "loading"}
                className="w-full bg-void/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-alive focus:ring-1 focus:ring-alive/30 transition-all disabled:opacity-50 placeholder:text-muted/50 shadow-inner"
                placeholder="listen to this beat drop bro..."
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !name.trim() || !selectedTrack}
              className="w-full bg-alive text-void hover:bg-alive/90 font-mono font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(200,255,0,0.25)] hover:shadow-[0_0_25px_rgba(200,255,0,0.4)] active:scale-[0.98] mt-2"
            >
              {status === "loading" ? "Broadcasting Drop..." : "Drop Recommendation"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function PingModal(props) {
  if (!props.isOpen) return null;
  return <PingModalContent {...props} />;
}
