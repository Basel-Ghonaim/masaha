import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { updateSpaceContactsSchema } from './requests.ts';

/** The contacts as they are stored, or the field errors they fail with. */
function stored(contacts: { type: string; value: string }[]) {
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
  });

  it('refuses an unknown type', () => {
    expect(stored([{ type: 'SNAPCHAT', value: 'masaha' }])).toEqual({
      'contacts.0.type': ['invalid_choice'],
    });
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
