import { Button, EmptyState, SearchXIcon } from '@shared/design-system';
import type { DirectoryListView } from '../../types/DirectoryListView';
import { SpaceCardSkeleton } from '../card/SpaceCardSkeleton';
import { FailureAlert } from './FailureAlert';

const SKELETONS = [1, 2, 3, 4, 5, 6];

/**
 * What stands in for the cards when there are none to show: six skeletons while the first page
 * loads, the failure with its retry, an empty directory, or no match with «مسح الفلاتر».
 */
export function ResultsState({ results }: { results: DirectoryListView['results'] }) {
  switch (results.state) {
    case 'loading':
      return SKELETONS.map((key) => <SpaceCardSkeleton key={key} />);
    case 'failed':
      return (
        results.failure !== null && (
          <div className="col-span-full">
            <FailureAlert failure={results.failure} />
          </div>
        )
      );
    case 'empty':
      return (
        <EmptyState
          className="col-span-full"
          titleAs="h3"
          title={results.empty.title}
          description={results.empty.text}
        />
      );
    case 'noMatch':
      return (
        <EmptyState
          className="col-span-full"
          titleAs="h3"
          icon={<SearchXIcon />}
          title={results.noMatch.title}
          description={results.noMatch.text}
        >
          <Button variant="outline" onClick={results.noMatch.clear.run}>
            {results.noMatch.clear.label}
          </Button>
        </EmptyState>
      );
    case 'ready':
      return null;
  }
}
