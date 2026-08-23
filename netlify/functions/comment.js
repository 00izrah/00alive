import { getComment } from "./templates.js";
import { getSupabaseClient } from "./utils/supabase.js";
import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";
import { getWATHour, getTimeContext, getTimeSlot } from "./utils/time.js";

async function getGroqComments(track, artist, tier, energy, valence, bpm = null) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const hour = getWATHour();
    const timeContext = getTimeContext(hour);

    const moodHint =
        valence > 0.6
            ? "upbeat/hype"
            : valence < 0.4
                ? "melancholic/in the trenches"
                : "neutral/chill";

    const energyHint =
        energy > 0.7
            ? "hyperactive"
            : energy < 0.3
                ? "calm/slow"
                : "mid tempo";

    const bpmHint = bpm ? `at ${bpm} BPM` : "";

    const prompt = `You write short, witty, comedic commentary for "izrah.live" — a live dashboard tracking if Izrah is alive based on his Spotify. Friends visit to laugh and check in on him.

Current listening:
- Track: "${track}" by ${artist}
- Vibe: ${moodHint}, ${energyHint} ${bpmHint}
- Time in WAT (West Africa): ${timeContext} (${hour}:00)
- Status: ${tier}

Write 5 short hilarious commentary lines. Keep the voice witty, Nigerian Gen Z group chat humor, observant, slightly unhinged but affectionate banter.
Refer to him in third person as "he", "this guy", "izrah", "broski", or "the boy".

Examples of tone & register:
- "${artist} at this ungodly hour. he is going through a spiritual warfare."
- "he is alive. whether his music taste survived is another conversation."
- "listening to ${artist} in the middle of the night. someone check his bank app."
- "no way he put ${track} on repeat. let him cook though."

Rules:
- Maximum 16 words per comment.
- No generic quotes, no corporate speak, no therapy jargon.
- No markdown formatting.
- Emojis allowed (max 1 per line).

Return ONLY a raw JSON array of 5 strings starting with [ and ending with ].`;

    const models = [
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-20b",
    ];

    for (const model of models) {
        try {
            const bodyPayload = {
                model,
                max_tokens: 1000,
                messages: [
                    {
                        role: "system",
                        content: "You are a witty Nigerian Gen Z friend writing hilarious roast commentary. Output only a raw JSON array of strings [\"...\", \"...\"]. No wrapper, no explanation."
                    },
                    { role: "user", content: prompt }
                ],
            };

            // Hide reasoning tokens for reasoning models
            if (model.includes("qwen") || model.includes("openai")) {
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

    let payload;
    try {
        payload = await req.json();
    } catch {
        return errorResponse("Invalid JSON body", 400);
    }


    const { trackId, track, artist, tier, energy, valence, bpm } = payload;

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
            bpm ? parseInt(bpm, 10) : null,
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

            if (supabase) {
                try {
                    const channel = supabase.channel("izrah-live");
                    await channel.send({
                        type: "broadcast",
                        event: "comment_updated",
                        payload: {
                            trackId,
                            comment: pick,
                            source: "groq-fresh",
                        },
                    });
                } catch (broadcastErr) {
                    console.error("Comment broadcast error:", broadcastErr);
                }
            }

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