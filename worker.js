// Global memory state for leads tracking across endpoints
let leadsStore = [];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS Headers handling
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Endpoint to accept POST data from Python Engine
    if (url.pathname === "/api/leads" && request.method === "POST") {
      try {
        const body = await request.json();
        if (body && Array.isArray(body.leads)) {
          // Add new leads and prevent exact duplicate URLs
          const incomingLeads = body.leads;
          incomingLeads.forEach(newLead => {
            if (!leadsStore.some(existing => existing.website === newLead.website && existing.business === newLead.business)) {
              leadsStore.push(newLead);
            } else {
              // Update status if it already exists
              let found = leadsStore.find(existing => existing.website === newLead.website && existing.business === newLead.business);
              if(found) found.status = newLead.status;
            }
          });
          
          return new Response(JSON.stringify({ success: true, message: "Leads database synched live!" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        return new Response(JSON.stringify({ error: "Invalid layout array format" }), { status: 400, headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Endpoint for Frontend interface to read current leads array
    if (url.pathname === "/api/leads" && request.method === "GET") {
      return new Response(JSON.stringify({ leads: leadsStore }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response("LeadPilot Worker Engine Active", { status: 200 });
  }
};
