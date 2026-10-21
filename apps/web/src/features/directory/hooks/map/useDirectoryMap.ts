import { GAZA_STRIP_BOUNDS } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useMediaQuery } from '@shared/design-system';
import { useLanguage } from '@shared/localisation';
import type { MapBounds } from '@shared/map';
import { useEffect, useRef, useState } from 'react';
import { cardViewOf } from '../../services/cardView';
import { pinMark } from '../../services/pinMark';
import { pinsRequestOf } from '../../services/requestOf';
import type { DirectoryMapView } from '../../types/DirectoryMapView';
import { useFiltersPanel } from '../filters/useFiltersPanel';
import { useDirectoryFilters } from '../list/useDirectoryFilters';
import { useFailureView } from '../list/useFailureView';
import { useLocationStatus } from '../near/useLocationStatus';
import { useNearMe } from '../near/useNearMe';
import { usePinsQuery } from './usePinsQuery';
import { useSelectedPin } from './useSelectedPin';

/** From here up the selected space is a card over the map; below it, a bottom sheet. */
const TABLET_UP = '(min-width: 768px)';
/** How long the map waits after a move before it asks within its view, as the search waits. */
const VIEW_PAUSE_MS = 400;

/**
 * The directory's map, ready to render: every space that passes the filters as a pin whose live
 * state is a shape as well as a colour (U6), the legend, the space chosen (a card from 768 px, a
 * bottom sheet below it, brought into view above the sheet), the visitor's point while one is held,
 * and the states. The filters are the list's, from the address; on the map they open in the sheet
 * at every width, and there is no order. Past the pins' ceiling, the answer says so, and once the
 * map has moved and paused it is asked again within the box in view, whose answer replaces the
 * marks; a change of filter asks for the whole set again and clears the choice.
 */
export function useDirectoryMap(): DirectoryMapView {
  const copy = useCopy();
  const words = copy.directory;
  const english = useLanguage() === 'en';
  const phone = !useMediaQuery(TABLET_UP);
  const filters = useDirectoryFilters();
  const near = useNearMe();

  const filtersKey = JSON.stringify(pinsRequestOf(filters.filters, null));
  const selection = useSelectedPin(filtersKey);
  const [inView, setInView] = useState<MapBounds | null>(null);
  const [inViewKey, setInViewKey] = useState(filtersKey);
  if (inViewKey !== filtersKey) {
    setInViewKey(filtersKey);
    setInView(null);
  }

  const whole = usePinsQuery(pinsRequestOf(filters.filters, null), true);
  const within = usePinsQuery(pinsRequestOf(filters.filters, inView), inView !== null);
  const answer = inView !== null && within.data !== undefined ? within.data : whole.data;
  const shownPins = answer?.pins ?? [];

  // A move asks within the box in view only once the map has paused, and only past the ceiling.
  const pause = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(pause.current);
    },
    [],
  );
  const onViewChange =
    whole.data?.truncated === true
      ? (bounds: MapBounds) => {
          clearTimeout(pause.current);
          pause.current = setTimeout(() => {
            setInView(bounds);
          }, VIEW_PAUSE_MS);
        }
      : null;

  const failure = useFailureView(
    whole.data === undefined ? whole.error : null,
    words.loadFailed,
    () => {
      void whole.refetch();
    },
  );

  const panel = useFiltersPanel({
    filters: filters.filters,
    apply: filters.apply,
    applied: filters.applied,
    clear: filters.clearFilters,
    total: whole.data === undefined || whole.data.truncated ? undefined : whole.data.pins.length,
    sheetOnly: true,
  });
  const status = useLocationStatus({
    state: near.state,
    stop: near.stop,
    clear: near.clear,
    // «اختر منطقتك»: on the map, the filters are always the sheet.
    chooseArea: () => {
      panel.sheet.setOpen(true);
    },
  });

  const now = new Date();
  const cardOf = (pin: (typeof shownPins)[number]) =>
    cardViewOf(pin, { english, now, copy, byDistance: false });
  const chosen = shownPins.find((pin) => pin.id === selection.selectedId) ?? null;
  const point = near.state.point;

  return {
    search: {
      label: words.search.label,
      placeholder: words.search.placeholder,
      text: filters.search.text,
      change: filters.search.change,
      error: filters.search.refused ? words.search.refused : null,
    },
    filters: panel,
    near: {
      button: {
        label: words.near.button,
        on: near.state.sorting && point !== null,
        locating: near.state.status === 'locating',
        press: near.press,
      },
      status,
    },
    map: {
      markers: shownPins.map((pin) => {
        const card = cardOf(pin);
        return {
          id: pin.id,
          point: pin.location,
          mark: pinMark(pin.liveStatus),
          // An attribute, never drawn: the name needs no isolation from the status.
          label: words.map.pin({
            name: card.name.text,
            status: card.status?.label ?? card.noStatus,
          }),
          name: { text: card.name.text, ...(card.name.lang && { lang: card.name.lang }) },
        };
      }),
      selectedId: chosen?.id ?? null,
      onSelect: selection.select,
      bounds: GAZA_STRIP_BOUNDS,
      user: point === null ? null : { point, label: words.map.you },
      focus: chosen === null ? null : { point: chosen.location, place: phone ? 'upper' : 'centre' },
      pick: null,
      onViewChange,
      label: words.map.label,
      failed: words.map.failed,
    },
    region: words.map.region,
    busy: answer !== undefined && (whole.isFetching || within.isFetching),
    legend: {
      label: words.map.legend,
      items: [
        { key: 'available', mark: pinMark('AVAILABLE'), label: copy.terms.liveStatuses.available },
        { key: 'full', mark: pinMark('FULL'), label: copy.terms.liveStatuses.full },
        { key: 'closed', mark: pinMark('CLOSED'), label: copy.terms.liveStatuses.closedNow },
        { key: 'none', mark: pinMark(null), label: words.status.none },
      ],
    },
    centre: point === null ? null : words.map.centre,
    state: whole.isPending
      ? 'loading'
      : whole.data === undefined
        ? 'failed'
        : shownPins.length > 0
          ? 'ready'
          : filters.anyApplied
            ? 'noMatch'
            : 'empty',
    failure,
    empty: { title: words.empty.title, text: words.empty.text },
    noMatch: {
      title: words.noMatch.title,
      text: words.noMatch.text,
      // As the list's: the filters while one is in force, else the search alone.
      clear: {
        label: words.clearFilters,
        run: filters.applied > 0 ? panel.sheet.clear.run : filters.clearSearch,
      },
    },
    truncated: answer?.truncated === true ? words.map.truncated : null,
    selected:
      chosen === null
        ? null
        : {
            card: cardOf(chosen),
            close: selection.close,
            closeLabel: words.map.close,
            details: words.map.details,
          },
    phone,
  };
}
