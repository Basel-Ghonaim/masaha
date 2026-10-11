import type { MapPoint } from '../types/MapPoint';

// A point as text, the way a map application copies it ("31.5205, 34.4535"): latitude, then
// longitude, apart by a comma, spaces or both. An Arabic keyboard writes the same with Arabic-Indic
// digits, the Arabic decimal separator (٫) and the Arabic comma (،), so those are read as their
// Western forms first.
const ARABIC_INDIC_ZERO = 0x0660;
const ARABIC_DECIMAL_SEPARATOR = '٫';
const ARABIC_COMMA = '،';

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
const POINT = new RegExp(String.raw`^\s*(${NUMBER})\s*(?:,\s*|\s+)(${NUMBER})\s*$`);

/** Arabic-Indic digits, the Arabic decimal separator and comma, in their Western forms. */
function westernised(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) =>
      String((digit.codePointAt(0) ?? ARABIC_INDIC_ZERO) - ARABIC_INDIC_ZERO),
    )
    .replaceAll(ARABIC_DECIMAL_SEPARATOR, '.')
    .replaceAll(ARABIC_COMMA, ',');
}

/** The point a text names, latitude first, or null when it names none on the globe. */
export function parseCoordinates(text: string): MapPoint | null {
  const match = POINT.exec(westernised(text));
  if (!match) {
    return null;
  }
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** A point as text, latitude first, to five decimals (about a metre), in Western digits. */
export function formatCoordinates({ lat, lng }: MapPoint): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
