import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    const supabase = getSupabaseClient();

    // GET: Fetch the global running tally
    if (req.method === "GET") {
        if (!supabase) {
            return jsonResponse({ fire_votes: 0, flag_votes: 0 });
        }

        try {
            const { data, error } = await supabase
                .from("global_vibes")
                .select("fire_votes, flag_votes")
                .eq("id", 1)
                .maybeSingle();

            if (error) console.error("Error fetching global vibes:", error);

            return jsonResponse(data || { fire_votes: 0, flag_votes: 0 });
        } catch (err) {
            console.error("Vibes GET error:", err);
            return jsonResponse({ fire_votes: 0, flag_votes: 0 });
        }
    }

    // POST: Submit a new global vote
    if (req.method === "POST") {
        let payload;
        try {
            payload = await req.json();
        } catch {
            return errorResponse("Invalid JSON body", 400);
        }


        const { voteType } = payload;
        if (voteType !== "fire" && voteType !== "flag") {
            return errorResponse("Invalid voteType. Must be 'fire' or 'flag'", 400);
        }

        if (supabase) {
            try {
                const { error: rpcErr } = await supabase.rpc("increment_global_vibe", {
                    v_type: voteType,
                });
                if (rpcErr) console.error("Vibe increment RPC error:", rpcErr);
            } catch (err) {
                console.error("Vibe POST error:", err);
            }
        }

        return jsonResponse({ success: true });
    }

    return errorResponse("Method Not Allowed", 405);
};