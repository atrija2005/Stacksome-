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

    // Derive 3–4 bullet points from the queries for the confirmation UI
    // Each query becomes a short "I'll cover X" phrase
    const bullets = (data.queries || [])
      .slice(0, 4)
      .map(q => {
        // Capitalise first letter
        return q.charAt(0).toUpperCase() + q.slice(1);
      });

    return res.json({
      success:     true,
      refinedGoal: data.refinedGoal,
      summary:     data.summary,
      queries:     data.queries,
      bullets,
      mode,
    });
  } catch (err) {
    console.error('[expand-goal]', err.message);
    return res.status(500).json({ error: err.message });
  }
});
