import { useSearchParams } from 'react-router';
import {
  reportsParamsOf,
  reportsQueryOf,
  type ReportChip,
  type SpaceReportsFilters,
} from '../../services/reportsQueryOf';

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The owner's status chip and page, kept in the address so a link, a reload or Back shows the same
 * list (S8): a value the server would refuse falls back to «الكل». Choosing a chip replaces the
 * address, so Back leaves the page rather than stepping through chips, and returns to the first
 * page. The pages are links of their own (`searchOf`).
 */
export function useSpaceReportsFilters() {
  const [params, setParams] = useSearchParams();
  const { filters, query } = reportsQueryOf(params);
  const write = (next: SpaceReportsFilters) => {
    setParams(reportsParamsOf(next), { replace: true });
  };

  return {
    filters,
    query,
    choose: (chip: ReportChip) => {
      write({ chip, page: 1 });
    },
    /** The address of a page, with the chip kept. */
    searchOf: (page: number) => addressOf(reportsParamsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...filters, page });
    },
  };
}
