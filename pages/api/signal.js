import { withAuth } from '../../lib/auth';
import { upsertSignal, getAllSignals } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { postUrl, signal, weekLabel } = req.body;
  if (!postUrl || !signal || !weekLabel) {
    return res.status(400).json({ error: 'postUrl, signal, and weekLabel required' });
  }
  if (!['up', 'down', 'read'].includes(signal)) {
    return res.status(400).json({ error: 'signal must be up, down, or read' });
  }

  await upsertSignal(supabase, user.id, postUrl, signal, weekLabel);

  const all = await getAllSignals(supabase);
  const upCount   = all.filter(s => s.signal === 'up').length;
  const downCount = all.filter(s => s.signal === 'down').length;

  return res.json({ success: true, upCount, downCount });
});
