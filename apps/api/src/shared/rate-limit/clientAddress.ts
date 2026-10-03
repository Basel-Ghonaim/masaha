import { isIPv4, isIPv6 } from 'node:net';

/**
 * What a per-IP limit counts by. `req.ip` is already the client's address once `trust proxy` is set
 * (TRUST_PROXY). An IPv4 address counts as itself, also when IPv6 carries it (`::ffff:1.2.3.4`). An
 * IPv6 address counts by its /64 network, the block a single subscriber is given, so rotating
 * addresses within it does not escape the limit.
 */
export function clientAddress(ip: string | undefined): string {
  if (!ip) return 'unknown';
  const address = ip.replace(/%.*$/, ''); // a zone index (fe80::1%eth0) is local, never the client's
  if (isIPv4(address)) return address;
  if (!isIPv6(address)) return address;

  const groups = expandIPv6(address);
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return [groups[6] ?? 0, groups[7] ?? 0]
      .flatMap((group) => [group >> 8, group & 0xff])
      .join('.');
  }
  return `${groups
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(':')}::/64`;
}

/** The eight 16-bit groups of a valid IPv6 address. */
function expandIPv6(address: string): number[] {
  const toGroups = (part: string): number[] =>
    part === ''
      ? []
      : part.split(':').flatMap((piece) => {
          if (!piece.includes('.')) return [parseInt(piece, 16)];
          // An embedded IPv4 address fills the last two groups.
          const [a = 0, b = 0, c = 0, d = 0] = piece.split('.').map(Number);
          return [(a << 8) | b, (c << 8) | d];
        });

  const [head = '', tail] = address.split('::');
  const headGroups = toGroups(head);
  if (tail === undefined) return headGroups;
  const tailGroups = toGroups(tail);
  const zeros = new Array<number>(8 - headGroups.length - tailGroups.length).fill(0);
  return [...headGroups, ...zeros, ...tailGroups];
}
