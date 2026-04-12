/**
 * Stacksome Discovery Catalogue
 * Every entry has a feedUrl + tags array.
 * Tags drive both matchToProfile() and the SUGGESTIONS UI.
 */

const CATALOGUE = [

  // ── Manufacturing, Industry & Hardware ────────────────────────────────────
  { name: 'Construction Physics',       feedUrl: 'https://www.construction-physics.com/feed',               tags: ['manufacturing','industry','engineering','science','history','economics','supply chain','industrial'] },
  { name: 'The Prepared',               feedUrl: 'https://theprepared.substack.com/feed',                   tags: ['manufacturing','hardware','supply chain','engineering','design','industrial','operations'] },
  { name: 'Works in Progress',          feedUrl: 'https://worksinprogress.substack.com/feed',               tags: ['manufacturing','industry','science','progress','research','innovation','technology','history','industrial'] },
  { name: 'SemiAnalysis',               feedUrl: 'https://semianalysis.substack.com/feed',                  tags: ['manufacturing','semiconductors','chips','hardware','technology','supply chain','industrial','engineering'] },
  { name: 'Fabricated Knowledge',       feedUrl: 'https://www.fabricatedknowledge.com/feed',                tags: ['manufacturing','semiconductors','chips','hardware','supply chain','industrial','technology'] },
  { name: 'Doomberg',                   feedUrl: 'https://doomberg.substack.com/feed',                      tags: ['energy','commodities','manufacturing','industrial','economics','policy','geopolitics','supply chain'] },
  { name: 'Noah Smith (Noahpinion)',     feedUrl: 'https://noahpinion.substack.com/feed',                   tags: ['economics','manufacturing','industrial policy','technology','politics','analysis','supply chain','future'] },
  { name: 'Chartbook',                  feedUrl: 'https://adamtooze.substack.com/feed',                     tags: ['economics','history','geopolitics','industry','finance','manufacturing','industrial','analysis'] },
  { name: 'Diff (Byrne Hobart)',        feedUrl: 'https://www.thediff.co/rss/',                             tags: ['finance','technology','economics','business','markets','manufacturing','analysis','industry'] },
  { name: 'The Generalist (Mario)',     feedUrl: 'https://www.generalist.com/briefing/rss',                 tags: ['manufacturing','engineering','making','hardware','design','ideas','building','technology'] },
  { name: 'The Long View',              feedUrl: 'https://thelongview.substack.com/feed',                   tags: ['economics','industry','manufacturing','business','strategy','long term'] },

  // ── Technology & Engineering ──────────────────────────────────────────────
  { name: "Lenny's Newsletter",         feedUrl: 'https://www.lennysnewsletter.com/feed',                   tags: ['product','growth','startup','career','management','pm','technology'] },
  { name: 'The Pragmatic Engineer',     feedUrl: 'https://newsletter.pragmaticengineer.com/feed',           tags: ['engineering','software','tech','career','leadership','developer','technology'] },
  { name: 'The Generalist',             feedUrl: 'https://thegeneralist.substack.com/feed',                 tags: ['tech','startup','venture','companies','technology','analysis'] },
  { name: 'Refactoring',                feedUrl: 'https://refactoring.fm/feed',                             tags: ['engineering','product','startup','technology','career','software'] },
  { name: 'Pirate Wires',              feedUrl: 'https://www.piratewires.com/feed',                        tags: ['tech','culture','politics','media','silicon valley','future'] },
  { name: 'Tidy First',                feedUrl: 'https://tidyfirst.substack.com/feed',                     tags: ['engineering','software','design','architecture','code','development'] },
  { name: 'Acquired',                  feedUrl: 'https://www.acquired.fm/feed',                            tags: ['technology','business','history','companies','strategy','deep dive'] },

  // ── AI & Machine Learning ─────────────────────────────────────────────────
  { name: 'The Algorithmic Bridge',    feedUrl: 'https://thealgorithmicbridge.substack.com/feed',          tags: ['ai','machine learning','technology','neural networks','research','artificial intelligence'] },
  { name: 'Import AI',                 feedUrl: 'https://importai.substack.com/feed',                      tags: ['ai','machine learning','research','artificial intelligence','deep learning'] },
  { name: 'One Useful Thing',          feedUrl: 'https://oneusefulthing.substack.com/feed',                tags: ['ai','education','productivity','learning','artificial intelligence','tools'] },
  { name: 'The Intrinsic Perspective', feedUrl: 'https://erikhoel.substack.com/feed',                      tags: ['ai','science','consciousness','philosophy','neuroscience','future'] },
  { name: 'The Neuron Daily',          feedUrl: 'https://theneurondaily.substack.com/feed',                tags: ['ai','tools','artificial intelligence','news','productivity'] },
  { name: 'Stratechery',               feedUrl: 'https://stratechery.com/feed',                            tags: ['ai','tech','strategy','business','platforms','analysis','technology'] },

  // ── Finance & Investing ───────────────────────────────────────────────────
  { name: 'Klement on Investing',      feedUrl: 'https://klementoninvesting.substack.com/feed',            tags: ['investing','finance','markets','economics','analysis','quant'] },
  { name: 'Net Interest',              feedUrl: 'https://www.netinterest.co/feed',                         tags: ['finance','banking','investing','business','analysis','markets'] },
  { name: 'The Last Bear Standing',    feedUrl: 'https://thelastbearstanding.substack.com/feed',           tags: ['finance','investing','macro','markets','analysis','economics'] },
  { name: 'Concoda',                   feedUrl: 'https://concoda.substack.com/feed',                       tags: ['finance','markets','macro','investing','economics','monetary'] },
  { name: 'Frederik\'s Journals',      feedUrl: 'https://www.frederikjournals.com/feed',                   tags: ['investing','finance','manufacturing','industrials','analysis','stocks','industry'] },
  { name: 'Capital Gains',             feedUrl: 'https://capitalgains.thediff.co/feed',                    tags: ['investing','finance','markets','business','analysis','economics'] },
  { name: 'Verdad Research',           feedUrl: 'https://verdadcap.substack.com/feed',                     tags: ['investing','finance','quant','markets','research','economics','analysis'] },

  // ── Startups, Founders & Venture ─────────────────────────────────────────
  { name: 'Not Boring',                feedUrl: 'https://www.notboring.co/feed',                           tags: ['startup','founder','business','strategy','technology','venture','entrepreneur'] },
  { name: 'The Bootstrapped Founder',  feedUrl: 'https://thebootstrappedfounder.substack.com/feed',       tags: ['startup','bootstrapping','saas','founder','business','indie','entrepreneur'] },
  { name: 'Napkin Math',               feedUrl: 'https://napkinmath.substack.com/feed',                   tags: ['startup','founder','business','growth','metrics','saas','venture'] },
  { name: 'Every (Dan Shipper)',        feedUrl: 'https://every.to/feed',                                  tags: ['startup','founder','ai','productivity','writing','business','entrepreneur'] },
  { name: 'The Generalist',            feedUrl: 'https://thegeneralist.substack.com/feed',                tags: ['startup','venture','founder','companies','technology','analysis','vc'] },
  { name: 'Newcomer (Eric Newcomer)',   feedUrl: 'https://www.newcomer.co/feed',                          tags: ['startup','venture','founder','vc','fundraising','silicon valley','tech'] },
  { name: 'The Information',           feedUrl: 'https://www.theinformation.com/feed',                    tags: ['startup','tech','founder','venture','business','companies','silicon valley'] },

  // ── Business & Strategy ───────────────────────────────────────────────────
  { name: 'The Profile',               feedUrl: 'https://theprofile.substack.com/feed',                    tags: ['business','leadership','biography','people','entrepreneurship','founder'] },
  { name: 'Prof G Markets',            feedUrl: 'https://profgalloway.substack.com/feed',                  tags: ['business','markets','technology','culture','analysis','strategy'] },
  { name: 'Commonplace (Cedric Chin)', feedUrl: 'https://commoncog.substack.com/feed',                    tags: ['learning','mental models','business','strategy','ideas','career','operations'] },

  // ── Science, Progress & Ideas ─────────────────────────────────────────────
  { name: 'Astral Codex Ten',          feedUrl: 'https://astralcodexten.substack.com/feed',               tags: ['philosophy','psychology','rationality','science','medicine','policy'] },
  { name: 'Cremieux Recueil',          feedUrl: 'https://cremieux.substack.com/feed',                     tags: ['science','research','statistics','social science','analysis','data'] },
  { name: 'Experimental History',      feedUrl: 'https://experimentalhistory.substack.com/feed',          tags: ['psychology','science','research','behavior','society','data'] },
  { name: 'Why Is This Interesting',   feedUrl: 'https://whyisthisinteresting.substack.com/feed',         tags: ['curiosity','culture','technology','history','design','ideas'] },
  { name: 'The Roots of Progress',     feedUrl: 'https://rootsofprogress.substack.com/feed',              tags: ['progress','science','history','technology','industry','manufacturing','ideas','innovation'] },
  { name: 'Maximum Progress',          feedUrl: 'https://maximumprogress.substack.com/feed',              tags: ['progress','industry','technology','science','innovation','economics','manufacturing'] },

  // ── Geopolitics & Policy ──────────────────────────────────────────────────
  { name: 'Battlegrounds',             feedUrl: 'https://battlegrounds.substack.com/feed',                tags: ['geopolitics','history','international','politics','security','conflict'] },
  { name: 'Heather Cox Richardson',    feedUrl: 'https://heathercoxrichardson.substack.com/feed',        tags: ['history','politics','america','democracy','analysis','society'] },
  { name: 'Slow Boring',               feedUrl: 'https://www.slowboring.com/feed',                       tags: ['politics','policy','economics','analysis','society','america'] },

  // ── Philosophy & Long-form ────────────────────────────────────────────────
  { name: 'Applied Divinity Studies',  feedUrl: 'https://applieddivinitystudies.substack.com/feed',      tags: ['philosophy','rationality','ideas','culture','contrarian','thinking'] },
  { name: 'Freddie deBoer',            feedUrl: 'https://freddiedeboer.substack.com/feed',               tags: ['education','politics','culture','contrarian','writing','society'] },

  // ── Writing, Culture & Media ──────────────────────────────────────────────
  { name: 'The Honest Broker',         feedUrl: 'https://tedgioia.substack.com/feed',                    tags: ['music','culture','writing','arts','media','criticism'] },
  { name: 'Platformer',                feedUrl: 'https://www.platformer.news/feed',                      tags: ['tech','media','journalism','platforms','policy','social media'] },
  { name: 'The Rebooting',             feedUrl: 'https://therebooting.substack.com/feed',                tags: ['media','journalism','business','publishing','future','newsletters'] },

  // ── Career & Self-Development ─────────────────────────────────────────────
  { name: 'Paul Millerd',              feedUrl: 'https://paulmillerd.substack.com/feed',                 tags: ['work','career','entrepreneurship','freelance','life','purpose'] },
  { name: 'Superorganizers',           feedUrl: 'https://superorganizers.substack.com/feed',             tags: ['productivity','tools','systems','work','learning','ai'] },
];

// ── Synonym / expansion map ───────────────────────────────────────────────────
// When a user's profile contains any of the keys, we also score against the values.
// This means "manufacturing" in a profile matches pubs tagged "supply chain", "industrial", etc.
const SYNONYMS = {
  'manufacturing': ['industry','industrial','supply chain','hardware','engineering','production','factory','operations','fabrication','semiconductors','chips'],
  'manufacture':   ['industry','industrial','supply chain','hardware','engineering','production'],
  'factory':       ['manufacturing','industrial','operations','supply chain','industry'],
  'supply chain':  ['manufacturing','logistics','operations','industrial','hardware'],
  'industrial':    ['manufacturing','industry','engineering','hardware','supply chain','operations'],
  'hardware':      ['manufacturing','engineering','supply chain','semiconductors','design'],
  'semiconductor': ['manufacturing','chips','hardware','supply chain','technology'],
  'investing':     ['finance','markets','economics','stocks','portfolio','analysis'],
  'finance':       ['investing','markets','banking','economics','financial','capital'],
  'startup':       ['venture','founder','business','saas','growth','entrepreneurship'],
  'entrepreneur':  ['startup','founder','business','venture','bootstrapping'],
  'artificial intelligence': ['ai','machine learning','deep learning','llm'],
  'machine learning': ['ai','artificial intelligence','deep learning','research'],
  'technology':    ['tech','engineering','software','innovation','digital'],
  'philosophy':    ['ideas','thinking','rationality','ethics','ideas','contrarian'],
  'psychology':    ['behavior','cognitive','mental','neuroscience','research'],
  'economics':     ['finance','markets','policy','trade','macro','analysis'],
  'geopolitics':   ['politics','international','history','policy','conflict','security'],
  'climate':       ['energy','environment','sustainability','carbon','renewable'],
  'health':        ['medicine','biology','fitness','neuroscience','longevity'],
  'science':       ['research','physics','biology','chemistry','progress','innovation'],
  'history':       ['past','civilisation','context','analysis','society','culture'],
  'leadership':    ['management','strategy','career','business','operations','execution'],
  'operations':    ['manufacturing','supply chain','logistics','management','execution'],
  'design':        ['engineering','product','hardware','ux','systems','architecture'],
  'progress':      ['innovation','technology','industry','science','manufacturing','future'],
};

// ── Deduplicate by feedUrl ───────────────────────────────────────────────────
const seen = new Set();
const UNIQUE_CATALOGUE = CATALOGUE.filter(p => {
  if (seen.has(p.feedUrl)) return false;
  seen.add(p.feedUrl);
  return true;
});

// ── Suggestions grouped by category (for Settings > Publications > Browse) ───
const SUGGESTIONS = [
  {
    category: 'Manufacturing & Industry',
    color: '#b07d2a',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['manufacturing','industrial','supply chain','hardware','semiconductors'].includes(t)))
      .slice(0, 8)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'Finance & Investing',
    color: '#2a6b4a',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['finance','investing','markets','economics'].includes(t)))
      .slice(0, 6)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'AI & Machine Learning',
    color: '#7b2fa0',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.includes('ai') || p.tags.includes('machine learning') || p.tags.includes('artificial intelligence'))
      .slice(0, 6)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'Technology & Engineering',
    color: '#9b2335',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['engineering','software','developer','tech'].includes(t)) && !p.tags.includes('manufacturing'))
      .slice(0, 6)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'Startups & Founders',
    color: '#c44b1f',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['founder','startup','entrepreneur','venture','bootstrapping','vc'].includes(t)))
      .slice(0, 7)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'Business & Strategy',
    color: '#1a4f6e',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['business','strategy'].includes(t)) && !p.tags.includes('ai') && !p.tags.includes('founder'))
      .slice(0, 5)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'Science, Progress & Ideas',
    color: '#1a6e3a',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['science','philosophy','research','progress'].includes(t)))
      .slice(0, 6)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
  {
    category: 'Geopolitics & Policy',
    color: '#6b2a6e',
    pubs: UNIQUE_CATALOGUE
      .filter(p => p.tags.some(t => ['geopolitics','politics','policy','history'].includes(t)))
      .slice(0, 5)
      .map(p => ({ name: p.name, url: p.feedUrl.replace('/feed','').replace(/^https?:\/\//, ''), desc: p.tags.slice(0,3).join(', ') })),
  },
];

// ── Match catalogue to a user profile ────────────────────────────────────────
function matchToProfile(profile, excludeNames = [], limit = 20) {
  if (!profile || profile.trim().length < 5) {
    return UNIQUE_CATALOGUE
      .filter(p => !excludeNames.map(n => n.toLowerCase()).includes(p.name.toLowerCase()))
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
  }

  const raw = profile.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

  // Build expanded word set: profile words + all synonyms they trigger
  const baseWords = raw.split(/\s+/).filter(w => w.length > 2);
  const expandedWords = new Set(baseWords);

  for (const [keyword, synonyms] of Object.entries(SYNONYMS)) {
    // Check if any base word matches the keyword (or is contained in it)
    const triggered = baseWords.some(w =>
      keyword.includes(w) || w.includes(keyword) || keyword === w
    );
    if (triggered) {
      synonyms.forEach(s => s.split(' ').forEach(sw => expandedWords.add(sw)));
      // Also add multi-word synonyms as phrases
      synonyms.forEach(s => expandedWords.add(s));
    }
  }

  const excludeLower = new Set(excludeNames.map(n => n.toLowerCase()));

  const scored = UNIQUE_CATALOGUE
    .filter(p => !excludeLower.has(p.name.toLowerCase()))
    .map(p => {
      let score = 0;
      for (const tag of p.tags) {
        const tagWords = tag.split(' ');
        for (const word of expandedWords) {
          // Exact tag match = 3 pts, partial = 1 pt
          if (tag === word) score += 3;
          else if (tag.includes(word) || word.includes(tag)) score += 1;
        }
        // Bonus: if tag appears literally in the raw profile = 5 pts
        if (raw.includes(tag)) score += 5;
      }
      return { ...p, _score: score };
    })
    .filter(p => p._score > 0)   // drop zero-score pubs
    .sort((a, b) => b._score - a._score);

  // If fewer than 8 scored pubs, pad with randoms
  const result = scored.slice(0, limit);
  if (result.length < 8) {
    const extra = UNIQUE_CATALOGUE
      .filter(p => !excludeLower.has(p.name.toLowerCase()) && !result.find(r => r.feedUrl === p.feedUrl))
      .sort(() => Math.random() - 0.5)
      .slice(0, limit - result.length);
    result.push(...extra);
  }

  console.log(`[matchToProfile] Top matches: ${result.slice(0,5).map(p => `${p.name}(${p._score})`).join(', ')}`);
  return result.slice(0, limit);
}

module.exports = { CATALOGUE: UNIQUE_CATALOGUE, SUGGESTIONS, matchToProfile };
