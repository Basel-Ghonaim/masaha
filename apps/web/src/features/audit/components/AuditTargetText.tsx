import { Link } from 'react-router';
import type { TargetView } from '../services/targetOf';

/**
 * An entry's target: its name in its own language and direction, a link where it has a page, else
 * its words; a person's or a record's own words isolated (`<bdi>`).
 */
export function AuditTargetText({ target }: { target: TargetView }) {
  const text = target.isolated ? <bdi>{target.text}</bdi> : target.text;
  if (target.link === null) {
    return (
      <span lang={target.lang} dir={target.dir} className="text-label">
        {text}
      </span>
    );
  }
  return (
    <Link
      to={target.link}
      lang={target.lang}
      dir={target.dir}
      className="text-label text-foreground underline underline-offset-4"
    >
      {text}
    </Link>
  );
}
