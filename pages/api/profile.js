import { withAuth } from '../../lib/auth';
import { getProfile, updateProfile } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method === 'GET') {
    const profile = await getProfile(supabase);
    return res.json(profile || { interests: '' });
  }

  if (req.method === 'POST') {
    const { interests } = req.body;
    if (interests === undefined) return res.status(400).json({ error: 'interests required' });
    await updateProfile(supabase, user.id, interests);
    return res.json({ success: true });
  }

  res.status(405).end();
});
