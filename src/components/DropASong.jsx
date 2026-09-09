import { useState, useEffect, useRef } from 'react';
import { MusicIcon, AddIcon, HeadphonesIcon, ArrowLeftIcon, ArrowRightIcon } from './Icons';

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

  // Fetch recommendations from API on mount & on tab focus
  useEffect(() => {
    const loadRecs = () => {
      fetch('/api/recommend')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setRecommendations(data.slice(0, MAX_RECOMMENDATIONS));
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, MAX_RECOMMENDATIONS)));
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});
    };

    loadRecs();

    const handleVisibility = () => {
      if (!document.hidden) {
        loadRecs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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
      <div className="glass-panel rounded-2xl p-4 h-full animate-pulse flex flex-col justify-between">
        <div className="h-3 bg-surface-elevated rounded w-28 mb-2" />
        <div className="h-12 bg-surface-elevated rounded w-full" />
      </div>
    );
  }

  return (
    <div className="glass-panel-interactive rounded-2xl p-4 h-full flex flex-col justify-between relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-1.5">
          <MusicIcon className="w-3.5 h-3.5 text-alive" />
          <p className="text-muted text-[11px] tracking-widest font-mono uppercase font-semibold">
            — community drops
          </p>
        </div>
        <button
          onClick={onOpenRecommendModal}
          className="px-3 py-1 rounded-full border border-alive/40 bg-alive/10 hover:bg-alive/20 text-alive text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(200,255,0,0.15)] active:scale-95 flex items-center gap-1"
        >
          <AddIcon className="w-3 h-3 text-alive" />
          <span>Drop Song</span>
        </button>
      </div>

      {/* Content */}
      {recommendations.length > 0 && currentRec ? (
        <div className="pt-0.5 relative z-10">
          <div className="flex items-center gap-3">
            {/* Thumbnail + preview play button */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-surface-elevated group/cover shadow-md">
              {currentRec.track?.albumArt ? (
                <img
                  src={currentRec.track.albumArt}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">
                  <HeadphonesIcon className="w-6 h-6 text-muted/50" />
                </div>
              )}
              {/* Gloss overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />

              <button
                onClick={handleTogglePreview}
                title={isPlaying ? "Pause Preview" : "Play 30s Preview"}
                className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-void/80 border border-alive/50 text-alive flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(200,255,0,0.3)] hover:scale-110 hover:bg-alive hover:text-void"
              >
                {audioLoading ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
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
                  className="text-text font-mono text-[13px] font-bold truncate hover:text-alive transition-colors flex items-center gap-1"
                >
                  <span className="truncate">{currentRec.track?.name}</span>
                  <svg className="w-3 h-3 opacity-60 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <p className="text-muted-light text-[11px] truncate mt-0.5">
                {currentRec.track?.artist}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-1.5 py-0.2 rounded bg-white/[0.04] text-alive/90 text-[9px] font-mono border border-alive/20 truncate">
                  @{currentRec.name}
                </span>
                {currentRec.message && (
                  <span className="text-muted text-[9px] font-mono truncate italic opacity-80 max-w-[140px]">
                    &quot;{currentRec.message}&quot;
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Carousel footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.06] text-[9px] font-mono text-muted">
            {/* Animated pagination dots */}
            <div className="flex items-center gap-1.5">
              {recommendations.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'w-4 bg-alive shadow-[0_0_8px_#c8ff00]'
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
              <span className="ml-1 text-muted/60 text-[8px]">
                {currentIndex + 1}/{recommendations.length}
              </span>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={handlePrev}
                className="hover:text-text px-2 py-1 rounded-md hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-colors cursor-pointer flex items-center justify-center"
                title="Previous drop"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                className="hover:text-text px-2 py-1 rounded-md hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-colors cursor-pointer flex items-center justify-center"
                title="Next drop"
              >
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={onOpenRecommendModal}
          className="py-4 text-center cursor-pointer group/prompt rounded-xl hover:bg-white/[0.02] transition-colors"
        >
          <p className="text-muted-light text-[11px] font-mono leading-tight group-hover/prompt:text-text transition-colors">
            No song drops yet in the feed.
          </p>
          <p className="text-alive text-[10px] font-mono mt-1 underline underline-offset-4 flex items-center justify-center gap-1">
            <span>Drop the first track</span>
            <ArrowRightIcon className="w-3 h-3" />
          </p>
        </div>
      )}
    </div>
  );
}
