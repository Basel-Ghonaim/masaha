/** A Palestinian mobile network, as a phone number's prefix tells it. */
export type Carrier = 'jawwal' | 'ooredoo';

/**
 * The carrier of a phone number in its stored form (E.164), read from its prefix: +97059 is Jawwal,
 * +97056 Ooredoo; any other number has none to show. A display rule only: the number's stored form
 * is the shared phone rule's.
 */
export function carrierOf(phone: string): Carrier | null {
  if (phone.startsWith('+97059')) return 'jawwal';
  if (phone.startsWith('+97056')) return 'ooredoo';
  return null;
}
