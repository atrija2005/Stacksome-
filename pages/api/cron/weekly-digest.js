/**
 * GET /api/cron/weekly-digest
 * Fires every Monday at 9am UTC via Vercel Cron.
 * Reads all active email subscribers from auth.users metadata,
 * generates a personalised Substack digest for each, and sends it.
 */
import { createServiceClient } from '../../../lib/supabase';
import { discoverPosts } from '../../../lib/substack-discover';
import { buildEmailHtml } from '../../../lib/email';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stacksome.vercel.app';

export default async function handler(req, res) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createServiceClient();

  // Fetch all users — subscribers have user_metadata.subscriber === true
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    console.error('[weekly-digest] listUsers failed:', error.message);
    return res.status(500).json({ error: error.message });
  }

  const subscribers = users.filter(u => u.user_metadata?.subscriber === true && u.email);

  if (subscribers.length === 0) {
    return res.json({ success: true, sent: 0, message: 'No active subscribers.' });
  }

  console.log(`[weekly-digest] Sending to ${subscribers.length} subscribers`);

  const results = { sent: 0, failed: 0, errors: [] };

  for (const sub of subscribers) {
    try {
      const interests = sub.user_metadata?.interests || 'technology startups';
      const token = sub.user_metadata?.unsubscribe_token;
      const unsubscribeUrl = token ? `${BASE_URL}/api/unsubscribe?token=${token}` : null;

      let posts = await discoverPosts(interests, [], 80);
      posts = posts
        .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
        .slice(0, 10);

      if (posts.length === 0) {
        console.warn(`[weekly-digest] No posts for ${sub.email}`);
        results.failed++;
        continue;
      }

      await resend.emails.send({
        from:    'Stacksome <onboarding@resend.dev>',
        to:      sub.email,
        subject: 'Your Stacksome reads this week',
        html:    buildEmailHtml(posts, interests, unsubscribeUrl),
      });

      results.sent++;
      console.log(`[weekly-digest] ✓ ${sub.email}`);
    } catch (err) {
      console.error(`[weekly-digest] ✗ ${sub.email}:`, err.message);
      results.failed++;
      results.errors.push({ email: sub.email, error: err.message });
    }
  }

  console.log(`[weekly-digest] Done — sent: ${results.sent}, failed: ${results.failed}`);
  return res.json({ success: true, ...results });
}
