import { useCopy } from '@shared/copy';
import { Link } from 'react-router';
import { SITE_PATHS } from '../../navigation';

/**
 * «اقرأ سياسة الخصوصية», opening the policy in a new tab, which assistive technology is told:
 * leaving this page would let the guest's held action go.
 */
export function PrivacyLine() {
  const copy = useCopy();
  const words = copy.auth.register.privacy;

  return (
    <p className="text-body-sm text-muted-foreground">
      {words.read}{' '}
      <Link
        to={SITE_PATHS.privacy}
        target="_blank"
        rel="noopener"
        className="text-primary underline underline-offset-4"
      >
        {words.link} <span className="sr-only">{copy.site.signInPrompt.newTab}</span>
      </Link>
    </p>
  );
}
