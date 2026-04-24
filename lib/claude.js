const Anthropic = require('@anthropic-ai/sdk');
const scraper   = require('./scraper');

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
  const wild     = pool.slice(9, 10).map(p => ({ publication: p.publication_name, title: p.title, url: p.url, description: p.description, type: 'wild',     why: why('wild'),     topic: guessTopic(p), tldr: '' }));

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

Also write:
- A 1-sentence summary of what the curriculum will cover (for the user confirmation screen)
- A refined version of the user's goal (more specific, keep same intent)
- 3-4 short topic phrases (4-6 words each) that tell the user what angles the curriculum covers — e.g. "Payments infrastructure & unit economics", "PE valuation methodology", "Bear case & regulatory risks"

Rules for queries:
- Each query is 3–6 words, plain text, no quotes
- Specific enough to find expert essays on Substack
- Diverse — no two queries should retrieve the same posts

Return ONLY valid JSON:
{"refinedGoal":"...","summary":"...","queries":["...","...","...","...","...","...","..."],"bullets":["...","...","...","..."]}`

      : `You are a research strategist. A user wants to learn about this goal:

"${goal}"

Generate exactly 5 Substack search queries that together will surface a well-rounded reading curriculum on this goal. Cover: fundamentals, business/economic angles, current debates, practical implications, and one forward-looking angle.

Also write:
- A 1-sentence summary of what the curriculum will cover (for the user confirmation screen)
- A refined version of the user's goal (more specific, keep same intent)
- 3-4 short topic phrases (4-6 words each) that tell the user what angles the curriculum covers — e.g. "Payments infrastructure & unit economics", "PE valuation methodology", "Bear case & regulatory risks"

Rules for queries:
- Each query is 3–6 words, plain text, no quotes
- Specific enough to find expert essays on Substack
- Diverse — no two queries should retrieve the same posts

Return ONLY valid JSON:
{"refinedGoal":"...","summary":"...","queries":["...","...","...","...","..."],"bullets":["...","...","..."]}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw    = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);

    return {
      refinedGoal: (parsed.refinedGoal || goal).trim(),
      summary:     (parsed.summary     || '').trim(),
      queries:     (parsed.queries     || []).slice(0, count).filter(Boolean),
      bullets:     (parsed.bullets     || []).slice(0, 4).filter(Boolean),
    };
  } catch (err) {
    console.warn('[generateSearchQueries] Claude error — using raw goal:', err.message);
    // Fallback: use goal as single query, no bullets (they come from Claude only)
    return { refinedGoal: goal, summary: '', queries: [goal.slice(0, 60)], bullets: [] };
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

    const preferredPubs = Array.isArray(opts.preferredPubs) ? opts.preferredPubs : [];
    const preferredSection = preferredPubs.length > 0
      ? `\nBehaviour signal — the user has spent time reading or expanding posts from these publications (prioritise them if relevant posts are available in the candidate pool): ${JSON.stringify(preferredPubs)}\n`
      : '';

    // Split rules based on count
    const coreCount  = Math.round(count * 0.7);
    const adjCount   = Math.round(count * 0.2);
    const wildCount  = count - coreCount - adjCount;

    const isDeep = opts.mode === 'deep';

    const prompt = isDeep
      ? `You are a sector research curator for Stacksome. The user is doing serious, high-stakes preparation.

Goal: "${profile || 'Deep sector research.'}"
${referenceSection}${preferredSection}
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
- "why": one short sentence in plain, direct language — tell the reader exactly what they'll get from this post and why it matters for their goal. Write like you're talking to a smart friend, not writing a report. No jargon. No "contributes to" or "provides insight into". Examples of good why: "Read this first — it explains how the whole industry actually works." / "This one makes the bear case. Know the risks before you go in." / "Covers who the real power players are and why they matter."
- "tldr": 2 sentences — the concrete insight the reader walks away with. Start with "You'll" or a strong verb.
- "topic": specific aspect covered (1–3 words, capitalised)

Return ONLY a valid JSON array — no markdown, no code fences:
[{"publication":"...","title":"...","url":"...","type":"core","why":"...","tldr":"...","topic":"...","angle":"Overview"}]`

      : `You are a curriculum designer for Stacksome. The user has a specific learning goal.

Goal: "${profile || 'Broad intellectual curiosity across disciplines.'}"
${referenceSection}${preferredSection}
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
- "why": one short sentence in plain, direct language — tell the reader exactly what they'll get from this post and why it matters right now in the sequence. Write like you're talking to a smart friend, not writing a report. No jargon. No "contributes to" or "provides insight into". Examples of good why: "Start here — this gives you the mental model everything else builds on." / "Read this second — it shows how the money actually works." / "Save this for last — it's the most advanced take in the set."
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

// ─── Suggest best Substack publications for a goal ───────────────────────────
async function suggestPublications(goal) {
  try {
    const prompt = `You are a Substack expert. Given this reading goal, suggest the 10 best Substack publications that publish high-quality posts on this exact topic.

Goal: "${goal}"

Rules:
- Only suggest real, active Substack publications you are confident exist
- Provide the base URL: either "subdomain.substack.com" or the custom domain if well-known (e.g. "stratechery.com", "mattstoller.substack.com")
- Prioritise depth and quality over popularity
- Mix established names with niche experts
- Aim for publications that write long-form analysis, not just news

Return ONLY valid JSON (no commentary):
{"publications":["url1","url2","url3","url4","url5","url6","url7","url8","url9","url10"]}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw    = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);
    const pubs   = (parsed.publications || []).filter(Boolean).map(u =>
      u.startsWith('http') ? u : `https://${u}`
    );
    console.log(`[suggestPublications] ${pubs.length} pubs suggested for: "${goal.slice(0,60)}"`);
    return pubs;
  } catch (err) {
    console.warn('[suggestPublications] failed:', err.message);
    return [];
  }
}

// ─── Suggest specific known posts for a goal ─────────────────────────────────
async function suggestSpecificPosts(goal, mode = 'quick') {
  const count = mode === 'deep' ? 20 : 14;
  try {
    const prompt = `You are a Substack curator with deep knowledge of newsletters and essays published before early 2024.

A user wants to read about: "${goal}"

Suggest ${count} specific Substack posts or essays that DIRECTLY serve this goal. These must be real posts you are confident exist from your training data.

For each post return:
- title: the exact post title as published
- publication_name: the newsletter name
- url: the full URL — use format https://subdomain.substack.com/p/slug or custom domain. Derive the slug from the title (lowercase words joined by hyphens, drop punctuation).
- description: 2 sentences on what this post covers and why it serves the goal

Return ONLY valid JSON (no markdown, no commentary):
{"posts":[{"title":"...","publication_name":"...","url":"...","description":"..."}]}

Rules:
- ONLY posts you are genuinely confident exist — no guessing
- Must directly address the stated goal, not just tangentially related
- Long-form analytical essays preferred over news items
- Diverse publications — don't repeat the same newsletter
- Mix evergreen classics with impactful recent pieces`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw    = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);
    const posts  = (parsed.posts || []).filter(p => p.title && p.url && p.publication_name);

    console.log(`[suggestSpecificPosts] ${posts.length} posts suggested for: "${goal.slice(0, 60)}"`);
    return posts.map(p => ({
      publication_name: p.publication_name,
      title:            p.title,
      url:              p.url,
      description:      p.description || '',
      published_at:     new Date().toISOString(),
      _source:          'claude-suggested',
      _profileScore:    120, // High base score — Claude directly chose these
      _reactions:       0,
      _comments:        0,
      _engagement:      0,
    }));
  } catch (err) {
    console.warn('[suggestSpecificPosts] failed:', err.message);
    return [];
  }
}

// ─── Firecrawl: scrape a publication page to find real post URLs ──────────────
async function firecrawlDiscoverPosts(pubUrl) {
  const { ok, posts } = await scraper.discoverPubPosts(pubUrl);
  return ok ? posts : [];
}

// ─── enrichAndFilterPool: scrape bodies + score semantically ─────────────────

/**
 * Scrapes the most uncertain posts in the pool, scores each 0–10 for
 * relevance to the goal using Claude, then removes anything < 6.
 * Posts that were not scraped (budget exhausted, Firecrawl unavailable) are
 * kept as-is — we never penalise for missing data.
 *
 * @param {object[]} posts  – full candidate pool
 * @param {string}   goal   – user's refined goal / interest text
 * @returns {Promise<object[]>} enriched + filtered pool
 */
async function enrichAndFilterPool(posts, goal) {
  if (!scraper.isAvailable()) {
    console.log('[enrichAndFilterPool] Firecrawl not configured — skipping');
    return posts;
  }
  if (!posts || posts.length === 0) return posts;

  const MAX_SCRAPES = 12;

  // ── 1. Select which posts to scrape (priority order) ───────────────────────
  function needsScrape(p) {
    if (p._source === 'claude-suggested') return true;               // hallucination risk
    if ((p.description || '').length < 60) return true;             // thin metadata
    if (/^([A-Z][a-z]+ ){2,6}[A-Z][a-z]+$/.test(p.title || '')) return true; // slug-like
    return false;
  }

  const toScrape = posts.filter(needsScrape).slice(0, MAX_SCRAPES);
  console.log(`[enrichAndFilterPool] Scraping ${toScrape.length} of ${posts.length} posts`);

  // ── 2. Scrape in parallel (up to MAX_SCRAPES) ──────────────────────────────
  const scrapeResults = await Promise.allSettled(
    toScrape.map(p => scraper.scrapePost(p.url))
  );

  // Build url → scraped data map
  const scraped = new Map();
  scrapeResults.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.ok) {
      scraped.set(toScrape[i].url, r.value);
    }
  });

  // Apply real titles and descriptions to pool posts
  const pool = posts.map(p => {
    const data = scraped.get(p.url);
    if (!data) return p;
    return {
      ...p,
      title:       (data.title       && data.title.length > 5)       ? data.title       : p.title,
      description: (data.description && data.description.length > 20) ? data.description : p.description,
      _enriched:   true,
      _scrapedMarkdown: data.markdown, // used for Claude scoring below
    };
  });

  // ── 3. Score scraped posts with Claude (batch of 5) ────────────────────────
  const enrichedPosts = pool.filter(p => p._enriched && p._scrapedMarkdown);
  const scored        = new Map(); // url → score

  const BATCH = 5;
  for (let i = 0; i < enrichedPosts.length; i += BATCH) {
    const batch = enrichedPosts.slice(i, i + BATCH);
    const prompt = `Goal: "${goal}"

Rate each post 0–10 for how DIRECTLY relevant it is to the goal.
10 = directly and deeply addresses the goal. 0 = unrelated.
Be strict — only score ≥ 6 if the post genuinely serves the goal.

${batch.map((p, idx) => `[${idx}] Title: ${p.title}\nContent:\n${(p._scrapedMarkdown || '').slice(0, 800)}`).join('\n\n---\n\n')}

Return ONLY valid JSON — no markdown, no commentary:
[{"index":0,"score":7,"reason":"..."},...]`;

    try {
      const msg = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        messages:   [{ role: 'user', content: prompt }],
      });
      const raw    = msg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(raw);
      for (const entry of parsed) {
        const post = batch[entry.index];
        if (post) scored.set(post.url, { score: entry.score, reason: entry.reason || '' });
      }
    } catch (err) {
      console.warn('[enrichAndFilterPool] Claude scoring batch failed:', err.message);
      // Batch failed — those posts keep no score, won't be filtered
    }
  }

  // ── 4. Filter + annotate ───────────────────────────────────────────────────
  const THRESHOLD = 6;
  let filtered = 0;

  const result = pool
    .filter(p => {
      const s = scored.get(p.url);
      if (!s) return true; // not scored → keep
      if (s.score < THRESHOLD) { filtered++; return false; }
      return true;
    })
    .map(p => {
      const s = scored.get(p.url);
      if (!s) return p;
      // eslint-disable-next-line no-unused-vars
      const { _scrapedMarkdown, ...rest } = p; // strip raw markdown before ranking
      return { ...rest, _relevanceScore: s.score, _relevanceReason: s.reason };
    });

  console.log(`[enrichAndFilterPool] ${enrichedPosts.length} scraped · ${filtered} filtered out (score < ${THRESHOLD}) · ${result.length} remaining`);
  return result;
}

module.exports = { rankPosts, localRankFallback: localRank, generateSearchQueries, suggestPublications, suggestSpecificPosts, firecrawlDiscoverPosts, enrichAndFilterPool };
