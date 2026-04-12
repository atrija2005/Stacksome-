import { withAuth } from '../../lib/auth';
const { matchToProfile } = require('../../lib/discovery');
const { getRecentPosts }  = require('../../lib/db');

const SYNONYMS = {
  manufacturing: ['factory','factories','industrial','production','fabrication','operations','manufacturer','reshoring','nearshoring','machinery','assembly','made in'],
  'supply chain': ['logistics','sourcing','procurement','inventory','vendor','distribution','fulfillment','shipping','warehouse','supply chain'],
  semiconductor: ['chips','wafer','fab','tsmc','intel','nvidia','gpu','cpu','fabrication','foundry','semiconductor'],
  hardware:   ['circuit','electronics','device','component','pcb','embedded'],
  finance:    ['investment','investing','market','stocks','banking','capital','equity','debt','monetary','financial','fund','portfolio','returns','valuation'],
  investing:  ['portfolio','stocks','equity','returns','valuation','hedge','asset','alpha','dividend','yield'],
  startup:    ['founder','entrepreneur','saas','venture','vc','bootstrap','scale','growth','fundraising','seed','early stage','pre-seed'],
  founder:    ['startup','entrepreneur','venture','bootstrapping','vc','raise','fundraising','co-founder','equity'],
  ai:         ['artificial intelligence','machine learning','llm','neural','deep learning','gpt','chatgpt','openai','transformer','language model'],
  technology: ['software','digital','platform','cloud','developer','codebase'],
  economics:  ['economy','economic','macro','gdp','inflation','trade','fiscal','monetary','policy'],
  geopolitics:['foreign policy','diplomacy','conflict','international','global','sanctions','treaty'],
  health:     ['medicine','medical','biology','fitness','longevity','nutrition','drug','clinical'],
  climate:    ['renewable','carbon','emissions','environment','sustainability','solar','wind','clean energy'],
  philosophy: ['ethics','morality','consciousness','epistemology','metaphysics'],
  psychology: ['behavior','cognitive','neuroscience','habit','mindset','mental health'],
  history:    ['historical','ancient','century','empire','revolution','civilization','archaeology'],
  crypto:     ['bitcoin','ethereum','blockchain','defi','web3','token','nft'],
  energy:     ['oil','gas','nuclear','solar','wind','power grid','electricity','utilities'],
};

// Word-boundary safe "contains" — checks if phrase contains token as a whole word
function hasWord(phrase, token) {
  const re = new RegExp('(?:^|\\s)' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)');
  return re.test(phrase);
}

function expandWords(q) {
  const qLower = q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  const base = qLower.split(/\s+/).filter(w => w.length > 2);
  const expanded = new Set(base);

  // Match the FULL normalised query against synonym keys (exact match or query contains full key phrase)
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (key === qLower || hasWord(qLower, key)) {
      expanded.add(key);
      syns.forEach(s => expanded.add(s));
    }
  }

  // Match individual base words against single-word keys (exact only)
  for (const word of base) {
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (key === word) {   // single-word exact match only
        expanded.add(key);
        syns.forEach(s => expanded.add(s));
      }
    }
  }
  return { base, expanded: [...expanded] };
}

function score(title, subtitle, base, expanded) {
  const t = (title || '').toLowerCase();
  const s = (subtitle || '').toLowerCase();
  let sc = 0;
  for (const w of base)     { if (t.includes(w)) sc += 10; if (s.includes(w)) sc += 4; }
  for (const w of expanded) { if (t.includes(w)) sc += 4;  if (s.includes(w)) sc += 1; }
  // Penalise roundups and link digests
  if (/reading list|top links|roundup|weekly digest|link(s)? of|out loud|best of the week|things i read/i.test(t)) sc -= 25;
  return sc;
}

function buildReason(title, subtitle, base, expanded) {
  const t = (title || '').toLowerCase();
  const s = (subtitle || '').toLowerCase();
  const hits = [];
  // Check which base words matched
  for (const w of base) {
    if (t.includes(w) || s.includes(w)) hits.push(w);
  }
  // Check which expanded words matched (show up to 2)
  const expandedHits = [];
  for (const w of expanded) {
    if (!base.includes(w) && (t.includes(w) || s.includes(w))) expandedHits.push(w);
    if (expandedHits.length >= 2) break;
  }
  if (hits.length > 0 && expandedHits.length > 0) {
    return `Covers ${hits.join(', ')} · mentions ${expandedHits.join(', ')}`;
  }
  if (hits.length > 0) return `Covers ${hits.join(', ')}`;
  if (expandedHits.length > 0) return `Related: ${expandedHits.join(', ')}`;
  return null;
}

// Fetch Substack archive for a publication
async function fetchSubstackArchive(pub) {
  const feedUrl = pub.feedUrl || '';
  let baseUrl = feedUrl.replace(/\/feed\/?$/, '');

  const archiveUrl = `${baseUrl}/api/v1/archive?sort=new&limit=50`;

  try {
    const res = await fetch(archiveUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(p => ({
      publication: pub.name,
      title:       p.title || '',
      description: (p.subtitle || p.description || '').slice(0, 300),
      url:         p.canonical_url || p.slug || '',
    })).filter(p => p.url && p.title);
  } catch {
    return [];
  }
}

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'GET') return res.status(405).end();

  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'query required' });

  const { base, expanded } = expandWords(q);

  // ── 1. DB posts ──────────────────────────────────────────────────────────
  let dbPosts = [];
  try {
    const all = await getRecentPosts(supabase, 180);
    dbPosts = all
      .map(p => ({ ...p, _score: score(p.title, p.description, base, expanded) }))
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 15)
      .map(p => ({
        publication: p.publication_name || 'Unknown',
        title:       p.title,
        url:         p.url,
        description: p.description || '',
        reason:      buildReason(p.title, p.description, base, expanded) || 'In your library',
        _score:      p._score,
        _source:     'library',
      }));
  } catch {}

  // ── 2. Fetch archives from matched pubs ────────────────────────────────
  const matchedPubs = matchToProfile(q, [], 20);
  const archiveFetches = matchedPubs.slice(0, 15).map(pub => fetchSubstackArchive(pub));
  const settled = await Promise.allSettled(archiveFetches);

  const archivePosts = settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .map(p => ({
      ...p,
      _score: score(p.title, p.description, base, expanded),
    }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score);

  // ── 3. Merge, enforce max 2 per pub, take top 12 ────────────────────────
  const seen     = new Set();
  const pubCount = {};
  const merged   = [];

  // Capitalise the original query for the topic label (e.g. "supply chain" → "Supply Chain")
  const topicLabel = q.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  for (const p of [...dbPosts, ...archivePosts]) {
    if (!p.url || !p.title || seen.has(p.url)) continue;
    const pub = p.publication;
    if ((pubCount[pub] || 0) >= 2) continue;
    seen.add(p.url);
    pubCount[pub] = (pubCount[pub] || 0) + 1;

    merged.push({
      publication: p.publication,
      title:       p.title,
      url:         p.url,
      description: p.description || '',
      reason:      buildReason(p.title, p.description, base, expanded) || `Covers ${q}`,
      topic:       topicLabel,
      _score:      p._score,
    });

    if (merged.length >= 30) break;
  }

  if (merged.length === 0) {
    return res.json({
      results: [],
      query: q,
      message: `No articles found for "${q}". Try a broader term like "manufacturing", "AI", or "investing".`,
    });
  }

  return res.json({ results: merged, query: q });
});
