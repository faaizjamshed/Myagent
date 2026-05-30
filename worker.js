export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, app: 'leadpilot-fixed-dashboard' });
    }
    return env.ASSETS.fetch(request);
  }
};
