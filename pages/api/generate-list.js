import { withAuth } from '../../lib/auth';
import { getPostsByType, getRecentPosts, getProfile, saveWeeklyList, getAllSignals } from '../../lib/db';
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

  const { active, reference } = await getPostsByType(supabase, 30);
  const stackPool = active.length >= 2 ? active : await getRecentPosts(supabase, 30);

  const profile     = await getProfile(supabase);
  const profileText = profile?.interests || '';
  const signals     = await getAllSignals(supabase);
  const likedUrls   = signals.filter(s => s.signal === 'up').map(s => s.post_url).slice(0, 20);
  const skippedUrls = signals.filter(s => s.signal === 'down').map(s => s.post_url).slice(0, 20);

  // ── Section 1: Fresh Discoveries ──
  let discoveryPool = [];
  try {
    const existingNames = [
      ...stackPool.map(p => p.publication_name),
      ...reference.map(p => p.publication_name),
    ].filter(Boolean);
    discoveryPool = await discoverPosts(profileText, existingNames, 50);
    if (excludeUrls.length) discoveryPool = discoveryPool.filter(p => !excludeUrls.includes(p.url));
  } catch (err) {
    console.warn('[generate-list] Discovery failed (non-fatal):', err.message);
  }

  // ── Section 2: From Your Stack ──
  let stackCandidates = stackPool.filter(p => !skippedUrls.includes(p.url));
  if (excludeUrls.length) stackCandidates = stackCandidates.filter(p => !excludeUrls.includes(p.url));
  if (stackCandidates.length < 3) stackCandidates = stackPool;

  console.log(`[generate-list] Pools — discovery: ${discoveryPool.length} | stack: ${stackCandidates.length}`);

  const TOTAL_TARGET = 10;
  const hasStack     = stackCandidates.length >= 2;
  const stackTarget  = hasStack ? 3 : 0;
  const discoverTarget = TOTAL_TARGET - stackTarget; // 10 if no stack, 7 if stack exists

  const rankOpts = { likedUrls, skippedUrls, reference };

  const [discoverResult, stackResult] = await Promise.all([
    discoveryPool.length >= 3
      ? rankSection(discoveryPool, profileText, rankOpts, 'discover', discoverTarget)
      : Promise.resolve([]),
    hasStack
      ? rankSection(stackCandidates, profileText, rankOpts, 'stack', stackTarget)
      : Promise.resolve([]),
  ]);

  // If discovery came up short, try to backfill from whatever pool had more posts
  let combined = [...discoverResult, ...stackResult];
  if (combined.length < TOTAL_TARGET && discoverResult.length < discoverTarget && discoveryPool.length > discoverResult.length) {
    const usedUrls = new Set(combined.map(p => p.url));
    const extras = discoveryPool
      .filter(p => !usedUrls.has(p.url))
      .slice(0, TOTAL_TARGET - combined.length)
      .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Expands your reading across matched publications.' }));
    combined = [...combined, ...extras];
  }

  // Last resort: if ranking returned nothing but discovery pool has posts, serve them directly
  if (combined.length === 0 && discoveryPool.length > 0) {
    console.warn('[generate-list] Ranking returned 0 — falling back to raw discovery pool');
    combined = discoveryPool
      .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
      .slice(0, TOTAL_TARGET)
      .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your reading profile.' }));
  }

  if (combined.length === 0) {
    return res.status(400).json({ error: 'Could not find posts right now. Please try again in a moment.' });
  }
  const weekLabel = getWeekLabel();
  await saveWeeklyList(supabase, user.id, weekLabel, combined);

  return res.json({
    success: true,
    weekLabel,
    posts: combined,
    meta: {
      discoveryCount: discoverResult.length,
      stackCount: stackResult.length,
      total: combined.length,
    },
  });
});

async function rankSection(pool, profile, { likedUrls, skippedUrls, reference }, section, count) {
  try {
    return await rankPosts(pool, profile, likedUrls, skippedUrls, reference, { count, section });
  } catch {
    try {
      const fallback = localRankFallback(pool, profile, likedUrls, skippedUrls);
      return fallback.slice(0, count).map(p => ({ ...p, section }));
    } catch {
      return [];
    }
  }
}
