import { withAuth } from '../../lib/auth';
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { input } = req.body || {};
  if (!input?.trim()) return res.status(400).json({ error: 'input required' });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `You are helping someone set up a personalized reading profile for Stacksome — an intelligent Substack curation app that finds the best essays, analyses, and ideas across the internet.

The user was asked: "What's on your mind right now? What do you want to get smarter about?"

Their answer: "${input.trim()}"

Your job:
1. Write a rich, specific interest profile (2-4 sentences) that will be used to curate posts for this person. Expand vague terms into specific adjacent areas. Make it vivid and detailed — this is what Claude will read before picking every article.
2. Extract exactly 3-4 short topic tags (1-3 words each) that represent their broadest core interests. Keep them human and evocative, not jargon. These appear as clickable chips.
3. For each topic tag, write exactly 5 "sub-option" phrases (8-12 words each) that describe specific angles or lenses within that topic. These look like mini-headlines — punchy, opinionated, specific. Cover the main angles AND 1-2 surprising adjacent ones. Example for "Manufacturing": "Why most factories fail before they scale", "The hidden economics of supply chains", "Industrial policy and the reshoring wave", "Automation, labour, and what comes next", "Capital intensity and the returns nobody talks about".
4. Write one short summary sentence (under 12 words) describing what Stacksome will find for them.

Return ONLY valid JSON, no markdown:
{
  "profile": "...",
  "topics": ["...", "...", "..."],
  "sub_options": {
    "TopicName": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
    "TopicName2": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"]
  },
  "summary": "..."
}`
      }],
    });

    const raw = message.content[0].text.trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const parsed = JSON.parse(raw);
    return res.json({ success: true, ...parsed });

  } catch (err) {
    console.error('[onboard] Claude error:', err.message);
    const words = input.trim().split(/[,\s]+/).filter(w => w.length > 3).slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const sub_options = {};
    words.forEach(t => {
      sub_options[t] = [
        'The first principles behind this field',
        'What most people get wrong about this',
        'How the best practitioners actually think',
        'The history that explains the present',
        'Where this intersects with everything else',
      ];
    });
    return res.json({
      success: true,
      profile: `Interested in: ${input.trim()}. Looking for rigorous, first-principles writing that builds real understanding.`,
      topics: words,
      sub_options,
      summary: `Deep reads on ${input.trim().slice(0, 40)}`,
    });
  }
});
