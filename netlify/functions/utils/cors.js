export const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cron-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
};

export function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, ...extraHeaders },
    });
}

export function errorResponse(message, status = 500, extraHeaders = {}) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...CORS_HEADERS, ...extraHeaders },
    });
}

export function optionsResponse(extraHeaders = {}) {
    return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, ...extraHeaders },
    });
}
