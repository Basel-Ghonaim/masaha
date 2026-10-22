import type { SpacePageView } from '../../types/SpacePageView';
import { Section } from './Section';

/** «عن المساحة»: the space's description, its lines kept. */
export function AboutSection({ about }: { about: NonNullable<SpacePageView['about']> }) {
  return (
    <Section title={about.title} meta={null}>
      <p className="text-body whitespace-pre-line" lang={about.text.lang} dir={about.text.dir}>
        {about.text.text}
      </p>
    </Section>
  );
}
