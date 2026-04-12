import { withAuth } from '../../lib/auth';
import { getProfile, saveWeeklyList, getAllSignals } from '../../lib/db';
import { rankPosts, localRankFallback } from '../../lib/claude';
import { discoverPosts } from '../../lib/substack-discover';

function getWeekLabel() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { excludeUrls = [] } = req.body || {};

  // Load profile
  const profile     = await getProfile(supabase);
  const profileText = (profile?.interests || '').trim();

  if (!profileText) {
    return res.status(400).json({ error: 'No interests set. Please tell us what you want to read about first.' });
  }

  // Load signals so we can personalise ranking
  let likedUrls   = [];
  let skippedUrls = [];
  try {
    const signals = await getAllSignals(supabase);
    likedUrls   = signals.filter(s => s.signal === 'up').map(s => s.post_url).slice(0, 20);
    skippedUrls = signals.filter(s => s.signal === 'down').map(s => s.post_url).slice(0, 20);
  } catch { /* signals are optional */ }

  // Discover posts from Substack directly based on user interests
  let pool = [];
  try {
    pool = await discoverPosts(profileText, [], 60);
    if (excludeUrls.length) pool = pool.filter(p => !excludeUrls.includes(p.url));
  } catch (err) {
    console.error('[generate-list] Discovery error:', err.message);
    return res.status(500).json({ error: 'Could not reach Substack right now. Please try again.' });
  }

  console.log(`[generate-list] Discovery pool: ${pool.length} posts`);

  if (pool.length === 0) {
    return res.status(400).json({ error: 'No Substack posts found for your interests. Try different keywords.' });
  }

  // Rank with Claude, fall back to local scoring if Claude fails
  const TARGET = 10;
  let ranked = [];

  try {
    ranked = await rankPosts(pool, profileText, likedUrls, skippedUrls, [], { count: TARGET, section: 'discover' });
  } catch (err) {
    console.warn('[generate-list] Claude ranking failed, using local fallback:', err.message);
    try {
      ranked = localRankFallback(pool, profileText, likedUrls, skippedUrls)
        .slice(0, TARGET)
        .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your reading interests.' }));
    } catch {
      // Last resort: just serve top-scored posts directly
      ranked = pool
        .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
        .slice(0, TARGET)
        .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your reading interests.' }));
    }
  }

  if (ranked.length === 0) {
    // Absolute fallback — give them top scored without ranking
    ranked = pool
      .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
      .slice(0, TARGET)
      .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your reading interests.' }));
  }

  const weekLabel = getWeekLabel();
  await saveWeeklyList(supabase, user.id, weekLabel, ranked);

  return res.json({
    success: true,
    weekLabel,
    posts: ranked,
    meta: { discoveryCount: ranked.length, stackCount: 0, total: ranked.length },
  });
});
