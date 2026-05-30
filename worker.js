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

    // 🛡️ Guardrail Check: Check if KV is bound correctly
    if (!env.LEADPILOT_KV) {
      return new Response(JSON.stringify({ error: "KV Namespace binding 'LEADPILOT_KV' is missing in wrangler.toml!" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // 1. ENDPOINT TO ACCEPT POST DATA (Handles both Bulk Python Sync & Single Button Clicks)
    if (url.pathname === "/api/leads" && request.method === "POST") {
      try {
        const body = await request.json();
        
        // CASE A: Bulk Upload / Python Engine Sync
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

            // FIX: Dono fields ko support karein taake Python aur Frontend dono sync rahein
            const updatedStatus = newLead.status || newLead['Email Status'] || 'Pending';

            let foundIdx = currentLeadsStore.findIndex(existing => {
              const exWeb = (existing.website || existing['Website'] || '').trim().toLowerCase();
              const exName = (existing.business || existing['Business Name'] || '').trim().toLowerCase();
              return exWeb === newWebsite && exName === newName;
            });

            if (foundIdx === -1) {
              // Normalize data properties for Frontend uniformity
              newLead.status = updatedStatus;
              currentLeadsStore.push(newLead);
            } else {
              // Agar lead pehle se hai, to data merge karein aur status force update karein
              currentLeadsStore[foundIdx] = { 
                ...currentLeadsStore[foundIdx], 
                ...newLead,
                status: updatedStatus 
              };
            }
          });

          // Permanent lock into KV database
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
        
        // CASE B: SINGLE LEAD UPDATE (Jab frontend dashboard se manual button click ho)
        if (body && body.action === "update_status") {
          const storedData = await env.LEADPILOT_KV.get("leads_database");
          let currentLeadsStore = storedData ? JSON.parse(storedData) : [];
          
          let found = currentLeadsStore.find(l => (l.business === body.business || l['Business Name'] === body.business));
          if (found) {
            found.status = body.status; // Directly change status to 'Sent'
            await env.LEADPILOT_KV.put("leads_database", JSON.stringify(currentLeadsStore));
            return new Response(JSON.stringify({ success: true, message: "Status updated directly from Dashboard!" }), { 
              status: 200, 
              headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
          } else {
            return new Response(JSON.stringify({ error: "Lead not found in database" }), { status: 404, headers: corsHeaders });
          }
        }

        return new Response(JSON.stringify({ error: "Invalid format payload" }), { status: 400, headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. ENDPOINT FOR FRONTEND INTERFACE (To read current database safely with Mock Feed)
    if (url.pathname === "/api/leads" && request.method === "GET") {
      try {
        // Direct KV storage se permanent data pull karein
        const storedData = await env.LEADPILOT_KV.get("leads_database");
        const leadsArray = storedData ? JSON.parse(storedData) : [];

        // ✅ FIXED: Mock responses are now fully restored for the dashboard hot leads feed card
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
