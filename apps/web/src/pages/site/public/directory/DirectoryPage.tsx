import { DirectoryView, ViewSwitch } from '@features/directory';
import { AreaFilter, AreaName } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { publicSpacePath } from '@shared/routing';
import { useHeart } from '../useHeart';
import { useSignInPrompt } from '../useSignInPrompt';

// The lookups' area name and area filter set in the directory's slots, made once so they are the
// same between renders.
const areaName = (areaId: number) => <AreaName areaId={areaId} source="public" />;
const placeFilter = (value: number[], onChange: (ids: number[]) => void) => (
  <AreaFilter value={value} onValueChange={onChange} />
);

/**
 * The directory of spaces: its heading with «قائمة | خريطة», then the directory's list or map, each
 * space's area named and the place filtered by lookups, and favorites' heart on each card; a guest's
 * press of it asks them to sign in, with the reason.
 */
export function DirectoryPage() {
  const copy = useCopy();
  const { signIn, prompt } = useSignInPrompt();
  const heart = useHeart(signIn);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-heading-1">{copy.directory.title}</h1>
        <ViewSwitch />
      </div>
      <DirectoryView
        spaceLink={publicSpacePath}
        areaName={areaName}
        placeFilter={placeFilter}
        cardAction={(space) => heart(space, { onCover: true })}
      />
      {prompt}
    </div>
  );
}
