import { RegisterForm } from '@features/auth';
import { useCopy } from '@shared/copy';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { Link, useLocation } from 'react-router';
import { SITE_PATHS } from '../navigation';
import { nextSearch } from './nextSearch';

/**
 * Register: the card around the register form, the way to sign in instead, and where space owners
 * get their accounts. Once the account is signed in, `RequireGuest` sends the user on to the page
 * they came for.
 */
export function RegisterPage() {
  const copy = useCopy();
  const { search } = useLocation();
  const signIn = `${SITE_PATHS.signIn}${nextSearch(search)}`;

  return (
    <Card className="w-full md:max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>{copy.auth.register.title}</h1>
        </CardTitle>
        <CardDescription>{copy.auth.register.description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <RegisterForm
          signInLink={
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to={signIn}>{copy.auth.register.signInInstead}</Link>
            </Button>
          }
        />
      </CardContent>
      <CardFooter className="flex-col gap-3 text-body-sm text-muted-foreground">
        <p className="flex flex-wrap items-center justify-center gap-1">
          {copy.auth.register.haveAccount}
          <Button asChild variant="link" size="sm">
            <Link to={signIn}>{copy.auth.register.signIn}</Link>
          </Button>
        </p>
        <p className="text-center text-caption">
          {copy.auth.register.ownerNote}{' '}
          <Link to={SITE_PATHS.contact} className="text-primary">
            {copy.site.contact}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
