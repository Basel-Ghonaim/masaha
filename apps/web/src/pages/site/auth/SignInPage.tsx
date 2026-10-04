import { SignInForm } from '@features/auth';
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
 * Sign in: the card around the sign-in form, the ways to a forgotten password and to a new account,
 * and the way on without one. Once signed in, `RequireGuest` sends the user on to the page they came
 * for.
 */
export function SignInPage() {
  const copy = useCopy();
  const { search } = useLocation();

  return (
    <Card className="w-full md:max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>{copy.auth.signIn.title}</h1>
        </CardTitle>
        <CardDescription>{copy.auth.signIn.description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <SignInForm
          forgotPasswordLink={
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to={SITE_PATHS.forgotPassword}>{copy.auth.signIn.forgotPassword}</Link>
            </Button>
          }
        />
      </CardContent>
      <CardFooter className="flex-col gap-2 text-body-sm text-muted-foreground">
        <p className="flex flex-wrap items-center justify-center gap-1">
          {copy.auth.signIn.noAccount}
          <Button asChild variant="link" size="sm">
            <Link to={`${SITE_PATHS.register}${nextSearch(search)}`}>
              {copy.auth.signIn.createAccount}
            </Link>
          </Button>
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link to={SITE_PATHS.spaces}>{copy.auth.signIn.browseWithoutAccount}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
