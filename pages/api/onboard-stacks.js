import { withAuth } from '../../lib/auth';
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { topics = [], selectedSubOptions = {}, profile = '' } = req.body || {};

  const subOptionLines = Object.entries(selectedSubOptions)
    .flatMap(([topic, opts]) => opts.map(o => `  - ${topic}: ${o}`))
    .join('\n');

  const prompt = `You are helping calibrate a personalized reading experience for a new Stacksome user.

Their interest profile: "${profile}"
Their topics: ${topics.join(', ')}
${subOptionLines ? `Specific angles they care about:\n${subOptionLines}` : ''}

Generate exactly 3 "test stacks" — sample reading lists that represent different editorial styles and lenses. Pick the 3 archetypes from this list that best fit their interests:
- Contrarian: challenges consensus, makes you reconsider
- First Principles: from the ground up, foundational thinking
- Builder's Lens: practical, operational, what actually works
- Big Picture: macro trends, systems thinking, zoomed out
- Quiet Depth: slower, reflective, ideas that compound over time

For each stack, write 3 post headlines (10-16 words each) that sound like real, high-quality Substack pieces a thoughtful writer would publish — specific, opinionated, grounded in the user's interests.

Return ONLY valid JSON, no markdown:
[
  {
    "id": "snake_case_id",
    "vibe": "Stack Name",
    "description": "One sentence describing the editorial angle (under 12 words)",
    "posts": ["headline 1", "headline 2", "headline 3"]
  },
  { ... },
  { ... }
]`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const stacks = JSON.parse(raw);
    return res.json({ success: true, stacks });

  } catch (err) {
    console.error('[onboard-stacks] error:', err.message);
    return res.json({
      success: true,
      stacks: [
        {
          id: 'contrarian',
          vibe: 'The Contrarian Take',
          description: 'Writing that challenges consensus and makes you reconsider',
          posts: [
            'Why the conventional wisdom in your field is quietly falling apart',
            'The uncomfortable data point everyone in this industry ignores',
            'What the most successful people here believe that nobody says out loud',
          ],
        },
        {
          id: 'first_principles',
          vibe: 'First Principles',
          description: 'From the ground up — foundational thinking that actually holds',
          posts: [
            'Strip it back: what is this field actually trying to solve',
            'The mental models that practitioners use but rarely write down',
            'Why most frameworks fail and what the underlying logic really is',
          ],
        },
        {
          id: 'big_picture',
          vibe: 'The Big Picture',
          description: 'Macro trends and systems thinking, zoomed all the way out',
          posts: [
            'The structural shift happening right now that most people are missing',
            'How this connects to three other things that are also changing fast',
            'Ten years from now, this will look obvious — here is why',
          ],
        },
      ],
    });
  }
});
