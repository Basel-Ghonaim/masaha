import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/design-system';
import { useFinanceScreen } from '../hooks/useFinanceScreen';
import type { FinanceLinks } from '../types/FinanceLinks';
import { DebtsTab } from './DebtsTab';
import { IncomeTab } from './IncomeTab';
import { MonthField } from './MonthField';
import { OccupancyTab } from './OccupancyTab';

/**
 * Finance (screen 19, D5.3–D5.5): the tabs «الدخل», «الديون», «الإشغال» and, beside them from 1024
 * px, the month every month-bound block reads; then the tab shown. The tab and the month are in the
 * address (DI29); every link is the page's.
 */
export function FinanceScreen({
  spaceId,
  spaceName,
  links,
}: {
  spaceId: number;
  spaceName: string;
  links: FinanceLinks;
}) {
  const screen = useFinanceScreen();

  return (
    <Tabs value={screen.tab} onValueChange={screen.tabs.choose} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <TabsList aria-label={screen.tabs.label}>
          {screen.tabs.items.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <MonthField month={screen.monthField} />
      </div>
      <TabsContent value="income">
        <IncomeTab spaceId={spaceId} asked={screen.asked} />
      </TabsContent>
      <TabsContent value="debts">
        <DebtsTab spaceId={spaceId} place={screen.place} links={links} spaceName={spaceName} />
      </TabsContent>
      <TabsContent value="occupancy">
        <OccupancyTab spaceId={spaceId} asked={screen.asked} />
      </TabsContent>
    </Tabs>
  );
}
