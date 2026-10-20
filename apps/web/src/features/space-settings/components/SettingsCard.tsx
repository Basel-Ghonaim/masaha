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
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { ReactNode } from 'react';
import type { SettingsCardView } from '../types/SettingsCardView';

/**
 * A settings card: titled by its `h2`, its description (or the page's own, `description`), its
 * unsaved badge, its fields (`children`) in one form, its failure and its note, then «حفظ» and,
 * while it has unsaved changes, «تجاهل التغييرات». Its id is the card's anchor.
 */
export function SettingsCard({
  frame,
  description,
  footer,
  children,
}: {
  frame: SettingsCardView;
  /** In place of the frame's own description, when it holds more than words (a link). */
  description?: ReactNode;
  /** Another action of the card's footer, after its own. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const shownDescription = description ?? frame.description;
  return (
    <Card id={frame.id}>
      <CardHeader>
        <CardTitle>
          <h2>{frame.title}</h2>
        </CardTitle>
        {shownDescription !== undefined && <CardDescription>{shownDescription}</CardDescription>}
        {frame.unsaved !== null && (
          <CardAction>
            <Badge variant="warning">{frame.unsaved}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {/* The form takes no box of its own, so its content and footer are the card's. */}
      <form noValidate onSubmit={frame.save.submit} className="contents">
        <CardContent className="flex flex-col gap-5">
          {children}
          {frame.failure !== null && <FormFailure view={frame.failure} />}
          {frame.note !== null && (
            <p role="status" className="text-body-sm text-muted-foreground">
              {frame.note}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <Button type="submit" loading={frame.save.pending} disabled={frame.save.blocked}>
            {frame.save.label}
          </Button>
          {frame.discard !== null && (
            <Button type="button" variant="ghost" onClick={frame.discard.run}>
              {frame.discard.label}
            </Button>
          )}
          {footer}
        </CardFooter>
      </form>
    </Card>
  );
}
