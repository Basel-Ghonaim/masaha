import type { MapMark, MarkerMapProps } from '@shared/map';
import type { DirectoryListView, ListFailureView } from './DirectoryListView';
import type { FiltersView } from './FiltersView';
import type { SpaceCardView } from './SpaceCardView';

/**
 * The directory's map, ready to render: the search, the filters (a sheet at every width), near me,
 * the map's marks and what it is handed, the legend, the selected space and each state's words.
 */
export type DirectoryMapView = {
  search: DirectoryListView['search'];
  filters: FiltersView;
  near: DirectoryListView['near'];
  /** What the map is handed, but what the component draws over and under it. */
  map: Omit<MarkerMapProps, 'overlay' | 'under'>;
  /** The section around the map. */
  region: string;
  /** A fetch is in flight over the marks shown. */
  busy: boolean;
  legend: { label: string; items: { key: string; mark: MapMark; label: string }[] };
  /** «مركّز على موقعي», while a point is held. */
  centre: string | null;
  /** Picking a point by hand: the card over the map, placing the centre or going back. */
  pick: {
    title: string;
    text: string;
    confirm: string;
    back: string;
    place: (point: { lat: number; lng: number }) => void;
    cancel: () => void;
  } | null;
  state: 'loading' | 'failed' | 'empty' | 'noMatch' | 'ready';
  failure: ListFailureView | null;
  empty: { title: string; text: string };
  noMatch: { title: string; text: string; clear: { label: string; run: () => void } };
  /** Past the pins' ceiling, until the map is asked within its view. */
  truncated: string | null;
  selected: { card: SpaceCardView; close: () => void; closeLabel: string; details: string } | null;
  /** Below 768 px: the selected space is a bottom sheet, not a card over the map. */
  phone: boolean;
  /** Below 1024 px, where the map is shorter: the picking card stands under the map, not over it. */
  pickUnder: boolean;
};
