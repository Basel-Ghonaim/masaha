import { DirectoryList } from '@features/directory';
import { AreaName } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { publicSpacePath } from '@shared/routing';

// The lookups' area name set in the directory's slot, made once so it is the same between renders.
const areaName = (areaId: number) => <AreaName areaId={areaId} source="public" />;

/** The directory of spaces: its heading, then the directory's list, each card's area named by lookups. */
export function DirectoryPage() {
  const copy = useCopy();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-8">
      <h1 className="text-heading-1">{copy.directory.title}</h1>
      <DirectoryList spaceLink={publicSpacePath} areaName={areaName} />
    </div>
  );
}
