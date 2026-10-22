import { emailSchema, normalisePhone } from '@masaha/shared/core';
import type { PlatformChannel } from '../types/PlatformChannel';

/**
 * The platform's contact, from what the web is configured with: WhatsApp first, kept only when it
 * is a phone number (in its one stored form), then the email, kept only when it is one. An empty
 * or an invalid one is left out, so it is never drawn.
 */
export function contactOf({
  email,
  whatsapp,
}: {
  email?: string;
  whatsapp?: string;
}): PlatformChannel[] {
  const channels: PlatformChannel[] = [];
  const phone = whatsapp ? normalisePhone(whatsapp) : null;
  if (phone !== null)
    channels.push({ kind: 'whatsapp', value: phone, href: `https://wa.me/${phone.slice(1)}` });
  const address = emailSchema.safeParse(email ?? '');
  if (address.success)
    channels.push({ kind: 'email', value: address.data, href: `mailto:${address.data}` });
  return channels;
}

/**
 * The platform's contact as this build is configured (S11): `VITE_CONTACT_EMAIL` and
 * `VITE_CONTACT_WHATSAPP` (apps/web/.env.example), read on each call. Until the platform's settings
 * reach the web (step 11, finding 40), this is the one place the site learns them.
 */
export function platformContact(): PlatformChannel[] {
  return contactOf({
    email: import.meta.env.VITE_CONTACT_EMAIL,
    whatsapp: import.meta.env.VITE_CONTACT_WHATSAPP,
  });
}
