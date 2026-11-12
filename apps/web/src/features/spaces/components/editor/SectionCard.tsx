import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { ReactNode } from 'react';
import type { SectionFrameView } from '../../types/SectionFrameView';
import type { SectionId } from '../../types/SectionId';
import { SectionEmpty, type SectionEmptyView } from './SectionEmpty';

/** The heading a section is titled by: a link's hash and a closed Sheet give it the focus. */
export const headingIdOf = (section: SectionId) => `${section}-title`;

/**
 * A section of the profile, read first: a card titled by its `h2`, its date line (`meta` adds the
 * photos' count before it) and its stale badge, «تعديل» named for the section or the section's own
 * head action (`action`, the photos'); inside it, a page's notice (a visitor's report), the stale
 * line with «ما زالت صحيحة», and the section's facts (`children`) — or, while it shows nothing, its
 * empty state with its action (`empty`). Its id is the index's anchor.
 */
export function SectionCard({
  frame,
  meta,
  action,
  notice,
  empty,
  children,
}: {
  frame: Pick<SectionFrameView, 'id' | 'title' | 'date' | 'stale' | 'edit'>;
  meta?: string;
  action?: ReactNode;
  notice?: ReactNode;
  /** Shown instead of the facts while the section has none. */
  empty?: SectionEmptyView | null;
  children?: ReactNode;
}) {
  const head =
    action ??
    (frame.edit && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={frame.edit.name}
        onClick={frame.edit.run}
      >
        {frame.edit.label}
      </Button>
    ));
  const lines = [meta, frame.date].filter((line) => line !== undefined && line !== null);
  return (
    <Card id={frame.id} aria-labelledby={headingIdOf(frame.id)} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>
          {/* A link's hash lands on it (184), and a closed Sheet gives it the focus. */}
          <h2 id={headingIdOf(frame.id)} tabIndex={-1} className="outline-none">
            {frame.title}
          </h2>
        </CardTitle>
        {(lines.length > 0 || frame.stale) && (
          <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
            {frame.stale && <Badge variant="warning">{frame.stale.badge}</Badge>}
          </CardDescription>
        )}
        {head && <CardAction>{head}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notice}
        {frame.stale && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground">
              <span>{frame.stale.line}</span>
              {frame.stale.confirm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={frame.stale.confirm.pending}
                  disabled={frame.stale.confirm.blocked}
                  onClick={frame.stale.confirm.run}
                >
                  {frame.stale.confirm.label}
                </Button>
              )}
            </div>
            {frame.stale.failure && <FormFailure view={frame.stale.failure} />}
          </div>
        )}
        {empty ? <SectionEmpty view={empty} /> : children}
      </CardContent>
    </Card>
  );
}
