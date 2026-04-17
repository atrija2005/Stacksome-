import { withAuth } from '../../lib/auth';
import { getProfile, updateProfile } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method === 'GET') {
    try {
      const profile = await getProfile(supabase, user.id);
      return res.json(profile || { interests: '' });
    } catch {
      return res.json({ interests: '' });
    }
  }

  if (req.method === 'POST') {
    const { interests } = req.body;
    if (interests === undefined) return res.status(400).json({ error: 'interests required' });
    try {
      await updateProfile(supabase, user.id, interests);
    } catch (err) {
      console.warn('[profile] updateProfile failed (non-fatal):', err.message);
      // Don't crash — the interests will still be passed directly to generate-list
    }
    return res.json({ success: true, interests });
  }

  res.status(405).end();
});
