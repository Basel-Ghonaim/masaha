import { Badge, type BadgeProps } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type Variant = NonNullable<BadgeProps['variant']>;

const VARIANTS: Variant[] = ['neutral', 'primary', 'success', 'warning', 'info', 'destructive'];

type BadgeSamples = {
  title: string;
  caption: string;
  variants: Record<Variant, string>;
};

export function BadgeSection({ samples }: { samples: BadgeSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        {VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {samples.variants[variant]}
          </Badge>
        ))}
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
