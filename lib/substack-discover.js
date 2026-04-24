/**
 * Stacksome Discovery Engine v3
 *
 * How it works:
 *   1. Extract keywords from user's interest text
 *   2. Map keywords → Substack category IDs (real categories from substack.com/api/v1/categories)
 *   3. Fetch top publications from those categories via Substack's category API
 *   4. Fetch recent posts from each publication (Posts API → RSS → Sitemap)
 *   5. Score every post against user keywords
 *   6. Return top N ranked by relevance
 *
 * This means the discovery pool is 100% dynamic — searching actual Substack
 * publications relevant to what the user typed, not a hardcoded list.
 */

'use strict';

const Parser = require('rss-parser');

const rssParser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)' },
  customFields: { item: ['description', 'content:encoded'] },
});

// ── In-memory cache ───────────────────────────────────────────────────────────
const FETCH_CACHE    = new Map(); // feedUrl → { posts, ts }
const CATEGORY_CACHE = new Map(); // categoryId → { pubs, ts }
const CACHE_TTL      = 20 * 60 * 1000; // 20 min

// ── Substack category IDs (from /api/v1/categories) ──────────────────────────
// keyword → array of category IDs to search
const KEYWORD_CATEGORIES = {
  // Education & Learning
  education:       [34],
  learning:        [34],
  teaching:        [34],
  school:          [34],
  academic:        [34],
  university:      [34],
  classroom:       [34],
  curriculum:      [34],
  literacy:        [34],
  stem:            [34, 4],

  // Child & Parenting
  child:           [1796, 34],
  children:        [1796, 34],
  parenting:       [1796],
  kids:            [1796, 34],
  family:          [1796],
  baby:            [1796],
  toddler:         [1796],
  development:     [1796, 34, 134],
  adolescent:      [1796, 34],
  motherhood:      [1796],
  fatherhood:      [1796],
  childhood:       [1796, 34],

  // Technology & AI
  technology:      [4],
  tech:            [4],
  ai:              [4],
  'artificial intelligence': [4],
  'machine learning': [4],
  software:        [4],
  coding:          [4],
  programming:     [4],
  startup:         [4, 62],
  crypto:          [118],
  blockchain:      [118],

  // Business & Startups
  business:        [62],
  entrepreneur:    [62],
  founder:         [62],
  venture:         [62],
  marketing:       [62],
  strategy:        [62],
  management:      [62],
  leadership:      [62],
  productivity:    [62],
  career:          [62],

  // Finance & Economics
  finance:         [153],
  investing:       [153],
  stocks:          [153],
  markets:         [153],
  economics:       [153, 62],
  money:           [153],
  trading:         [153],
  banking:         [153],
  wealth:          [153],

  // Science
  science:         [134],
  research:        [134],
  biology:         [134],
  chemistry:       [134],
  physics:         [134],
  space:           [134],
  neuroscience:    [134, 355],
  psychology:      [355, 134],

  // Health & Wellness
  health:          [355],
  wellness:        [355],
  fitness:         [355],
  nutrition:       [355],
  'mental health': [355],
  medicine:        [355, 134],
  therapy:         [355],
  longevity:       [355, 134],

  // Philosophy & Ideas
  philosophy:      [114],
  ethics:          [114],
  consciousness:   [114],
  rationality:     [114],
  ideas:           [114],
  thinking:        [114],

  // Politics & Policy
  politics:        [76739, 76740],
  policy:          [76739],
  government:      [76739],
  democracy:       [76739],
  geopolitics:     [76740],
  international:   [76740, 51282],
  diplomacy:       [76740],
  'foreign policy':[76740],

  // History
  history:         [18],
  historical:      [18],
  civilization:    [18],

  // Culture & Arts
  culture:         [96],
  art:             [15417],
  design:          [61],
  music:           [11],
  film:            [76782],
  literature:      [339],
  writing:         [339],
  fiction:         [284],
  food:            [13645],
  travel:          [109],

  // Climate & Environment
  climate:         [15414],
  environment:     [15414],
  sustainability:  [15414],
  energy:          [15414],
  renewable:       [15414],

  // News
  news:            [103],
};

// Default categories when nothing specific matches
const DEFAULT_CATEGORIES = [4, 62, 134, 355, 114]; // tech, business, science, health, philosophy

// ── Extract interest keywords from raw profile text ───────────────────────────
function extractKeywords(profile) {
  const text = (profile || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const words = text.split(/\s+/).filter(w => w.length > 2);

  // Check multi-word phrases first, then single words
  const matched = new Set();
  for (const [keyword] of Object.entries(KEYWORD_CATEGORIES)) {
    if (text.includes(keyword)) {
      matched.add(keyword);
    }
  }
  // Also check individual words
  for (const word of words) {
    if (KEYWORD_CATEGORIES[word]) {
      matched.add(word);
    }
  }

  return [...matched];
}

// ── Map profile → ordered category IDs (most relevant first) ─────────────────
function getCategories(profile) {
  const keywords = extractKeywords(profile);
  console.log(`[Discovery] Matched keywords: ${keywords.join(', ') || 'none'}`);

  const catScore = new Map();
  for (const kw of keywords) {
    const cats = KEYWORD_CATEGORIES[kw] || [];
    cats.forEach((id, i) => {
      catScore.set(id, (catScore.get(id) || 0) + (cats.length - i));
    });
  }

  let sorted = [...catScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 5); // top 5 most relevant categories

  if (sorted.length === 0) {
    console.log(`[Discovery] No category match — using defaults`);
    sorted = DEFAULT_CATEGORIES;
  }

  console.log(`[Discovery] Categories: ${sorted.join(', ')}`);
  return sorted;
}

// ── Fetch top publications for a Substack category ───────────────────────────
async function fetchCategoryPubs(categoryId) {
  const cached = CATEGORY_CACHE.get(categoryId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.pubs;

  try {
    const url = `https://substack.com/api/v1/category/public/${categoryId}/home?page=0&limit=25`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)', 'Accept': 'application/json' },
      signal: makeAbortSignal(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const pubs = (data.publications || []).map(p => {
      const base = p.custom_domain
        ? `https://${p.custom_domain}`
        : `https://${p.subdomain}.substack.com`;
      return {
        name:    p.name,
        feedUrl: `${base}/feed`,
        baseUrl: base,
      };
    }).filter(p => p.name && p.feedUrl);

    CATEGORY_CACHE.set(categoryId, { pubs, ts: Date.now() });
    console.log(`[Discovery] Category ${categoryId}: ${pubs.length} pubs`);
    return pubs;
  } catch (err) {
    console.warn(`[Discovery] Category ${categoryId} failed:`, err.message);
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(str = '') {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function toIso(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch { return new Date().toISOString(); }
}

function makeAbortSignal(ms) {
  try { return AbortSignal.timeout(ms); } catch { return undefined; }
}

function getBaseUrl(feedUrl) {
  return feedUrl
    .replace(/\/feed\/?$/, '')
    .replace(/\/rss\/?$/, '')
    .replace(/\/atom\.xml\/?$/, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '');
}

// ── Sum reactions object → number ─────────────────────────────────────────────
function sumReactions(reactions) {
  if (!reactions) return 0;
  if (typeof reactions === 'number') return reactions;
  return Object.values(reactions).reduce((a, b) => a + (Number(b) || 0), 0);
}

// ── Score a post against profile keywords + engagement ───────────────────────
function scorePost(post, keywords) {
  const title = (post.title || '').toLowerCase();
  const desc  = (post.description || '').toLowerCase();
  const pub   = (post.publication_name || '').toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    if (title.includes(kw)) score += 6;
    if (desc.includes(kw))  score += 2;
    if (pub.includes(kw))   score += 1;
  }

  // Engagement signal — normalised to max ~40 pts so it boosts but doesn't override relevance
  const engagement = (post._reactions || 0) + (post._comments || 0) * 3 + (post._restacks || 0) * 2;
  score += Math.min(engagement / 5, 40);

  // Penalise roundups / digests
  if (/top links|reading list|roundup|weekly digest|links? of the week|best of the week|things i read|weekend reads|daily links|link dump|issue #\d|vol\.\s*\d/i.test(title)) {
    score -= 30;
  }

  return score;
}

// ── ENRICHED posts API: fetches 50 posts WITH engagement data ─────────────────
async function fetchEnrichedPosts(baseUrl, pubName) {
  const url = `${baseUrl}/api/v1/posts?limit=50&offset=0`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)', 'Accept': 'application/json' },
      signal: makeAbortSignal(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    // Derive pub name from first post's bylines if not provided
    const derivedName = pubName || data[0]?.publishedBylines?.[0]?.name || baseUrl.replace(/^https?:\/\//, '').replace('.substack.com','').replace('www.','');

    return data
      .filter(p => p.title && (p.canonical_url || p.slug) && p.audience !== 'only_paid')
      .map(p => {
        const reactions = sumReactions(p.reactions);
        const comments  = p.comment_count  || 0;
        const restacks  = p.restacks || 0;
        return {
          publication_name: derivedName,
          title:            (p.title || '').trim(),
          description:      stripHtml(p.subtitle || p.truncated_body_text || '').slice(0, 400),
          url:              p.canonical_url || `${baseUrl}/p/${p.slug}`,
          published_at:     toIso(p.post_date),
          _reactions:       reactions,
          _comments:        comments,
          _restacks:        restacks,
          _engagement:      reactions + comments * 3 + restacks * 2,
          _source:          'enriched-api',
        };
      });
  } catch (err) {
    console.warn(`[Discovery] fetchEnrichedPosts failed for ${baseUrl}:`, err.message);
    return [];
  }
}

// ── PRIMARY: Discover from Claude-suggested publications ──────────────────────
async function discoverFromSuggestedPubs(pubUrls, keywords, target = 40) {
  if (!pubUrls || pubUrls.length === 0) return [];

  console.log(`[Discovery] Fetching enriched posts from ${pubUrls.length} suggested pubs`);

  const BATCH = 5;
  const allPosts = [];

  for (let i = 0; i < pubUrls.length; i += BATCH) {
    const batch = pubUrls.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(url => {
      const base = url.replace(/\/$/, '');
      return fetchEnrichedPosts(base, null);
    }));
    for (const r of results) {
      if (r.status === 'fulfilled') allPosts.push(...r.value);
    }
  }

  console.log(`[Discovery] Suggested-pubs pool: ${allPosts.length} posts`);

  // Score by keyword relevance + engagement
  const scored = allPosts
    .filter(p => p.url && p.title && p.title.length > 5)
    .map(p => ({ ...p, _profileScore: scorePost(p, keywords) }));

  // Deduplicate, max 3 per pub
  const seenUrls = new Set();
  const pubCount = {};
  const final    = [];

  scored.sort((a, b) => b._profileScore - a._profileScore);

  for (const p of scored) {
    if (seenUrls.has(p.url)) continue;
    seenUrls.add(p.url);
    const cnt = pubCount[p.publication_name] || 0;
    if (cnt >= 3) continue;
    pubCount[p.publication_name] = cnt + 1;
    final.push(p);
    if (final.length >= target) break;
  }

  console.log(`[Discovery] Suggested-pubs final: ${final.length} posts | Top: ${final.slice(0,3).map(p=>`"${p.title.slice(0,40)}"(score:${p._profileScore?.toFixed(0)},eng:${p._engagement})`).join(' | ')}`);
  return final;
}

// ── LAYER 1: Substack Posts API (50 posts + engagement) ──────────────────────
async function fetchViaPostsAPI(pub) {
  const base   = getBaseUrl(pub.feedUrl);
  const apiUrl = `${base}/api/v1/posts?limit=50&offset=0`;
  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)', 'Accept': 'application/json' },
      signal: makeAbortSignal(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const posts = data
      .filter(p => p.title && (p.canonical_url || p.slug) && p.audience !== 'only_paid')
      .map(p => {
        const reactions = sumReactions(p.reactions);
        const comments  = p.comment_count || 0;
        const restacks  = p.restacks || 0;
        return {
          publication_name: pub.name,
          title:       (p.title || '').trim(),
          description: stripHtml(p.subtitle || p.truncated_body_text || '').slice(0, 400),
          url:         p.canonical_url || `${base}/p/${p.slug}`,
          published_at: toIso(p.post_date),
          _reactions:   reactions,
          _comments:    comments,
          _restacks:    restacks,
          _engagement:  reactions + comments * 3 + restacks * 2,
          _source:      'posts-api',
        };
      });

    return posts.length > 0 ? posts : null;
  } catch { return null; }
}

// ── LAYER 2: RSS ──────────────────────────────────────────────────────────────
async function fetchViaRSS(pub) {
  const base = getBaseUrl(pub.feedUrl);
  const candidates = [pub.feedUrl, `${base}/feed`, `${base}/rss`];

  for (const feedUrl of candidates) {
    try {
      const feed  = await rssParser.parseURL(feedUrl);
      const items = (feed.items || []).slice(0, 20);
      if (items.length === 0) continue;

      const posts = items.map(item => ({
        publication_name: pub.name,
        title:       (item.title || '').trim(),
        description: stripHtml(item['content:encoded'] || item.contentSnippet || '').slice(0, 400),
        url:         item.link || item.guid || '',
        published_at: toIso(item.isoDate || item.pubDate),
        _source: 'rss',
      })).filter(p => p.url && p.title);

      if (posts.length > 0) return posts;
    } catch { /* try next */ }
  }
  return null;
}

// ── LAYER 3: Sitemap ──────────────────────────────────────────────────────────
async function fetchViaSitemap(pub) {
  const base = getBaseUrl(pub.feedUrl);
  try {
    const res = await fetch(`${base}/sitemap.xml`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)' },
      signal: makeAbortSignal(8000),
    });
    if (!res.ok) return null;
    const xml    = await res.text();
    const blocks = xml.split('<url>').slice(1);
    const posts  = [];

    for (const block of blocks) {
      const locMatch     = block.match(/<loc>(.*?)<\/loc>/);
      const lastmodMatch = block.match(/<lastmod>(.*?)<\/lastmod>/);
      if (!locMatch) continue;
      const url = locMatch[1].trim();
      if (!/\/(p|post|article|blog)\//.test(url)) continue;
      const slug  = url.split('/').pop()?.split('?')[0] || '';
      const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (title.length < 4) continue;
      posts.push({
        publication_name: pub.name,
        title,
        description: '',
        url,
        published_at: toIso(lastmodMatch?.[1]),
        _source: 'sitemap',
      });
    }

    posts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    return posts.length > 0 ? posts.slice(0, 30) : null;
  } catch { return null; }
}

// ── Fetch posts from one pub (3-layer) ────────────────────────────────────────
async function fetchPubPosts(pub) {
  const cached = FETCH_CACHE.get(pub.feedUrl);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.posts;

  const posts =
    (await fetchViaPostsAPI(pub)) ||
    (await fetchViaRSS(pub))      ||
    (await fetchViaSitemap(pub))  ||
    [];

  if (posts.length > 0) FETCH_CACHE.set(pub.feedUrl, { posts, ts: Date.now() });
  return posts;
}

// ── MAIN: discoverPosts ───────────────────────────────────────────────────────
async function discoverPosts(profile, existingPubNames = [], targetPosts = 40) {
  const categoryIds = getCategories(profile);
  const keywords    = extractKeywords(profile);

  // Build scoring keywords — the actual words user typed + matched keywords
  const profileWords = (profile || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  const allKeywords = [...new Set([...keywords, ...profileWords])];

  // Fetch pubs from all relevant categories in parallel
  const catResults = await Promise.allSettled(categoryIds.map(id => fetchCategoryPubs(id)));
  const existingLower = new Set((existingPubNames || []).map(n => n.toLowerCase()));

  // Deduplicate pubs across categories
  const seenFeeds = new Set();
  const pubs = [];
  for (const r of catResults) {
    if (r.status !== 'fulfilled') continue;
    for (const pub of r.value) {
      if (seenFeeds.has(pub.feedUrl)) continue;
      if (existingLower.has(pub.name.toLowerCase())) continue;
      seenFeeds.add(pub.feedUrl);
      pubs.push(pub);
    }
  }

  console.log(`[Discovery] ${pubs.length} unique pubs across ${categoryIds.length} categories`);
  if (pubs.length === 0) return [];

  // Fetch posts from all pubs, batched 8 at a time
  const BATCH = 8;
  const allRaw = [];
  for (let i = 0; i < pubs.length; i += BATCH) {
    const batch   = pubs.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(p => fetchPubPosts(p)));
    for (const r of results) {
      if (r.status === 'fulfilled') allRaw.push(...r.value);
    }
  }

  console.log(`[Discovery] Raw pool: ${allRaw.length} posts from ${pubs.length} pubs`);
  if (allRaw.length === 0) return [];

  // Score every post
  const scored = allRaw
    .filter(p => p.url && p.title && p.title.length > 3)
    .map(p => ({ ...p, _profileScore: scorePost(p, allKeywords), _discovered: true }));

  scored.sort((a, b) => b._profileScore - a._profileScore);

  // Dedupe by URL, max 3 per publication
  const seenUrls = new Set();
  const pubCount = {};
  const final    = [];

  for (const p of scored) {
    if (seenUrls.has(p.url)) continue;
    seenUrls.add(p.url);
    const count = pubCount[p.publication_name] || 0;
    if (count >= 3) continue;
    pubCount[p.publication_name] = count + 1;
    final.push(p);
    if (final.length >= targetPosts) break;
  }

  console.log(`[Discovery] Final: ${final.length} posts | Top: ${final.slice(0, 3).map(p => `"${p.title.slice(0, 40)}"(${p._profileScore})`).join(' | ')}`);
  return final;
}

// ── SUBSTACK SEARCH API ───────────────────────────────────────────────────────

/**
 * Search Substack's full-text search endpoint for a query.
 * Returns up to `limit` posts with title, url, publication_name, description.
 */
async function searchSubstack(query, limit = 20) {
  const encodedQuery = encodeURIComponent(query.trim());
  const url = `https://substack.com/api/v1/search/posts?query=${encodedQuery}&page=0`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)',
        'Accept':     'application/json',
      },
      signal: makeAbortSignal(10000),
    });

    if (!res.ok) {
      console.warn(`[Search] Substack search HTTP ${res.status} for query: "${query}"`);
      return [];
    }

    const data = await res.json();

    // Response shape: { hits: [...] } or { results: [...] } or direct array
    const hits = Array.isArray(data)
      ? data
      : (data.hits || data.results || data.posts || []);

    if (!Array.isArray(hits) || hits.length === 0) {
      console.warn(`[Search] No hits for query: "${query}"`);
      return [];
    }

    const posts = hits
      .filter(h => h.title && (h.canonical_url || h.url))
      .slice(0, limit)
      .map(h => {
        const pub = h.publication || h.pub || {};
        return {
          publication_name: pub.name || h.publication_name || h.author || '',
          title:            (h.title || '').trim(),
          description:      stripHtml(h.subtitle || h.description || h.truncated_body_text || '').slice(0, 400),
          url:              h.canonical_url || h.url || '',
          published_at:     toIso(h.post_date || h.published_at),
          _source:          'search',
          _query:           query,
        };
      });

    console.log(`[Search] "${query}" → ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.warn(`[Search] Error for "${query}":`, err.message);
    return [];
  }
}

/**
 * Run multiple search queries in parallel, deduplicate by URL, return top `target` posts.
 */
async function discoverBySearch(queries, target = 40) {
  if (!queries || queries.length === 0) return [];

  const results = await Promise.allSettled(
    queries.map(q => searchSubstack(q, Math.ceil(target / queries.length) + 5))
  );

  const seenUrls = new Set();
  const pool     = [];

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const post of r.value) {
      if (!post.url || seenUrls.has(post.url)) continue;
      seenUrls.add(post.url);
      pool.push(post);
    }
  }

  console.log(`[Search] discoverBySearch: ${pool.length} unique posts from ${queries.length} queries`);
  return pool.slice(0, target);
}

// ── Verify Claude-suggested post URLs actually exist ──────────────────────────
async function verifyPosts(posts, timeoutMs = 4000) {
  if (!posts || posts.length === 0) return [];

  const results = await Promise.allSettled(posts.map(async post => {
    try {
      const res = await fetch(post.url, {
        method:  'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)' },
        signal:  makeAbortSignal(timeoutMs),
        redirect: 'follow',
      });
      // 200 = exists, 403 = paywalled but exists (redirects are followed automatically)
      const ok = res.status === 200 || res.status === 403;
      return ok ? post : null;
    } catch {
      return null;
    }
  }));

  const verified = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  console.log(`[verifyPosts] ${verified.length}/${posts.length} URLs verified`);
  return verified;
}

module.exports = { discoverPosts, searchSubstack, discoverBySearch, discoverFromSuggestedPubs, verifyPosts };
