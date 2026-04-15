import { withAuth } from '../../lib/auth';
import { getLatestWeeklyList, getAllWeeklyLists, getWeeklyListById, getSignalsForWeek } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    if (req.query.all) {
      const lists = await getAllWeeklyLists(supabase);
      return res.json(lists);
    }

    if (req.query.id) {
      const list = await getWeeklyListById(supabase, req.query.id);
      if (!list) return res.status(404).json({ error: 'List not found' });
      const signals    = await getSignalsForWeek(supabase, list.week_label);
      const signalMap  = {};
      for (const s of signals) {
        if (!signalMap[s.post_url]) signalMap[s.post_url] = {};
        signalMap[s.post_url][s.signal] = true;
      }
      return res.json({ ...list, signals: signalMap });
    }

    const list = await getLatestWeeklyList(supabase);
    if (!list) return res.json(null);

    const signals   = await getSignalsForWeek(supabase, list.week_label);
    const signalMap = {};
    for (const s of signals) {
      if (!signalMap[s.post_url]) signalMap[s.post_url] = {};
      signalMap[s.post_url][s.signal] = true;
    }
    return res.json({ ...list, signals: signalMap });

  } catch (err) {
    console.warn('[weekly-list] DB error (returning null):', err.message);
    return res.json(null); // treat as "no list yet" — don't crash the app
  }
});
