import { withAuth } from '../../lib/auth';
import { getProfile, saveWeeklyList, getAllSignals } from '../../lib/db';
import { rankPosts, localRankFallback, generateSearchQueries, suggestPublications, suggestSpecificPosts, enrichAndFilterPool } from '../../lib/claude';
import { discoverPosts, discoverFromSuggestedPubs } from '../../lib/substack-discover';

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

  const { excludeUrls = [], interests: bodyInterests, mode = 'quick', preferredPubs = [] } = req.body || {};
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

  // ── Step 1: Claude generates refined goal + suggests best publications ────────
  let refinedGoal = profileText;
  let suggestedPubUrls = [];
  try {
    const [queryData, pubUrls] = await Promise.all([
      generateSearchQueries(profileText, mode),
      suggestPublications(profileText),
    ]);
    refinedGoal      = queryData.refinedGoal || profileText;
    suggestedPubUrls = pubUrls;
    console.log(`[generate-list] Suggested pubs: ${suggestedPubUrls.join(', ')}`);
  } catch (err) {
    console.warn('[generate-list] Step 1 failed:', err.message);
  }

  const profileWords = (refinedGoal || profileText).toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);

  // ── Step 2: PRIMARY — Claude directly names specific posts it knows about ──
  let pool = [];
  try {
    const claudePosts = await suggestSpecificPosts(refinedGoal || profileText, mode);
    pool = claudePosts; // no HEAD-check — enrichAndFilterPool handles real verification
    console.log(`[generate-list] Claude-suggested: ${pool.length} posts (pending enrichment)`);
  } catch (err) {
    console.warn('[generate-list] suggestSpecificPosts failed:', err.message);
  }

  // ── Step 3: AUGMENT — always fetch real posts from real publications ────────
  // Run unconditionally: real Substack posts are more reliable than Claude-suggested URLs
  if (suggestedPubUrls.length > 0) {
    try {
      const pubPosts = await discoverFromSuggestedPubs(suggestedPubUrls, profileWords, TARGET * 8);
      const seenUrls = new Set(pool.map(p => p.url));
      for (const p of pubPosts) {
        if (!seenUrls.has(p.url)) { pool.push(p); seenUrls.add(p.url); }
      }
      console.log(`[generate-list] After pub augment: ${pool.length} posts`);
    } catch (err) {
      console.warn('[generate-list] discoverFromSuggestedPubs failed:', err.message);
    }
  }

  // ── Step 3b: ENRICH + FILTER — scrape bodies, score semantically ──────────
  try {
    pool = await enrichAndFilterPool(pool, refinedGoal || profileText);
    console.log(`[generate-list] After semantic filter: ${pool.length} posts`);
  } catch (err) {
    console.warn('[generate-list] enrichAndFilterPool failed:', err.message);
  }

  // ── Step 4: FALLBACK — category-based discovery if pool still thin ─────────
  if (pool.length < TARGET * 2) {
    console.log(`[generate-list] Pool still thin (${pool.length}) — falling back to category discovery`);
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

  // Hard filter: Substack only — drop anything not on substack.com
  pool = pool.filter(p => p.url && p.url.includes('substack.com'));

  if (excludeUrls.length) pool = pool.filter(p => !excludeUrls.includes(p.url));

  console.log(`[generate-list] Pool: ${pool.length} posts for "${profileText.slice(0, 60)}"`);

  if (pool.length === 0) {
    return res.status(400).json({ error: 'No Substack posts found for your interests. Try different keywords.' });
  }

  // Rank — Claude first, then local fallback, then raw score sort
  let ranked = [];
  try {
    ranked = (await rankPosts(pool, refinedGoal || profileText, likedUrls, skippedUrls, [], { count: TARGET, mode, preferredPubs }))
      .map(p => ({ ...p, section: p.section || 'discover' }));
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

  ranked = ranked.filter(p => p.url && p.title);

  // Final relevance guard: drop any post that has zero keyword overlap with the goal
  // Uses broad match so synonyms / related terms count (e.g. "ai" matches "artificial intelligence")
  const goalLower = (refinedGoal || profileText).toLowerCase();
  const goalTokens = goalLower.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  if (goalTokens.length > 0) {
    ranked = ranked.filter(p => {
      const text = `${p.title || ''} ${p.description || ''} ${p.publication_name || ''}`.toLowerCase();
      return goalTokens.some(w => text.includes(w));
    });
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
