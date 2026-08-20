import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";
import {
    getSpotifyAccessToken,
    getCurrentlyPlaying,
    getRecentlyPlayed,
    getAudioFeatures,
    getTopArtists,
} from "./utils/spotify.js";

async function getListeningClock(token) {
    try {
        const res = await fetch(
            "https://api.spotify.com/v1/me/player/recently-played?limit=50",
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.items || data.items.length === 0) return [];

        const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
        for (const item of data.items) {
            const hour = new Date(item.played_at).getHours();
            if (hour >= 0 && hour < 24) {
                hourCounts[hour].count += 1;
            }
        }
        return hourCounts;
    } catch {
        return [];
    }
}

function deriveTopGenre(topArtists = []) {
    const genreCounts = {};
    for (const artist of topArtists) {
        const genres = artist.genres && artist.genres.length > 0 ? artist.genres : (artist.genre ? [artist.genre] : []);
        for (const g of genres) {
            if (!g || g === "artist") continue;
            genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
    }

    let topGenre = null;
    let maxCount = 0;
    for (const [genre, count] of Object.entries(genreCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topGenre = genre;
        }
    }
    return topGenre || (topArtists[0]?.genre !== "artist" ? topArtists[0]?.genre : null);
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    const authHeader = req.headers.get("x-cron-secret");
    if (!process.env.CRON_SECRET || authHeader !== process.env.CRON_SECRET) {
        return errorResponse("Unauthorized", 401);
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
        return errorResponse("Database configuration missing", 500);
    }

    try {
        const token = await getSpotifyAccessToken();

        // Get current or last played track
        let trackData = await getCurrentlyPlaying(token);
        if (!trackData) {
            trackData = await getRecentlyPlayed(token, 1);
        }

        if (!trackData) {
            return jsonResponse({ ok: true, message: "No track data available" });
        }

        // Run remaining fetches in parallel
        const [audioFeatures, recentTracks, topArtists, clockData] = await Promise.all([
            getAudioFeatures(token, trackData.trackId),
            getRecentlyPlayed(token, 5),
            getTopArtists(token),
            getListeningClock(token),
        ]);

        const topGenre = deriveTopGenre(topArtists);
        const listeningStats = {
            topGenre,
            topArtists: topArtists.map((a) => ({ name: a.name, count: a.affinity })),
            clockData,
        };

        // Write full snapshot to Supabase
        const { error } = await supabase.from("spotify_snapshot").upsert({
            id: 1,
            track: trackData,
            audio_features: audioFeatures,
            recent_tracks: recentTracks,
            top_artists: topArtists,
            listening_stats: listeningStats,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            console.error("Supabase snapshot write error:", error);
            return errorResponse("DB write failed", 500);
        }

        console.log(`Snapshot updated — track: ${trackData.track} by ${trackData.artist}`);

        return jsonResponse({
            ok: true,
            track: trackData.track,
            artist: trackData.artist,
            updated: new Date().toISOString(),
        });

    } catch (err) {
        console.error("Sync function error:", err);
        return errorResponse("Internal Server Error", 500);
    }
};