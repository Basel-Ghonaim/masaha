import type { AdminUserRow } from '@masaha/shared/space-links';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useLanguage } from '@shared/localisation';
import { useQuery } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { userRowView } from '../../services/userRowView';
import type { EmailAccountState } from '../../types/EmailAccountView';
import { spaceLinksKeys } from '../queryKeys';

const repository = createSpaceLinksRepository();

/**
 * Whose account `email` is, read from the admin's users list by its exact email (`?email=`, D6.5,
 * finding 89) before an upgrade is offered, so a right email is found whatever page a search would
 * put it on: `found`, `notFound` — never upgraded by one click —, or a read that `failed`, said
 * apart with its retry. `null` reads nothing.
 */
export function useEmailAccount(email: string | null): EmailAccountState {
  const words = useCopy().spaceLinks.usersList.row;
  const english = useLanguage() === 'en';
  const request = { email: email ?? undefined };
  const query = useQuery<Page<AdminUserRow[]>, AppError>({
    queryKey: spaceLinksKeys.adminUsers(request),
    queryFn: () => repository.adminUsers(request),
    enabled: email !== null,
  });

  if (email === null) return { status: 'none' };
  if (query.isPending) return { status: 'reading' };
  if (query.data === undefined) {
    return {
      status: 'failed',
      retry: () => {
        void query.refetch();
      },
    };
  }
  const row = query.data.data.find((user) => user.email === email);
  if (row === undefined) return { status: 'notFound' };
  const view = userRowView(row, { words, english, now: new Date() });
  return {
    status: 'found',
    row,
    account: {
      name: row.name,
      joined: view.joined,
      spaces: view.spaces,
      receptionSpaces: view.receptionSpaces,
    },
  };
}
