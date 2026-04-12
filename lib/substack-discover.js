/**
 * Stacksome Discovery Engine v2
 *
 * Fetch strategy per publication (in order):
 *   1. Substack Posts API  — /api/v1/posts?limit=50   (JSON, richest data, works on custom domains too)
 *   2. RSS feed            — /feed                    (XML, universal, ~20-30 posts)
 *   3. Sitemap scrape      — /sitemap.xml             (last resort; titles only, still scoreable)
 *
 * After fetching, every post is scored against the user's expanded profile keywords.
 * Posts are deduplicated, limited to 3 per pub, and sorted by relevance.
 */

const Parser = require('rss-parser');
const { matchToProfile } = require('./discovery');

const rssParser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0; +https://stacksome.com)' },
  customFields: { item: ['description', 'content:encoded'] },
});

// ── In-memory cache — avoids re-fetching the same pub in the same process ────
const FETCH_CACHE = new Map(); // feedUrl → { posts, ts }
const CACHE_TTL   = 20 * 60 * 1000; // 20 minutes

// ── Synonym map for profile keyword expansion ─────────────────────────────────
const PROFILE_SYNONYMS = {
  manufacturing:   ['factory','factories','industrial','production','fabrication','operations','manufacturer','assembly','supply chain','machinery','reshoring','nearshoring','plant'],
  'supply chain':  ['logistics','sourcing','procurement','inventory','distribution','fulfillment','shipping','warehouse','procurement'],
  semiconductor:   ['chips','wafer','fab','tsmc','fabrication','foundry','silicon','node','lithography'],
  hardware:        ['circuit','electronics','device','component','embedded','pcb','firmware'],
  investing:       ['portfolio','stocks','equity','returns','valuation','hedge','fund','asset','dividend','alpha'],
  finance:         ['investment','investing','market','stocks','banking','capital','equity','financial','fund','credit'],
  startup:         ['founder','entrepreneur','saas','venture','vc','bootstrap','fundraising','seed','series'],
  founder:         ['startup','entrepreneur','venture','bootstrapping','fundraising','co-founder','building'],
  ai:              ['artificial intelligence','machine learning','llm','neural','deep learning','gpt','language model','transformer'],
  technology:      ['software','digital','platform','cloud','engineering','developer','code'],
  economics:       ['economy','economic','macro','gdp','inflation','trade','fiscal','monetary','policy'],
  geopolitics:     ['foreign policy','diplomacy','conflict','international','sanctions','treaty','war'],
  health:          ['medicine','medical','biology','fitness','longevity','nutrition','clinical','drug'],
  climate:         ['renewable','carbon','emissions','environment','sustainability','solar','wind','energy'],
  philosophy:      ['ethics','morality','consciousness','epistemology','rationality','meaning'],
  psychology:      ['behavior','cognitive','neuroscience','habit','mindset','mental'],
  history:         ['historical','ancient','century','empire','revolution','civilization','war'],
  law:             ['legal','regulation','court','legislation','policy','compliance','regulatory'],
  leadership:      ['management','strategy','executive','ceo','decision','organisation','team'],
  progress:        ['innovation','technology','science','industry','future','improvement','growth'],
  design:          ['ux','ui','product','interface','user experience','visual','architecture'],
  writing:         ['prose','essay','author','craft','editorial','narrative','journalism'],
};

// ── Noise words stripped before keyword extraction ────────────────────────────
const NOISE = new Set([
  'deeply','interested','interest','about','reading','goals','role','find','want','know',
  'already','think','thinking','blind','spots','spot','anything','going','would','could',
  'should','more','from','with','that','this','have','been','will','very','also','just',
  'what','when','where','which','their','there','these','those','then','than','well',
  'into','over','some','like','make','take','keep','give','help','need','look',
  'good','great','best','most','much','many','even','still','back','each','does','doing',
  'read','get','got','our','its','for','and','the','are','was','were','has','had',
  'not','but','can','all','any','both','few','same','such','only','next',
  'first','last','every','less','also','just','your','mine','ours','they',
]);

// ── Build expanded keyword set from raw profile text ─────────────────────────
function buildProfileKeywords(profile) {
  const raw = (profile || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const base = raw.split(/\s+/).filter(w => w.length > 3 && !NOISE.has(w));
  const expanded = new Set(base);

  for (const word of base) {
    // Forward: keyword → synonyms
    for (const [key, syns] of Object.entries(PROFILE_SYNONYMS)) {
      if (key === word || key.includes(word) || word.includes(key)) {
        syns.forEach(s => expanded.add(s));
      }
    }
    // Reverse: if word is a synonym, pull in its parent and siblings
    for (const [key, syns] of Object.entries(PROFILE_SYNONYMS)) {
      if (syns.some(s => s === word || s.includes(word))) {
        expanded.add(key);
        syns.forEach(s => expanded.add(s));
      }
    }
  }

  return [...expanded].filter(k => k.length > 2);
}

// ── Score a post against profile keywords ────────────────────────────────────
function scorePost(post, keywords) {
  const title = (post.title || '').toLowerCase();
  const desc  = (post.description || '').toLowerCase();
  const pub   = (post.publication_name || '').toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    if (title.includes(kw)) score += 5;
    if (desc.includes(kw))  score += 2;
    if (pub.includes(kw))   score += 1;
  }

  // Roundup / digest penalty — these almost never match a profile well
  if (/top links|reading list|roundup|weekly digest|links? of the week|out loud|best of the week|things i read|weekend reads|daily links|link dump|issue #\d|vol\.\s*\d/i.test(title)) {
    score -= 40;
  }

  return score;
}

// ── Extract clean base URL from feedUrl ───────────────────────────────────────
function getBaseUrl(feedUrl) {
  return feedUrl
    .replace(/\/feed\/?$/, '')
    .replace(/\/rss\/?$/, '')
    .replace(/\/atom\/?$/, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '');
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
  } catch {
    return new Date().toISOString();
  }
}

function makeAbortSignal(ms) {
  // AbortSignal.timeout is Node 17.3+; fall back gracefully
  try { return AbortSignal.timeout(ms); } catch { return undefined; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LAYER 1 — Substack Posts API  /api/v1/posts?limit=50
//  Works on *.substack.com AND custom domains hosted on Substack infrastructure.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchViaPostsAPI(pub) {
  const base   = getBaseUrl(pub.feedUrl);
  const apiUrl = `${base}/api/v1/posts?limit=50&offset=0`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)',
        'Accept':     'application/json',
      },
      signal: makeAbortSignal(9000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const posts = data
      .filter(p => p.title && (p.canonical_url || p.slug))
      .map(p => ({
        publication_name: pub.name,
        title:       (p.title || '').trim(),
        description: stripHtml(
          p.subtitle || p.truncated_body_text || p.description || ''
        ).slice(0, 400),
        url:         p.canonical_url || `${base}/p/${p.slug}`,
        published_at: toIso(p.post_date || p.publishedAt),
        _discovered: true,
        _source:     'posts-api',
      }));

    if (posts.length === 0) return null;
    console.log(`[Fetch] ✓ Posts API — ${pub.name} — ${posts.length} posts`);
    return posts;

  } catch (err) {
    // Timeout or network error — fall through to next layer
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LAYER 2 — RSS feed
//  Universal, always works, limited to ~20-30 posts.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchViaRSS(pub) {
  const base = getBaseUrl(pub.feedUrl);

  // Build candidate feed URLs in priority order
  const candidates = Array.from(new Set([
    pub.feedUrl,
    `${base}/feed`,
    `${base}/rss`,
    `${base}/atom.xml`,
    `${base}/rss.xml`,
  ]));

  for (const feedUrl of candidates) {
    try {
      const feed  = await rssParser.parseURL(feedUrl);
      const items = (feed.items || []).slice(0, 30);
      if (items.length === 0) continue;

      const posts = items
        .map(item => {
          const rawDesc = item['content:encoded'] || item.contentSnippet || item.summary || item.content || '';
          return {
            publication_name: pub.name,
            title:       (item.title || '').trim(),
            description: stripHtml(rawDesc).slice(0, 400),
            url:         item.link || item.guid || '',
            published_at: toIso(item.isoDate || item.pubDate),
            _discovered: true,
            _source:     'rss',
          };
        })
        .filter(p => p.url && p.title);

      if (posts.length > 0) {
        console.log(`[Fetch] ✓ RSS — ${pub.name} — ${posts.length} posts`);
        return posts;
      }
    } catch { /* try next candidate */ }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  LAYER 3 — Sitemap
//  Grabs post URLs + dates from /sitemap.xml. Titles are derived from slugs
//  (so scoring is weaker, but it's better than nothing for niche pubs).
// ─────────────────────────────────────────────────────────────────────────────
async function fetchViaSitemap(pub) {
  const base = getBaseUrl(pub.feedUrl);

  try {
    const res = await fetch(`${base}/sitemap.xml`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stacksome/1.0)' },
      signal: makeAbortSignal(9000),
    });
    if (!res.ok) return null;

    const xml  = await res.text();

    // Extract <url> blocks that look like posts (/p/ path for Substack)
    const blocks = xml.split('<url>').slice(1);
    const posts  = [];

    for (const block of blocks) {
      const locMatch     = block.match(/<loc>(.*?)<\/loc>/);
      const lastmodMatch = block.match(/<lastmod>(.*?)<\/lastmod>/);
      if (!locMatch) continue;

      const url = locMatch[1].trim();
      // Only include post URLs — skip tag pages, about, etc.
      if (!/\/(p|post|article|blog)\//.test(url) && !/substack\.com\/p\//.test(url)) continue;

      const lastmod = lastmodMatch ? lastmodMatch[1].trim() : new Date().toISOString();
      const slug    = url.split('/').pop()?.split('?')[0] || '';
      // Convert slug to a human-readable title
      const title   = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      if (!title || title.length < 4) continue;

      posts.push({
        publication_name: pub.name,
        title,
        description: '',          // no description from sitemap alone
        url,
        published_at: toIso(lastmod),
        _discovered: true,
        _source:     'sitemap',
      });
    }

    if (posts.length === 0) return null;

    // Sort newest first and cap at 50
    posts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    console.log(`[Fetch] ✓ Sitemap — ${pub.name} — ${posts.length} URLs`);
    return posts.slice(0, 50);

  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORCHESTRATOR — tries all three layers, returns best result
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPubPosts(pub) {
  // Check cache first
  const cached = FETCH_CACHE.get(pub.feedUrl);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.posts;
  }

  let posts = null;

  // Layer 1: Posts API (best quality)
  posts = await fetchViaPostsAPI(pub);

  // Layer 2: RSS
  if (!posts || posts.length === 0) {
    posts = await fetchViaRSS(pub);
  }

  // Layer 3: Sitemap (weakest but never empty for live sites)
  if (!posts || posts.length === 0) {
    posts = await fetchViaSitemap(pub);
  }

  if (!posts || posts.length === 0) {
    console.log(`[Fetch] ✗ All layers failed — ${pub.name}`);
    return [];
  }

  // Cache successful result
  FETCH_CACHE.set(pub.feedUrl, { posts, ts: Date.now() });
  return posts;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN — discoverPosts
// ─────────────────────────────────────────────────────────────────────────────
async function discoverPosts(profile, existingPubNames = [], targetPosts = 40) {
  const matched = matchToProfile(profile, existingPubNames, 20);
  if (matched.length === 0) return [];

  const keywords = buildProfileKeywords(profile);
  console.log(`[Discovery] Keywords (${keywords.length}): ${keywords.slice(0, 14).join(', ')}`);
  console.log(`[Discovery] Fetching from ${matched.length} pubs…`);

  // Fetch all pubs concurrently, batched to avoid hammering servers
  const BATCH = 8;
  const allRaw = [];

  for (let i = 0; i < matched.length; i += BATCH) {
    const batch   = matched.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(pub => fetchPubPosts(pub)));

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        allRaw.push(...r.value);
      }
    }
  }

  console.log(`[Discovery] Raw pool: ${allRaw.length} posts across ${matched.length} pubs`);

  // Score every post
  const scored = allRaw
    .filter(p => p.url && p.title && p.title.length > 3)
    .map(p => ({ ...p, _profileScore: scorePost(p, keywords) }));

  // Sort by score descending
  scored.sort((a, b) => b._profileScore - a._profileScore);

  // Dedupe by URL + limit to 3 per pub for variety
  const seenUrls = new Set();
  const pubCount = {};
  const relevant = [];
  const padding  = [];

  for (const p of scored) {
    if (seenUrls.has(p.url)) continue;
    seenUrls.add(p.url);
    const bucket = p._profileScore > 0 ? relevant : padding;
    bucket.push(p);
  }

  const final = [];
  for (const p of [...relevant, ...padding]) {
    const count = pubCount[p.publication_name] || 0;
    if (count >= 3) continue;
    pubCount[p.publication_name] = count + 1;
    final.push(p);
    if (final.length >= targetPosts) break;
  }

  const sourceCounts = final.reduce((acc, p) => {
    acc[p._source] = (acc[p._source] || 0) + 1;
    return acc;
  }, {});

  console.log(`[Discovery] Final: ${final.length} posts | Sources: ${JSON.stringify(sourceCounts)}`);
  console.log(`[Discovery] Top 5: ${final.slice(0, 5).map(p => `"${p.title.slice(0, 35)}"(${p._profileScore})`).join(' | ')}`);

  return final;
}

module.exports = { discoverPosts };
