import {
  Button,
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type SheetSamples = {
  title: string;
  caption: string;
  navigation: { trigger: string; title: string; items: string[]; closeLabel: string };
  details: { trigger: string; title: string; description: string; closeLabel: string };
  filters: {
    trigger: string;
    title: string;
    clear: string;
    status: string;
    statuses: string[];
    area: string;
    areas: string[];
    apply: string;
  };
};

export function SheetSection({ samples }: { samples: SheetSamples }) {
  const { navigation, details, filters } = samples;

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">{navigation.trigger}</Button>
          </SheetTrigger>
          <SheetContent
            side="start"
            closeLabel={navigation.closeLabel}
            aria-describedby={undefined}
          >
            <SheetHeader>
              <SheetTitle>{navigation.title}</SheetTitle>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-1">
              {navigation.items.map((item) => (
                <Button key={item} variant="ghost" className="justify-start">
                  {item}
                </Button>
              ))}
            </SheetBody>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">{details.trigger}</Button>
          </SheetTrigger>
          <SheetContent side="end" closeLabel={details.closeLabel}>
            <SheetHeader>
              <SheetTitle>{details.title}</SheetTitle>
              <SheetDescription>{details.description}</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">{filters.trigger}</Button>
          </SheetTrigger>
          <SheetContent side="bottom" aria-describedby={undefined}>
            <SheetHeader className="flex-row items-center justify-between">
              <SheetTitle>{filters.title}</SheetTitle>
              <Button variant="link" size="sm">
                {filters.clear}
              </Button>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4">
              <Field label={filters.status}>
                {/* Values come from position: fixtures hold phrases only. */}
                <ToggleGroup type="multiple" defaultValue={['0', '1']}>
                  {filters.statuses.map((status, index) => (
                    <ToggleGroupItem key={status} value={String(index)}>
                      {status}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field label={filters.area}>
                <Select defaultValue={filters.areas[0]}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </SheetBody>
            <SheetFooter>
              <SheetClose asChild>
                <Button>{filters.apply}</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
