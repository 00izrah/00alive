import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'izrah_song_drops';
const MAX_RECOMMENDATIONS = 5;

async function fetchAudioPreviewUrl(track) {
  if (track?.previewUrl) return track.previewUrl;
  if (!track?.name || !track?.artist) return null;

  try {
    const query = encodeURIComponent(`${track.artist} ${track.name}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
      return data.results[0].previewUrl;
    }
  } catch {
    // Fallback failed
  }
  return null;
}

export function DropASong({ onOpenRecommendModal, latestRecommendation, isLoading }) {
  const [recommendations, setRecommendations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, MAX_RECOMMENDATIONS);
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);
  const lastHandledRecRef = useRef(null);

  // Fetch recommendations from API on mount
  useEffect(() => {
    fetch('/api/recommend')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRecommendations(prev => {
            const merged = [...data];
            // Merge previously stored items if unique
            for (const item of prev) {
              if (!merged.some(m => m.track?.name === item.track?.name && m.name === item.name)) {
                merged.push(item);
              }
            }
            const finalRecs = merged.slice(0, MAX_RECOMMENDATIONS);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(finalRecs));
            } catch {
              // ignore
            }
            return finalRecs;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Prepend latest realtime recommendation
  useEffect(() => {
    if (!latestRecommendation) return;
    if (lastHandledRecRef.current === latestRecommendation) return;
    lastHandledRecRef.current = latestRecommendation;

    setRecommendations(prev => {
      const filtered = prev.filter(
        r => !(r.track?.name === latestRecommendation.track?.name && r.name === latestRecommendation.name)
      );
      const nextList = [latestRecommendation, ...filtered].slice(0, MAX_RECOMMENDATIONS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      } catch {
        // ignore
      }
      return nextList;
    });

    setCurrentIndex(0);
    setIsPlaying(false);
  }, [latestRecommendation]);

  // Stop audio on slide change or unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentIndex]);

  const currentRec = recommendations[currentIndex];

  const handleTogglePreview = async (e) => {
    e.stopPropagation();
    if (!currentRec?.track) return;

    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setAudioLoading(true);

    try {
      let previewUrl = audioRef.current?.src;
      if (!previewUrl) {
        previewUrl = await fetchAudioPreviewUrl(currentRec.track);
      }

      if (!previewUrl) {
        setAudioLoading(false);
        if (currentRec.track?.url) window.open(currentRec.track.url, '_blank');
        return;
      }

      if (!audioRef.current || audioRef.current.src !== previewUrl) {
        const audio = new Audio(previewUrl);
        audioRef.current = audio;
        audio.addEventListener('ended', () => setIsPlaying(false));
        audio.addEventListener('pause', () => setIsPlaying(false));
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Preview error:', err);
      setIsPlaying(false);
    } finally {
      setAudioLoading(false);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setIsPlaying(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : recommendations.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setIsPlaying(false);
    setCurrentIndex(prev => (prev < recommendations.length - 1 ? prev + 1 : 0));
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-2xl p-4 h-full animate-pulse flex flex-col justify-between">
        <div className="h-3 bg-surface rounded w-20 mb-2" />
        <div className="h-10 bg-surface rounded w-full" />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl p-4 h-full flex flex-col justify-between relative overflow-hidden bg-surface/20 backdrop-blur-sm group">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-alive text-[10px]">🎵</span>
          <p className="text-muted text-xs tracking-widest font-mono uppercase">
            — Community Drops
          </p>
        </div>
        <button
          onClick={onOpenRecommendModal}
          className="px-2.5 py-0.5 rounded-full border border-alive/30 bg-alive/10 hover:bg-alive/20 text-alive text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(200,255,0,0.1)]"
        >
          + Drop Song
        </button>
      </div>

      {/* Content */}
      {recommendations.length > 0 && currentRec ? (
        <div className="pt-1">
          <div className="flex items-center gap-3">
            {/* Thumbnail + preview play button */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-void group/cover">
              {currentRec.track?.albumArt ? (
                <img
                  src={currentRec.track.albumArt}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                  🎧
                </div>
              )}

              <button
                onClick={handleTogglePreview}
                title={isPlaying ? "Pause Preview" : "Play 30s Preview"}
                className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-void/80 border border-alive/40 text-alive flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(200,255,0,0.2)] hover:scale-110"
              >
                {audioLoading ? (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Track metadata */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={currentRec.track?.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text font-mono text-xs font-bold truncate hover:text-alive transition-colors"
                >
                  {currentRec.track?.name}
                </a>
              </div>
              <p className="text-muted text-[11px] truncate">
                {currentRec.track?.artist}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-alive/80 text-[9px] font-mono truncate">
                  suggested by @{currentRec.name}
                </span>
                {currentRec.message && (
                  <span className="text-muted/60 text-[9px] font-mono truncate max-w-[140px]">
                    &quot;{currentRec.message}&quot;
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Carousel footer */}
          <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-border/30 text-[9px] font-mono text-muted">
            <span>
              {currentIndex + 1} of {recommendations.length} (limit 5)
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={handlePrev}
                className="hover:text-text px-1.5 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
                title="Previous recommendation"
              >
                ◀ Prev
              </button>
              <button
                onClick={handleNext}
                className="hover:text-text px-1.5 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
                title="Next recommendation"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={onOpenRecommendModal}
          className="pt-2 pb-1 text-center cursor-pointer group/prompt"
        >
          <p className="text-muted text-[11px] font-mono leading-tight group-hover/prompt:text-text transition-colors">
            No song drops yet.
          </p>
          <p className="text-alive text-[10px] font-mono mt-1 underline underline-offset-2">
            Be the first to drop one →
          </p>
        </div>
      )}
    </div>
  );
}
