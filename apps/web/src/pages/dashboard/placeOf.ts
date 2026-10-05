/** A page's place below its branch: the branch's own path for '', else its segment. */
export function placeOf(segment: string) {
  return segment === '' ? { index: true as const } : { path: segment };
}
