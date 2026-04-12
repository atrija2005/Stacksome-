import { withAuth } from '../../lib/auth';
import { getPublications, upsertPost, updateLastFetched } from '../../lib/db';
import { fetchFeed } from '../../lib/rss';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method !== 'POST') return res.status(405).end();

  const publications = await getPublications(supabase);
  if (publications.length === 0) {
    return res.json({ success: true, fetched: 0, message: 'No publications tracked yet.' });
  }

  let totalFetched = 0;
  const errors = [];

  for (const pub of publications) {
    try {
      const items = await fetchFeed(pub.feed_url);
      for (const item of items) {
        if (item.url) {
          await upsertPost(supabase, user.id, pub.id, item.title, item.description, item.url, item.publishedAt);
          totalFetched++;
        }
      }
      await updateLastFetched(supabase, pub.id);
    } catch (err) {
      errors.push({ publication: pub.name, error: err.message });
    }
  }

  return res.json({ success: true, fetched: totalFetched, errors });
});
