import { withAuth } from '../../lib/auth';
import { getPublications, addPublication, deletePublication, setPublicationReference } from '../../lib/db';
import { toFeedUrl, toCanonicalUrl, validateAndParseFeed } from '../../lib/rss';

export default withAuth(async (req, res, user, supabase) => {
  if (req.method === 'GET') {
    const pubs = await getPublications(supabase, user.id);
    return res.json(pubs);
  }

  if (req.method === 'POST') {
    const { url, action, id, isReference } = req.body || {};

    if (action === 'set_reference') {
      if (!id) return res.status(400).json({ error: 'id required' });
      await setPublicationReference(supabase, id, !!isReference);
      return res.json({ success: true });
    }

    if (!url) return res.status(400).json({ error: 'url required' });
    try {
      const feedUrl = toFeedUrl(url);
      const { title } = await validateAndParseFeed(feedUrl);
      const canonical = toCanonicalUrl(url);
      const pub = await addPublication(supabase, user.id, canonical, feedUrl, title);
      return res.json({ success: true, name: title, pub });
    } catch (err) {
      return res.status(400).json({ error: `Could not parse feed: ${err.message}` });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await deletePublication(supabase, id);
    return res.json({ success: true });
  }

  res.status(405).end();
});
