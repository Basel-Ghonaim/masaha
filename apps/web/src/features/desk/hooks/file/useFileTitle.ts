import type { PageTitle } from '@shared/routing';
import { useCustomerFileQuery } from './useCustomerFileQuery';

/**
 * The file's title: the customer's name once their file has loaded, from the same read the file
 * shows. A name is typed by the staff in any language, so it carries none; until it loads, none,
 * and the route's own title stands.
 */
export function useFileTitle(spaceId: number, customerId: number): PageTitle | undefined {
  const name = useCustomerFileQuery(spaceId, customerId).data?.customer.name;
  return name === undefined ? undefined : { text: name };
}
