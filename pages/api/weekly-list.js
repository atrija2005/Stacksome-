import { withAuth } from '../../lib/auth';
import { getLatestWeeklyList, getAllWeeklyLists, getWeeklyListById, getSignalsForWeek } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();

  // ?all=true — return all lists (for history page)
  if (req.query.all) {
    const lists = await getAllWeeklyLists(supabase);
    return res.json(lists);
  }

  // ?id=123 — return a specific list
  if (req.query.id) {
    const list = await getWeeklyListById(supabase, req.query.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    const signals = await getSignalsForWeek(supabase, list.week_label);
    const signalMap = {};
    for (const s of signals) {
      if (!signalMap[s.post_url]) signalMap[s.post_url] = {};
      signalMap[s.post_url][s.signal] = true;
    }
    return res.json({ ...list, signals: signalMap });
  }

  // Default: latest list
  const list = await getLatestWeeklyList(supabase);
  if (!list) return res.json(null);

  const signals = await getSignalsForWeek(supabase, list.week_label);
  const signalMap = {};
  for (const s of signals) {
    if (!signalMap[s.post_url]) signalMap[s.post_url] = {};
    signalMap[s.post_url][s.signal] = true;
  }

  return res.json({ ...list, signals: signalMap });
});
