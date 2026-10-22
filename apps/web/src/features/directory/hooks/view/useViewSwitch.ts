import { useCopy } from '@shared/copy';
import { useSearchParams } from 'react-router';
import { filtersOf, paramsOf } from '../../services/filtersOf';
import type { DirectoryViewKind } from '../../types/DirectoryFilters';

const VIEWS: readonly DirectoryViewKind[] = ['list', 'map'];

/**
 * «قائمة | خريطة»: the directory's view, kept in the address (`view=map`) with every filter, the
 * address replaced as a filter replaces it, on the first page.
 */
export function useViewSwitch() {
  const words = useCopy().directory.view;
  const [params, setParams] = useSearchParams();
  const current = filtersOf(params).view;

  return {
    label: words.label,
    value: current,
    options: VIEWS.map((value) => ({ value, label: words[value] })),
    choose: (value: string) => {
      const view = VIEWS.find((candidate) => candidate === value);
      if (view === undefined || view === current) return;
      setParams(paramsOf({ ...filtersOf(params), view, page: 1 }), { replace: true });
    },
  };
}
