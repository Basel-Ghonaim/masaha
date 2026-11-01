import { emailSchema, normalisePhone } from '@masaha/shared/core';
import type { PlatformChannel } from '../types/PlatformChannel';

/**
 * The platform's contact, as `GET /settings/public` answers it: WhatsApp first, kept only when it
 * is a phone number (in its one stored form), then the email, kept only when it is one. An unset
 * (`null`), empty or invalid one is left out, so it is never drawn.
 */
export function contactOf({
  email,
  whatsapp,
}: {
  email?: string | null;
  whatsapp?: string | null;
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
