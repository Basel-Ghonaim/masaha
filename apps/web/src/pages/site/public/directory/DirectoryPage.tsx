import { useCopy } from '@shared/copy';

/** The directory of spaces: a placeholder that shows only its title. */
export function DirectoryPage() {
  const copy = useCopy();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <h1 className="text-heading-1">{copy.site.links.spaces}</h1>
    </div>
  );
}
