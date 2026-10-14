import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';
import { useCatalogueQuery } from './useCatalogueQuery';

/**
 * The field that chooses one area, ready to render: each governorate a group named after it, its
 * areas under it, in order, named in the interface's language. It reads the public catalogue, so
 * only an area that may take a space is offered: never a hidden one, nor one of a hidden
 * governorate. While the catalogue loads, or once it has failed, it says so.
 *
 * A space keeps its area when the admin hides it later: `kept` is then that one area, named from the
 * admin's lists and marked hidden, so the field still shows it; it is never among the groups, so no
 * other space is offered it. The admin's lists are read only then, and `kept` is null while they load
 * or once they have failed.
 */
export function useAreaOptions({
  value,
  onValueChange,
}: {
  value: number | null;
  onValueChange: (areaId: number) => void;
}) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const query = useCatalogueQuery();
  const nameOf = (place: { nameAr: string; nameEn: string }) =>
    english ? place.nameEn : place.nameAr;
  const governorates = query.data?.governorates ?? [];
  const offered =
    value === null ||
    query.data === undefined ||
    governorates.some(({ areas }) => areas.some(({ id }) => id === value));
  const adminLists = useGovernoratesQuery({ enabled: !offered });

  const kept = (() => {
    if (offered) return null;
    for (const governorate of adminLists.data ?? []) {
      const area = governorate.areas.find(({ id }) => id === value);
      if (area !== undefined) {
        return {
          value: String(value),
          label: copy.lookups.areaSelect.hidden({
            name: copy.lookups.areaName({ area: nameOf(area), governorate: nameOf(governorate) }),
          }),
        };
      }
    }
    return null;
  })();

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : ('ready' as const),
    // No option ('') until an area is chosen, so the trigger shows its placeholder.
    value: value === null ? '' : String(value),
    choose: (option: string) => {
      onValueChange(Number(option));
    },
    kept,
    groups: governorates.map((governorate) => ({
      key: String(governorate.id),
      label: nameOf(governorate),
      options: governorate.areas.map((area) => ({ value: String(area.id), label: nameOf(area) })),
    })),
    placeholder: copy.lookups.areaSelect.placeholder,
    loadingLabel: copy.status.loading,
    failedLabel: copy.lookups.placeSelect.loadFailed,
  };
}
