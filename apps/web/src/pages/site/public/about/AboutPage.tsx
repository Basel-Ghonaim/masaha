import { useCopy } from '@shared/copy';
import { CONTACT_ANCHOR } from '../../navigation';

/**
 * The about page: a placeholder that shows only its title. Its contact section has its anchor, so
 * the footer's link has its target.
 */
export function AboutPage() {
  const copy = useCopy();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <h1 className="text-heading-1">{copy.site.links.about}</h1>
      <section id={CONTACT_ANCHOR} />
    </div>
  );
}
