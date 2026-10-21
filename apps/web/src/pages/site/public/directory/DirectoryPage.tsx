import { DirectoryList } from '@features/directory';
import { AreaFilter, AreaName } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { publicSpacePath } from '@shared/routing';

// The lookups' area name and area filter set in the directory's slots, made once so they are the
// same between renders.
const areaName = (areaId: number) => <AreaName areaId={areaId} source="public" />;
const placeFilter = (value: number[], onChange: (ids: number[]) => void) => (
  <AreaFilter value={value} onValueChange={onChange} />
);

/**
 * The directory of spaces: its heading, then the directory's list, each card's area named and the
 * place filtered by lookups.
 */
export function DirectoryPage() {
  const copy = useCopy();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-8">
      <h1 className="text-heading-1">{copy.directory.title}</h1>
      <DirectoryList spaceLink={publicSpacePath} areaName={areaName} placeFilter={placeFilter} />
    </div>
  );
}
