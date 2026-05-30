// functions/api/leads/update.js
// POST /api/leads/update → ek lead ka status update karo

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (request.method === "POST") {
    try {
      const { email, business, status } = await request.json();
      const raw = await env.LEADS_KV.get("all_leads");
      const leads = raw ? JSON.parse(raw) : [];

      const updated = leads.map(l => {
        const matchEmail = email && (l.Email || l.email) === email;
        const matchBiz   = business && (l["Business Name"] || l.business) === business;
        return (matchEmail || matchBiz) ? { ...l, "Email Status": status } : l;
      });

      await env.LEADS_KV.put("all_leads", JSON.stringify(updated));
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
