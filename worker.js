// LeadPilot Worker — KV Storage + REST API
// Setup: wrangler.toml mein yeh add karo:
//   [[kv_namespaces]]
//   binding = "LEADS_KV"
//   id = "TUMHARA_KV_NAMESPACE_ID"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // --- GET /api/leads → sab leads wapas do ---
    if (url.pathname === "/api/leads" && request.method === "GET") {
      try {
        const raw = await env.LEADS_KV.get("all_leads");
        const leads = raw ? JSON.parse(raw) : [];
        return json({ ok: true, count: leads.length, leads });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    // --- POST /api/leads → naye leads merge karke save karo ---
    if (url.pathname === "/api/leads" && request.method === "POST") {
      try {
        const body = await request.json();
        const incoming = Array.isArray(body.leads) ? body.leads : [];

        // Existing leads fetch karo
        const raw = await env.LEADS_KV.get("all_leads");
        const existing = raw ? JSON.parse(raw) : [];

        // Dedupe by email + business name
        const keyOf = (l) =>
          `${(l["Business Name"] || l.business || "").toLowerCase()}|${(l.Email || l.email || "").toLowerCase()}`;

        const map = new Map();
        [...existing, ...incoming].forEach((l) => map.set(keyOf(l), l));
        const merged = [...map.values()];

        await env.LEADS_KV.put("all_leads", JSON.stringify(merged));
        return json({ ok: true, saved: merged.length });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    // --- POST /api/leads/update → ek lead ka status update karo ---
    if (url.pathname === "/api/leads/update" && request.method === "POST") {
      try {
        const { email, business, status } = await request.json();
        const raw = await env.LEADS_KV.get("all_leads");
        const leads = raw ? JSON.parse(raw) : [];

        const updated = leads.map((l) => {
          const match =
            (email && (l.Email || l.email) === email) ||
            (business && (l["Business Name"] || l.business) === business);
          return match ? { ...l, "Email Status": status } : l;
        });

        await env.LEADS_KV.put("all_leads", JSON.stringify(updated));
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    // --- DELETE /api/leads → sab leads clear karo ---
    if (url.pathname === "/api/leads" && request.method === "DELETE") {
      await env.LEADS_KV.put("all_leads", "[]");
      return json({ ok: true, message: "All leads cleared" });
    }

    // --- GET /api/health ---
    if (url.pathname === "/api/health") {
      return json({ ok: true, app: "leadpilot", ts: Date.now() });
    }

    // Static assets
    return env.ASSETS.fetch(request);
  },
};
