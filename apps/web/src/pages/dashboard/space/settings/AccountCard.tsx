import { useCopy } from '@shared/copy';
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { ACCOUNT_SETTINGS_PATH } from '@shared/routing';
import { Link } from 'react-router';

/**
 * «حسابي», the settings page's last card (D5.7): what the owner's own account holds, and the way to
 * the personal settings, where it is kept.
 */
export function AccountCard() {
  const words = useCopy().spaceSettings.account;
  return (
    <Card id="account">
      <CardHeader>
        <CardTitle>
          <h2>{words.title}</h2>
        </CardTitle>
        <CardDescription>{words.description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild variant="outline">
          <Link to={ACCOUNT_SETTINGS_PATH}>{words.action}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
