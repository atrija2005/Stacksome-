import { withAuth } from '../../lib/auth';
import { getPublicationStats } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const stats = await getPublicationStats(supabase, user.id);
    return res.json(stats);
  } catch (err) {
    console.error('[pub-stats] Error:', err.message);
    return res.status(500).json({ error: 'Could not fetch stats' });
  }
});
