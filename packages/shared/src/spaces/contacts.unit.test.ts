import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { updateSpaceContactsSchema } from './requests.ts';

/** The contacts as they are stored, or the field errors they fail with. */
function stored(contacts: { type: string; value: string; label?: string | null }[]) {
  const body = { contacts };
  const result = updateSpaceContactsSchema.safeParse(body);
  return result.success ? result.data.contacts : toFieldErrors(result.error.issues, body);
}

/** The one contact of this type and value, as it is stored. */
function one(type: string, value: string) {
  const result = stored([{ type, value }]);
  return Array.isArray(result) ? result[0]?.value : result;
}

const INVALID = { 'contacts.0.value': ['invalid_format'] };

const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);

describe('updateSpaceContactsSchema', () => {
  it('stores a phone and a WhatsApp number in their international form', () => {
    expect(one('WHATSAPP', '059-912 3456')).toBe('+970599123456');
    expect(one('PHONE', '(08) 282 1234')).toBe('+97082821234');
    expect(one('PHONE', '+1 202 555 0100')).toEqual(INVALID);
  });

  it('stores an email lowercased, and refuses one that is not', () => {
    expect(one('EMAIL', ' Hello@Masaha.PS ')).toBe('hello@masaha.ps');
    expect(one('EMAIL', 'hello at masaha')).toEqual(INVALID);
  });

  it.each([
    ['INSTAGRAM', 'masaha.space', 'https://www.instagram.com/masaha.space'],
    ['INSTAGRAM', '@masaha', 'https://www.instagram.com/masaha'],
    ['FACEBOOK', 'masaha.gaza', 'https://www.facebook.com/masaha.gaza'],
    ['TIKTOK', '@masaha', 'https://www.tiktok.com/@masaha'],
    ['TIKTOK', 'masaha', 'https://www.tiktok.com/@masaha'],
  ])('makes a %s handle its full address: %s', (type, value, url) => {
    expect(one(type, value)).toBe(url);
  });

  it.each([
    ['INSTAGRAM', 'http://instagram.com/masaha/', 'https://www.instagram.com/masaha'],
    ['INSTAGRAM', 'www.instagram.com/masaha', 'https://www.instagram.com/masaha'],
    ['FACEBOOK', 'fb.com/masaha', 'https://www.facebook.com/masaha'],
    ['FACEBOOK', 'https://m.facebook.com/masaha', 'https://www.facebook.com/masaha'],
    ['TIKTOK', 'https://www.tiktok.com/@masaha', 'https://www.tiktok.com/@masaha'],
  ])('stores a %s link on the network’s own address: %s', (type, value, url) => {
    expect(one(type, value)).toBe(url);
  });

  it('drops a link’s query and fragment', () => {
    expect(one('INSTAGRAM', 'https://www.instagram.com/masaha/?igsh=abc123#top')).toBe(
      'https://www.instagram.com/masaha',
    );
  });

  it('keeps the id of a Facebook profile with no username, and nothing else of its query', () => {
    expect(one('FACEBOOK', 'https://www.facebook.com/profile.php?id=100012345&ref=share#x')).toBe(
      'https://www.facebook.com/profile.php?id=100012345',
    );
    expect(one('FACEBOOK', 'facebook.com/profile.php?id=abc')).toEqual(INVALID);
  });

  it.each([
    ['a Facebook profile page without its id', 'FACEBOOK', 'profile.php'],
    ['a network’s own host', 'INSTAGRAM', 'instagram.com'],
  ])('takes %s as a link, never as a handle, and refuses it', (_case, type, value) => {
    expect(one(type, value)).toEqual(INVALID);
  });

  it('keeps a handle with dots that names no domain a handle', () => {
    expect(one('INSTAGRAM', 'my.space_gaza')).toBe('https://www.instagram.com/my.space_gaza');
  });

  it('refuses a link to another site, or to no page', () => {
    expect(one('INSTAGRAM', 'https://www.facebook.com/masaha')).toEqual(INVALID);
    expect(one('TIKTOK', 'https://tiktok.com.evil.ps/@masaha')).toEqual(INVALID);
    expect(one('INSTAGRAM', 'https://www.instagram.com/')).toEqual(INVALID);
    expect(one('FACEBOOK', 'masaha gaza')).toEqual(INVALID);
  });

  it('stores a website with https and a lowercase host, its path and query kept', () => {
    expect(one('WEBSITE', 'masaha.ps')).toBe('https://masaha.ps');
    expect(one('WEBSITE', 'http://Masaha.PS/About?lang=ar#team')).toBe(
      'https://masaha.ps/About?lang=ar',
    );
  });

  it('refuses a website without a domain, of another scheme, or with credentials', () => {
    expect(one('WEBSITE', 'localhost')).toEqual(INVALID);
    expect(one('WEBSITE', 'ftp://masaha.ps')).toEqual(INVALID);
    expect(one('WEBSITE', 'https://user:secret@masaha.ps')).toEqual(INVALID);
    expect(one('WEBSITE', 'javascript:alert(1)')).toEqual(INVALID);
  });

  it.each([
    ['a bare number', '123'],
    ['a longer bare number', '599123456'],
    ['an IP address', 'http://10.0.0.1'],
    ['an IP address without its scheme', '10.0.0.1/menu'],
    ['a short IP address', 'http://127.1'],
    ['an IPv6 address', 'https://[::1]/'],
    ['localhost with a port', 'http://localhost:5173'],
    ['a bare word', 'example'],
    ['a one-letter top-level domain', 'masaha.p'],
    ['a name that starts with a dash', 'https://-masaha.ps'],
  ])('refuses a website that is %s: %s', (_case, value) => {
    expect(one('WEBSITE', value)).toEqual(INVALID);
  });

  it.each([
    ['www.masaha.ps/about', 'https://www.masaha.ps/about'],
    ['https://Masaha-Hub.co.uk', 'https://masaha-hub.co.uk'],
    ['123.ps', 'https://123.ps'],
  ])('stores a website on a domain with a top-level domain: %s', (value, url) => {
    expect(one('WEBSITE', value)).toBe(url);
  });

  it.each([
    [
      'facebook.com/people/Masaha-Hub/100012345678',
      'https://www.facebook.com/people/Masaha-Hub/100012345678',
    ],
    ['https://m.facebook.com/Masaha-Space-123456/', 'https://www.facebook.com/Masaha-Space-123456'],
    ['www.facebook.com/masaha.gaza?ref=bookmarks', 'https://www.facebook.com/masaha.gaza'],
  ])('stores a Facebook page or profile: %s', (value, url) => {
    expect(one('FACEBOOK', value)).toBe(url);
  });

  it.each([
    'facebook.com/watch?v=1',
    'https://www.facebook.com/watch/?v=123',
    'facebook.com/reel/123',
    'facebook.com/masaha/videos/123',
    'facebook.com/masaha.gaza/posts/pfbid02abc',
    'facebook.com/permalink.php?story_fbid=1&id=2',
    'facebook.com/story.php?story_fbid=1&id=2',
    'facebook.com/groups/gazafreelancers',
    'facebook.com/events/123',
    'facebook.com/photo/?fbid=123',
    'facebook.com/photo.php?fbid=123',
    'facebook.com/masaha/photos/a.1/2',
    'facebook.com/share/p/abc',
    'facebook.com/sharer/sharer.php?u=x',
    'facebook.com/search/top?q=masaha',
    'facebook.com/search/?q=x',
    'facebook.com/events',
    'facebook.com/share',
    'facebook.com/reels',
    'facebook.com/videos',
    'facebook.com/posts',
    'facebook.com/masaha/about',
    'facebook.com/profile.php',
    'notfacebook.com/masaha',
    'facebook.com/people/Masaha-Hub',
    'facebook.com/people/Masaha-Hub/abc',
    'watch',
    '@groups',
  ])('refuses a Facebook link or handle that names no page or profile: %s', (value) => {
    expect(one('FACEBOOK', value)).toEqual(INVALID);
  });

  it('refuses an unknown type', () => {
    expect(stored([{ type: 'SNAPCHAT', value: 'masaha' }])).toEqual({
      'contacts.0.type': ['invalid_choice'],
    });
    expect(stored([{ type: 'TWITTER', value: 'masaha' }])).toEqual({
      'contacts.0.type': ['invalid_choice'],
    });
  });

  it.each(['@masaha_ps', 'masaha_ps', 't.me/masaha_ps', 'https://telegram.me/masaha_ps?x=1'])(
    'stores a Telegram handle or link on t.me: %s',
    (value) => {
      expect(one('TELEGRAM', value)).toBe('https://t.me/masaha_ps');
    },
  );

  it.each([
    ['@masaha_ps', 'https://x.com/masaha_ps'],
    ['https://twitter.com/masaha_ps?s=20', 'https://x.com/masaha_ps'],
    ['mobile.twitter.com/masaha_ps', 'https://x.com/masaha_ps'],
    ['x.com/masaha_ps', 'https://x.com/masaha_ps'],
  ])('stores an X handle or link, a Twitter one too, on x.com: %s', (value, url) => {
    expect(one('X', value)).toBe(url);
  });

  it('stores a LinkedIn link with its path, and refuses a bare name', () => {
    expect(one('LINKEDIN', 'linkedin.com/company/masaha')).toBe(
      'https://www.linkedin.com/company/masaha',
    );
    expect(one('LINKEDIN', 'https://www.linkedin.com/in/basel/?trk=x')).toBe(
      'https://www.linkedin.com/in/basel',
    );
    expect(one('LINKEDIN', 'masaha')).toEqual(INVALID);
  });

  it('stores a LinkedIn link from a country’s subdomain on www.linkedin.com', () => {
    expect(one('LINKEDIN', 'https://ps.linkedin.com/in/basel')).toBe(
      'https://www.linkedin.com/in/basel',
    );
    expect(one('LINKEDIN', 'https://evil.linkedin.com/in/basel')).toEqual(INVALID);
  });

  it('stores a YouTube channel by its handle or its link, and refuses a video’s short link', () => {
    expect(one('YOUTUBE', '@masaha')).toBe('https://www.youtube.com/@masaha');
    expect(one('YOUTUBE', 'youtube.com/channel/UC123abc')).toBe(
      'https://www.youtube.com/channel/UC123abc',
    );
    expect(one('YOUTUBE', 'https://m.youtube.com/@masaha')).toBe('https://www.youtube.com/@masaha');
    expect(one('YOUTUBE', 'youtu.be/abc')).toEqual(INVALID);
  });

  it('keeps a YouTube channel’s older links, and refuses a link that names no channel', () => {
    expect(one('YOUTUBE', 'youtube.com/c/masaha')).toBe('https://www.youtube.com/c/masaha');
    expect(one('YOUTUBE', 'youtube.com/user/masaha')).toBe('https://www.youtube.com/user/masaha');
    expect(one('YOUTUBE', 'https://www.youtube.com/@masaha/videos')).toBe(
      'https://www.youtube.com/@masaha/videos',
    );
    expect(one('YOUTUBE', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(INVALID);
    expect(one('YOUTUBE', 'youtube.com/shorts/abc')).toEqual(INVALID);
    expect(one('YOUTUBE', 'youtube.com/playlist?list=PL1')).toEqual(INVALID);
    expect(one('YOUTUBE', 'youtube.com/results?search_query=masaha')).toEqual(INVALID);
    expect(one('YOUTUBE', 'youtube.com/live/abc')).toEqual(INVALID);
  });

  it('refuses a network’s link on another host', () => {
    expect(one('TELEGRAM', 'example.com/masaha')).toEqual(INVALID);
    expect(one('X', 'https://www.facebook.com/masaha')).toEqual(INVALID);
  });

  it('refuses a contact repeated once both are stored alike', () => {
    expect(
      stored([
        { type: 'WHATSAPP', value: '0599123456' },
        { type: 'PHONE', value: '0599123456' },
        { type: 'WHATSAPP', value: '+970 59 912 3456' },
      ]),
    ).toEqual({ 'contacts.2.value': ['not_unique'] });
  });

  it('takes at most twenty contacts, each at most 200 characters', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      type: 'EMAIL',
      value: `a${String(i)}@masaha.ps`,
    }));

    expect(stored(many)).toEqual({ contacts: ['too_long'] });
    expect(one('WEBSITE', `masaha.ps/${'a'.repeat(200)}`)).toEqual({
      'contacts.0.value': ['too_long'],
    });
  });
});

describe('a contact of another kind («وسيلة أخرى»)', () => {
  const other = (value: string, label: string | null = 'ديسكورد') =>
    stored([{ type: 'OTHER', value, label }]);

  it('stores a number by the platform’s phone rule, else a link by the website rule', () => {
    expect(other('discord.gg/focushub')).toEqual([
      { type: 'OTHER', value: 'https://discord.gg/focushub', label: 'ديسكورد' },
    ]);
    expect(other('059-912 3456')).toEqual([
      { type: 'OTHER', value: '+970599123456', label: 'ديسكورد' },
    ]);
  });

  it('refuses a number outside the phone rule and text that is no link', () => {
    expect(other('+44 20 7946 0000')).toEqual(INVALID);
    expect(other('two words')).toEqual(INVALID);
  });

  it('refuses a number the phone rule refuses, never reading it as a link', () => {
    expect(other('599123456')).toEqual(INVALID);
    expect(other('1800')).toEqual(INVALID);
    expect(other('+44.20.7946.0000')).toEqual(INVALID);
  });

  it('reads a number typed in Arabic-Indic or Eastern digits by the phone rule', () => {
    expect(other('٠٥٩-٩١٢ ٣٤٥٦')).toEqual([
      { type: 'OTHER', value: '+970599123456', label: 'ديسكورد' },
    ]);
    expect(other('۰۵۶۹۱۲۳۴۵۶')).toEqual([
      { type: 'OTHER', value: '+970569123456', label: 'ديسكورد' },
    ]);
    expect(other('١٢٣')).toEqual(INVALID);
  });

  it('refuses a link to an IP address', () => {
    expect(other('http://10.0.0.1')).toEqual(INVALID);
  });

  it('needs its own name, trimmed, of one to forty characters, without bidi controls', () => {
    expect(other('discord.gg/focushub', null)).toEqual({ 'contacts.0.label': ['required'] });
    expect(stored([{ type: 'OTHER', value: 'discord.gg/focushub' }])).toEqual({
      'contacts.0.label': ['required'],
    });
    expect(other('discord.gg/focushub', '   ')).toEqual({ 'contacts.0.label': ['too_short'] });
    expect(other('discord.gg/focushub', 'a'.repeat(41))).toEqual({
      'contacts.0.label': ['too_long'],
    });
    expect(other('discord.gg/focushub', `ديس${RIGHT_TO_LEFT_OVERRIDE}كورد`)).toEqual({
      'contacts.0.label': ['invalid_format'],
    });
    expect(other('discord.gg/focushub', '  ديسكورد ')).toEqual([
      { type: 'OTHER', value: 'https://discord.gg/focushub', label: 'ديسكورد' },
    ]);
  });

  it('gives no other type a name: refused when sent, null when not', () => {
    expect(stored([{ type: 'WHATSAPP', value: '0599123456', label: 'رقمي' }])).toEqual({
      'contacts.0.label': ['invalid_format'],
    });
    expect(stored([{ type: 'WHATSAPP', value: '0599123456' }])).toEqual([
      { type: 'WHATSAPP', value: '+970599123456', label: null },
    ]);
  });

  it('refuses two of another kind with one value, whatever their names', () => {
    expect(
      stored([
        { type: 'OTHER', value: 'discord.gg/focushub', label: 'ديسكورد' },
        { type: 'OTHER', value: 'https://discord.gg/focushub', label: 'Discord' },
      ]),
    ).toEqual({ 'contacts.1.value': ['not_unique'] });
  });
});
