import { describe, expect, it } from 'vitest';

import { clientAddress } from './clientAddress.ts';

describe('clientAddress', () => {
  it('keeps an IPv4 address', () => {
    expect(clientAddress('203.0.113.7')).toBe('203.0.113.7');
  });

  it('reads an IPv4 address carried by IPv6 as IPv4', () => {
    expect(clientAddress('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(clientAddress('::ffff:cb00:7107')).toBe('203.0.113.7');
  });

  it('groups IPv6 addresses by their /64 network', () => {
    expect(clientAddress('2001:db8:85a3:12:8a2e:370:7334:1')).toBe('2001:db8:85a3:12::/64');
    expect(clientAddress('2001:0db8:85a3:0012:ffff:ffff:ffff:ffff')).toBe('2001:db8:85a3:12::/64');
    expect(clientAddress('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(clientAddress('::1')).toBe('0:0:0:0::/64');
  });

  it('ignores a zone index', () => {
    expect(clientAddress('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });

  it('counts a request without an address under one key', () => {
    expect(clientAddress(undefined)).toBe('unknown');
  });
});
