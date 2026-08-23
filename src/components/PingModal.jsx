import { useState, useEffect } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-surface border border-border/60 rounded-2xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-5 border-b border-border/50 pb-3">
          <button
            onClick={() => { setActiveTab("ping"); setStatus("idle"); }}
            className={`text-xs font-mono font-bold uppercase tracking-wider pb-1 transition-colors relative cursor-pointer ${
              activeTab === "ping" ? "text-alive" : "text-muted hover:text-text"
            }`}
          >
            🚨 Check In
            {activeTab === "ping" && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-alive" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab("recommend"); setStatus("idle"); }}
            className={`text-xs font-mono font-bold uppercase tracking-wider pb-1 transition-colors relative cursor-pointer ${
              activeTab === "recommend" ? "text-alive" : "text-muted hover:text-text"
            }`}
          >
            🎵 Drop a Song
            {activeTab === "recommend" && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-alive" />
            )}
          </button>
        </div>

        {/* Status: Success */}
        {status === "success" ? (
          <div className="bg-alive/10 border border-alive/20 p-5 rounded-xl text-center flex flex-col items-center justify-center my-4">
            <div className="w-9 h-9 bg-alive/20 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-alive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-alive font-mono text-xs font-bold uppercase tracking-widest">
              {activeTab === "ping" ? "Ping Sent!" : "Track Dropped!"}
            </p>
            <p className="text-muted text-[11px] font-mono mt-1">
              {activeTab === "ping" ? "Delivered straight to his signals." : "Broadcasted live to the community inbox."}
            </p>
          </div>
        ) : activeTab === "ping" ? (
          /* ── TAB 1: PING FORM ── */
          <form onSubmit={handlePingSubmit} className="space-y-4">
            <div>
              <p className="text-xs text-muted font-mono leading-relaxed mb-4">
                Send a direct check-in ping to his phone. Let him know you&apos;re thinking of him.
              </p>
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
                Message <span className="opacity-50">(Optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "loading"}
                className="w-full bg-void border border-border/50 rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-alive/50 transition-colors h-20 resize-none disabled:opacity-50"
                placeholder="izrah you good? check in when you can..."
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !name.trim()}
              className="w-full bg-text text-void hover:bg-alive hover:text-void font-mono font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {status === "loading" ? "Sending..." : "Send Ping"}
            </button>
          </form>
        ) : (
          /* ── TAB 2: DROP A SONG FORM ── */
          <form onSubmit={handleRecommendSubmit} className="space-y-3.5">
            <div>
              <p className="text-xs text-muted font-mono leading-relaxed mb-3">
                Search any song on Spotify and drop it on his live radar.
              </p>

              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1">
                Search Track <span className="text-alive">*</span>
              </label>

              {!selectedTrack ? (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search song or artist name..."
                    className="w-full bg-void border border-border/50 rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-alive/50 transition-colors"
                  />
                  {isSearching && (
                    <span className="absolute right-3 top-2.5 text-xs text-muted animate-spin">
                      ⏳
                    </span>
                  )}

                  {/* Autocomplete dropdown results */}
                  {visibleSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl max-h-48 overflow-y-auto z-20 divide-y divide-border/40">
                      {visibleSearchResults.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTrack(t);
                            setSearchResults([]);
                          }}
                          className="flex items-center gap-2.5 p-2 hover:bg-alive/10 cursor-pointer transition-colors"
                        >
                          {t.albumArt && (
                            <img src={t.albumArt} alt="" className="w-8 h-8 rounded object-cover" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-text font-mono text-xs font-bold truncate">{t.name}</p>
                            <p className="text-muted text-[10px] truncate">{t.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected track chip */
                <div className="flex items-center justify-between p-2.5 bg-alive/10 border border-alive/30 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedTrack.albumArt && (
                      <img src={selectedTrack.albumArt} alt="" className="w-9 h-9 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-alive font-mono text-xs font-bold truncate">{selectedTrack.name}</p>
                      <p className="text-muted text-[10px] truncate">{selectedTrack.artist}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedTrack(null); setSearchQuery(""); }}
                    className="text-muted hover:text-text text-xs px-1 cursor-pointer"
                    title="Change track"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

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
                placeholder="who's dropping this banger?"
              />
            </div>

            <div>
              <label className="block text-[10px] text-muted font-mono uppercase tracking-widest mb-1">
                Note for Izrah <span className="opacity-50">(Optional)</span>
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "loading"}
                className="w-full bg-void border border-border/50 rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-alive/50 transition-colors disabled:opacity-50"
                placeholder="this track is so you bro..."
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !name.trim() || !selectedTrack}
              className="w-full bg-text text-void hover:bg-alive hover:text-void font-mono font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer mt-1"
            >
              {status === "loading" ? "Dropping..." : "Drop Recommendation"}
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
