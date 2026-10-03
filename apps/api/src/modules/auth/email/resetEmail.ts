import type { EmailMessage } from './emailSender.ts';
import { ARABIC as ar, ENGLISH as en } from './resetEmail.copy.ts';

// The design's colours (docs/design: Reset email.html), written inline: an email client reads no
// stylesheet and no custom property, so the web's tokens cannot reach it (findings).
const COLOR = {
  page: '#f4fcfe',
  card: '#ffffff',
  border: '#dbe6e9',
  brand: '#02787d',
  onBrand: '#ffffff',
  text: '#182022',
  muted: '#5c6567',
} as const;
const ARABIC_FONT = "'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif";
const LATIN_FONT = 'Arial,Helvetica,sans-serif';

/** Where the email's link leads: the token rides in the fragment, which no server ever receives. */
export function resetLink(webOrigin: string, token: string): string {
  return `${webOrigin}/reset-password#token=${encodeURIComponent(token)}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The reset email: Arabic first, then English, in one message, as designed. It greets no one by
 * name: registration proves no inbox, so a name could carry an attacker's words into Masaha's mail.
 */
export function resetEmail({ to, link }: { to: string; link: string }): EmailMessage {
  const href = escapeHtml(link);

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ar.subject}</title></head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;">${ar.preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td dir="rtl" align="right" style="padding:0 4px 20px;font-family:${ARABIC_FONT};font-size:24px;line-height:32px;font-weight:700;color:${COLOR.brand};">${ar.brand}</td></tr>
<tr><td dir="rtl" align="right" style="background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:12px;padding:32px;font-family:${ARABIC_FONT};color:${COLOR.text};">
<p style="margin:0 0 12px;font-size:20px;line-height:30px;font-weight:600;">${ar.greeting}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:26px;">${ar.request} ${ar.instruction}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td style="border-radius:8px;background:${COLOR.brand};">
<a href="${href}" style="display:inline-block;padding:12px 24px;font-family:${ARABIC_FONT};font-size:16px;line-height:24px;font-weight:600;color:${COLOR.onBrand};text-decoration:none;border-radius:8px;">${ar.action}</a>
</td></tr></table>
<p style="clear:both;margin:0;padding-top:24px;font-size:14px;line-height:22px;color:${COLOR.muted};">${ar.validity}</p>
<hr style="border:0;border-top:1px solid ${COLOR.border};margin:28px 0;">
<div dir="ltr" lang="en" style="text-align:left;font-family:${LATIN_FONT};">
<p style="margin:0 0 8px;font-size:15px;line-height:22px;color:${COLOR.text};">${en.greeting} ${en.request} <a href="${href}" style="color:${COLOR.brand};">${en.action}</a>.</p>
<p style="margin:0;font-size:13px;line-height:20px;color:${COLOR.muted};">${en.validity}</p>
</div>
</td></tr>
<tr><td dir="rtl" align="right" style="padding:20px 4px 0;font-family:${ARABIC_FONT};font-size:12px;line-height:18px;color:${COLOR.muted};">${ar.footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    ar.greeting,
    `${ar.request} ${ar.instruction}`,
    link,
    ar.validity,
    '',
    `${en.greeting} ${en.request}`,
    `${en.action}: ${link}`,
    en.validity,
    '',
    ar.footer,
  ].join('\n');

  return { to, subject: `${ar.subject} | ${en.subject}`, text, html };
}
