import { Alert, AlertDescription, AlertTitle, Badge } from '@shared/design-system';
import type { useAddOwnerForm } from '../../hooks/add-owner/useAddOwnerForm';

type Notice = ReturnType<typeof useAddOwnerForm>['notice'];

/**
 * What adding the owner will do, under the fields: a new account; the email's account being read;
 * that account shown — its name, when it joined, its spaces and its reception desks — so the admin
 * confirms it is the person meant before the upgrade; or, when no account has exactly this email,
 * that it is not upgraded here.
 */
export function AddOwnerNotice({ notice }: { notice: Notice }) {
  switch (notice.kind) {
    case 'create':
      return <p className="text-body-sm text-muted-foreground">{notice.text}</p>;
    case 'checking':
      return (
        <p role="status" className="text-body-sm text-muted-foreground">
          {notice.text}
        </p>
      );
    case 'unconfirmed':
      return (
        <Alert variant="warning">
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      );
    case 'upgrade':
      return (
        <Alert variant="info">
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>
            <dl className="mb-4 flex flex-col gap-1">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{notice.labels.name}</dt>
                <dd className="font-medium">
                  <bdi>{notice.account.name}</bdi>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{notice.labels.joined}</dt>
                <dd>{notice.account.joined}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{notice.labels.spaces}</dt>
                <dd className="flex flex-wrap gap-1">
                  {notice.account.spaces.length === 0
                    ? notice.labels.noSpaces
                    : notice.account.spaces.map((space, index) => (
                        // Two spaces may share a name, so each keeps its place in the list.
                        <Badge key={index} variant="neutral" lang={space.lang} dir={space.dir}>
                          {space.text}
                        </Badge>
                      ))}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{notice.labels.reception}</dt>
                <dd className="flex flex-wrap gap-1">
                  {notice.account.receptionSpaces.length === 0
                    ? notice.labels.noReception
                    : notice.account.receptionSpaces.map((space, index) => (
                        // Two spaces may share a name, so each keeps its place in the list.
                        <Badge key={index} variant="neutral" lang={space.lang} dir={space.dir}>
                          {space.text}
                        </Badge>
                      ))}
                </dd>
              </div>
            </dl>
            <p className="font-medium">{notice.confirm}</p>
            <p>{notice.text}</p>
          </AlertDescription>
        </Alert>
      );
  }
}
