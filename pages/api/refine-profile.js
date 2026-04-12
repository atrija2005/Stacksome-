/**
 * POST /api/refine-profile
 * Uses Claude to analyse the user's upvote/downvote signals and rewrite
 * their interest profile to be more accurate.
 */
import { withAuth } from '../../lib/auth';
import { getProfile, updateProfile, getAllSignals } from '../../lib/db';

const Anthropic = require('@anthropic-ai/sdk');

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const profile = await getProfile(supabase);
  const signals = await getAllSignals(supabase);

  const upSignals   = signals.filter(s => s.signal === 'up');
  const downSignals = signals.filter(s => s.signal === 'down');

  if (upSignals.length < 3) {
    return res.status(400).json({
      error: 'Not enough signals yet — upvote at least 3 posts first.',
      signalsNeeded: 3 - upSignals.length,
    });
  }

  const likedUrls   = upSignals.map(s => s.post_url);
  const skippedUrls = downSignals.map(s => s.post_url);
  const currentInterests = profile?.interests || '';

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are refining a user's Stacksome interest profile based on their reading behaviour.

Current profile:
"${currentInterests || '(none set)'}"

Posts the user UPVOTED (liked, found valuable) — URLs:
${likedUrls.slice(0, 20).map((u, i) => `${i + 1}. ${u}`).join('\n')}

Posts the user DOWNVOTED (skipped, not relevant) — URLs:
${skippedUrls.slice(0, 10).map((u, i) => `${i + 1}. ${u}`).join('\n')}

Based on the publication names and topics visible in these URLs, infer what this person is genuinely interested in vs. what they are not.

Write an updated interest profile in 3-5 sentences that:
- Captures the specific intellectual domains they engage with
- Notes any clear themes they avoid or are not interested in
- Is written in first person ("I am interested in...")
- Is specific enough to guide a curator selecting Substack articles
- Preserves anything from the current profile that still seems accurate

Return ONLY the updated profile text — no preamble, no explanation, no quotes.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const refined = message.content[0].text.trim();
    await updateProfile(supabase, user.id, refined);

    return res.json({
      success: true,
      profile: refined,
      signalsUsed: { liked: likedUrls.length, skipped: skippedUrls.length },
    });
  } catch (err) {
    if (!process.env.ANTHROPIC_API_KEY || err.status === 401 || err.status === 402 || err.status === 403) {
      const keywords = extractKeywordsFromUrls(likedUrls);
      const refined  = buildFallbackProfile(currentInterests, keywords);
      await updateProfile(supabase, user.id, refined);
      return res.json({ success: true, profile: refined, fallback: true, signalsUsed: { liked: likedUrls.length } });
    }
    return res.status(500).json({ error: err.message });
  }
});

function extractKeywordsFromUrls(urls) {
  const words = urls.join(' ')
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .toLowerCase()
    .split(/[\s/-]+/)
    .filter(w => w.length > 4)
    .filter(w => !['substack','https','feed','post','issue','weekly','newsletter','email','subscribe','read','open','thread'].includes(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
}

function buildFallbackProfile(current, keywords) {
  if (!keywords.length) return current;
  return `${current ? current + ' ' : ''}Based on reading patterns, I am particularly interested in: ${keywords.join(', ')}.`;
}
