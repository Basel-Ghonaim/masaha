/**
 * Directions to a point in the visitor's maps: Google Maps' search link, which opens the app on a
 * phone and the site elsewhere. One link for every page that shows a space's place.
 */
export function mapsLink({ lat, lng }: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${String(lat)},${String(lng)}`;
}
