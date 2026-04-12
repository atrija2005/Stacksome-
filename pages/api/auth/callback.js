import { createServerClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const supabase = createServerClient(req, res);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Error:', error.message);
    return res.redirect('/?error=auth_failed');
  }

  return res.redirect('/');
}
