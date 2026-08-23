import { useState, useEffect, useRef } from 'react';

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h ago`;
}

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

const SOUNDBAR_HEIGHTS = ['60%', '100%', '80%'];

export function TrackCard({ track, isLoading, ekgColor }) {
  const [, setTick] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);

  const audioRef = useRef(null);
  const currentPlayingTrackIdRef = useRef(null);

  // Timeago ticker
  useEffect(() => {
    if (!track || track.isPlaying) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [track]);

  // Clean up audio on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Toggle 30s audio preview
  const handleTogglePreview = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If already playing this track's preview, toggle pause
    if (isPlayingPreview && currentPlayingTrackIdRef.current === track?.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingPreview(false);
      return;
    }

    setAudioLoading(true);

    try {
      // If a previous audio was playing, stop it
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audioUrl = await fetchAudioPreviewUrl(track);

      if (!audioUrl) {
        setAudioLoading(false);
        // If no preview available, open Spotify link
        if (track?.url) window.open(track.url, '_blank');
        return;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      currentPlayingTrackIdRef.current = track?.id;

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setCurrentTime(audio.currentTime);
          setPreviewDuration(audio.duration);
          setPreviewProgress(audio.currentTime / audio.duration);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlayingPreview(false);
        setPreviewProgress(0);
        setCurrentTime(0);
      });

      audio.addEventListener('pause', () => {
        setIsPlayingPreview(false);
      });

      await audio.play();
      setIsPlayingPreview(true);
    } catch (err) {
      console.error('Audio preview play error:', err);
      setIsPlayingPreview(false);
    } finally {
      setAudioLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface/50 border border-border/80 backdrop-blur-md rounded-[1.25rem] p-5 space-y-4 animate-pulse">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-border/50 rounded-xl" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-4 bg-border/50 rounded w-3/4" />
            <div className="h-3 bg-border/50 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!track) return null;

  const isGhostMode = !track.isPlaying;
  const activeTimeAgo = track && !track.isPlaying && track.playedAt ? timeAgo(track.playedAt) : "";


  return (
    <div className={`relative group bg-surface/30 border backdrop-blur-sm rounded-[1.25rem] p-5 overflow-hidden transition-all duration-500 ${
      isGhostMode
        ? 'border-border/60 hover:border-border/90'
        : 'border-alive/30 shadow-[0_0_20px_rgba(200,255,0,0.05)]'
    }`}>
      {/* Ghost Mode subtle breathing background aura */}
      {isGhostMode && (
        <div className="absolute inset-0 bg-gradient-to-tr from-warn/5 via-transparent to-transparent opacity-40 animate-[pulse_4s_ease-in-out_infinite] pointer-events-none" />
      )}

      {/* Subtle hover glow on the card */}
      {(track.isPlaying || isPlayingPreview) && (
        <div className="absolute inset-0 bg-gradient-to-tr from-alive/5 via-transparent to-transparent opacity-100 transition-opacity duration-700 pointer-events-none" />
      )}

      {/* Header status info */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <p className="text-muted text-[10px] uppercase font-semibold tracking-[0.2em] relative z-10">
            {track.isPlaying ? "NOW LISTENING TO" : "that's odd..."}
          </p>
          {isGhostMode && (
            <span className="px-1.5 py-0.2 bg-white/5 border border-white/10 text-muted text-[9px] font-mono uppercase tracking-widest rounded-full">
              Dormant
            </span>
          )}
          {isPlayingPreview && (
            <span className="px-1.5 py-0.2 bg-alive/10 border border-alive/30 text-alive text-[9px] font-mono uppercase tracking-widest rounded-full animate-pulse">
              Previewing 30s
            </span>
          )}
        </div>

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


      {/* Vinyl Micro-Player Section */}
      <div className="flex gap-4 items-center relative z-10">

        {/* Album Jacket + Sliding Rotating Vinyl Disc */}
        <div className="relative shrink-0 flex items-center">
          {/* Vinyl record disc (slides out & spins when previewing or playing) */}
          <div
            className={`absolute top-0 w-20 h-20 rounded-full border border-white/10 shadow-2xl flex items-center justify-center transition-transform duration-700 ease-out pointer-events-none ${
              isPlayingPreview
                ? 'translate-x-6 rotate-180 animate-[spin_3s_linear_infinite]'
                : 'translate-x-2 group-hover:translate-x-4'
            }`}
            style={{
              background: 'repeating-radial-gradient(circle, #1a1a1a, #1a1a1a 2px, #0e0e0e 3px, #0e0e0e 5px)',
            }}
          >
            {/* Center vinyl label with album art thumbnail */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 relative shadow-inner">
              <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-void border border-white/40" />
            </div>
          </div>

          {/* Album Cover Art Jacket with Play Button Overlay */}
          <div className="relative z-10 w-20 h-20 rounded-xl overflow-hidden shadow-2xl border border-white/10 group/cover">
            <img
              src={track.albumArt}
              alt={track.album}
              className={`w-full h-full object-cover transition-all duration-700 ${
                !track.isPlaying && !isPlayingPreview
                  ? 'grayscale-[0.4] group-hover:grayscale-0'
                  : 'rotate-0 scale-100'
              }`}
            />

            {/* Play/Pause Micro-Button Overlay */}
            <button
              onClick={handleTogglePreview}
              title={isPlayingPreview ? "Pause 30s preview" : "Play 30s audio preview"}
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-void/80 border border-alive/40 backdrop-blur-md flex items-center justify-center text-alive transition-all duration-300 opacity-90 group-hover/cover:opacity-100 group-hover/cover:scale-110 hover:bg-alive hover:text-void shadow-[0_0_15px_rgba(200,255,0,0.2)] cursor-pointer"
            >
              {audioLoading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isPlayingPreview ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Track Details & External Link */}
        <div className="min-w-0 flex-1 pl-4">
          <a
            href={track?.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block group/link"
          >
            <p className="text-text font-mono text-[15px] font-bold truncate tracking-tight group-hover/link:text-alive transition-colors duration-300">
              {track.name}
            </p>
            <p className="text-muted text-[12px] truncate mt-0.5 group-hover/link:text-text/80 transition-colors duration-300">
              {track.artist}
            </p>
          </a>

          <div className="flex items-center gap-3 mt-1.5">
            {!track.isPlaying && (
              <span className="text-muted/60 text-[10px] uppercase tracking-wider font-mono">
                {activeTimeAgo}
              </span>
            )}
            {isPlayingPreview && (
              <span className="text-alive text-[10px] font-mono">
                0:{Math.floor(currentTime).toString().padStart(2, '0')} / 0:{Math.floor(previewDuration).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Audio Preview Progress Bar (when playing preview) */}
      {isPlayingPreview && (
        <div className="mt-4 h-[3px] bg-border/40 rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 left-0 bg-alive rounded-full shadow-[0_0_10px_#c8ff00] transition-all duration-200 ease-linear"
            style={{
              width: `${previewProgress * 100}%`,
            }}
          />
        </div>
      )}

      {/* Live Spotify Track Progress Bar (when listening on Spotify) */}
      {!isPlayingPreview && track.isPlaying && track.progressMs && track.durationMs && (
        <div className="mt-5 h-[3px] bg-border/40 rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 left-0 bg-alive rounded-full shadow-[0_0_10px_#c8ff00] transition-all duration-1000 ease-linear"
            style={{
              width: `${(track.progressMs / track.durationMs) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}