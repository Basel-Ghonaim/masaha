import type { AdminUserRow } from '@masaha/shared/space-links';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useLanguage } from '@shared/localisation';
import { useQuery } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { updatedOn } from '../../services/updatedOn';
import { userRowView } from '../../services/userRowView';
import type { EmailAccountState } from '../../types/EmailAccountView';
import { spaceLinksKeys } from '../queryKeys';

const repository = createSpaceLinksRepository();

/**
 * Whose account `email` is, read from the admin's users list before an upgrade is offered. The
 * list's search also finds longer emails that hold this one, so only a row with exactly this email
 * counts: a mistyped email that is someone else's is `notFound`, as a failed read is, and never
 * upgraded by one click. `null` reads nothing.
 */
export function useEmailAccount(email: string | null): EmailAccountState {
  const lines = useCopy().spaceLinks.ownersList;
  const english = useLanguage() === 'en';
  const request = { q: email ?? undefined };
  const query = useQuery<Page<AdminUserRow[]>, AppError>({
    queryKey: spaceLinksKeys.adminUsers(request),
    queryFn: () => repository.adminUsers(request),
    enabled: email !== null,
  });

  if (email === null) return { status: 'none' };
  if (query.isPending) return { status: 'reading' };
  const row = query.data?.data.find((user) => user.email === email);
  if (row === undefined) return { status: 'notFound' };
  const view = userRowView(row, { lines, english });
  return {
    status: 'found',
    account: {
      name: row.name,
      joined: updatedOn(row.joinedAt, english ? 'en' : 'ar', new Date()),
      spaces: view.spaces,
      receptionSpaces: view.receptionSpaces,
    },
  };
}
