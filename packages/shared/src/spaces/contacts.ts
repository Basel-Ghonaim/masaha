import { emailSchema, normalisePhone, toWesternDigits } from '../core/index.ts';

// A space's contacts are a typed list (docs/architecture/data-model.md › Conventions, Contacts),
// each stored in one form, whatever form it was typed in (decision F6): a phone or WhatsApp number
// in E.164, an email lowercased, a social network or a website as a full https:// address. A
// contact of another kind («وسيلة أخرى») has a name of its own and is a number or a link.

export const CONTACT_TYPES = [
  'WHATSAPP',
  'PHONE',
  'EMAIL',
  'INSTAGRAM',
  'FACEBOOK',
  'TELEGRAM',
  'TIKTOK',
  'X',
  'LINKEDIN',
  'YOUTUBE',
  'WEBSITE',
  'OTHER',
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

/** The longest name a contact of another kind takes, e.g. «ديسكورد». */
export const CONTACT_LABEL_MAX_LENGTH = 40;

/** What is written as a number: digits, a leading +, and the separators people type between them. */
const LIKE_A_NUMBER = /^\+?[\d\s\-.()]+$/;

/** A handle, as a network shows it, with or without its @. */
const HANDLE = /^@?([A-Za-z0-9._]{1,50})$/;
/**
 * What looks like a host or a page rather than a handle: a name that ends in a common domain
 * (`instagram.com`), or a page (`profile.php`). It is read as a link instead.
 */
const LIKE_A_LINK = /\.(com|net|org|php)$/i;

/**
 * A host that is a domain with a top-level domain (`masaha.ps`, `t.me`; an internationalised one in
 * its `xn--` form): never an IP address, which a URL reads a bare number as, `localhost` or a bare
 * word.
 */
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i;

interface Network {
  /** The hosts its addresses are on, without `www.`. */
  hosts: readonly string[];
  /** Its address for a handle, and the base its links are stored on. */
  base: string;
  /** Its address for a handle; a network without one is reached by a link only. */
  handlePath?: (handle: string) => string;
  /** The paths a handle or a link may have, when only some name what the contact is (a channel, a page). */
  paths?: RegExp;
  /** Whether a country's two-letter subdomain of its host (`ps.linkedin.com`) is its host too. */
  countrySubdomains?: boolean;
}

type NetworkType = 'INSTAGRAM' | 'FACEBOOK' | 'TELEGRAM' | 'TIKTOK' | 'X' | 'LINKEDIN' | 'YOUTUBE';

const NETWORKS: Record<NetworkType, Network> = {
  INSTAGRAM: {
    hosts: ['instagram.com'],
    base: 'https://www.instagram.com',
    handlePath: (handle) => `/${handle}`,
  },
  FACEBOOK: {
    hosts: ['facebook.com', 'm.facebook.com', 'fb.com'],
    base: 'https://www.facebook.com',
    handlePath: (handle) => `/${handle}`,
    paths:
      /^\/(?:(?!(?:watch|reels?|videos?|posts?|groups|events|photos?|share|sharer|search|stories|story|hashtag|live|gaming|marketplace|pages|people|permalink)$)(?![^/]*\.php$)[\w.-]+|people\/[^/]+\/\d+)$/i,
  },
  TELEGRAM: {
    hosts: ['t.me', 'telegram.me'],
    base: 'https://t.me',
    handlePath: (handle) => `/${handle}`,
  },
  TIKTOK: {
    hosts: ['tiktok.com'],
    base: 'https://www.tiktok.com',
    handlePath: (handle) => `/@${handle}`,
  },
  X: {
    hosts: ['x.com', 'twitter.com', 'mobile.twitter.com'],
    base: 'https://x.com',
    handlePath: (handle) => `/${handle}`,
  },
  // A LinkedIn address names a person, a company or a school by its path: a bare name says none.
  // Search engines often show a country's subdomain (`ps.linkedin.com`); it is stored on www.
  LINKEDIN: {
    hosts: ['linkedin.com'],
    base: 'https://www.linkedin.com',
    countrySubdomains: true,
  },
  // A channel, by its handle or its older addresses. A video, a playlist or a search names no
  // channel, and its query would be dropped: refused, as a video's short link (youtu.be) is.
  YOUTUBE: {
    hosts: ['youtube.com', 'm.youtube.com'],
    base: 'https://www.youtube.com',
    handlePath: (handle) => `/@${handle}`,
    paths: /^\/(?:@[^/]+|(?:channel|c|user)\/[^/]+)(?:\/|$)/,
  },
};

/**
 * A link typed with or without its scheme, as a URL on a domain; null when it is none, not on the
 * web, or on an IP address, `localhost` or a bare word.
 */
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
  return onTheWeb && !url.username && !url.password && DOMAIN.test(url.hostname) ? url : null;
}

/** Whether a link's host, without `www.`, is one of the network's. */
function onHostOf(network: Network, url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (network.hosts.includes(host)) return true;
  const country = /^[a-z]{2}\.(.+)$/.exec(host)?.[1];
  return (
    network.countrySubdomains === true && country !== undefined && network.hosts.includes(country)
  );
}

/** The path of a link, without its trailing slash. */
function pathOf(url: URL): string {
  return url.pathname.replace(/\/+$/, '');
}

/**
 * A network's handle or link as its full address. A link must be on the network's own host, and
 * keeps its path only: its query and fragment are dropped, except a Facebook profile's numeric
 * `id`, the only address of a profile with no username. A network that names its paths takes a
 * handle or a link only on one of them.
 */
function networkAddress(network: Network, input: string): string | null {
  const handle = HANDLE.exec(input)?.[1];
  if (network.handlePath && handle && !LIKE_A_LINK.test(handle)) {
    const path = network.handlePath(handle);
    return network.paths && !network.paths.test(path) ? null : `${network.base}${path}`;
  }

  const url = linkOf(input);
  if (!url || !onHostOf(network, url)) return null;
  const path = pathOf(url);
  if (network === NETWORKS.FACEBOOK && path === '/profile.php') {
    const id = url.searchParams.get('id');
    return id && /^\d+$/.test(id) ? `${network.base}${path}?id=${id}` : null;
  }
  if (!path || (network.paths && !network.paths.test(path))) return null;
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
    case 'TELEGRAM':
    case 'TIKTOK':
    case 'X':
    case 'LINKEDIN':
    case 'YOUTUBE':
      return networkAddress(NETWORKS[type], value);
    case 'WEBSITE':
      return websiteAddress(value);
    // A number, in any digits people type, takes the platform's phone rule, so one number has one
    // form; anything else is a link on the web, as a website's. A number the rule refuses is
    // refused, never read as a link (a URL reads a bare number as an IP address).
    case 'OTHER':
      return LIKE_A_NUMBER.test(toWesternDigits(value))
        ? normalisePhone(value)
        : websiteAddress(value);
  }
}
