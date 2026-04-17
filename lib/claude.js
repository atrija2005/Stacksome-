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
  const core     = pool.slice(0, 7).map(p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'core',     why: why('core'),     topic: guessTopic(p), tldr: '' }));
  const adjacent = pool.slice(7, 9).map(p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'adjacent', why: why('adjacent'), topic: guessTopic(p), tldr: '' }));
  const wild     = pool.slice(-1).map  (p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'wild',     why: why('wild'),     topic: guessTopic(p), tldr: '' }));

  // Pad if not enough posts
  const all = [...core, ...adjacent, ...wild];
  return all.slice(0, Math.min(10, pool.length));
}

// ─── Search query generator ───────────────────────────────────────────────────

async function generateSearchQueries(goal, mode = 'quick') {
  const isDeep = mode === 'deep';
  const count  = isDeep ? 7 : 5;

  try {
    const prompt = isDeep
      ? `You are a research strategist. A user wants to do a deep-dive on this goal:

"${goal}"

Generate exactly 7 Substack search queries — one per critical angle an analyst must understand:
1. Overview / foundational context
2. Business model / unit economics
3. Key players / who matters
4. Bear case / risks
5. Consensus view / mainstream smart take
6. Contrarian view / what everyone gets wrong
7. Edge / what's emerging in the next 2-3 years

Also write a 1-sentence summary of what the curriculum will cover (for the user confirmation screen).
Also write a refined version of the user's goal (more specific, keep same intent).

Rules for queries:
- Each query is 3–6 words, plain text, no quotes
- Specific enough to find expert essays on Substack
- Diverse — no two queries should retrieve the same posts

Return ONLY valid JSON:
{"refinedGoal":"...","summary":"...","queries":["...","...","...","...","...","...","..."]}`

      : `You are a research strategist. A user wants to learn about this goal:

"${goal}"

Generate exactly 5 Substack search queries that together will surface a well-rounded reading curriculum on this goal. Cover: fundamentals, business/economic angles, current debates, practical implications, and one forward-looking angle.

Also write a 1-sentence summary of what the curriculum will cover (for the user confirmation screen).
Also write a refined version of the user's goal (more specific, keep same intent).

Rules for queries:
- Each query is 3–6 words, plain text, no quotes
- Specific enough to find expert essays on Substack
- Diverse — no two queries should retrieve the same posts

Return ONLY valid JSON:
{"refinedGoal":"...","summary":"...","queries":["...","...","...","...","..."]}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw    = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);

    return {
      refinedGoal: (parsed.refinedGoal || goal).trim(),
      summary:     (parsed.summary     || '').trim(),
      queries:     (parsed.queries     || []).slice(0, count).filter(Boolean),
    };
  } catch (err) {
    console.warn('[generateSearchQueries] Claude error — using raw goal:', err.message);
    // Fallback: split goal into word pairs as queries
    const words = goal.trim().split(/\s+/);
    const fallback = [];
    for (let i = 0; i < words.length && fallback.length < count; i += 2) {
      fallback.push(words.slice(i, i + 3).join(' '));
    }
    if (fallback.length === 0) fallback.push(goal.slice(0, 60));
    return { refinedGoal: goal, summary: '', queries: fallback };
  }
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

    const isDeep = opts.mode === 'deep';

    const prompt = isDeep
      ? `You are a sector research curator for Stacksome. The user is doing serious, high-stakes preparation.

Goal: "${profile || 'Deep sector research.'}"
${referenceSection}
Candidate posts (JSON): ${postsJson}

Past signals — liked: ${JSON.stringify(likedUrls.slice(0,15))} / skipped: ${JSON.stringify(skippedUrls.slice(0,15))}

Build a 7-post deep-dive curriculum — one definitive post per critical angle that a serious analyst must understand before walking into a room.

Assign exactly one post to each of these 7 angles:
1. "Overview" — What is this? Foundational context, scale, history of the sector/topic.
2. "Business Model" — How do the key players actually make money? Unit economics, incentives, margins.
3. "Key Players" — Who matters in this space and what makes them significant?
4. "Bear Case" — What are the critical risks? What could make this fail or be overhyped?
5. "Consensus" — What do serious, experienced practitioners believe? The mainstream smart take.
6. "Contrarian" — What does everyone get wrong? The uncomfortable truth most people in the space miss.
7. "Edge" — Where is this going? What's emerging in the next 2–3 years that most people haven't priced in?

Rules:
- Each post must genuinely serve its assigned angle — no forcing a bad fit
- Zero overlap between posts — each answers a completely different question
- Prefer rigorous, opinionated writing from practitioners over surface-level overviews
- No roundups, link dumps, or "best of" lists
- Do NOT repeat the same publication more than once
- Prefer posts the user hasn't signalled before

For each post:
- "angle": exactly one of the 7 labels above (exact string match)
- "why": one sentence — the specific question this post answers for the user's goal
- "tldr": 2 sentences — the concrete insight the reader walks away with. Start with "You'll" or a strong verb.
- "topic": specific aspect covered (1–3 words, capitalised)

Return ONLY a valid JSON array — no markdown, no code fences:
[{"publication":"...","title":"...","url":"...","type":"core","why":"...","tldr":"...","topic":"...","angle":"Overview"}]`

      : `You are a curriculum designer for Stacksome. The user has a specific learning goal.

Goal: "${profile || 'Broad intellectual curiosity across disciplines.'}"
${referenceSection}
Candidate posts (JSON): ${postsJson}

Past signals — liked: ${JSON.stringify(likedUrls.slice(0,15))} / skipped: ${JSON.stringify(skippedUrls.slice(0,15))}

Build a focused ${count}-post reading curriculum that takes the user from foundational understanding to genuine depth on this goal.

Rules:
- Select exactly ${count} posts, ALL directly relevant to the stated goal — zero tangential picks
- Order them as a reading sequence: order 1 = best entry point, order ${count} = most advanced/specific
- Each post should build on the previous one conceptually
- Prefer rigorous, evidence-based posts from serious thinkers — no hot takes, no roundups, no link digests
- Do NOT repeat the same publication more than once
- Prefer posts the user hasn't signalled before

For each post include:
- "order": 1–${count} (position in the reading sequence)
- "why": one sentence — exactly what this post contributes to the learning path at this position
- "tldr": 2 sentences — the concrete insight the reader walks away with. Start with "You'll" or a strong verb.
- "topic": the specific aspect of the goal this post covers (1–3 words, capitalised)

Return ONLY a valid JSON array sorted by order — no markdown, no code fences:
[{"publication":"...","title":"...","url":"...","type":"core","why":"...","tldr":"...","topic":"...","order":1}]`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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

module.exports = { rankPosts, localRankFallback: localRank, generateSearchQueries };
