// functions/api/leads.js
// Cloudflare Pages Functions format
// GET  /api/leads       → sab leads wapas do
// POST /api/leads       → naye leads merge karke save karo
// DELETE /api/leads     → sab clear karo

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function keyOf(l) {
  const b = (l["Business Name"] || l.business || "").toLowerCase().trim();
  const e = (l["Email"] || l.email || "").toLowerCase().trim();
  return `${b}|${e}`;
}

export async function onRequest({ request, env }) {
  // Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // GET — sab leads do
  if (request.method === "GET") {
    try {
      const raw = await env.LEADS_KV.get("all_leads");
      const leads = raw ? JSON.parse(raw) : [];
      return json({ ok: true, count: leads.length, leads });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  // POST — merge + save
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const incoming = Array.isArray(body.leads) ? body.leads : [];

      const raw = await env.LEADS_KV.get("all_leads");
      const existing = raw ? JSON.parse(raw) : [];

      const map = new Map();
      [...existing, ...incoming].forEach(l => map.set(keyOf(l), l));
      const merged = [...map.values()];

      await env.LEADS_KV.put("all_leads", JSON.stringify(merged));
      return json({ ok: true, saved: merged.length });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  // DELETE — sab clear karo
  if (request.method === "DELETE") {
    await env.LEADS_KV.put("all_leads", "[]");
    return json({ ok: true, message: "All leads cleared" });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
