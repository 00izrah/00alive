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
        url:         data.item.external_urls?.spotify,
    };
}

export async function getRecentlyPlayed(token, limit = 5) {
    const res = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        console.warn(`recently-played returned ${res.status}`);
        return limit === 1 ? null : [];
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return limit === 1 ? null : [];

    if (limit === 1) {
        const item = data.items[0];
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
            url:        item.track.external_urls?.spotify,
        };
    }

    return data.items.map((item) => ({
        trackId:  item.track.id,
        track:    item.track.name,
        artist:   item.track.artists.map((a) => a.name).join(", "),
        albumArt: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
        playedAt: item.played_at,
        url:      item.track.external_urls?.spotify,
    }));
}

export async function getAudioFeatures(token, trackId) {
    if (!trackId) {
        return { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
    }

    const res = await fetch(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
    const data = await res.json();
    return {
        bpm:          Math.round(data.tempo) || 80,
        energy:       data.energy       ?? 0.5,
        valence:      data.valence      ?? 0.5,
        danceability: data.danceability ?? 0.5,
    };
}

export async function getTopArtists(token) {
    const res = await fetch(
        "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5",
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        console.warn(`top-artists returned ${res.status}`);
        return [];
    }
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((artist, index) => ({
        name:     artist.name,
        genre:    artist.genres?.[0] || "artist",
        genres:   artist.genres || [],
        image:    artist.images?.[2]?.url || artist.images?.[0]?.url || "",
        affinity: 100 - index * 15,
    }));
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
