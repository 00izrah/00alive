import { useEffect, useRef, useState, useCallback } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { supabase } from './lib/supabase';
import { playReactionSound } from './lib/audioSynth';
import { EKG } from './components/EKG';
import { StatusBadge } from './components/StatusBadge';
import { TrackCard } from './components/TrackCard';
import { RecentTracks } from './components/RecentTracks';
import { PingModal } from './components/PingModal';
import { PingToast } from './components/PingToast';
import { ArtistLoyalty } from './components/ArtistLoyalty';
import { SoundBiteReactions } from './components/SoundBiteReactions';
import { FloatingReactions } from './components/FloatingReactions';
import { DropASong } from './components/DropASong';
import { GroovePet } from './components/GroovePet';

const fac = new FastAverageColor();


export default function App() {
  const [statusData, setStatusData] = useState(null);
  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(true);
  const [isPingModalOpen, setIsPingModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('ping');
  const [latestRecommendation, setLatestRecommendation] = useState(null);
  const [activePing, setActivePing] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [visitorCount, setVisitorCount] = useState('...');
  const [ekgColor, setEkgColor] = useState('#c8ff00');



  // Track the last track ID so we only re-fetch comments when the song changes
  const lastTrackIdRef = useRef(null);
  const lastSyncTriggerRef = useRef(0);



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
  const fetchComment = useCallback(async (track, tier, energy, valence, bpm) => {
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
          bpm,
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

      // If snapshot is older than 30 seconds, trigger a background sync (throttled to 30s)
      if (data?.snapshotAge) {
        const ageSec = (Date.now() - new Date(data.snapshotAge).getTime()) / 1000;
        const timeSinceLastTrigger = Date.now() - lastSyncTriggerRef.current;
        if (ageSec > 30 && timeSinceLastTrigger > 30000) {
          lastSyncTriggerRef.current = Date.now();
          triggerSync();
        }
      }

      if (data?.track) {
        if (data.track.id !== lastTrackIdRef.current) {
          lastTrackIdRef.current = data.track.id;
          applyAlbumColor(data.track.albumArt, data.energy, data.valence);
          fetchComment(data.track, data.tier, data.energy, data.valence, data.bpm);
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

  // ── Floating Sound-Bite Reactions ───────────────────────────────────────
  const triggerFloatingReaction = useCallback((reactionData, isRemote = false) => {
    const reactionId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReaction = {
      id: reactionId,
      emoji: reactionData.emoji || '🔥',
      soundType: reactionData.soundType || 'fire',
      isVoicePing: Boolean(reactionData.isVoicePing),
      label: reactionData.label || null,
      x: reactionData.x ?? (20 + Math.random() * 60),
      driftX: (Math.random() - 0.5) * 80,
      rot: (Math.random() - 0.5) * 40,
      timestamp: Date.now(),
    };

    setReactions((prev) => [...prev.slice(-15), newReaction]);
    playReactionSound(reactionData.soundType || reactionData.emoji);

    // Broadcast if locally triggered
    if (!isRemote && supabase) {
      const channel = supabase.channel('izrah-live');
      channel.send({
        type: 'broadcast',
        event: 'reaction_sent',
        payload: {
          emoji: newReaction.emoji,
          soundType: newReaction.soundType,
          isVoicePing: newReaction.isVoicePing,
          label: newReaction.label,
          x: newReaction.x,
        },
      }).catch(() => {});
    }
  }, []);

  // ── Realtime Subscriptions & Lifecycle ──────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // Initial load
    const initialize = async () => {
      await fetchStatus();
      if (isMounted) {
        trackVisitor();
      }
    };
    initialize();

    // Periodic check every 30s when tab is visible
    const liveInterval = setInterval(() => {
      if (!document.hidden && isMounted) {
        fetchStatus();
      }
    }, 30000);

    // Re-verify immediately on tab visibility change
    const handleVisibility = () => {
      if (!document.hidden && isMounted) {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);


    // Supabase Realtime Channel Subscription
    let channel = null;
    if (supabase) {
      channel = supabase.channel('izrah-live')
        // Database changes on spotify_snapshot
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'spotify_snapshot' },
          (payload) => {
            console.log('[Realtime] Spotify snapshot changed:', payload);
            if (isMounted) fetchStatus();
          }
        )
        // Database changes on comment_cache
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comment_cache' },
          (payload) => {
            console.log('[Realtime] Comment cache changed:', payload);
            if (isMounted && payload.new?.comments?.length) {
              const comments = payload.new.comments;
              const pick = comments[Math.floor(Math.random() * comments.length)];
              setComment(pick);
              setCommentLoading(false);
            }
          }
        )
        // Database changes on pings
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pings' },
          (payload) => {
            console.log('[Realtime] Ping received via DB insert:', payload);
            if (isMounted && payload.new) {
              setActivePing({
                name: payload.new.name,
                message: payload.new.message,
                timestamp: payload.new.created_at || new Date().toISOString(),
              });
              triggerFloatingReaction({
                emoji: '🔊',
                soundType: 'sonar',
                isVoicePing: true,
                label: `${payload.new.name} pinged`,
              }, true);
            }
          }
        )
        // Database changes on recommendations
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'recommendations' },
          (payload) => {
            console.log('[Realtime] Recommendation inserted via DB:', payload);
            if (isMounted && payload.new) {
              setLatestRecommendation(payload.new);
              triggerFloatingReaction({
                emoji: '🎵',
                soundType: 'cyber',
                isVoicePing: false,
                label: `${payload.new.name || 'someone'} dropped a song`,
              }, true);
            }
          }
        )
        // Database changes on streaks

        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'streaks' },
          () => {
            if (isMounted) fetchStatus();
          }
        )
        // Database changes on listening_calendar
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'listening_calendar' },
          () => {
            if (isMounted) fetchStatus();
          }
        )
        // Realtime Broadcast: status_updated
        .on(
          'broadcast',
          { event: 'status_updated' },
          (payload) => {
            console.log('[Realtime Broadcast] Status updated:', payload);
            if (isMounted) fetchStatus();
          }
        )
        // Realtime Broadcast: comment_updated
        .on(
          'broadcast',
          { event: 'comment_updated' },
          ({ payload }) => {
            console.log('[Realtime Broadcast] Comment updated:', payload);
            if (isMounted && payload?.comment) {
              setComment(payload.comment);
              setCommentLoading(false);
            }
          }
        )
        // Realtime Broadcast: ping_received
        .on(
          'broadcast',
          { event: 'ping_received' },
          ({ payload }) => {
            console.log('[Realtime Broadcast] Ping received:', payload);
            if (isMounted && payload) {
              setActivePing(payload);
              triggerFloatingReaction({
                emoji: '🔊',
                soundType: 'sonar',
                isVoicePing: true,
                label: `${payload.name || 'someone'} pinged`,
              }, true);
            }
          }
        )
        // Realtime Broadcast: reaction_sent
        .on(
          'broadcast',
          { event: 'reaction_sent' },
          ({ payload }) => {
            console.log('[Realtime Broadcast] Reaction received:', payload);
            if (isMounted && payload) {
              triggerFloatingReaction(payload, true);
            }
          }
        )
        // Realtime Broadcast: recommendation_added
        .on(
          'broadcast',
          { event: 'recommendation_added' },
          ({ payload }) => {
            console.log('[Realtime Broadcast] Recommendation received:', payload);
            if (isMounted && payload) {
              setLatestRecommendation(payload);
              triggerFloatingReaction({
                emoji: '🎵',
                soundType: 'cyber',
                isVoicePing: false,
                label: `${payload.name || 'someone'} dropped a song`,
              }, true);
            }
          }
        )
        .subscribe((status) => {

          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Subscribed to izrah-live channel');
          }
        });
    }

    return () => {
      isMounted = false;
      clearInterval(liveInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };

  }, [fetchStatus, trackVisitor, triggerFloatingReaction]);



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
              isPlaying={Boolean(statusData?.track?.isPlaying)}
            />
            <button
              onClick={() => {
                setModalInitialTab('ping');
                setIsPingModalOpen(true);
              }}
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

        {/* ─── COMPANION & REACTIONS ─────────────────────────────── */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <GroovePet
              bpm={statusData?.bpm || 80}
              isPlaying={Boolean(statusData?.track?.isPlaying)}
              energy={statusData?.energy || 0.5}
              ekgColor={activeEkgColor}
            />
          </div>
          <div className="flex-1 min-w-0">
            <SoundBiteReactions
              onReaction={triggerFloatingReaction}
              isLoading={loading}
            />
          </div>
        </div>

        {/* ─── COMMUNITY DROPS (Dedicated Full Row) ─────────────────── */}
        <div className="mb-10">
          <DropASong
            onOpenRecommendModal={() => {
              setModalInitialTab('recommend');
              setIsPingModalOpen(true);
            }}
            latestRecommendation={latestRecommendation}
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

      <FloatingReactions
        reactions={reactions}
        onComplete={(id) => setReactions((prev) => prev.filter((r) => r.id !== id))}
      />
      <PingModal
        isOpen={isPingModalOpen}
        onClose={() => setIsPingModalOpen(false)}
        initialTab={modalInitialTab}
        onRecommendationSubmitted={(rec) => setLatestRecommendation(rec)}
      />
      <PingToast ping={activePing} onClose={() => setActivePing(null)} />
    </div>
  );
}



