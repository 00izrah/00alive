import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            // Check snapshot age from DB for reliable cross-instance cooldown
            const { data } = await supabase
                .from("spotify_snapshot")
                .select("updated_at")
                .eq("id", 1)
                .maybeSingle();

            if (data?.updated_at) {
                const ageMs = Date.now() - new Date(data.updated_at).getTime();
                if (ageMs < 180000) {
                    return jsonResponse({ ok: true, message: "recently synced, skipping" });
                }
            }
        } catch {
            // Continue if read check fails
        }
    }

    const siteUrl = process.env.URL || process.env.SITE_URL || "http://localhost:8888";
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return errorResponse("CRON_SECRET not configured", 500);
    }

    try {
        const syncRes = await fetch(`${siteUrl}/.netlify/functions/sync-spotify`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-cron-secret": cronSecret,
            },
        });

        const data = await syncRes.json();
        return jsonResponse(data, syncRes.status);
    } catch (err) {
        console.error("Trigger sync error:", err);
        return errorResponse("Failed to trigger sync", 500);
    }
};