/**
 * A space's page on the public site, by its slug (docs/frontend/architecture.md › Landing and
 * guards). Here, not in a page group, because it is the site's path and the dashboard links to it.
 */
export function publicSpacePath(slug: string): string {
  return `/spaces/${encodeURIComponent(slug)}`;
}
