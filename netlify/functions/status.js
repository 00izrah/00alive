import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";
import { calculateTier, generateVibe } from "./utils/time.js";

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return errorResponse("Database configuration missing", 500);
        }

        const thirtyDaysAgo = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString().split("T")[0];

        const [snapshotRes, streakRes, calendarRes] = await Promise.all([
            supabase.from("spotify_snapshot").select("*").eq("id", 1).maybeSingle(),
            supabase.from("streaks").select("*").eq("id", 1).maybeSingle(),
            supabase.from("listening_calendar").select("*").gte("date", thirtyDaysAgo).order("date", { ascending: false }),
        ]);

        const snapshot = snapshotRes.data;

        // Fallback for streak if named 'streak' instead of 'streaks'
        let streakData = streakRes.data;
        if (!streakData) {
            const altStreak = await supabase.from("streak").select("*").eq("id", 1).maybeSingle();
            streakData = altStreak.data;
        }

        const defaultStreak = { current_streak: 0, best_streak: 0, total_days: 0 };
        const streak = streakData || defaultStreak;
        const calendar = calendarRes.data || [];

        if (!snapshot || !snapshot.track) {
            return jsonResponse({
                tier: "ALIVE",
                label: "loading",
                color: "alive",
                message: "syncing data, check back in a moment.",
                track: null,
                streak,
                bpm: 80,
                energy: 0.5,
                valence: 0.5,
                danceability: 0.5,
                recentTracks: [],
                loyalty: [],
                topGenre: null,
                clock: [],
                calendar,
                vibe: null,
            });
        }

        const track          = snapshot.track;
        const audioFeatures  = snapshot.audio_features  || { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
        const recentTracks   = snapshot.recent_tracks   || [];
        const topArtists     = snapshot.top_artists     || [];
        const listeningStats = snapshot.listening_stats || { topGenre: null, topArtists: [], clockData: [] };

        const status = calculateTier(track.playedAt, track.isPlaying);
        const vibe   = generateVibe(audioFeatures.energy, audioFeatures.valence, track.playedAt);

        return jsonResponse({
            ...status,
            track: {
                id:         track.trackId,
                name:       track.track,
                artist:     track.artist,
                album:      track.album,
                albumArt:   track.albumArt,
                playedAt:   track.playedAt,
                isPlaying:  track.isPlaying,
                progressMs: track.progressMs,
                durationMs: track.durationMs,
                url:        track.url,
            },
            recentTracks,
            topGenre:    listeningStats.topGenre || "unknown",
            loyalty:     topArtists.length > 0 ? topArtists : listeningStats.topArtists || [],
            clock:       listeningStats.clockData || [],
            calendar,
            vibe,
            streak,
            bpm:          audioFeatures.bpm,
            energy:       audioFeatures.energy,
            valence:      audioFeatures.valence,
            danceability: audioFeatures.danceability,
            snapshotAge:  snapshot.updated_at,
        });

    } catch (err) {
        console.error("Status function error:", err);
        return errorResponse("Internal Server Error", 500);
    }
};