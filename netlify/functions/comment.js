import { getComment } from "./templates.js";
import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";
import { getWATHour, getTimeContext, getTimeSlot } from "./utils/time.js";

async function getGroqComments(track, artist, tier, energy, valence) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const hour = getWATHour();
    const timeContext = getTimeContext(hour);

    const moodHint =
        valence > 0.6
            ? "upbeat/vibing"
            : valence < 0.4
                ? "melancholic/brooding/in the trenches"
                : "neutral/reflective";

    const energyHint =
        energy > 0.7
            ? "high energy"
            : energy < 0.3
                ? "low energy, very calm"
                : "mid energy";

    const prompt = `You write short, funny comments for "izrah.live" — a site that tracks if Izrah is alive based on his Spotify. His friends visit to check on him and laugh.

Current listening:
- Track: "${track}" by ${artist}
- Vibe: ${moodHint}, ${energyHint}  
- Time: ${timeContext}
- Status: ${tier}

Write 5 comments. Mix up the structures — some are observations, some are accusations, some are fake concern, some are just stating facts with no emotion. Third person only, referring to him as "he" or "this man" or "dude" or "izrah."

Examples of the register to match — vary your structure like these do:
- "${artist} at this hour. he already knows what he's doing."
- "he is alive. the music choice is doing a lot of talking though."
- "lore accurate. ${artist} fits exactly what he has going on right now."

BANNED phrases and patterns (do not use any of these):
- "vibes", "feeling", "lost in", "immersed in"
- starting with "In the" 
- any exclamation marks
- rhetorical questions
- anything that sounds like a music review

- Do NOT write anything that sounds like a therapy observation or a deep life quote
- Write like a friend in a group chat who just saw something embarrassing, not a narrator
- Refer to him as "he", "broski", "dude", "this guy", or "izrah" — keep it casual group chat banter

Maximum 18 words each. Emojis allowed, max one per line.

Return a raw JSON array of 5 strings. No markdown. No object wrapper. Just the array starting with [ and ending with ].`;

    const models = [
        "allam-2-7b",
        "qwen/qwen3.6-27b",
    ];

    for (const model of models) {
        try {
            const bodyPayload = {
                model,
                max_tokens: 1000,
                messages: [
                    {
                        role: "system",
                        content: "You are a witty Nigerian Gen Z friend writing roast comments. You always respond with only a valid JSON array of strings. Nothing else. No object, no markdown, no explanation. Start your response with [ and end with ]."
                    },
                    { role: "user", content: prompt }
                ],
            };

            // Hide reasoning tokens for reasoning models
            if (model.includes("qwen")) {
                bodyPayload.reasoning_format = "hidden";
            }

            const res = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(bodyPayload),
                },
            );

            if (!res.ok) {
                const errBody = await res.text();
                console.warn(`Groq model ${model} failed (${res.status}): ${errBody}`);
                continue;
            }
            const data = await res.json();
            let content = data.choices[0].message.content ?? "";

            // 1. If closed <think> exists, strip it
            if (content.includes("</think>")) {
                content = content.split("</think>")[1];
            } else if (content.startsWith("<think>")) {
                content = content.replace(/^<think>/i, "");
            }

            // 2. Strip code fences
            content = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();

            // 3. Try standard JSON array parsing
            const arrayMatch = content.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                try {
                    const parsed = JSON.parse(arrayMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch {
                    // Fall through to regex extraction
                }
            }

            // 4. Fallback: extract all completed quoted strings if JSON was cut off
            const matches = [...content.matchAll(/"([^"\n\\]*(?:\\.[^"\n\\]*)*)"/g)]
                .map(m => m[1].trim())
                .filter(s => s.length >= 6 && !s.startsWith("role") && !s.startsWith("system"));

            if (matches.length > 0) {
                return matches;
            }

            console.warn(`Groq model ${model}: could not extract comments from: ${content.substring(0, 150)}`);
        } catch (err) {
            console.error(`Groq error with model ${model}:`, err);
        }
    }
    return null;
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    if (req.method !== "POST") {
        return errorResponse("Method Not Allowed", 405);
    }

    let payload = {};
    try {
        payload = await req.json();
    } catch {
        return errorResponse("Invalid JSON body", 400);
    }

    const { trackId, track, artist, tier, energy, valence } = payload;

    if (!trackId || !track || !artist) {
        return jsonResponse({
            comment: getComment(artist, tier),
            source: "template",
        });
    }

    const hour = getWATHour();
    const timeSlot = getTimeSlot(hour);
    const cacheKey = `${trackId}_${timeSlot}`;
    const supabase = getSupabaseClient();

    try {
        if (supabase) {
            const { data: cacheData, error: cacheError } = await supabase
                .from("comment_cache")
                .select("comments")
                .eq("track_id", cacheKey)
                .maybeSingle();

            if (!cacheError && cacheData?.comments?.length > 0) {
                const pick =
                    cacheData.comments[
                    Math.floor(Math.random() * cacheData.comments.length)
                    ];
                return jsonResponse({ comment: pick, source: "cache" });
            }
        }

        const groqComments = await getGroqComments(
            track,
            artist,
            tier,
            parseFloat(energy) || 0.5,
            parseFloat(valence) || 0.5,
        );

        if (groqComments) {
            if (supabase) {
                const { error: writeErr } = await supabase
                    .from("comment_cache")
                    .upsert({
                        track_id: cacheKey,
                        track_name: track,
                        artist,
                        comments: groqComments,
                    });
                if (writeErr) console.error("Cache write failed:", writeErr);
            }

            const pick =
                groqComments[Math.floor(Math.random() * groqComments.length)];
            return jsonResponse({ comment: pick, source: "groq-fresh" });
        }
    } catch (err) {
        console.error("Comment function error:", err);
    }

    // Ultimate fallback
    return jsonResponse({
        comment: getComment(artist, tier),
        source: "template-fallback",
    });
};