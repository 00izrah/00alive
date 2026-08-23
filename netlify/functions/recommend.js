import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";

function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    const supabase = getSupabaseClient();

    // GET: Fetch recent community recommendations
    if (req.method === "GET") {
        if (!supabase) {
            return jsonResponse([]);
        }

        try {
            // 1. Try recommendations table
            const { data, error } = await supabase
                .from("recommendations")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

            if (!error && Array.isArray(data) && data.length > 0) {
                return jsonResponse(data);
            }
        } catch {
            // Fall through to snapshot fallback
        }

        // 2. Fallback: Read from spotify_snapshot.listening_stats.recommendations
        try {
            const { data: snapshotData } = await supabase
                .from("spotify_snapshot")
                .select("listening_stats")
                .eq("id", 1)
                .maybeSingle();

            const snapshotRecs = snapshotData?.listening_stats?.recommendations || [];
            return jsonResponse(snapshotRecs);
        } catch (err) {
            console.error("Recommendations GET error:", err);
            return jsonResponse([]);
        }
    }

    // POST: Submit a new song recommendation
    if (req.method === "POST") {
        let payload;
        try {
            payload = await req.json();
        } catch {
            return errorResponse("Invalid JSON body", 400);
        }

        const rawName = typeof payload?.name === "string" ? payload.name.trim() : "";
        const rawMessage = typeof payload?.message === "string" ? payload.message.trim() : "";
        const track = payload?.track;

        if (!rawName) {
            return errorResponse("Name is required", 400);
        }

        if (!track || !track.name || !track.artist) {
            return errorResponse("Track details (name and artist) are required", 400);
        }

        const name = escapeHtml(rawName.slice(0, 100));
        const message = escapeHtml(rawMessage.slice(0, 500));
        const cleanTrack = {
            id: String(track.id || Date.now()),
            name: escapeHtml(String(track.name).slice(0, 200)),
            artist: escapeHtml(String(track.artist).slice(0, 200)),
            album: escapeHtml(String(track.album || "").slice(0, 200)),
            albumArt: typeof track.albumArt === "string" ? track.albumArt : "",
            url: typeof track.url === "string" ? track.url : "",
            previewUrl: typeof track.previewUrl === "string" ? track.previewUrl : null,
        };

        const recRecord = {
            name,
            message,
            track: cleanTrack,
            created_at: new Date().toISOString(),
        };

        if (supabase) {
            // 1. Try to save to recommendations table
            try {
                await supabase.from("recommendations").insert(recRecord);
            } catch (dbErr) {
                console.warn("Could not insert to recommendations table:", dbErr);
            }

            // 2. Dual persistence: Save into spotify_snapshot.listening_stats.recommendations
            try {
                const { data: snapshotData } = await supabase
                    .from("spotify_snapshot")
                    .select("listening_stats")
                    .eq("id", 1)
                    .maybeSingle();

                const existingStats = snapshotData?.listening_stats || {};
                const existingRecs = existingStats.recommendations || [];
                const updatedRecs = [recRecord, ...existingRecs.filter(r => !(r.track?.name === cleanTrack.name && r.name === name))].slice(0, 10);

                await supabase.from("spotify_snapshot").update({
                    listening_stats: {
                        ...existingStats,
                        recommendations: updatedRecs,
                    },
                }).eq("id", 1);
            } catch (snapshotErr) {
                console.warn("Could not update recommendations in snapshot:", snapshotErr);
            }

            // 3. Broadcast in real-time to all connected clients
            try {
                const channel = supabase.channel("izrah-live");
                await channel.send({
                    type: "broadcast",
                    event: "recommendation_added",
                    payload: recRecord,
                });
            } catch (broadcastErr) {
                console.error("Recommendation broadcast error:", broadcastErr);
            }
        }

        return jsonResponse({ success: true, recommendation: recRecord });
    }


    return errorResponse("Method not allowed", 405);
};
