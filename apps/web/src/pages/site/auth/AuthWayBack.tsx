import { useCachedSpaceName } from '@features/directory';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { returnUrlOf } from '@shared/routing';
import { Link, useLocation } from 'react-router';
import { SITE_PATHS } from '../navigation';

/** A space's page, `/spaces/:slug`, with nothing after the slug but the search or the hash. */
const SPACE_PAGE = /^\/spaces\/([^/?#]+)(?:[?#]|$)/;

/** The slug of the space's page `path` names, if it names one. */
function spaceSlugOf(path: string): string | undefined {
  const slug = SPACE_PAGE.exec(path)?.[1];
  return slug === undefined ? undefined : decodeURIComponent(slug);
}

/**
 * The sign-in and register cards' way back (C4, DI33): with a safe `next`, «العودة إلى {space}» when
 * it is a space's page whose read this tab holds, else «العودة إلى الصفحة السابقة»; without one (or
 * one that would leave the site), «العودة إلى الرئيسية».
 */
export function AuthWayBack() {
  const copy = useCopy();
  const words = copy.auth.wayBack;
  const { search } = useLocation();
  const back = returnUrlOf(search);
  const name = useCachedSpaceName(back === undefined ? undefined : spaceSlugOf(back));

  const label =
    back === undefined
      ? words.home
      : name === undefined
        ? words.previous
        : words.toSpace({ space: isolate(name.text) });

  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={back ?? SITE_PATHS.home}>{label}</Link>
    </Button>
  );
}
