import { AmenitiesSection, GovernoratesSection } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/design-system';
import { PageHeader } from '../shell/PageHeader';
import { useLookupsTab } from './useLookupsTab';

/**
 * The admin's lookup lists: the page's title, then its two lists under tabs, the governorates and
 * their areas first, then the amenities, with the page's hint under the tabs. The tab shown is kept
 * in the address.
 */
export function LookupsPage() {
  const copy = useCopy();
  const [tab, chooseTab] = useLookupsTab();

  return (
    <>
      <PageHeader title={copy.dashboard.pages.lookups} />
      <Tabs value={tab} onValueChange={chooseTab} className="w-full max-w-3xl">
        <TabsList aria-label={copy.dashboard.pages.lookups}>
          <TabsTrigger value="governorates">{copy.lookups.governorates.title}</TabsTrigger>
          <TabsTrigger value="amenities">{copy.lookups.amenities.title}</TabsTrigger>
        </TabsList>
        <p className="text-body-sm text-muted-foreground">{copy.lookups.hint}</p>
        <TabsContent value="governorates">
          <GovernoratesSection />
        </TabsContent>
        <TabsContent value="amenities">
          <AmenitiesSection />
        </TabsContent>
      </Tabs>
    </>
  );
}
