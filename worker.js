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

    // Check if KV is bound correctly
    if (!env.LEADPILOT_KV) {
      return new Response(JSON.stringify({ error: "KV Namespace binding 'LEADPILOT_KV' is missing in wrangler.toml!" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // 1. ENDPOINT TO ACCEPT POST DATA (From Python Scraper or Frontend Upload)
    if (url.pathname === "/api/leads" && request.method === "POST") {
      try {
        const body = await request.json();
        if (body && Array.isArray(body.leads)) {
          const incomingLeads = body.leads;

          // KV Storage se pehle se majood permanent leads nikalyein
          const storedData = await env.LEADPILOT_KV.get("leads_database");
          let currentLeadsStore = storedData ? JSON.parse(storedData) : [];

          // Deduplication & Update Engine
          incomingLeads.forEach(newLead => {
            // Keys safely normalize karein check ke liye
            const newWebsite = (newLead.website || newLead['Website'] || '').trim().toLowerCase();
            const newName = (newLead.business || newLead['Business Name'] || '').trim().toLowerCase();

            let foundIdx = currentLeadsStore.findIndex(existing => {
              const exWeb = (existing.website || existing['Website'] || '').trim().toLowerCase();
              const exName = (existing.business || existing['Business Name'] || '').trim().toLowerCase();
              return exWeb === newWebsite && exName === newName;
            });

            if (foundIdx === -1) {
              // Agar nayi lead hai to push karein
              currentLeadsStore.push(newLead);
            } else {
              // Agar lead pehle se hai, to status aur fields update karein
              currentLeadsStore[foundIdx] = { ...currentLeadsStore[foundIdx], ...newLead };
            }
          });

          // UPDATE COLD DATABASE: Ab hamesha ke liye KV database mein lock kar dein
          await env.LEADPILOT_KV.put("leads_database", JSON.stringify(currentLeadsStore));
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Leads database synced permanently to Cloudflare KV!",
            total_records: currentLeadsStore.length 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        return new Response(JSON.stringify({ error: "Invalid layout array format" }), { status: 400, headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. ENDPOINT FOR FRONTEND INTERFACE (To read current leads safely)
    if (url.pathname === "/api/leads" && request.method === "GET") {
      try {
        // Direct KV storage se permanent data pull karein
        const storedData = await env.LEADPILOT_KV.get("leads_database");
        const leadsArray = storedData ? JSON.parse(storedData) : [];

        // Mock hot email responses for the inbox feed card container
        const mockReplies = [
          { 
            sender: "info@vancouverdining.ca", 
            subject: "Re: Website Layout Proposal", 
            snippet: "Hi Faaiz, looked at your audit report. Our mobile viewport is indeed broken. Can you send over a custom package link?" 
          }
        ];

        return new Response(JSON.stringify({ leads: leadsArray, replies: mockReplies }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("LeadPilot Worker Engine Active & Secured with KV Storage", { status: 200 });
  }
};
