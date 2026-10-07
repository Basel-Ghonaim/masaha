import { useSearchParams } from 'react-router';

const TABS = ['governorates', 'amenities'] as const;

/** A tab of the lookups page: the governorates and their areas, or the amenities. */
export type LookupsTab = (typeof TABS)[number];

/**
 * The lookups page's tab, kept in the address (`?tab=amenities`) so a link or a reload opens it. A
 * missing or unknown tab is the first. Choosing one replaces the address rather than adding a step,
 * so Back leaves the page; the first tab takes no parameter.
 */
export function useLookupsTab(): [LookupsTab, (tab: string) => void] {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((one) => one === params.get('tab')) ?? TABS[0];

  const choose = (value: string) => {
    const next = TABS.find((one) => one === value);
    if (next === undefined) return;
    setParams(next === TABS[0] ? {} : { tab: next }, { replace: true });
  };

  return [tab, choose];
}
