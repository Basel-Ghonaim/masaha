import {
  ArrowEndIcon,
  Button,
  LogInIcon,
  SearchIcon,
  type ButtonProps,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type Variant = NonNullable<ButtonProps['variant']>;

const VARIANTS: Variant[] = ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'];

type ButtonSamples = {
  title: string;
  variantsCaption: string;
  sizesCaption: string;
  iconsCaption: string;
  statesCaption: string;
  variants: Record<Variant, string>;
  sizes: { sm: string; md: string; lg: string; icon: string };
  leadingIcon: string;
  trailingIcon: string;
  loading: string;
  disabled: string;
  asLink: string;
};

export function ButtonSection({ samples }: { samples: ButtonSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.variantsCaption}>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {samples.variants[variant]}
          </Button>
        ))}
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.sizesCaption}>
        <Button size="sm">{samples.sizes.sm}</Button>
        <Button size="md">{samples.sizes.md}</Button>
        <Button size="lg">{samples.sizes.lg}</Button>
        <Button size="icon" variant="outline" aria-label={samples.sizes.icon}>
          <SearchIcon />
        </Button>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.iconsCaption}>
        <Button>
          <LogInIcon />
          {samples.leadingIcon}
        </Button>
        <Button variant="outline">
          {samples.trailingIcon}
          <ArrowEndIcon />
        </Button>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.statesCaption}>
        <Button loading>{samples.loading}</Button>
        <Button variant="secondary" loading>
          {samples.loading}
        </Button>
        <Button disabled>{samples.disabled}</Button>
        <Button variant="outline" disabled>
          {samples.disabled}
        </Button>
        <Button asChild variant="link">
          <a href="#buttons">{samples.asLink}</a>
        </Button>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
