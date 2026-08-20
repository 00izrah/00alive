import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

export function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
        return null;
    }

    if (!cachedClient) {
        cachedClient = createClient(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }

    return cachedClient;
}
