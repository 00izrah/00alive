import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";
import {
    getSpotifyAccessToken,
    getCurrentlyPlaying,
    getRecentlyPlayedBatch,
    formatRecentItem,
    getAudioFeatures,
    getTopArtists,
} from "./utils/spotify.js";

function deriveListeningClock(items = []) {
    const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    for (const item of items) {
        if (item.played_at) {
            const hour = new Date(item.played_at).getHours();
            if (hour >= 0 && hour < 24) {
                hourCounts[hour].count += 1;
            }
        }
    }
    return hourCounts;
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

        // 1. Check live playback
        const currentlyPlaying = await getCurrentlyPlaying(token);

        // 2. Fetch existing snapshot as fallback base
        const { data: existingSnapshot } = await supabase
            .from("spotify_snapshot")
            .select("*")
            .eq("id", 1)
            .maybeSingle();

        // 3. Fetch recent tracks batch (single call for last played + recent 5 + 24h clock)
        const recentItems = await getRecentlyPlayedBatch(token);

        let trackData = null;
        let recentTracks = existingSnapshot?.recent_tracks || [];
        let clockData = existingSnapshot?.listening_stats?.clockData || [];

        if (currentlyPlaying) {
            trackData = currentlyPlaying;
        } else if (recentItems && recentItems.length > 0) {
            trackData = formatRecentItem(recentItems[0]);
            recentTracks = recentItems.slice(0, 5).map((item) => ({
                trackId:  item.track.id,
                track:    item.track.name,
                artist:   item.track.artists.map((a) => a.name).join(", "),
                albumArt: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
                playedAt: item.played_at,
                url:      item.track.external_urls?.spotify,
            }));
            clockData = deriveListeningClock(recentItems);
        } else if (existingSnapshot?.track) {
            // If recently-played is rate limited (429), preserve previous track but mark as not playing
            trackData = {
                ...existingSnapshot.track,
                isPlaying: false,
            };
        }

        if (!trackData) {
            return jsonResponse({ ok: true, message: "No track data available" });
        }

        // 4. Fetch audio features & top artists in parallel
        const isSameTrack = (existingSnapshot?.track?.id === trackData.trackId || existingSnapshot?.track?.trackId === trackData.trackId) && existingSnapshot?.audio_features?.bpm;
        const cachedAudioFeatures = isSameTrack ? existingSnapshot.audio_features : null;
        const existingArtistHistory = existingSnapshot?.listening_stats?.artistHistory || {};

        const [audioFeatures, topArtistsResult] = await Promise.all([
            cachedAudioFeatures ? Promise.resolve(cachedAudioFeatures) : getAudioFeatures(token, trackData.trackId, trackData.track, trackData.artist),
            getTopArtists(token, recentItems || recentTracks, existingArtistHistory),
        ]);

        const finalTopArtists = topArtistsResult?.topArtists?.length > 0 ? topArtistsResult.topArtists : (existingSnapshot?.top_artists || []);
        const updatedArtistHistory = topArtistsResult?.artistHistory || existingArtistHistory;
        const topGenre = deriveTopGenre(finalTopArtists);
        const listeningStats = {
            topGenre,
            topArtists: finalTopArtists.map((a) => ({ name: a.name, count: a.affinity })),
            artistHistory: updatedArtistHistory,
            recommendations: existingSnapshot?.listening_stats?.recommendations || [],
            clockData,
        };




        const nowIso = new Date().toISOString();

        // 5. Write full snapshot to Supabase
        const { error } = await supabase.from("spotify_snapshot").upsert({
            id: 1,
            track: trackData,
            audio_features: audioFeatures,
            recent_tracks: recentTracks,
            top_artists: finalTopArtists,
            listening_stats: listeningStats,
            updated_at: nowIso,
        });

        if (error) {
            console.error("Supabase snapshot write error:", error);
            return errorResponse("DB write failed", 500);
        }

        console.log(`Snapshot updated — track: ${trackData.track} by ${trackData.artist} (isPlaying: ${Boolean(trackData.isPlaying)})`);

        // 6. Broadcast realtime update to connected clients
        try {
            const channel = supabase.channel("izrah-live");
            await channel.send({
                type: "broadcast",
                event: "status_updated",
                payload: {
                    track: trackData,
                    updated_at: nowIso,
                },
            });
        } catch (broadcastErr) {
            console.error("Status broadcast error:", broadcastErr);
        }

        return jsonResponse({
            ok: true,
            track: trackData.track,
            artist: trackData.artist,
            isPlaying: Boolean(trackData.isPlaying),
            updated: nowIso,
        });

    } catch (err) {
        console.error("Sync function error:", err);
        return errorResponse("Internal Server Error", 500);
    }
};