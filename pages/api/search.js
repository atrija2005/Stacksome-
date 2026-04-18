import { withAuth } from '../../lib/auth';
import { getRecentPosts } from '../../lib/db';
import { suggestPublications } from '../../lib/claude';
import { discoverFromSuggestedPubs } from '../../lib/substack-discover';

function scorePost(post, keywords) {
  const t = (post.title || '').toLowerCase();
  const d = (post.description || '').toLowerCase();
  let sc = 0;
  for (const w of keywords) {
    if (t.includes(w)) sc += 8;
    if (d.includes(w)) sc += 2;
  }
  if (/reading list|top links|roundup|weekly digest|things i read/i.test(t)) sc -= 25;
  return sc;
}

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();

  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'query required' });

  const keywords = q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const topicLabel = q.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // ── 1. User's saved library ─────────────────────────────────────────────
  let libraryResults = [];
  try {
    const all = await getRecentPosts(supabase, user.id, 180);
    libraryResults = all
      .map(p => ({ ...p, _score: scorePost(p, keywords) }))
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10)
      .map(p => ({
        publication: p.publication_name || 'Unknown',
        title:       p.title,
        url:         p.url,
        description: p.description || '',
        topic:       topicLabel,
        _score:      p._score,
        _source:     'library',
      }));
  } catch {}

  // ── 2. Live Substack discovery — Claude suggests pubs + engagement scoring
  let liveResults = [];
  try {
    const pubUrls = await suggestPublications(q);
    if (pubUrls.length > 0) {
      const posts = await discoverFromSuggestedPubs(pubUrls, keywords, 40);
      liveResults = posts
        .filter(p => p._profileScore > 0)
        .map(p => ({
          publication: p.publication_name,
          title:       p.title,
          url:         p.url,
          description: p.description || '',
          topic:       topicLabel,
          _score:      p._profileScore,
          _engagement: p._engagement || 0,
          _source:     'live',
        }));
    }
  } catch (err) {
    console.warn('[search] live discovery failed:', err.message);
  }

  // ── 3. Merge — library first, then live, dedupe, max 2 per pub ─────────
  const seen     = new Set();
  const pubCount = {};
  const merged   = [];

  for (const p of [...libraryResults, ...liveResults]) {
    if (!p.url || !p.title || seen.has(p.url)) continue;
    if ((pubCount[p.publication] || 0) >= 2) continue;
    seen.add(p.url);
    pubCount[p.publication] = (pubCount[p.publication] || 0) + 1;
    merged.push(p);
    if (merged.length >= 30) break;
  }

  if (merged.length === 0) {
    return res.json({
      results: [],
      query:   q,
      message: `No articles found for "${q}". Try something like "AI", "fintech", or "startups".`,
    });
  }

  return res.json({ results: merged, query: q });
});
