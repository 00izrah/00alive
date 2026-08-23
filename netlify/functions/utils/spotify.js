export async function getSpotifyAccessToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Missing Spotify credentials in environment");
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    if (!res.ok) {
        throw new Error(`Spotify token refresh failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) {
        throw new Error("Failed to extract Spotify access token");
    }

    return data.access_token;
}

export async function getCurrentlyPlaying(token) {
    const res = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 204 || res.status === 400 || !res.ok) return null;

    const data = await res.json();
    if (!data || !data.item || data.item.type !== "track") return null;

    return {
        isPlaying:   data.is_playing,
        track:       data.item.name,
        artist:      data.item.artists.map((a) => a.name).join(", "),
        album:       data.item.album.name,
        albumArt:    data.item.album.images[1]?.url || data.item.album.images[0]?.url,
        trackId:     data.item.id,
        playedAt:    new Date().toISOString(),
        progressMs:  data.progress_ms,
        durationMs:  data.item.duration_ms,
        previewUrl:  data.item.preview_url || null,
        url:         data.item.external_urls?.spotify,
    };
}

export async function getRecentlyPlayedBatch(token) {
    const res = await fetch(
        "https://api.spotify.com/v1/me/player/recently-played?limit=50",
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        console.warn(`recently-played returned ${res.status}`);
        return null;
    }

    const data = await res.json();
    return data.items || [];
}

export function formatRecentItem(item) {
    if (!item || !item.track) return null;
    return {
        isPlaying:  false,
        track:      item.track.name,
        artist:     item.track.artists.map((a) => a.name).join(", "),
        album:      item.track.album.name,
        albumArt:   item.track.album.images[1]?.url || item.track.album.images[0]?.url,
        trackId:    item.track.id,
        playedAt:   item.played_at,
        progressMs: null,
        durationMs: item.track.duration_ms,
        previewUrl: item.track.preview_url || null,
        url:        item.track.external_urls?.spotify,
    };
}


export async function getRecentlyPlayed(token, limit = 5) {
    const items = await getRecentlyPlayedBatch(token);
    if (!items || items.length === 0) return limit === 1 ? null : [];

    if (limit === 1) {
        return formatRecentItem(items[0]);
    }

    return items.slice(0, limit).map((item) => ({
        trackId:  item.track.id,
        track:    item.track.name,
        artist:   item.track.artists.map((a) => a.name).join(", "),
        albumArt: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
        playedAt: item.played_at,
        url:      item.track.external_urls?.spotify,
    }));
}


async function getGroqAudioFeatures(trackName, artistName) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !trackName || !artistName) return null;

    const models = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "openai/gpt-oss-20b"];

    for (const model of models) {
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content: "You are a musical audio analysis database. Output valid JSON with numeric values: {\"bpm\": integer between 60 and 190, \"energy\": float 0.0-1.0, \"valence\": float 0.0-1.0, \"danceability\": float 0.0-1.0}",
                        },
                        {
                            role: "user",
                            content: `Analyze track: "${trackName}" by "${artistName}"`,
                        },
                    ],
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const content = data.choices?.[0]?.message?.content;
                if (content) {
                    const parsed = JSON.parse(content);
                    if (parsed.bpm && typeof parsed.bpm === "number") {
                        return {
                            bpm: Math.min(220, Math.max(50, Math.round(parsed.bpm))),
                            energy: typeof parsed.energy === "number" ? Math.min(1, Math.max(0, parsed.energy)) : 0.5,
                            valence: typeof parsed.valence === "number" ? Math.min(1, Math.max(0, parsed.valence)) : 0.5,
                            danceability: typeof parsed.danceability === "number" ? Math.min(1, Math.max(0, parsed.danceability)) : 0.5,
                        };
                    }
                }
            }
        } catch (err) {
            console.warn(`Groq audio features inference failed with ${model}:`, err.message);
        }
    }
    return null;
}

export async function getAudioFeatures(token, trackId, trackName = "", artistName = "") {
    if (!trackId && !trackName) {
        return { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
    }

    // 1. Try Spotify API
    if (token && trackId) {
        try {
            const res = await fetch(
                `https://api.spotify.com/v1/audio-features/${trackId}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (res.ok) {
                const data = await res.json();
                if (data && data.tempo) {
                    return {
                        bpm:          Math.round(data.tempo) || 80,
                        energy:       data.energy       ?? 0.5,
                        valence:      data.valence      ?? 0.5,
                        danceability: data.danceability ?? 0.5,
                    };
                }
            }
        } catch {
            // Fall through to AI inference
        }
    }

    // 2. Groq AI Audio Inference (since Spotify deprecated /v1/audio-features)
    if (trackName && artistName) {
        const aiFeatures = await getGroqAudioFeatures(trackName, artistName);
        if (aiFeatures) return aiFeatures;
    }

    // 3. Fallback default
    return { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
}

export async function getArtistGenresBatch(artists) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !artists || artists.length === 0) return {};

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: 'Return a JSON object mapping each artist name to their primary signature music genre (1-3 words max, e.g. "Afrobeats", "Alternative R&B", "Hip-Hop", "R&B / Soul", "Trap", "Indie Pop"). Output format: {"genres": {"Artist Name": "Genre"}}',
                    },
                    {
                        role: "user",
                        content: `Artists: ${JSON.stringify(artists)}`,
                    },
                ],
            }),
        });

        if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
            return parsed.genres || {};
        }
    } catch {
        // Silently continue
    }
    return {};
}

export async function getTopArtists(token, recentItems = [], existingHistory = {}) {
    // 1. Try Spotify official top artists endpoint
    if (token) {
        try {
            const res = await fetch(
                "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5",
                { headers: { Authorization: `Bearer ${token}` } },
            );

            if (res.ok) {
                const data = await res.json();
                if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
                    const topArtists = data.items.map((artist, index) => ({
                        name:     artist.name,
                        genre:    artist.genres?.[0] || "artist",
                        genres:   artist.genres || [],
                        image:    artist.images?.[2]?.url || artist.images?.[0]?.url || "",
                        affinity: 100 - index * 12,
                    }));
                    return { topArtists, artistHistory: existingHistory };
                }
            }
        } catch {
            // Fall through to historical calculation
        }
    }

    // 2. Intelligent Cumulative Listening & Rotation History
    const history = { ...(existingHistory || {}) };

    if (recentItems && recentItems.length > 0) {
        for (const item of recentItems) {
            const artistName = item.track?.artists?.[0]?.name || item.artist?.split(",")?.[0]?.trim() || item.artist;
            if (!artistName) continue;

            const artUrl = item.track?.album?.images?.[1]?.url || item.track?.album?.images?.[0]?.url || item.albumArt || "";

            if (!history[artistName]) {
                history[artistName] = {
                    name: artistName,
                    plays: 0,
                    genre: "heavy rotation",
                    image: artUrl,
                    lastPlayed: item.played_at || item.playedAt || new Date().toISOString(),
                };
            }

            history[artistName].plays += 1;
            if (artUrl && (!history[artistName].image || history[artistName].image.includes("4851"))) {
                history[artistName].image = artUrl;
            }
        }
    }

    const sorted = Object.values(history).sort((a, b) => b.plays - a.plays);
    if (sorted.length === 0) {
        return { topArtists: [], artistHistory: history };
    }

    const top5 = sorted.slice(0, 5);
    const maxPlays = Math.max(1, top5[0]?.plays || 1);

    // Enrich missing genres with AI classification
    const artistsNeedingGenre = top5.filter(a => !a.genre || a.genre === "heavy rotation" || a.genre === "artist").map(a => a.name);
    let genreMap = {};
    if (artistsNeedingGenre.length > 0) {
        genreMap = await getArtistGenresBatch(artistsNeedingGenre);
    }

    const topArtists = top5.map((artist, index) => {
        const detectedGenre = genreMap[artist.name] || (artist.genre !== "heavy rotation" && artist.genre !== "artist" ? artist.genre : "Heavy Rotation");
        artist.genre = detectedGenre;

        let affinity;
        if (index === 0) {
            affinity = 100;
        } else {
            const ratio = artist.plays / maxPlays;
            affinity = Math.min(92, Math.max(35, Math.round(ratio * 100)));
        }

        return {
            name: artist.name,
            genre: detectedGenre,
            genres: [detectedGenre],
            image: artist.image,
            affinity,
            plays: artist.plays,
        };
    });

    return { topArtists, artistHistory: history };
}



export async function getActivityToday(token) {
    const since = Date.now() - 24 * 60 * 60 * 1000;

    const res = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=50&after=${since}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        console.warn(`Spotify recently-played returned ${res.status}`);
        return { active: false, trackCount: 0 };
    }

    const data = await res.json();
    const trackCount = data.items ? data.items.length : 0;
    return { active: trackCount > 0, trackCount };
}
