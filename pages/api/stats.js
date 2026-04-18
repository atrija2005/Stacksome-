import { withAuth } from '../../lib/auth';
import { getStats } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const stats = await getStats(supabase, user.id);
    return res.json(stats);
  } catch (err) {
    console.error('[stats] Error:', err.message);
    return res.status(500).json({ error: 'Could not fetch stats' });
  }
});
