import type { MyAccount } from '@masaha/shared/users';
import { useCopy } from '@shared/copy';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useProfileForm } from '../../hooks/settings/useProfileForm';

/**
 * «الملف الشخصي»: the name, by registration's rule, and the email as text — the address one signs in
 * with, which is not changed here — then «حفظ», from `useProfileForm`.
 */
export function ProfileCard({ account }: { account: MyAccount }) {
  const words = useCopy().users.settings.profile;
  const { field, submit, isPending, blocked, errors, failure } = useProfileForm(account);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{words.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {failure && <FormFailure view={failure} />}
          <Field label={words.name} error={errors.name}>
            <Input autoComplete="name" {...field('name')} />
          </Field>
          <div className="flex flex-col gap-1">
            <p className="text-label">{words.email}</p>
            <p className="text-body" dir="ltr">
              {account.email}
            </p>
            <p className="text-body-sm text-muted-foreground">{words.emailNote}</p>
          </div>
          <Button type="submit" className="self-start" loading={isPending} disabled={blocked}>
            {words.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
