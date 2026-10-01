import { Button, Popover, PopoverContent, PopoverTrigger } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type PopoverSamples = {
  title: string;
  caption: string;
  trigger: string;
  label: string;
  text: string;
};

export function PopoverSection({ samples }: { samples: PopoverSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">{samples.trigger}</Button>
          </PopoverTrigger>
          <PopoverContent align="start" aria-label={samples.label}>
            <p>{samples.text}</p>
          </PopoverContent>
        </Popover>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
