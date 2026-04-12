/**
 * Stacksome Discovery Engine
 * Uses Substack archive API to fetch 50 posts per matched publication,
 * then scores each post against the user's profile using keyword + synonym expansion.
 * Falls back to RSS parser if archive API fails.
 */

const Parser = require('rss-parser');
const { matchToProfile } = require('./discovery');

const parser = new Parser({
  timeout: 7000,
  headers: { 'User-Agent': 'Stacksome/1.0 RSS Reader' },
});

// ── Synonym map for profile → article keyword expansion ──────────────────────
const PROFILE_SYNONYMS = {
  manufacturing: ['factory','factories','industrial','production','fabrication','operations','manufacturer','assembly','supply chain','machinery','reshoring','nearshoring'],
  'supply chain': ['logistics','sourcing','procurement','inventory','distribution','fulfillment','shipping','warehouse'],
  semiconductor: ['chips','wafer','fab','tsmc','fabrication','foundry','silicon'],
  hardware:      ['circuit','electronics','device','component','embedded'],
  investing:     ['portfolio','stocks','equity','returns','valuation','hedge','fund','asset','dividend'],
  finance:       ['investment','investing','market','stocks','banking','capital','equity','financial','fund'],
  startup:       ['founder','entrepreneur','saas','venture','vc','bootstrap','fundraising'],
  founder:       ['startup','entrepreneur','venture','bootstrapping','fundraising','co-founder'],
  ai:            ['artificial intelligence','machine learning','llm','neural','deep learning','gpt','language model'],
  technology:    ['software','digital','platform','cloud','engineering','developer'],
  economics:     ['economy','economic','macro','gdp','inflation','trade','fiscal','monetary','policy'],
  geopolitics:   ['foreign policy','diplomacy','conflict','international','sanctions','treaty'],
  health:        ['medicine','medical','biology','fitness','longevity','nutrition','clinical'],
  climate:       ['renewable','carbon','emissions','environment','sustainability','solar','wind'],
  philosophy:    ['ethics','morality','consciousness','epistemology','rationality'],
  psychology:    ['behavior','cognitive','neuroscience','habit','mindset'],
  history:       ['historical','ancient','century','empire','revolution','civilization'],
  law:           ['legal','regulation','court','legislation','policy','compliance','regulatory'],
  policy:        ['regulation','government','legislation','regulatory','law','rules'],
  investor:      ['investment','portfolio','fund','capital','equity','venture','returns'],
  leadership:    ['management','strategy','executive','ceo','decision','organisation'],
  progress:      ['innovation','technology','science','industry','future','improvement'],
};

// ── Noise words to filter from profile before keyword scoring ────────────────
const NOISE = new Set([
  'deeply','interested','interest','about','reading','goals','role','find','want','know',
  'already','think','thinking','blind','spots','spot','anything','going','would','could',
  'should','more','from','with','that','this','have','been','will','very','also','just',
  'what','when','where','which','their','there','these','those','then','than','well',
  'into','over','some','like','make','take','keep','give','help','need','look',
  'good','great','best','most','much','many','even','still','back','each','does','doing',
  'read','get','got','our','its','for','and','the','are','was','were','has','had',
  'not','but','can','all','any','both','few','same','such','only','both','next',
  'first','last','every','both','less','more','also','just','your','mine','ours',
]);

// ── Extract meaningful profile keywords with synonym expansion ────────────────
function buildProfileKeywords(profile) {
  const raw = (profile || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const base = raw.split(/\s+/).filter(w => w.length > 3 && !NOISE.has(w));
  const expanded = new Set(base);

  for (const word of base) {
    for (const [key, syns] of Object.entries(PROFILE_SYNONYMS)) {
      if (key === word) {
        syns.forEach(s => expanded.add(s));
        break;
      }
    }
  }

  // Also reverse: if a synonym matches a profile word, add its key
  for (const word of base) {
    for (const [key, syns] of Object.entries(PROFILE_SYNONYMS)) {
      if (syns.some(s => s === word)) {
        expanded.add(key);
        syns.forEach(s => expanded.add(s));
      }
    }
  }

  return [...expanded];
}

// ── Score a post against profile keywords ────────────────────────────────────
function scoreAgainstProfile(post, keywords) {
  const title = (post.title || '').toLowerCase();
  const desc  = (post.description || '').toLowerCase();
  const pub   = (post.publication_name || '').toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    if (title.includes(kw)) score += 5;   // title match = high value
    if (desc.includes(kw))  score += 2;   // description match
    if (pub.includes(kw))   score += 1;   // publication name
  }

  // Penalise link roundups / digests heavily — they should almost never appear
  if (/top links|reading list|roundup|weekly digest|link(s)? of the week|out loud|best of the week|things i read|weekend reads|daily links|link dump/i.test(title)) {
    score -= 40;
  }
  return score;
}

// ── Fetch via Substack archive API (50 posts) ─────────────────────────────────
async function fetchArchivePosts(pub) {
  const feedUrl = pub.feedUrl || '';
  const baseUrl = feedUrl.replace(/\/feed\/?$/, '');
  const archiveUrl = `${baseUrl}/api/v1/archive?sort=new&limit=50`;

  try {
    const res = await fetch(archiveUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');

    return data.map(p => ({
      publication_name: pub.name,
      title:       p.title || '',
      description: (p.subtitle || p.description || '').slice(0, 300),
      url:         p.canonical_url || p.slug || '',
      published_at: p.post_date || new Date().toISOString(),
      _discovered:  true,
    })).filter(p => p.url && p.title);
  } catch {
    return null; // signal to try RSS fallback
  }
}

// ── Fetch via RSS feed (4 recent posts) ──────────────────────────────────────
async function fetchRSSPosts(pub, maxPosts = 6) {
  const urlsToTry = [pub.feedUrl];
  if (!pub.feedUrl.includes('substack.com')) {
    const slug = pub.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    urlsToTry.push(`https://${slug}.substack.com/feed`);
  }
  if (!pub.feedUrl.endsWith('/feed')) {
    urlsToTry.push(pub.feedUrl.replace(/\/?$/, '/feed'));
  }

  for (const url of urlsToTry) {
    try {
      const feed  = await parser.parseURL(url);
      const posts = (feed.items || []).slice(0, maxPosts).map(item => ({
        publication_name: pub.name,
        title:       item.title || 'Untitled',
        description: stripHtml(item.contentSnippet || item.summary || item.content || '').slice(0, 300),
        url:         item.link || item.guid || '',
        published_at: toIso(item.isoDate || item.pubDate),
        _discovered: true,
      })).filter(p => p.url && p.title !== 'Untitled');
      if (posts.length > 0) return posts;
    } catch { /* try next */ }
  }
  return [];
}

// ── Main discovery function ───────────────────────────────────────────────────
async function discoverPosts(profile, existingPubNames = [], targetPosts = 40) {
  const matched = matchToProfile(profile, existingPubNames, 20);
  if (matched.length === 0) return [];

  const keywords = buildProfileKeywords(profile);
  console.log(`[Discovery] Profile keywords (${keywords.length}): ${keywords.slice(0,12).join(', ')}`);
  console.log(`[Discovery] Fetching from ${matched.length} matched publications`);

  // Fetch archive (preferred) or RSS fallback for each pub, concurrency 10
  const batchSize = 10;
  const allRaw = [];
  for (let i = 0; i < matched.length; i += batchSize) {
    const batch = matched.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async pub => {
        const archive = await fetchArchivePosts(pub);
        if (archive !== null) return archive;          // archive worked
        return fetchRSSPosts(pub, 6);                  // fallback to RSS
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allRaw.push(...r.value);
    }
  }

  // Score every post against the profile
  const scored = allRaw
    .filter(p => p.url && p.title)
    .map(p => ({ ...p, _profileScore: scoreAgainstProfile(p, keywords) }));

  // Sort by relevance descending
  scored.sort((a, b) => b._profileScore - a._profileScore);

  // Log top picks for debugging
  console.log(`[Discovery] Top posts: ${scored.slice(0,5).map(p => `"${p.title.slice(0,40)}"(${p._profileScore})`).join(' | ')}`);
  console.log(`[Discovery] Total scored posts: ${scored.length}, above 0: ${scored.filter(p => p._profileScore > 0).length}`);

  // Prefer posts with score > 0, but pad with others if needed
  const relevant   = scored.filter(p => p._profileScore > 0);
  const padding    = scored.filter(p => p._profileScore <= 0);

  // Dedupe by URL and limit to 2 per publication to ensure variety
  const seen    = new Set();
  const pubCount = {};
  const final   = [];

  for (const p of [...relevant, ...padding]) {
    if (seen.has(p.url)) continue;
    const pub = p.publication_name;
    if ((pubCount[pub] || 0) >= 3) continue;   // max 3 per pub
    seen.add(p.url);
    pubCount[pub] = (pubCount[pub] || 0) + 1;
    final.push(p);
    if (final.length >= targetPosts) break;
  }

  console.log(`[Discovery] Final pool: ${final.length} posts`);
  return final;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(str) {
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

module.exports = { discoverPosts };
