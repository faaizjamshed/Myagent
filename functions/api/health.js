// functions/api/health.js
export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, app: "leadpilot", ts: Date.now() }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
