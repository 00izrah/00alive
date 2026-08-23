import { jsonResponse, errorResponse, optionsResponse } from "./utils/cors.js";
import { getSupabaseClient } from "./utils/supabase.js";


function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export default async function handler(req) {
    if (req.method === "OPTIONS") {
        return optionsResponse();
    }

    if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    try {
        let data;
        try {
            data = await req.json();
        } catch {
            return errorResponse("Invalid JSON body", 400);
        }

        const rawName = typeof data?.name === "string" ? data.name.trim() : "";
        const rawMessage = typeof data?.message === "string" ? data.message.trim() : "";

        if (!rawName) {
            return errorResponse("Name is required", 400);
        }

        // Impose strict length limits
        const name = rawName.slice(0, 100);
        const message = rawMessage.slice(0, 1000);

        const safeName = escapeHtml(name);
        const safeMessage = escapeHtml(message);

        const resendApiKey = process.env.RESEND_API_KEY;
        const toEmail = process.env.PING_TO_EMAIL || "your-email@example.com"; 
        const fromEmail = process.env.PING_FROM_EMAIL || "onboarding@resend.dev";

        if (resendApiKey) {
            const emailBody = {
                from: `00ALIVE Ping <${fromEmail}>`,
                to: [toEmail],
                subject: `🚨 00ALIVE Dashboard Ping from ${name}!`,
                html: `
                    <div style="font-family: monospace; background: #000; color: #fff; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #4ade80;">Someone is checking on you.</h2>
                        <p><strong>Name:</strong> ${safeName}</p>
                        <p><strong>Message:</strong> ${safeMessage ? safeMessage : "<em>No message provided</em>"}</p>
                    </div>
                `,
            };

            const resendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${resendApiKey}`,
                },
                body: JSON.stringify(emailBody),
            });

            if (!resendRes.ok) {
                console.error("Resend API failed: " + await resendRes.text());
            }
        } else {
            console.log("NOTICE: RESEND_API_KEY is not set. Ping simulated:", { name, message });
        }

        // Realtime notification broadcast & storage
        const supabase = getSupabaseClient();
        if (supabase) {
            const pingPayload = {
                name: safeName,
                message: safeMessage,
                timestamp: new Date().toISOString(),
            };

            // Broadcast to connected frontend clients immediately
            try {
                const channel = supabase.channel("izrah-live");
                await channel.send({
                    type: "broadcast",
                    event: "ping_received",
                    payload: pingPayload,
                });
            } catch (broadcastErr) {
                console.error("Ping broadcast error:", broadcastErr);
            }

            // Persist to database if pings table exists
            try {
                await supabase.from("pings").insert({
                    name: safeName,
                    message: safeMessage,
                    created_at: new Date().toISOString(),
                });
            } catch {
                // Silently ignore if table does not exist
            }
        }

        return jsonResponse({ success: true });


    } catch (error) {
        console.error("Ping error:", error);
        return errorResponse("Internal Server Error", 500);
    }
}