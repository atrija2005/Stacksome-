const { createServerClient, createServiceClient } = require('./supabase');

// Fixed dev user ID — used when Google OAuth is not yet set up
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

function withAuth(handler) {
  return async (req, res) => {
    try {
      // ── Dev bypass (no real auth yet) ──────────────────────────────────
      if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true') {
        const supabase = createServiceClient();
        const devUser  = { id: DEV_USER_ID, email: 'dev@stacksome.local' };
        return await handler(req, res, devUser, supabase);
      }

      // ── Production: real Supabase auth ─────────────────────────────────
      const supabase = createServerClient(req, res);
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      return await handler(req, res, user, supabase);
    } catch (err) {
      console.error('[withAuth] Unexpected error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { withAuth };
