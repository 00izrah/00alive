import { useEffect, useRef, useState, useCallback } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { EKG } from './components/EKG';
import { StatusBadge } from './components/StatusBadge';
import { TrackCard } from './components/TrackCard';
import { RecentTracks } from './components/RecentTracks';
import { PingModal } from './components/PingModal';
import { ArtistLoyalty } from './components/ArtistLoyalty';
import { VibeCheck } from './components/VibeCheck';
import { StreakCounter } from './components/StreakCounter';
import { AudioSignature } from './components/AudioSignature';
import { HistoricalCalendar } from './components/HistoricalCalendar';

const fac = new FastAverageColor();

export default function App() {
  const [statusData, setStatusData] = useState(null);
  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(true);
  const [isPingModalOpen, setIsPingModalOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState('...');
  const [ekgColor, setEkgColor] = useState('#c8ff00');

  // Track the last track ID so we only re-fetch comments when the song changes
  const lastTrackIdRef = useRef(null);
  const intervalRef = useRef(null);

  // ── Page title ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!statusData) return;
    const tierText = {
      LIVE:         "yeah he's literally listening right now",
      ALIVE:        "yeah he's good",
      QUIET:        "probably fine",
      'STILL HERE': "still here, just quiet",
      UNKNOWN:      "unclear",
      'CHECK ON HIM': "???",
    };
    document.title = `izrah.live — ${tierText[statusData.tier] || 'loading'}`;
  }, [statusData]);

  // ── Colour extraction from album art ─────────────────────────────────────
  const applyAlbumColor = useCallback((albumArt, energy, valence) => {
    if (!albumArt) return;
    fac.getColorAsync(albumArt)
      .then(color => {
        setEkgColor(color.rgba);
        document.documentElement.style.setProperty(
          '--color-alive',
          `${color.value[0]} ${color.value[1]} ${color.value[2]}`
        );
        if (energy !== undefined && valence !== undefined) {
          const opacity = ((energy + valence) / 2) * 0.1;
          document.documentElement.style.setProperty(
            '--color-mood-bg',
            `rgba(${color.value[0]}, ${color.value[1]}, ${color.value[2]}, ${opacity})`
          );
        }
      })
      .catch(() => {}); // Silently ignore CORS failures on album art
  }, []);

  // ── Fetch witty comment ───────────────────────────────────────────────────
  const fetchComment = useCallback(async (track, tier, energy, valence) => {
    setCommentLoading(true);
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          track:   track.name,
          artist:  track.artist,
          tier,
          energy,
          valence,
        }),
      });
      const data = await res.json();
      setComment(data.comment);
    } catch (err) {
      console.error('Failed to fetch comment:', err);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  // ── Background sync trigger ──────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    try {
      await fetch('/api/trigger-sync', { method: 'POST' });
    } catch {
      // Silently fail
    }
  }, []);

  // ── Fetch status ─────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatusData(data);

      // If snapshot is older than 4 minutes, trigger a background sync
      if (data?.snapshotAge) {
        const ageMinutes = (Date.now() - new Date(data.snapshotAge).getTime()) / 60000;
        if (ageMinutes > 4) {
          triggerSync();
        }
      }

      if (data?.track) {
        if (data.track.id !== lastTrackIdRef.current) {
          lastTrackIdRef.current = data.track.id;
          applyAlbumColor(data.track.albumArt, data.energy, data.valence);
          fetchComment(data.track, data.tier, data.energy, data.valence);
        }
      } else {
        setCommentLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, [applyAlbumColor, fetchComment, triggerSync]);

  // ── Visitor tracking ─────────────────────────────────────────────────────
  const trackVisitor = useCallback(async () => {
    try {
      const res = await fetch('/api/visit');
      if (res.ok) {
        const data = await res.json();
        setVisitorCount(data.todayCount);
      }
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  // ── Polling setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      await fetchStatus();
      if (isMounted) {
        trackVisitor();
      }
    }

    initialize();

    const startPolling = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(fetchStatus, 180000);
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchStatus();
        startPolling();
      }
    };

    if (!document.hidden) startPolling();

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchStatus, trackVisitor]);

  // ── Derived values ────────────────────────────────────────────────────────
  const tierColor = statusData?.color || 'alive';
  const activeEkgColor =
    tierColor === 'alive' ? ekgColor :
    tierColor === 'warn'  ? '#ff9500' :
    '#ff3b30';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-void relative overflow-hidden flex flex-col items-center py-10 selection:bg-alive selection:text-void">

      {/* Background glow — shifts colour with album art */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-25 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: activeEkgColor }}
      />

      <div className="w-full max-w-sm px-5 flex flex-col z-10">

        {/* EKG */}
        <div className="mb-8 opacity-60">
          <EKG
            bpm={statusData?.bpm || 80}
            energy={statusData?.energy || 0.5}
            valence={statusData?.valence || 0.5}
            status={statusData?.tier || 'ALIVE'}
            color={activeEkgColor}
          />
        </div>

        {/* The question */}
        <div className="mb-8">
          <p className="text-muted text-[15px] tracking-[0.3em] font-semibold mb-3">
            — IS IZRAH STILL ALIVE?
          </p>
          <h1 className="font-display text-8xl leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tracking-wider">
            {loading ? '...' : (
              statusData?.tier === 'CHECK ON HIM' || statusData?.tier === 'UNKNOWN'
                ? 'UNCLEAR.'
                : 'YES.'
            )}
          </h1>
        </div>

        {/* Status badge + ping button */}
        {!loading && statusData && (
          <div className="mb-8 flex items-center justify-between border-b border-border/50 pb-6">
            <StatusBadge
              tier={statusData.tier}
              label={statusData.label}
              color={statusData.color}
              genre={statusData.topGenre}
            />
            <button
              onClick={() => setIsPingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-alive/30 bg-alive/5 text-alive text-[10px] font-mono tracking-widest uppercase transition-colors hover:bg-alive/10 hover:border-alive/50 cursor-pointer"
            >
              <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 11.9998H8L9.5 8.99976L11.5 13.9998L13 11.9998H15M12 6.42958C12.4844 5.46436 13.4683 4.72543 14.2187 4.35927C16.1094 3.43671 17.9832 3.91202 19.5355 5.46436C21.4881 7.41698 21.4881 10.5828 19.5355 12.5354L12.7071 19.3639C12.3166 19.7544 11.6834 19.7544 11.2929 19.3639L4.46447 12.5354C2.51184 10.5828 2.51184 7.41698 4.46447 5.46436C6.0168 3.91202 7.89056 3.43671 9.78125 4.35927C10.5317 4.72543 11.5156 5.46436 12 6.42958Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Check On Him
            </button>
          </div>
        )}

        {/* Witty comment */}
        <div className="mb-10 min-h-[4rem] relative">
          <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-border/50 to-transparent" />
          {commentLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-surface rounded w-full animate-pulse" />
              <div className="h-3 bg-surface rounded w-4/5 animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {statusData?.vibe && (
                <span className="text-alive/80 text-[10px] uppercase font-bold tracking-[0.2em]">
                  [{statusData.vibe}]
                </span>
              )}
              <p className="text-text/80 text-[13px] font-mono leading-relaxed pl-1">
                {comment || statusData?.message}
              </p>
            </div>
          )}
        </div>

        {/* Track card */}
        <div className="mb-10">
          <TrackCard
            track={statusData?.track}
            isLoading={loading}
            ekgColor={activeEkgColor}
          />
        </div>

        {/* ─── ACTIVITY & CONSISTENCY ─────────────────────────────────── */}

        {/* Streak + Vibe side-by-side */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <StreakCounter
              streak={statusData?.streak}
              isLoading={loading}
            />
          </div>
          <div className="flex-1 min-w-0">
            <VibeCheck />
          </div>
        </div>

        {/* Historical 30-Day Activity Calendar */}
        <div className="mb-10">
          <HistoricalCalendar
            calendar={statusData?.calendar}
            isLoading={loading}
          />
        </div>

        {/* ─── DEEP DIVE ─────────────────────────────────────────────── */}
        <div className="mb-6 pt-2 border-t border-border/30">
          <p className="text-muted text-[10px] font-mono uppercase tracking-widest mt-4">
            — Deep Dive
          </p>
        </div>

        {/* Artist loyalty */}
        <div className="mb-8">
          <ArtistLoyalty
            topArtists={statusData?.loyalty}
            isLoading={loading}
          />
        </div>

        {/* Recent tracks */}
        <div className="mb-8">
          <RecentTracks
            tracks={statusData?.recentTracks}
            isLoading={loading}
          />
        </div>

        {/* Audio Signature Radar — secondary insight */}
        <div className="mb-8">
          <AudioSignature
            energy={statusData?.energy || 0.5}
            valence={statusData?.valence || 0.5}
            isPlaying={Boolean(statusData?.track?.isPlaying)}
          />
        </div>

        {/* Footer — visitor count + raw API link */}
        <div className="mt-4 pt-6 border-t border-border/30 flex items-center justify-between">
          <p className="text-muted text-[10px] font-mono">
            {visitorCount !== '...' ? `${visitorCount} visits today` : 'reading signals...'}
          </p>
          <a
            href="/api/status"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted text-[10px] font-mono hover:text-text transition-colors"
          >
            /api/status →
          </a>
        </div>

      </div>

      <PingModal isOpen={isPingModalOpen} onClose={() => setIsPingModalOpen(false)} />
    </div>
  );
}
