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

  it('the reset email holds the link as text in both parts and languages', () => {
    const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const words of [ARABIC.copyLink, ENGLISH.copyLink]) {
      // Under the button, the words, then the link as text a reader can copy, left to right.
      expect(email.html).toMatch(
        new RegExp(`${escaped(words)}</p>\\s*<p dir="ltr"[^>]*>${escaped(link)}</p>`),
      );
      expect(email.text).toContain(`${words}\n${link}`);
    }
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

  // The identity's values, written by hand (ADR 0019, finding 19): a mail client reads no token.
  it("draws with ink + berry's neutrals only: #f7fbff, #ffffff, #dde5ed, #1a1f25 and #5e646a", () => {
    expect(new Set(email.html.toLowerCase().match(/#[0-9a-f]{3,8}\b/g))).toEqual(
      new Set(['#f7fbff', '#ffffff', '#dde5ed', '#1a1f25', '#5e646a']),
    );
  });

  it("draws its button as the web's primary: a #1a1f25 ink cell under a #ffffff label", () => {
    const [, cell = '', label = ''] =
      new RegExp(
        `<td style="([^"]*)">\\s*<a href="[^"]*" style="([^"]*)">${ARABIC.action}</a>`,
      ).exec(email.html) ?? [];

    expect(cell).toContain('background:#1a1f25;');
    expect(label).toContain('color:#ffffff;');
  });

  it('writes its links in #1a1f25 ink, the one in the English text underlined', () => {
    const [, english = ''] =
      new RegExp(`<a href="[^"]*" style="([^"]*)">${ENGLISH.action}</a>`).exec(email.html) ?? [];
    const asText = [...email.html.matchAll(/<p dir="ltr" style="([^"]*)">/g)].map(
      ([, style]) => style,
    );

    expect(english).toContain('color:#1a1f25;');
    expect(english).toContain('text-decoration:underline;');
    expect(asText).toHaveLength(2);
    for (const style of asText) expect(style).toContain('color:#1a1f25;');
  });
});
