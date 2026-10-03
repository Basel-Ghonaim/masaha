import { useCopy } from '@shared/copy';

/** The home page: a placeholder that shows only its title. */
export function HomePage() {
  const copy = useCopy();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <h1 className="text-heading-1">{copy.site.links.home}</h1>
    </div>
  );
}
