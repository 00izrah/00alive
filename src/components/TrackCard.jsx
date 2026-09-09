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
      <div className="glass-panel rounded-[1.5rem] p-5 space-y-4 animate-pulse">
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 bg-surface-elevated rounded-2xl border border-white/5" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-4 bg-surface-elevated rounded-full w-3/4" />
            <div className="h-3 bg-surface-elevated rounded-full w-1/2" />
            <div className="h-2 bg-surface-elevated rounded-full w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!track) return null;

  const isGhostMode = !track.isPlaying;
  const activeTimeAgo = track && !track.isPlaying && track.playedAt ? timeAgo(track.playedAt) : "";

  // Spotify live progress calculation
  const spotifyProgressPercent = 
    track.isPlaying && track.progressMs && track.durationMs
      ? Math.min(100, Math.max(0, (track.progressMs / track.durationMs) * 100))
      : 0;

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const spotifyElapsedSec = track?.progressMs ? Math.floor(track.progressMs / 1000) : 0;
  const spotifyDurationSec = track?.durationMs ? Math.floor(track.durationMs / 1000) : 0;

  return (
    <div className={`relative group glass-panel-interactive rounded-[1.5rem] p-5 overflow-hidden select-none transition-all duration-500 ${
      isGhostMode
        ? 'hover:border-white/15'
        : 'border-alive/30 shadow-[0_0_30px_rgba(200,255,0,0.06)] hover:shadow-[0_0_40px_rgba(200,255,0,0.12)]'
    }`}>
      {/* Background ambient chromatic aura */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity duration-700"
        style={{ backgroundColor: ekgColor || '#c8ff00' }}
      />
      {isGhostMode && (
        <div className="absolute inset-0 bg-gradient-to-tr from-warn/5 via-transparent to-transparent opacity-30 animate-[pulse_4s_ease-in-out_infinite] pointer-events-none" />
      )}

      {/* Header status line */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: track.isPlaying ? (ekgColor || '#c8ff00') : '#888888' }} />
          <p className="text-muted text-[10px] uppercase font-semibold tracking-[0.2em]">
            {track.isPlaying ? "NOW LISTENING TO" : "RECENT PLAYBACK"}
          </p>
          {isGhostMode && (
            <span className="px-2 py-0.5 bg-white/[0.04] border border-white/10 text-muted-light text-[8px] font-mono uppercase tracking-widest rounded-full">
              Dormant
            </span>
          )}
          {isPlayingPreview && (
            <span className="px-2 py-0.5 bg-alive/15 border border-alive/40 text-alive text-[8px] font-mono uppercase tracking-widest rounded-full animate-pulse shadow-[0_0_10px_rgba(200,255,0,0.2)]">
              30s Preview
            </span>
          )}
        </div>

        {/* 4-Bar Dancing Equalizer */}
        {track.isPlaying && (
          <div className="flex gap-[3px] h-3.5 items-end px-1" title="Realtime audio transmission">
            <div
              className="w-[2.5px] rounded-full animate-eq-1 shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: ekgColor || '#c8ff00', color: ekgColor || '#c8ff00' }}
            />
            <div
              className="w-[2.5px] rounded-full animate-eq-2 shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: ekgColor || '#c8ff00', color: ekgColor || '#c8ff00' }}
            />
            <div
              className="w-[2.5px] rounded-full animate-eq-3 shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: ekgColor || '#c8ff00', color: ekgColor || '#c8ff00' }}
            />
            <div
              className="w-[2.5px] rounded-full animate-eq-4 shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: ekgColor || '#c8ff00', color: ekgColor || '#c8ff00' }}
            />
          </div>
        )}
      </div>

      {/* Vinyl Micro-Player Section */}
      <div className="flex gap-4 items-center relative z-10">

        {/* Album Jacket + Sliding Rotating Vinyl Disc */}
        <div className="relative shrink-0 flex items-center pr-2">
          {/* Vinyl record disc (slides out & spins when previewing or playing) */}
          <div
            className={`absolute top-0 w-20 h-20 rounded-full border border-white/10 shadow-vinyl flex items-center justify-center transition-transform duration-700 ease-out pointer-events-none ${
              isPlayingPreview
                ? 'translate-x-8 rotate-180 animate-[spin_3s_linear_infinite]'
                : 'translate-x-3 group-hover:translate-x-6'
            }`}
            style={{
              background: 'repeating-radial-gradient(circle, #1c1c1c, #1c1c1c 2px, #0e0e0e 3px, #0e0e0e 5px)',
            }}
          >
            {/* Center vinyl label with album art thumbnail and spindle ring */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 relative shadow-inner">
              <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-void border border-white/60 shadow-sm" />
            </div>
            {/* Glossy light sweep on vinyl */}
            <div className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,transparent_42%,rgba(255,255,255,0.06)_50%,transparent_58%)]" />
          </div>

          {/* Album Cover Art Jacket with Play Button Overlay */}
          <div className="relative z-10 w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-white/15 group/cover bg-surface-elevated">
            <img
              src={track.albumArt}
              alt={track.album}
              className={`w-full h-full object-cover transition-all duration-700 ${
                !track.isPlaying && !isPlayingPreview
                  ? 'grayscale-[0.3] group-hover:grayscale-0'
                  : 'scale-100'
              }`}
            />
            {/* Subtle gloss glare layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/15 pointer-events-none" />

            {/* Play/Pause Micro-Button Overlay */}
            <button
              onClick={handleTogglePreview}
              title={isPlayingPreview ? "Pause 30s preview" : "Play 30s audio preview"}
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-void/80 border border-alive/50 backdrop-blur-md flex items-center justify-center text-alive transition-all duration-300 opacity-90 group-hover/cover:opacity-100 group-hover/cover:scale-110 hover:bg-alive hover:text-void shadow-[0_0_20px_rgba(200,255,0,0.3)] cursor-pointer active:scale-95"
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
        <div className="min-w-0 flex-1 pl-2">
          <a
            href={track?.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block group/link"
          >
            <p className="text-text font-mono text-[15px] font-bold truncate tracking-tight group-hover/link:text-alive transition-colors duration-300 flex items-center gap-1.5">
              <span>{track.name}</span>
              <svg className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 -translate-x-1 group-hover/link:translate-x-0 transition-all text-alive shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </p>
            <p className="text-muted-light text-[12px] truncate mt-0.5 group-hover/link:text-text transition-colors duration-300">
              {track.artist}
            </p>
            {track.album && (
              <p className="text-muted text-[10px] truncate mt-0.5 opacity-60">
                {track.album}
              </p>
            )}
          </a>

          <div className="flex items-center gap-3 mt-2">
            {!track.isPlaying && (
              <span className="text-muted text-[10px] uppercase tracking-wider font-mono">
                {activeTimeAgo}
              </span>
            )}
            {isPlayingPreview && (
              <span className="text-alive text-[10px] font-mono tracking-wider font-semibold">
                {formatSeconds(currentTime)} / {formatSeconds(previewDuration)}
              </span>
            )}
            {!isPlayingPreview && track.isPlaying && track.progressMs && track.durationMs && (
              <span className="text-muted-light text-[10px] font-mono">
                {formatSeconds(spotifyElapsedSec)} / {formatSeconds(spotifyDurationSec)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Audio Preview Progress Bar (when playing preview) */}
      {isPlayingPreview && (
        <div className="mt-4 pt-1">
          <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden relative border border-white/5">
            <div
              className="absolute top-0 bottom-0 left-0 bg-alive rounded-full shadow-[0_0_12px_#c8ff00] transition-all duration-200 ease-linear"
              style={{
                width: `${previewProgress * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Live Spotify Track Progress Bar (when listening on Spotify) */}
      {!isPlayingPreview && track.isPlaying && track.progressMs && track.durationMs && (
        <div className="mt-4 pt-1">
          <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden relative border border-white/5">
            <div
              className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(200,255,0,0.5)]"
              style={{
                width: `${spotifyProgressPercent}%`,
                backgroundColor: ekgColor || '#c8ff00',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}