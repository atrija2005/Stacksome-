import { Resend } from 'resend';
import { createServiceClient } from '../../lib/supabase';
import { discoverPosts } from '../../lib/substack-discover';
import { buildEmailHtml } from '../../lib/email';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stacksome.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, interests } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }
  if (!interests?.trim()) {
    return res.status(400).json({ error: 'Interests required.' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  const supabase = createServiceClient();

  // Generate unsubscribe token
  const unsubscribeToken = crypto.randomBytes(32).toString('hex');

  // Upsert subscriber — if they re-subscribe, reactivate them
  const { data: subscriber, error: dbError } = await supabase
    .from('subscribers')
    .upsert(
      {
        email: email.toLowerCase().trim(),
        interests: interests.trim(),
        unsubscribe_token: unsubscribeToken,
        active: true,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (dbError) {
    console.error('[subscribe] DB error:', dbError.message);
    return res.status(500).json({ error: 'Could not save subscription.' });
  }

  // Use the token from the upserted row (may be existing if re-subscribe)
  const token = subscriber?.unsubscribe_token || unsubscribeToken;
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${token}`;

  // Discover posts for welcome email
  let posts = [];
  try {
    posts = await discoverPosts(interests.trim(), [], 80);
    posts = posts.sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0)).slice(0, 10);
  } catch (err) {
    console.error('[subscribe] Discovery failed:', err.message);
    // Don't fail subscription just because discovery failed — still save them
  }

  // Send welcome email
  try {
    await resend.emails.send({
      from:    'Stacksome <onboarding@resend.dev>',
      to:      email,
      subject: posts.length > 0
        ? `Welcome to Stacksome — your first reads are here`
        : `You're subscribed to Stacksome weekly reads`,
      html: posts.length > 0
        ? buildEmailHtml(posts, interests, unsubscribeUrl)
        : buildWelcomeOnlyHtml(interests, unsubscribeUrl),
    });
  } catch (err) {
    console.error('[subscribe] Resend error:', err.message);
    // Subscription is saved — don't fail the request over email delivery
  }

  // Update last_sent_at
  await supabase
    .from('subscribers')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('email', email.toLowerCase().trim());

  return res.json({ success: true, count: posts.length });
}

function buildWelcomeOnlyHtml(interests, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:40px 20px;background:#F7F5F2;font-family:Arial,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#0A0A0A;padding:28px 36px;">
      <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;">stack<span style="color:#FF6719;">some</span></span>
    </td></tr>
    <tr><td style="padding:36px;">
      <h2 style="font-family:Georgia,serif;color:#0A0A0A;margin:0 0 16px 0;">You're subscribed.</h2>
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#555;line-height:1.7;margin:0 0 12px 0;">
        Every Monday morning you'll receive your personalised Substack reading list for: <strong>${interests}</strong>
      </p>
      <p style="font-family:Arial,sans-serif;font-size:11px;color:#bbb;margin:32px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
