import { describe, expect, it } from 'vitest';
import { whatsappLink } from './whatsappLink';

describe('whatsappLink', () => {
  it('makes a wa.me link of a phone’s digits with the text encoded', () => {
    expect(whatsappLink('+970591234567', 'مرحبًا رهف، عليك 45 ₪ & شكرًا?')).toBe(
      `https://wa.me/970591234567?text=${encodeURIComponent('مرحبًا رهف، عليك 45 ₪ & شكرًا?')}`,
    );
  });

  it('keeps no plus, space or dash of the number', () => {
    expect(whatsappLink('+972 59-123 4567', 'hi')).toBe('https://wa.me/972591234567?text=hi');
  });
});
