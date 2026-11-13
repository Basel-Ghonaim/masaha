import { Logo } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type LogoSamples = {
  title: string;
  name: string;
  fullCaption: string;
  markCaption: string;
  decorativeCaption: string;
};

export function LogoSection({ samples }: { samples: LogoSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.fullCaption}>
        <Logo label={samples.name} className="h-10" />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.markCaption}>
        <div className="flex items-end gap-4">
          <Logo form="mark" label={samples.name} className="size-9" />
          <Logo form="mark" label={samples.name} className="size-4" />
        </div>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.decorativeCaption}>
        <div className="flex items-center gap-2">
          <Logo form="mark" className="size-9" />
          <span className="text-label">{samples.name}</span>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
