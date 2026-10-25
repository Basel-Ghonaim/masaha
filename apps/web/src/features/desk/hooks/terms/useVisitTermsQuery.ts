import type { VisitTerms } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * The desk's terms for visits, for the caller: the rounding and the cap in force, the rates a visit
 * would copy now, and whether they may type a price where a visit has none (S7: the server's answer,
 * never the role). A link ended meanwhile reads the user's own spaces again.
 */
export function useVisitTermsQuery(spaceId: number) {
  const { linkEnded } = useDeskWrite();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<VisitTerms, AppError>({
    queryKey: deskKeys.terms(spaceId),
    queryFn: () => repository.terms(spaceId),
  });
  useEffect(() => {
    linkEnded(query.error);
  }, [query.error, linkEnded]);
  return query;
}
