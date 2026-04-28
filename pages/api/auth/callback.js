import { createServerClient, createServiceClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const supabase = createServerClient(req, res);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Error:', error.message);
    return res.redirect('/?error=auth_failed');
  }

  // Ensure a profile row exists for this user (upsert — safe to re-run)
  const userId = data?.user?.id;
  let isNewUser = false;
  if (userId) {
    try {
      const service = createServiceClient();

      // Check if profile already has interests (returning user)
      const { data: existing } = await service
        .from('profile')
        .select('interests')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // Brand new — insert profile row and mark as new
        await service.from('profile').insert({
          user_id: userId, interests: '', updated_at: new Date().toISOString(),
        });
        isNewUser = true;
      } else {
        isNewUser = !existing.interests?.trim();
      }
    } catch (err) {
      console.warn('[auth/callback] Could not upsert profile row:', err.message);
    }
  }

  return res.redirect(isNewUser ? '/setup' : '/');
}
