import {
  Alert,
  AlertDescription,
  cn,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/design-system';
import type { PriceGroupView } from '../../types/PriceGroupView';
import type { SpacePageView } from '../../types/SpacePageView';
import { Section } from './Section';

/**
 * «الأسعار»: per audience (U9), the general prices then the students', each a cell with its label
 * and its amount, in a grid whose incomplete last row shares its width; by shift in tabs when a price
 * names one. Hidden prices say why; prices never saved say so; stale ones add a check line.
 */
export function PricesSection({ prices }: { prices: SpacePageView['prices'] }) {
  return (
    <Section title={prices.title} meta={prices.meta}>
      {prices.state === 'hidden' && (
        <p className="rounded-lg bg-muted px-4 py-3 text-body-sm">{prices.hidden}</p>
      )}
      {prices.state === 'none' && (
        <p className="text-body-sm text-muted-foreground">{prices.none}</p>
      )}
      {prices.state === 'shown' && (
        <>
          {prices.check !== null && (
            <Alert variant="warning">
              <AlertDescription>{prices.check}</AlertDescription>
            </Alert>
          )}
          {prices.tabs === null ? (
            <Audiences audiences={prices.audiences} />
          ) : (
            <Tabs defaultValue={prices.tabs[0]?.key}>
              <TabsList aria-label={prices.byShift}>
                {prices.tabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {prices.tabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key} className="flex flex-col gap-4 pt-4">
                  {tab.range !== null && (
                    <p className="text-body-sm text-muted-foreground">{tab.range}</p>
                  )}
                  <Audiences audiences={tab.audiences} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}
    </Section>
  );
}

/** Each audience's prices: its title, then its cells, two to a row on a phone and four from 768 px. */
function Audiences({ audiences }: { audiences: PriceGroupView[] }) {
  return (
    <div className="flex flex-col gap-4">
      {audiences.map((group) => (
        <div key={group.title ?? 'general'} className="flex flex-col gap-2">
          {group.title !== null && <h3 className="text-label">{group.title}</h3>}
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {group.cells.map((cell) => (
              <div
                key={cell.key}
                className={cn('flex flex-col gap-1 rounded-lg border border-border p-3', cell.span)}
              >
                <dt
                  className="text-body-sm text-muted-foreground"
                  lang={cell.label.lang}
                  dir={cell.label.dir}
                >
                  {cell.label.text}
                </dt>
                <dd className="text-heading-3" dir="ltr">
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
