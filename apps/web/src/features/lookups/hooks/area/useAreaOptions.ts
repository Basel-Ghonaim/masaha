import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useCatalogueQuery } from './useCatalogueQuery';

/**
 * The field that chooses one area, ready to render: each governorate a group named after it, its
 * areas under it, in order, named in the interface's language. It reads the public catalogue, so
 * only an area that may take a space is offered: never a hidden one, nor one of a hidden
 * governorate. While the catalogue loads, or once it has failed, it says so.
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
    groups: (query.data?.governorates ?? []).map((governorate) => ({
      key: String(governorate.id),
      label: nameOf(governorate),
      options: governorate.areas.map((area) => ({ value: String(area.id), label: nameOf(area) })),
    })),
    placeholder: copy.lookups.areaSelect.placeholder,
    loadingLabel: copy.status.loading,
    failedLabel: copy.lookups.placeSelect.loadFailed,
  };
}
