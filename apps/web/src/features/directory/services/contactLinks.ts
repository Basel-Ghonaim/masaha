import type { Contact } from '@masaha/shared/spaces';
import type { Catalogue } from '@shared/copy';
import { carrierOf } from '@shared/lib';

type Words = Catalogue['directory']['page']['contacts'];

/** A contact as the page links it. */
export type ContactLink = {
  key: string;
  /** Its type's word, a phone's with its carrier. */
  label: string;
  /** As stored, shown left to right. */
  value: string;
  href: string;
  /** Opens in a new tab: WhatsApp and the addresses on the web. */
  external: boolean;
};

/**
 * A space's contact as a link: WhatsApp to `wa.me` with the number's digits, a phone to call (its
 * carrier in its label, read from its prefix), an email to write, and a network or a website to its
 * stored `https://` address.
 */
export function contactLinkOf({ type, value }: Contact, words: Words): ContactLink {
  const base = { key: `${type}:${value}`, value };
  switch (type) {
    case 'WHATSAPP':
      return {
        ...base,
        label: words.types.WHATSAPP,
        href: `https://wa.me/${value.replace(/\D/g, '')}`,
        external: true,
      };
    case 'PHONE': {
      const carrier = carrierOf(value);
      return {
        ...base,
        label:
          carrier === null
            ? words.types.PHONE
            : words.withCarrier({ type: words.types.PHONE, carrier: words.carriers[carrier] }),
        href: `tel:${value}`,
        external: false,
      };
    }
    case 'EMAIL':
      return { ...base, label: words.types.EMAIL, href: `mailto:${value}`, external: false };
    case 'INSTAGRAM':
    case 'FACEBOOK':
    case 'TIKTOK':
    case 'WEBSITE':
      return { ...base, label: words.types[type], href: value, external: true };
  }
}
