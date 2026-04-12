const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Local fallback ranker (no API needed) ────────────────────────────────────

const VERBS = ['Sharpens','Builds','Challenges','Develops','Trains','Strengthens','Expands','Hones','Cultivates','Forges'];
const CORE_QUALITIES = ['first-principles thinking','systems-level judgment','intellectual rigor','contrarian reasoning','long-term perspective','strategic clarity','pattern recognition','principled decision-making'];
const ADJ_QUALITIES  = ['cross-domain reasoning','adjacent-field intuition','conceptual flexibility','analogical thinking'];
const WILD_QUALITIES = ['lateral thinking','productive discomfort','worldview expansion','disciplined curiosity across domains'];

const TOPIC_MAP = [
  { keywords: ['manufactur','industrial','fabricat','supply chain','reshoring','nearshoring','assembly line','production facility','made in','machine shop'], label: 'Manufacturing' },
  { keywords: ['semiconductor','chips','wafer','tsmc','foundry','silicon fab','chip maker','chip design'], label: 'Semiconductors' },
  { keywords: ['financ','invest','market','stock','trading','crypto','bitcoin','wealth','money','economic','bank','portfolio','equity','hedge fund'], label: 'Finance' },
  { keywords: ['ai','artificial intelligence','machine learning','llm','openai','deep learning','neural','gpt','language model'], label: 'AI & Tech' },
  { keywords: ['founder','startup','venture','saas','bootstrap','fundrais','seed round','series','vc ','angel invest'], label: 'Startups' },
  { keywords: ['tech','software','engineer','code','developer','programming','platform','cloud'], label: 'Technology' },
  { keywords: ['philosophy','ethics','epistemolog','existential','stoic','virtue','logic','meaning','consciousness'], label: 'Philosophy' },
  { keywords: ['law','legal','regulat','court','legislat','compliance','policy','governance'], label: 'Law & Policy' },
  { keywords: ['psycholog','mental','cognitive','behavior','habit','mindset','emotion','neuroscience'], label: 'Psychology' },
  { keywords: ['health','fitness','nutrition','longevity','medicine','biology','biohack','sleep','exercise'], label: 'Health & Science' },
  { keywords: ['politic','geopolit','government','democracy','election','foreign policy','nation','war','diplomacy','sanctions'], label: 'Geopolitics' },
  { keywords: ['media','journalism','writing','storytell','publishing','newsletter','content','book'], label: 'Media & Writing' },
  { keywords: ['climate','energy','environment','sustain','carbon','renewable','nature','solar','wind'], label: 'Climate & Energy' },
  { keywords: ['business','strateg','management','leader','organisation','compan','ceo','entrepreneur'], label: 'Business' },
  { keywords: ['history','histor','civiliz','ancient','empire','world war','archaeology'], label: 'History' },
  { keywords: ['science','physics','chemistry','math','research','experiment','quantum','biology'], label: 'Science' },
  { keywords: ['culture','art','design','aesthetic','creative','music','film','literature'], label: 'Culture & Arts' },
];

function guessTopic(post) {
  const text = `${post.title || ''} ${post.description || ''} ${post.publication_name || ''}`.toLowerCase();
  for (const { keywords, label } of TOPIC_MAP) {
    if (keywords.some(k => text.includes(k))) return label;
  }
  return 'General';
}

function why(type) {
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  if (type === 'wild')     return `${verb} ${WILD_QUALITIES[Math.floor(Math.random() * WILD_QUALITIES.length)]} by exposing you to a completely different discipline.`;
  if (type === 'adjacent') return `${verb} ${ADJ_QUALITIES[Math.floor(Math.random() * ADJ_QUALITIES.length)]} through a perspective tangentially connected to your interests.`;
  return `${verb} your ${CORE_QUALITIES[Math.floor(Math.random() * CORE_QUALITIES.length)]} through direct engagement with the core argument.`;
}

// Noise words that add no signal when scoring articles against a profile
const RANK_NOISE = new Set([
  'deeply','interested','interest','reading','goals','role','find','want','know','already',
  'thinking','anything','going','would','could','should','more','from','with','that','this',
  'have','been','will','very','also','just','what','when','where','which','their','there',
  'these','those','then','than','well','into','over','some','like','make','take','keep',
  'good','great','best','most','much','many','even','still','back','each','does','doing',
  'read','look','help','need','about','deeper','blind','spots','spot','find',
]);

// Synonym expansion so profile word "manufacturing" also matches "industrial", etc.
const RANK_SYNONYMS = {
  manufacturing: ['factory','factories','industrial','production','fabrication','operations','manufacturer','assembly','supply chain','machinery'],
  'supply chain':['logistics','procurement','inventory','distribution','fulfillment','shipping'],
  semiconductor: ['chips','wafer','fab','tsmc','silicon','foundry'],
  investing:     ['portfolio','stocks','equity','returns','fund','asset','dividend'],
  investor:      ['investment','portfolio','fund','capital','equity','venture'],
  finance:       ['investment','investing','market','stocks','banking','capital','equity','financial'],
  startup:       ['founder','entrepreneur','saas','venture','vc','bootstrap','fundraising'],
  founder:       ['startup','entrepreneur','venture','bootstrapping','fundraising'],
  ai:            ['artificial intelligence','machine learning','llm','neural','deep learning','gpt'],
  law:           ['legal','regulation','court','legislation','compliance','regulatory'],
  policy:        ['regulation','government','legislation','rules','regulatory'],
  philosophy:    ['ethics','morality','consciousness','epistemology','rationality'],
  economics:     ['economy','economic','macro','gdp','inflation','trade','fiscal','monetary'],
  geopolitics:   ['foreign policy','diplomacy','conflict','international','sanctions'],
  progress:      ['innovation','technology','science','industry','future'],
};

function expandProfileWords(profile) {
  const raw = (profile || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const base = raw.split(/\s+/).filter(w => w.length > 3 && !RANK_NOISE.has(w));
  const expanded = new Set(base);
  for (const word of base) {
    const syns = RANK_SYNONYMS[word];
    if (syns) syns.forEach(s => expanded.add(s));
    // Reverse: if a synonym matches, add key + siblings
    for (const [key, syns2] of Object.entries(RANK_SYNONYMS)) {
      if (syns2.includes(word)) { expanded.add(key); syns2.forEach(s => expanded.add(s)); }
    }
  }
  return [...expanded];
}

function scorePost(post, profileWords, skippedUrls) {
  if (skippedUrls.includes(post.url)) return -999;
  const title = (post.title || '').toLowerCase();
  const desc  = (post.description || '').toLowerCase();
  const pub   = (post.publication_name || '').toLowerCase();
  let sc = 0;
  for (const w of profileWords) {
    if (title.includes(w)) sc += 4;   // title match = very valuable
    if (desc.includes(w))  sc += 2;   // description match
    if (pub.includes(w))   sc += 1;   // pub name
  }
  // Penalise link roundups / digests — they dilute the reading list
  if (/top links|reading list|roundup|weekly digest|link(s)? of the week|out loud|best of the week|things i read|weekend reads|coming soon/i.test(title)) {
    sc -= 20;
  }
  return sc;
}

function localRank(posts, profile, likedUrls = [], skippedUrls = []) {
  const profileWords = expandProfileWords(profile);
  const scored = posts
    .map(p => ({ ...p, _score: scorePost(p, profileWords, skippedUrls) }))
    .sort((a, b) => b._score - a._score);

  // Dedupe by publication
  const seenPub = new Set();
  const deduped = scored.filter(p => {
    if (seenPub.has(p.publication_name)) return false;
    seenPub.add(p.publication_name);
    return true;
  });
  const pool = deduped.length >= 10 ? deduped : scored;

  // 70% core (7), 20% adjacent (2), 10% wild (1) — from 10 total
  const core     = pool.slice(0, 7).map(p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'core',     why: why('core'),     topic: guessTopic(p) }));
  const adjacent = pool.slice(7, 9).map(p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'adjacent', why: why('adjacent'), topic: guessTopic(p) }));
  const wild     = pool.slice(-1).map  (p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'wild',     why: why('wild'),     topic: guessTopic(p) }));

  // Pad if not enough posts
  const all = [...core, ...adjacent, ...wild];
  return all.slice(0, Math.min(10, pool.length));
}

// ─── Claude ranker ────────────────────────────────────────────────────────────

async function rankPosts(posts, profile, likedUrls = [], skippedUrls = [], referencePosts = [], opts = {}) {
  const count = opts.count || 10;
  const sectionLabel = opts.section || null; // 'discover' | 'stack' | null

  try {
    const postsJson = JSON.stringify(posts.slice(0, 80).map(p => ({
      publication: p.publication_name,
      title: p.title,
      url: p.url,
      description: (p.description || '').slice(0, 200),
    })));

    const referenceSection = referencePosts.length > 0
      ? `\nTaste reference examples (the user already reads these — DO NOT recommend from these publications, use them only to understand the user's taste and intellectual level):\n${JSON.stringify(referencePosts.slice(0, 20).map(p => ({ publication: p.publication_name, title: p.title })))}\n`
      : '';

    // Split rules based on count
    const coreCount  = Math.round(count * 0.7);
    const adjCount   = Math.round(count * 0.2);
    const wildCount  = count - coreCount - adjCount;

    const prompt = `You are a character curriculum curator for Stacksome. Select exactly ${count} posts that will build the user's character, judgment, and thinking.

User profile: ${profile || 'Broad intellectual curiosity — pick rigorous, principle-driven posts across disciplines.'}
${referenceSection}
Candidate posts to pick FROM (JSON): ${postsJson}

Past signals — liked URLs: ${JSON.stringify(likedUrls.slice(0,15))} / skipped URLs: ${JSON.stringify(skippedUrls.slice(0,15))}

Selection rules — ${count} posts total:
- ${coreCount} "core" (70%): Directly relevant to the user's stated interests. Rigorous, contrarian, or first-principles. No shallow hot takes.
- ${adjCount} "adjacent" (20%): Tangentially related — same domain but unexpected angle, or a neighbouring field with clear overlap.
- ${wildCount} "wild" (10%): Completely different field or worldview. Maximum productive discomfort.

Quality rules:
- Every pick must build character: sharpen judgment, challenge a belief, or teach a durable principle.
- "why" must start with an action verb and name the exact character quality built. One sentence only.
- Prefer posts the user hasn't signalled before.
- Do NOT repeat the same publication more than twice.

For each post, also include a "topic" field: pick the single best-matching interest from the user's profile above (use their exact wording where possible, capitalised). If the post doesn't clearly match any stated interest, use the closest related area in 1–3 words. Keep it short and specific — this is a filter label the user will click.

Return ONLY a valid JSON array — no markdown, no code fences, no explanation:
[{"publication":"...","title":"...","url":"...","type":"core|adjacent|wild","why":"...","topic":"..."}]`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);

    // Enforce count ceiling — Claude sometimes returns more than asked
    const capped = parsed.slice(0, count);

    // Tag with section if provided
    if (sectionLabel) return capped.map(p => ({ ...p, section: sectionLabel }));
    return capped;

  } catch (err) {
    const needsFallback =
      !process.env.ANTHROPIC_API_KEY ||
      err.message?.includes('credit') ||
      err.message?.includes('auth') ||
      err.status === 401 || err.status === 402 || err.status === 403;

    if (needsFallback) {
      console.warn('[Stacksome] Claude unavailable — using local ranker:', err.message);
      const ranked = localRank(posts, profile, likedUrls, skippedUrls).slice(0, count);
      if (sectionLabel) return ranked.map(p => ({ ...p, section: sectionLabel }));
      return ranked;
    }
    throw err;
  }
}

module.exports = { rankPosts, localRankFallback: localRank };
