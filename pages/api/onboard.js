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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are helping someone set up a personalized reading profile for Stacksome — an intelligent Substack curation app that finds the best essays, analyses, and ideas across the internet.

The user was asked: "What's on your mind right now? What do you want to get smarter about?"

Their answer: "${input.trim()}"

Your job:
1. Write a rich, specific interest profile (2-4 sentences) that will be used to curate posts for this person. Expand vague terms into specific adjacent areas. If they say "manufacturing", think: factory economics, supply chains, industrial policy, capital-intensive businesses, automation, materials science, operations. Make it vivid and detailed — this is what Claude will read before picking every article.
2. Extract 5-8 short topic tags (1-3 words each) that represent their core interests. These appear as clickable filter pills.
3. Write 8 "resonance prompts" — short phrases (6-10 words) that describe article angles they might love. These look like mini-headlines. Cover their main interests AND 2-3 surprising adjacent areas they probably haven't thought of. Format like: "Why most factories fail before they scale" or "The hidden economics of supply chains".
4. Write one short summary sentence (under 12 words) describing what Stacksome will find for them.

Return ONLY valid JSON, no markdown:
{
  "profile": "...",
  "topics": ["...", "..."],
  "prompts": ["...", "...", "...", "...", "...", "...", "...", "..."],
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
    // Graceful fallback
    return res.json({
      success: true,
      profile: `Interested in: ${input.trim()}. Looking for rigorous, first-principles writing that builds real understanding.`,
      topics: input.trim().split(/[,\s]+/).filter(w => w.length > 3).slice(0, 6).map(w => w.charAt(0).toUpperCase() + w.slice(1)),
      prompts: [
        'The first principles behind this field',
        'What most people get wrong about this',
        'How the best practitioners actually think',
        'The history that explains the present',
        'Contrarian takes worth considering',
        'Where this field intersects with others',
        'The frameworks that actually work',
        'What the data really shows',
      ],
      summary: `Deep reads on ${input.trim().slice(0, 40)}`,
    });
  }
});
