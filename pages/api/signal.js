import { withAuth } from '../../lib/auth';
import { upsertSignal, getAllSignals } from '../../lib/db';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { postUrl, signal, weekLabel } = req.body;
  if (!postUrl || !signal || !weekLabel) {
    return res.status(400).json({ error: 'postUrl, signal, and weekLabel required' });
  }
  const validSignal = signal === 'up' || signal === 'read' || signal === 'down' || signal.startsWith('down:');
  if (!validSignal) {
    return res.status(400).json({ error: 'signal must be up, read, down, or down:<reason>' });
  }

  try {
    await upsertSignal(supabase, user.id, postUrl, signal, weekLabel);
    const all = await getAllSignals(supabase, user.id);
    const upCount   = all.filter(s => s.signal === 'up').length;
    const downCount = all.filter(s => s.signal === 'down' || s.signal.startsWith('down:')).length;
    return res.json({ success: true, upCount, downCount });
  } catch (err) {
    console.error('[signal] DB error:', err.message);
    return res.status(500).json({ error: 'Could not save signal' });
  }
});
