import { withAuth } from '../../lib/auth';
import { getPublicationStats } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();
  const stats = await getPublicationStats(supabase);
  return res.json(stats);
});
