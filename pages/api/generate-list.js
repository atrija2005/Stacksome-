import { withAuth } from '../../lib/auth';
import { getProfile, saveWeeklyList, getAllSignals } from '../../lib/db';
import { rankPosts, localRankFallback, generateSearchQueries, suggestPublications } from '../../lib/claude';
import { discoverPosts, discoverBySearch, discoverFromSuggestedPubs } from '../../lib/substack-discover';

const TARGET_QUICK = 5; // quick curriculum
const TARGET_DEEP  = 7; // deep dive — one post per angle

function getWeekLabel() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { excludeUrls = [], interests: bodyInterests, mode = 'quick' } = req.body || {};
  const TARGET = mode === 'deep' ? TARGET_DEEP : TARGET_QUICK;

  // Load profile — wrapped so a missing table doesn't crash everything
  let profileText = (bodyInterests || '').trim();
  if (!profileText) {
    try {
      const profile = await getProfile(supabase, user.id);
      profileText   = (profile?.interests || '').trim();
    } catch (err) {
      console.warn('[generate-list] getProfile failed:', err.message);
    }
  }

  if (!profileText) {
    return res.status(400).json({ error: 'No interests set — please tell us what you want to read about first.' });
  }

  // Signals for personalised ranking (optional — safe to fail)
  let likedUrls = [], skippedUrls = [];
  try {
    const signals = await getAllSignals(supabase, user.id);
    likedUrls   = signals.filter(s => s.signal === 'up').map(s => s.post_url).slice(0, 20);
    skippedUrls = signals.filter(s => s.signal === 'down' || s.signal.startsWith('down:')).map(s => s.post_url).slice(0, 20);
  } catch { /* non-fatal */ }

  // ── Step 1: Claude generates search queries + suggests best publications ──────
  let refinedGoal = profileText;
  let searchQueries = [];
  let suggestedPubUrls = [];
  try {
    const [queryData, pubUrls] = await Promise.all([
      generateSearchQueries(profileText, mode),
      suggestPublications(profileText),
    ]);
    refinedGoal      = queryData.refinedGoal || profileText;
    searchQueries    = queryData.queries     || [];
    suggestedPubUrls = pubUrls;
    console.log(`[generate-list] Queries: ${searchQueries.join(' | ')}`);
    console.log(`[generate-list] Suggested pubs: ${suggestedPubUrls.join(', ')}`);
  } catch (err) {
    console.warn('[generate-list] Step 1 failed:', err.message);
  }

  // ── Step 2: PRIMARY — fetch from Claude-suggested pubs with engagement scoring
  let pool = [];
  const profileWords = (refinedGoal || profileText).toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);

  try {
    if (suggestedPubUrls.length > 0) {
      pool = await discoverFromSuggestedPubs(suggestedPubUrls, profileWords, TARGET * 10);
    }
  } catch (err) {
    console.warn('[generate-list] discoverFromSuggestedPubs failed:', err.message);
  }

  // ── Step 3: AUGMENT — category-based discovery to fill the pool ───────────
  if (pool.length < TARGET * 3) {
    console.log(`[generate-list] Pool thin (${pool.length}) — augmenting with category discovery`);
    try {
      const fallback = await discoverPosts(profileText, [], TARGET * 6);
      const seenUrls = new Set(pool.map(p => p.url));
      for (const p of fallback) {
        if (!seenUrls.has(p.url)) { pool.push(p); seenUrls.add(p.url); }
      }
    } catch (err) {
      console.warn('[generate-list] Category discovery failed:', err.message);
      if (pool.length === 0) {
        return res.status(500).json({ error: 'Could not reach Substack right now. Please try again.' });
      }
    }
  }

  if (excludeUrls.length) pool = pool.filter(p => !excludeUrls.includes(p.url));

  console.log(`[generate-list] Pool: ${pool.length} posts for "${profileText.slice(0, 60)}"`);

  if (pool.length === 0) {
    return res.status(400).json({ error: 'No Substack posts found for your interests. Try different keywords.' });
  }

  // Rank — Claude first, then local fallback, then raw score sort
  let ranked = [];
  try {
    ranked = await rankPosts(pool, refinedGoal || profileText, likedUrls, skippedUrls, [], { count: TARGET, mode });
  } catch (err) {
    console.warn('[generate-list] Claude ranking failed:', err.message);
    try {
      ranked = localRankFallback(pool, profileText, likedUrls, skippedUrls)
        .slice(0, TARGET)
        .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your interests.' }));
    } catch {
      ranked = pool
        .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
        .slice(0, TARGET)
        .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your interests.' }));
    }
  }

  if (ranked.length === 0) {
    ranked = pool
      .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
      .slice(0, TARGET)
      .map(p => ({ ...p, section: 'discover', type: 'core', why: 'Matched to your interests.' }));
  }

  // Save to DB — wrapped so a missing table doesn't crash the response
  try {
    const weekLabel = getWeekLabel();
    await saveWeeklyList(supabase, user.id, weekLabel, ranked);
    return res.json({ success: true, weekLabel, posts: ranked, mode, meta: { total: ranked.length } });
  } catch (err) {
    console.warn('[generate-list] saveWeeklyList failed (returning posts anyway):', err.message);
    return res.json({ success: true, weekLabel: getWeekLabel(), posts: ranked, mode, meta: { total: ranked.length } });
  }
});
