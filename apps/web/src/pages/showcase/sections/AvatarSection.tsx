import { Avatar, AvatarFallback } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type AvatarSamples = {
  title: string;
  sizesCaption: string;
  initials: string;
  withNameCaption: string;
  name: string;
  phone: string;
};

const SIZES = ['sm', 'md', 'lg'] as const;

export function AvatarSection({ samples }: { samples: AvatarSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.sizesCaption}>
        <div className="flex items-center gap-3">
          {SIZES.map((size) => (
            <Avatar key={size} size={size}>
              <AvatarFallback>{samples.initials}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.withNameCaption}>
        <div className="flex items-center gap-3">
          <Avatar aria-hidden>
            <AvatarFallback>{samples.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span>{samples.name}</span>
            <span dir="ltr" className="text-body-sm text-muted-foreground">
              {samples.phone}
            </span>
          </div>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
