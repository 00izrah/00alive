import { getSpotifyAccessToken } from "./utils/spotify.js";
import { jsonResponse, optionsResponse } from "./utils/cors.js";


async function searchWithItunesFallback(query) {
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`);
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.results) return [];

        return data.results.map((item) => ({
            id: String(item.trackId),
            name: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            albumArt: item.artworkUrl100?.replace("100x100bb", "300x300bb") || item.artworkUrl100 || "",
            url: item.trackViewUrl || `https://open.spotify.com/search/${encodeURIComponent(item.artistName + " " + item.trackName)}`,
            previewUrl: item.previewUrl || null,
        }));
    } catch {
        return [];
    }
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    const url = new URL(req.url);
    const query = (url.searchParams.get("q") || "").trim();

    if (!query) {
        return jsonResponse([]);
    }

    try {
        const token = await getSpotifyAccessToken();
        const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=6`,
            { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.ok) {
            const data = await res.json();
            if (data.tracks?.items?.length > 0) {
                const tracks = await Promise.all(data.tracks.items.map(async (item) => {
                    let previewUrl = item.preview_url || null;
                    if (!previewUrl && item.name && item.artists?.[0]?.name) {
                        try {
                            const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(item.artists[0].name + " " + item.name)}&entity=song&limit=1`);
                            if (itunesRes.ok) {
                                const itunesData = await itunesRes.json();
                                if (itunesData.results?.[0]?.previewUrl) {
                                    previewUrl = itunesData.results[0].previewUrl;
                                }
                            }
                        } catch {
                            // ignore fallback error
                        }
                    }

                    return {
                        id: item.id,
                        name: item.name,
                        artist: item.artists.map((a) => a.name).join(", "),
                        album: item.album?.name,
                        albumArt: item.album?.images?.[1]?.url || item.album?.images?.[0]?.url || "",
                        url: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
                        previewUrl,
                    };
                }));
                return jsonResponse(tracks);
            }
        }

    } catch (spotifyErr) {
        console.warn("Spotify search error, using fallback:", spotifyErr);
    }

    // Fallback to iTunes Search
    const fallbackResults = await searchWithItunesFallback(query);
    return jsonResponse(fallbackResults);
};
