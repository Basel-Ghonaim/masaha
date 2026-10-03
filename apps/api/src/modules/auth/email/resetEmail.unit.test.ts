import { describe, expect, it } from 'vitest';

import { ARABIC, ENGLISH } from './resetEmail.copy.ts';
import { resetEmail, resetLink } from './resetEmail.ts';

const link = resetLink('https://masaha.example', 'tok-123_ABC');

describe('resetLink', () => {
  it('carries the token in the fragment, which no server receives', () => {
    expect(link).toBe('https://masaha.example/reset-password#token=tok-123_ABC');
  });
});

describe('resetEmail', () => {
  const email = resetEmail({ to: 'sara@example.com', link });

  it('is addressed and titled in both languages', () => {
    expect(email.to).toBe('sara@example.com');
    expect(email.subject).toBe(`${ARABIC.subject} | ${ENGLISH.subject}`);
  });

  it('says it all in Arabic first, then in English, in the HTML and in the text', () => {
    for (const body of [email.html, email.text]) {
      const arabic = body.indexOf(ARABIC.greeting);
      const english = body.indexOf(ENGLISH.greeting);
      expect(arabic).toBeGreaterThanOrEqual(0);
      expect(english).toBeGreaterThan(arabic);
      for (const line of [ARABIC.request, ARABIC.validity, ENGLISH.request, ENGLISH.validity]) {
        expect(body).toContain(line);
      }
      expect(body).toContain(link);
    }
    expect(email.html).toContain(`<a href="${link}"`);
    expect(email.html).toContain(ARABIC.action);
    expect(email.html).toContain('<html lang="ar" dir="rtl">');
    expect(email.html).toContain('<div dir="ltr" lang="en"');
  });

  it('escapes the link it is given', () => {
    const odd = resetEmail({ to: 'x@example.com', link: 'https://masaha.example/"><img src=x>' });

    expect(odd.html).not.toContain('<img');
    expect(odd.html).toContain('&quot;&gt;&lt;img src=x&gt;');
  });

  it('holds the two languages to one shape', () => {
    expect(Object.keys(ARABIC).sort()).toEqual(Object.keys(ENGLISH).sort());
    for (const value of Object.values(ARABIC)) expect(value).not.toBe('');
  });
});
