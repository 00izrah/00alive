import crypto from "crypto";
import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";

export default async function handler(req) {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    try {
        const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("client-ip") || "unknown";
        const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
        const today = new Date().toISOString().split("T")[0];

        const supabase = getSupabaseClient();
        if (!supabase) {
            return errorResponse("Missing DB configuration", 500);
        }

        // Upsert the visitor. If they visit multiple times in a day, update last_visit
        await supabase
            .from("visitors")
            .upsert(
                { ip_hash: `${ipHash}-${today}`, last_visit: today },
                { onConflict: "ip_hash" },
            );

        // Get total unique site visitors today
        const { count, error } = await supabase
            .from("visitors")
            .select("*", { count: "exact", head: true })
            .eq("last_visit", today);

        if (error) throw error;

        return jsonResponse({ todayCount: count || 0 });
    } catch (error) {
        console.error("Visitor counter error:", error);
        return jsonResponse({ todayCount: "..." }, 500);
    }
}