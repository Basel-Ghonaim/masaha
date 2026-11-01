import { describe, expect, it } from 'vitest';
import { contactOf } from './platformContact';

describe('contactOf', () => {
  it('keeps a WhatsApp number in its stored form and a valid email, WhatsApp first', () => {
    expect(contactOf({ email: ' Hello@Example.com ', whatsapp: '0599 000 099' })).toEqual([
      {
        kind: 'whatsapp',
        value: '+970599000099',
        href: 'https://wa.me/970599000099',
      },
      { kind: 'email', value: 'hello@example.com', href: 'mailto:hello@example.com' },
    ]);
  });

  it('leaves out an empty or an invalid one', () => {
    expect(contactOf({})).toEqual([]);
    expect(contactOf({ email: null, whatsapp: null })).toEqual([]);
    expect(contactOf({ email: '', whatsapp: '' })).toEqual([]);
    expect(contactOf({ email: 'not an email', whatsapp: '12345' })).toEqual([]);
    expect(contactOf({ email: 'team@example.com', whatsapp: 'abc' })).toEqual([
      { kind: 'email', value: 'team@example.com', href: 'mailto:team@example.com' },
    ]);
  });
});
