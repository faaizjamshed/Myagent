export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/leads') {
      const leads = [
        { business:'Prime Cut Barbers', niche:'Barber', country:'UK', city:'Manchester', email:'hello@primecutbarbers.co.uk', website:'primecutbarbers.co.uk', score:88, status:'Ready to email' },
        { business:'Maple Core Fitness', niche:'Gym', country:'Canada', city:'Toronto', email:'team@maplecorefitness.ca', website:'maplecorefitness.ca', score:91, status:'High priority' },
        { business:'Riverside Family Clinic', niche:'Clinic', country:'USA', city:'Austin', email:'contact@riversidefamilyclinic.com', website:'riversidefamilyclinic.com', score:84, status:'Needs review' },
        { business:'Urban Flame Kitchen', niche:'Restaurant', country:'USA', city:'Chicago', email:'info@urbanflamekitchen.com', website:'urbanflamekitchen.com', score:79, status:'Draft email ready' }
      ];
      return Response.json({ leads, source: 'worker-api' });
    }
    return env.ASSETS.fetch(request);
  }
};
