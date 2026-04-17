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
  const normalizedEmail = email.toLowerCase().trim();
  const token = crypto.randomBytes(32).toString('hex');

  // Check if already exists in auth.users
  const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = allUsers.find(u => u.email?.toLowerCase() === normalizedEmail);

  if (existing) {
    // Reactivate / update interests
    await supabase.auth.admin.updateUserById(existing.id, {
      user_metadata: {
        ...existing.user_metadata,
        subscriber: true,
        interests: interests.trim(),
        last_subscribed_at: new Date().toISOString(),
      },
    });
  } else {
    // Create new subscriber entry in auth.users
    const { error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        subscriber: true,
        interests: interests.trim(),
        unsubscribe_token: token,
        subscribed_at: new Date().toISOString(),
      },
    });
    if (createError) {
      console.error('[subscribe] createUser error:', createError.message);
      return res.status(500).json({ error: 'Could not save subscription.' });
    }
  }

  // Get the final token (existing user keeps their original token)
  const finalUser = existing || allUsers.find(u => u.email?.toLowerCase() === normalizedEmail);
  const finalToken = finalUser?.user_metadata?.unsubscribe_token || token;
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${finalToken}`;

  // Discover posts for welcome email
  let posts = [];
  try {
    posts = await discoverPosts(interests.trim(), [], 80);
    posts = posts.sort((a, b) => (b._profileScore || 0) - (a._profileScore || 0)).slice(0, 10);
  } catch (err) {
    console.warn('[subscribe] Discovery failed:', err.message);
  }

  // Send welcome / first-batch email
  try {
    await resend.emails.send({
      from:    'Stacksome <onboarding@resend.dev>',
      to:      normalizedEmail,
      subject: posts.length > 0
        ? 'Welcome to Stacksome — your first reads are here'
        : "You're subscribed to Stacksome weekly reads",
      html: posts.length > 0
        ? buildEmailHtml(posts, interests, unsubscribeUrl)
        : buildWelcomeHtml(interests, unsubscribeUrl),
    });
  } catch (err) {
    console.error('[subscribe] Resend error:', err.message);
  }

  return res.json({ success: true, count: posts.length });
}

function buildWelcomeHtml(interests, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
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
</body></html>`;
}
