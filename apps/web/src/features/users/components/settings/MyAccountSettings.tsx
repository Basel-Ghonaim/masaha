import type { ReactNode } from 'react';
import { useCopy } from '@shared/copy';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from '@shared/design-system';
import { useRefusalView } from '@shared/forms';
import { useMyAccountQuery } from '../../hooks/settings/useMyAccountQuery';
import { PreferencesCard } from './PreferencesCard';
import { ProfileCard } from './ProfileCard';
import { SignInCard } from './SignInCard';

const CARDS = ['profile', 'preferences', 'signIn'] as const;

/**
 * «إعدادات حسابي»'s three cards, one column (screen 9): the profile, the preferences and the ways of
 * signing in, from `GET /me`. While it loads, each card's skeleton; its failure, a destructive alert
 * with «إعادة المحاولة». A Google-only account's link to set a password is the page's (`setPassword`).
 */
export function MyAccountSettings({
  setPassword,
}: {
  /** The link to set a first password for the account's address, as the page draws it. */
  setPassword: (email: string) => ReactNode;
}) {
  const copy = useCopy();
  const query = useMyAccountQuery();
  const account = query.data;
  const { view, blocked } = useRefusalView(
    account === undefined ? query.error : null,
    copy.users.settings.loadFailed,
  );

  if (account === undefined) {
    if (view !== null)
      return (
        <Alert variant="destructive">
          <AlertTitle>{copy.users.settings.loadFailed}</AlertTitle>
          <AlertDescription>
            <p>{view.message}</p>
            {view.kind === 'refused' && view.reference !== undefined && <p>{view.reference}</p>}
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              disabled={blocked}
              onClick={() => {
                void query.refetch();
              }}
            >
              {copy.status.retry}
            </Button>
          </AlertAction>
        </Alert>
      );
    return (
      <div className="flex flex-col gap-6" role="status" aria-label={copy.status.loading}>
        {CARDS.map((card) => (
          <Card key={card}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileCard account={account} />
      <PreferencesCard />
      <SignInCard account={account} setPassword={setPassword} />
    </div>
  );
}
