/**
 * GET /api/cron/weekly-digest
 * Invoked every Monday at 9am UTC by Vercel Cron.
 * Sends personalised Substack reading lists to all active subscribers.
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

  // Fetch all active subscribers
  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('id, email, interests, unsubscribe_token')
    .eq('active', true);

  if (error) {
    console.error('[weekly-digest] Failed to fetch subscribers:', error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!subscribers || subscribers.length === 0) {
    return res.json({ success: true, sent: 0, message: 'No active subscribers.' });
  }

  console.log(`[weekly-digest] Sending to ${subscribers.length} subscribers`);

  const results = { sent: 0, failed: 0, errors: [] };

  for (const sub of subscribers) {
    try {
      // Discover posts for this subscriber's interests
      let posts = await discoverPosts(sub.interests || 'technology startups', [], 80);
      posts = posts
        .sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0))
        .slice(0, 10);

      if (posts.length === 0) {
        console.warn(`[weekly-digest] No posts found for ${sub.email}`);
        results.failed++;
        continue;
      }

      const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`;

      await resend.emails.send({
        from:    'Stacksome <onboarding@resend.dev>',
        to:      sub.email,
        subject: `Your Stacksome reads this week`,
        html:    buildEmailHtml(posts, sub.interests, unsubscribeUrl),
      });

      // Update last_sent_at
      await supabase
        .from('subscribers')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', sub.id);

      results.sent++;
      console.log(`[weekly-digest] Sent to ${sub.email}`);

    } catch (err) {
      console.error(`[weekly-digest] Failed for ${sub.email}:`, err.message);
      results.failed++;
      results.errors.push({ email: sub.email, error: err.message });
    }
  }

  console.log(`[weekly-digest] Done — sent: ${results.sent}, failed: ${results.failed}`);
  return res.json({ success: true, ...results });
}
