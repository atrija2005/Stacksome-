/**
 * POST /api/expand-goal
 * Takes a user's stated goal and returns:
 *   - refinedGoal: more specific version of what the user typed
 *   - summary: 1-sentence description of what the curriculum will cover
 *   - queries: 5–7 search queries to use for Substack discovery
 *   - bullets: 3–4 short phrases describing what the curriculum covers (for confirmation UI)
 */
import { withAuth } from '../../lib/auth';
import { generateSearchQueries } from '../../lib/claude';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { goal, mode = 'quick' } = req.body || {};
  if (!goal?.trim()) return res.status(400).json({ error: 'goal required' });

  try {
    const data = await generateSearchQueries(goal.trim(), mode);

    return res.json({
      success:     true,
      refinedGoal: data.refinedGoal,
      summary:     data.summary,
      queries:     data.queries,
      bullets:     data.bullets || [],
      mode,
    });
  } catch (err) {
    console.error('[expand-goal]', err.message);
    return res.status(500).json({ error: err.message });
  }
});
