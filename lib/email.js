/**
 * Shared email helpers for Stacksome weekly digest emails.
 */

export function getWeekLabel() {
  const now   = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  return `${month} ${now.getDate()}, ${now.getFullYear()}`;
}

export function buildEmailHtml(posts, interests, unsubscribeUrl) {
  const week = getWeekLabel();

  const rows = posts.slice(0, 15).map((p, i) => `
    <tr>
      <td style="padding:0 0 28px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 0 6px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#FF6719;border-radius:4px;padding:3px 10px;">
                    <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;">${p.publication_name || p.publication || 'Substack'}</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-family:Arial,sans-serif;font-size:11px;color:#999;">#${i + 1}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 6px 0;">
              <a href="${p.url}" style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#0A0A0A;text-decoration:none;line-height:1.3;">${p.title}</a>
            </td>
          </tr>
          ${p.description ? `
          <tr>
            <td style="padding:0 0 8px 0;">
              <p style="font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.6;margin:0;">${(p.description || '').slice(0, 160)}${(p.description || '').length > 160 ? '…' : ''}</p>
            </td>
          </tr>` : ''}
          <tr>
            <td>
              <a href="${p.url}" style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#FF6719;text-decoration:none;">Read on Substack →</a>
            </td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #F0EDE8;margin:28px 0 0 0;" />
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F5F2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0A0A0A;border-radius:12px 12px 0 0;padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:-.02em;">stack<span style="color:#FF6719;">some</span></span>
                  </td>
                  <td align="right">
                    <span style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.4);letter-spacing:.06em;text-transform:uppercase;">Weekly Reads · ${week}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro band -->
          <tr>
            <td style="background:#FF6719;padding:14px 36px;">
              <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#fff;letter-spacing:.06em;text-transform:uppercase;margin:0;">
                Curated for: ${interests.slice(0, 80)}${interests.length > 80 ? '…' : ''}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:36px 36px 8px 36px;">
              <p style="font-family:Arial,sans-serif;font-size:13px;color:#888;margin:0 0 28px 0;line-height:1.6;">
                Here are your ${posts.length} most relevant Substack posts this week, picked from hundreds of publications across the topics you care about.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fff;border-radius:0 0 12px 12px;padding:0 36px 28px 36px;" align="center">
              <p style="font-family:Arial,sans-serif;font-size:11px;color:#bbb;line-height:1.7;margin:0;">
                You're receiving this because you subscribed at stacksome.vercel.app<br>
                Powered by <strong style="color:#FF6719;">Stacksome</strong>
                ${unsubscribeUrl ? `&nbsp;·&nbsp;<a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a>` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
