import type { SpacePackage } from '@masaha/shared/packages';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { priceLineOf, shiftNameOf, summaryOf } from '../../services/packageSummary';
import type { PackageRowView } from '../../types/PackageRowView';
import type { ShiftChoice } from '../../types/ShiftChoice';
import { usePackagesQuery } from './usePackagesQuery';
import { useRowWrite } from './useRowWrite';

/**
 * The space's private packages, ready to render: the list's state (loading, failed with its
 * reference and a retry, empty, or the list), the packages as rows in order, a paused one muted, each
 * offered or paused at once by its switch, which waits on the server, and edited in the package
 * sheet; a paused package that still holds a shift says so and clears it (finding 81). «باقة جديدة»
 * opens the sheet for a new package. The space's shifts come from the page (`shifts`, `null` while
 * they load).
 */
export function usePackagesSection({
  spaceId,
  shifts,
}: {
  spaceId: number;
  shifts: readonly ShiftChoice[] | null;
}) {
  const copy = useCopy();
  const words = copy.packages;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const query = usePackagesQuery(spaceId);
  const write = useRowWrite(spaceId);
  // The sheet: closed, or open on a package (`null`: a new one).
  const [sheet, setSheet] = useState<{ editing: SpacePackage | null } | null>(null);
  // A failed refetch keeps the list already loaded: only a list that never arrived is an error.
  const { view, blocked } = useRefusalView(
    query.data === undefined ? query.error : null,
    words.loadFailed,
  );
  const packages = query.data ?? [];

  const rows = packages.map((pkg): PackageRowView => {
    const name = isolate(pkg.name);
    const pending = write.pending.includes(pkg.id);
    const shift = shifts?.find(({ id }) => id === pkg.shiftId);
    return {
      key: pkg.id,
      name: pkg.name,
      summary: summaryOf(pkg, shifts, words, language),
      price: priceLineOf(pkg, words, language),
      paused: pkg.isActive ? null : words.paused,
      available: {
        label: words.available,
        name: words.availableNamed({ name }),
        checked: pkg.isActive,
        pending,
        toggle: (checked) => {
          if (!pending) write.run({ pkg, change: { isActive: checked } });
        },
      },
      edit: {
        label: words.edit,
        name: words.editNamed({ name }),
        run: () => {
          setSheet({ editing: pkg });
        },
      },
      heldShift:
        !pkg.isActive && pkg.shiftId !== null
          ? {
              text: words.heldShift({
                shift: isolate(shift === undefined ? '' : shiftNameOf(shift, language)),
              }),
              clear: {
                label: words.clearShift,
                pending,
                run: () => {
                  if (!pending) write.run({ pkg, change: { shiftId: null } });
                },
              },
            }
          : null,
    };
  });

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : packages.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    title: words.title,
    description: words.description,
    loadingLabel: copy.status.loading,
    empty: { title: words.empty.title, description: words.empty.text },
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    rows,
    add: {
      label: words.add,
      run: () => {
        setSheet({ editing: null });
      },
    },
    sheet:
      sheet === null
        ? null
        : {
            editing: sheet.editing,
            close: () => {
              setSheet(null);
            },
          },
  };
}
