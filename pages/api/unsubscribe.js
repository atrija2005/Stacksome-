import { createServiceClient } from '../../lib/supabase';

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(page('Invalid link', 'This unsubscribe link is invalid.'));
  }

  try {
    const supabase = createServiceClient();
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const user = users.find(u => u.user_metadata?.unsubscribe_token === token);

    if (!user) {
      return res.status(404).send(page('Already unsubscribed', "We couldn't find an active subscription for this link."));
    }

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, subscriber: false },
    });

    return res.status(200).send(page(
      'Unsubscribed',
      `You've been removed from Stacksome weekly reads. No more emails will be sent to ${user.email}.`
    ));
  } catch (err) {
    console.error('[unsubscribe] Error:', err.message);
    return res.status(500).send(page('Error', 'Something went wrong. Please try again.'));
  }
}

function page(title, message) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Stacksome</title></head>
<body style="margin:0;padding:60px 20px;background:#F7F5F2;font-family:Arial,sans-serif;text-align:center;">
  <a href="https://stacksome.vercel.app" style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#0A0A0A;text-decoration:none;">
    stack<span style="color:#FF6719;">some</span>
  </a>
  <div style="margin:40px auto;max-width:480px;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#0A0A0A;margin:0 0 16px 0;">${title}</h1>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#555;line-height:1.7;margin:0 0 24px 0;">${message}</p>
    <a href="https://stacksome.vercel.app" style="display:inline-block;background:#FF6719;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Back to Stacksome</a>
  </div>
</body>
</html>`;
}
