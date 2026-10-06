import { GovernoratesSection } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { PageHeader } from '../shell/PageHeader';

/** The admin's lookup lists: the page's title and hint, then the governorates and their areas. */
export function LookupsPage() {
  const copy = useCopy();

  return (
    <>
      <PageHeader title={copy.dashboard.pages.lookups} />
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">{copy.lookups.hint}</p>
        <GovernoratesSection />
      </div>
    </>
  );
}
