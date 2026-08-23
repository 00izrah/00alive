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
            const { data, error } = await supabase
                .from("recommendations")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) {
                console.warn("Error reading recommendations table:", error);
                return jsonResponse([]);
            }

            return jsonResponse(data || []);
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
            // Save to database
            try {
                await supabase.from("recommendations").insert(recRecord);
            } catch (dbErr) {
                console.warn("Could not insert to recommendations table:", dbErr);
            }

            // Broadcast in real-time to connected clients
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
