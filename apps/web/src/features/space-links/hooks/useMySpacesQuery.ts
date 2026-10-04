import { useQuery } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../repository/spaceLinksRepository';
import { spaceLinksKeys } from './queryKeys';

const repository = createSpaceLinksRepository();

/** The spaces the signed-in user holds an active link to, with their role at each. */
export function useMySpacesQuery() {
  return useQuery({ queryKey: spaceLinksKeys.mySpaces, queryFn: () => repository.mySpaces() });
}
