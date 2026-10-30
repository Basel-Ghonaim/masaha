import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { ReactNode } from 'react';
import type { CardFrameView } from '../../types/CardFrameView';
import type { CardLoadView } from '../../types/CardLoadView';

type ShellProps = { load: CardLoadView } | { frame: CardFrameView; children: ReactNode };

/**
 * One of the admin's settings cards (AD-029): titled by its `h2`, its description, and its
 * «تغييرات غير محفوظة» badge while it differs. Before its values are read, its own skeleton or its
 * own failure with «إعادة المحاولة»; once read, its fields (`children`) in one form, its refusal
 * inside it, then «حفظ» and, while it differs, «تجاهل التغييرات». Its id is the card's anchor.
 */
export function SettingsCardShell(props: ShellProps) {
  const head = 'load' in props ? props.load : props.frame;
  const unsaved = 'frame' in props ? props.frame.unsaved : null;

  return (
    <Card id={head.id}>
      <CardHeader>
        <CardTitle>
          <h2>{head.title}</h2>
        </CardTitle>
        <CardDescription>{head.description}</CardDescription>
        {unsaved !== null && (
          <CardAction>
            <Badge variant="warning">{unsaved}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {'load' in props ? (
        <CardContent>
          {props.load.state === 'loading' ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Alert variant="destructive">
              <AlertTitle>{props.load.failure.title}</AlertTitle>
              {props.load.failure.message !== undefined && (
                <AlertDescription>{props.load.failure.message}</AlertDescription>
              )}
              <AlertAction>
                <Button
                  variant="outline"
                  disabled={props.load.failure.blocked}
                  onClick={props.load.failure.retry}
                >
                  {props.load.failure.retryLabel}
                </Button>
              </AlertAction>
            </Alert>
          )}
        </CardContent>
      ) : (
        // The form takes no box of its own, so its content and footer are the card's.
        <form noValidate onSubmit={props.frame.save.submit} className="contents">
          <CardContent className="flex flex-col gap-5">
            {props.children}
            {props.frame.failure !== null && <FormFailure view={props.frame.failure} />}
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button
              type="submit"
              loading={props.frame.save.pending}
              disabled={props.frame.save.blocked}
            >
              {props.frame.save.label}
            </Button>
            {props.frame.discard !== null && (
              <Button type="button" variant="ghost" onClick={props.frame.discard.run}>
                {props.frame.discard.label}
              </Button>
            )}
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
