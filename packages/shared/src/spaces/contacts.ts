import { emailSchema, normalisePhone } from '../core/index.ts';

// A space's contacts are a typed list (docs/architecture/data-model.md › Conventions, Contacts),
// each stored in one form, whatever form it was typed in (decision F6): a phone or WhatsApp number
// in E.164, an email lowercased, a social network or a website as a full https:// address.

export const CONTACT_TYPES = [
  'WHATSAPP',
  'PHONE',
  'EMAIL',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'WEBSITE',
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

/** A handle, as a network shows it, with or without its @. */
const HANDLE = /^@?([A-Za-z0-9._]{1,50})$/;
/**
 * What looks like a host or a page rather than a handle: a name that ends in a common domain
 * (`instagram.com`), or a page (`profile.php`). It is read as a link instead.
 */
const LIKE_A_LINK = /\.(com|net|org|php)$/i;

interface Network {
  /** The hosts its addresses are on, without `www.`. */
  hosts: readonly string[];
  /** Its address for a handle, and the base its links are stored on. */
  base: string;
  handlePath: (handle: string) => string;
}

const NETWORKS: Record<'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK', Network> = {
  INSTAGRAM: {
    hosts: ['instagram.com'],
    base: 'https://www.instagram.com',
    handlePath: (handle) => `/${handle}`,
  },
  FACEBOOK: {
    hosts: ['facebook.com', 'm.facebook.com', 'fb.com'],
    base: 'https://www.facebook.com',
    handlePath: (handle) => `/${handle}`,
  },
  TIKTOK: {
    hosts: ['tiktok.com'],
    base: 'https://www.tiktok.com',
    handlePath: (handle) => `/@${handle}`,
  },
};

/** A link typed with or without its scheme, as a URL; null when it is none, or not on the web. */
function linkOf(input: string): URL | null {
  if (/\s/.test(input)) return null;
  const text = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const onTheWeb = url.protocol === 'https:' || url.protocol === 'http:';
  return onTheWeb && !url.username && !url.password && url.hostname.includes('.') ? url : null;
}

/** The path of a link, without its trailing slash. */
function pathOf(url: URL): string {
  return url.pathname.replace(/\/+$/, '');
}

/**
 * A network's handle or link as its full address. A link must be on the network's own host, and
 * keeps its path only: its query and fragment are dropped, except a Facebook profile's numeric
 * `id`, the only address of a profile with no username.
 */
function networkAddress(network: Network, input: string): string | null {
  const handle = HANDLE.exec(input)?.[1];
  if (handle && !LIKE_A_LINK.test(handle)) return `${network.base}${network.handlePath(handle)}`;

  const url = linkOf(input);
  if (!url || !network.hosts.includes(url.hostname.toLowerCase().replace(/^www\./, ''))) {
    return null;
  }
  const path = pathOf(url);
  if (!path) return null;
  if (network === NETWORKS.FACEBOOK && path === '/profile.php') {
    const id = url.searchParams.get('id');
    return id && /^\d+$/.test(id) ? `${network.base}${path}?id=${id}` : null;
  }
  return `${network.base}${path}`;
}

/** A website, on https, with a lowercase host, its path and query kept and its fragment dropped. */
function websiteAddress(input: string): string | null {
  const url = linkOf(input);
  if (!url) return null;
  return `https://${url.host.toLowerCase()}${pathOf(url)}${url.search}`;
}

/** The contact's value in its one stored form, or null when it is not a valid one of its type. */
export function normaliseContact(type: ContactType, input: string): string | null {
  const value = input.trim();
  switch (type) {
    case 'WHATSAPP':
    case 'PHONE':
      return normalisePhone(value);
    case 'EMAIL': {
      const email = emailSchema.safeParse(value);
      return email.success ? email.data : null;
    }
    case 'INSTAGRAM':
    case 'FACEBOOK':
    case 'TIKTOK':
      return networkAddress(NETWORKS[type], value);
    case 'WEBSITE':
      return websiteAddress(value);
  }
}
