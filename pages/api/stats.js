import { withAuth } from '../../lib/auth';
import { getStats } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();
  const stats = await getStats(supabase, user.id);
  return res.json(stats);
});
