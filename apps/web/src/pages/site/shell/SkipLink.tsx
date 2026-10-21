import { useCopy } from '@shared/copy';

/**
 * The shell's first focusable element: a link past the header to the page's `main`, hidden until the
 * keyboard reaches it (SH-018).
 */
export function SkipLink() {
  const copy = useCopy();

  return (
    <a
      href="#main"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-2 focus-visible:z-sticky focus-visible:rounded-md focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      {copy.site.skipToContent}
    </a>
  );
}
