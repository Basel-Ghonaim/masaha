import type { ListFailureView } from './DirectoryListView';
import type { LocationStatusView } from './LocationStatusView';
import type { SpaceCardView } from './SpaceCardView';

/** Home's spaces, ready to render: the title, near me, «عرض الكل», the cards and each state. */
export type HomeSpacesView = {
  title: string;
  near: {
    button: { label: string; on: boolean; locating: boolean; press: () => void };
    status: LocationStatusView;
  };
  /** Where «عرض الكل» leads: the Directory's list, or its spaces available now. */
  viewAll: { label: string; to: 'list' | 'available' };
  /** A fetch is in flight over the cards shown. */
  busy: boolean;
  state: 'loading' | 'failed' | 'empty' | 'ready';
  cards: SpaceCardView[];
  failure: ListFailureView | null;
  /** None to show: its words, and «تصفّح كل المساحات». */
  empty: { title: string; text: string; action: string };
};
