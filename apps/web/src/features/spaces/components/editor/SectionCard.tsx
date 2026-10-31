import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  useMediaQuery,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { ReactNode } from 'react';
import type { SectionFrameView } from '../../types/SectionFrameView';

/**
 * A fact group's section: a card titled by its `h2`, its date or that it is missing, its badges and
 * its header's own `action`, its fields (`children`) in one form, its failure, and its footer: Save,
 * then Discard while it has unsaved changes, or the confirmation while it is unchanged. Its id is the
 * navigation's anchor. From 768 px the header's action sits beside the title; below it, it leads the
 * content, the title keeping its width (G20.2).
 */
export function SectionCard({
  frame,
  action,
  children,
}: {
  frame: SectionFrameView;
  action?: ReactNode;
  children: ReactNode;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  const headerAction = wide ? action : undefined;
  return (
    <Card id={frame.id} className="scroll-mt-28 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle>
          {/* A link's hash lands on it (184). */}
          <h2 tabIndex={-1} className="outline-none">
            {frame.title}
          </h2>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{frame.date}</span>
          {frame.stale && <Badge variant="warning">{frame.stale}</Badge>}
        </CardDescription>
        {(frame.unsaved || headerAction) && (
          <CardAction className="flex flex-wrap items-center justify-end gap-2">
            {frame.unsaved && <Badge variant="warning">{frame.unsaved}</Badge>}
            {headerAction}
          </CardAction>
        )}
      </CardHeader>
      {/* The form takes no box of its own, so its content and footer are the card's. */}
      <form noValidate onSubmit={frame.save.submit} className="contents">
        <CardContent className="gap-5">
          {!wide && action !== undefined && <div className="flex flex-wrap gap-2">{action}</div>}
          {children}
          {frame.failure && <FormFailure view={frame.failure} />}
          {frame.note && (
            <p role="status" className="text-body-sm text-muted-foreground">
              {frame.note}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <Button type="submit" loading={frame.save.pending} disabled={frame.save.blocked}>
            {frame.save.label}
          </Button>
          {frame.discard && (
            <Button type="button" variant="ghost" onClick={frame.discard.run}>
              {frame.discard.label}
            </Button>
          )}
          {frame.confirm && (
            <Button
              type="button"
              variant="ghost"
              loading={frame.confirm.pending}
              disabled={frame.confirm.blocked}
              onClick={frame.confirm.run}
            >
              {frame.confirm.label}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
