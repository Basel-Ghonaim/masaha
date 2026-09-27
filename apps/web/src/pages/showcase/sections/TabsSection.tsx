import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type TabItem = { value: string; label: string; content: string };

type TabsSamples = {
  title: string;
  defaultCaption: string;
  statusLabel: string;
  statuses: TabItem[];
  lineCaption: string;
  sectionsLabel: string;
  sections: TabItem[];
};

function TabsSample({
  label,
  items,
  variant,
}: {
  label: string;
  items: TabItem[];
  variant: 'default' | 'line';
}) {
  return (
    <Tabs defaultValue={items[0]?.value} className="w-full">
      <TabsList aria-label={label} variant={variant}>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className="text-muted-foreground">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function TabsSection({ samples }: { samples: TabsSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.defaultCaption}>
        <TabsSample label={samples.statusLabel} items={samples.statuses} variant="default" />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.lineCaption}>
        <TabsSample label={samples.sectionsLabel} items={samples.sections} variant="line" />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
