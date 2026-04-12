const { createBrowserClient: _createBrowserClient } = require('@supabase/ssr');
const { createServerClient: _createServerClient } = require('@supabase/ssr');
const { createClient } = require('@supabase/supabase-js');
const { serialize, parse } = require('cookie');

/**
 * Browser-side Supabase client (for React components / pages).
 * Uses NEXT_PUBLIC_* env vars exposed to the browser.
 */
function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server-side Supabase client (for API routes).
 * Reads/writes auth cookies via Next.js req/res.
 */
function createServerClient(req, res) {
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          // Parse cookies from the request
          const cookies = req.cookies || {};
          return Object.entries(cookies).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          // Set cookies on the response
          const existing = res.getHeader('Set-Cookie') || [];
          const current = Array.isArray(existing) ? existing : [existing].filter(Boolean);

          for (const { name, value, options } of cookiesToSet) {
            current.push(serialize(name, value, {
              path: '/',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 7 days
              ...options,
            }));
          }
          res.setHeader('Set-Cookie', current);
        },
      },
    }
  );
}

/**
 * Service-role client (bypasses RLS). Use sparingly.
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

module.exports = { createBrowserClient, createServerClient, createServiceClient };
