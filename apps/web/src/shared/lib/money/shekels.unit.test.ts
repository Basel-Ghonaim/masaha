import { describe, expect, it } from 'vitest';
import { agorotOf, shekelsOf } from './shekels';

describe('agorotOf', () => {
  it('reads an amount in shekels as whole agorot, Arabic digits and separators included', () => {
    expect(agorotOf('15')).toBe(1500);
    expect(agorotOf(' 12.5 ')).toBe(1250);
    expect(agorotOf('12.50')).toBe(1250);
    expect(agorotOf('0.05')).toBe(5);
    expect(agorotOf('١٢٫٥')).toBe(1250);
    expect(agorotOf('12,75')).toBe(1275);
    expect(agorotOf('٫٥')).toBe(50);
    expect(agorotOf('0')).toBe(0);
  });

  it('hands back an amount past two decimals as typed, a thousands separator included', () => {
    expect(agorotOf('1,000')).toBe('1,000');
    expect(agorotOf('12.500')).toBe('12.500');
    expect(agorotOf('٣٫٠٠٠')).toBe('٣٫٠٠٠');
    expect(agorotOf('12.555')).toBe('12.555');
    // Up to two decimals is still whole agorot.
    expect(agorotOf('12.5')).toBe(1250);
    expect(agorotOf('12,50')).toBe(1250);
    expect(agorotOf('١٢٫٥')).toBe(1250);
  });

  it('leaves what is no amount as typed, and a blank as no value', () => {
    expect(agorotOf('')).toBeUndefined();
    expect(agorotOf('  ')).toBeUndefined();
    expect(agorotOf('fifteen')).toBe('fifteen');
    expect(agorotOf('1.2.3')).toBe('1.2.3');
    expect(agorotOf('-5')).toBe('-5');
  });
});

describe('shekelsOf', () => {
  it('writes agorot as shekels, with no decimals for a whole amount', () => {
    expect(shekelsOf(1500)).toBe('15');
    expect(shekelsOf(1250)).toBe('12.50');
    expect(shekelsOf(5)).toBe('0.05');
    expect(shekelsOf(10_000_000)).toBe('100000');
  });
});
