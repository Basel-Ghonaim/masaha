import { Button, Card, EmptyState, SearchXIcon, UsersIcon } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type EmptyStateSamples = {
  title: string;
  searchCaption: string;
  search: { title: string; description: string; clear: string; add: string };
  firstCaption: string;
  first: { title: string; description: string; add: string };
};

export function EmptyStateSection({ samples }: { samples: EmptyStateSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.searchCaption}>
        <Card className="w-full max-w-120">
          <EmptyState
            icon={<SearchXIcon />}
            title={samples.search.title}
            description={samples.search.description}
            titleAs="h3"
          >
            <Button variant="outline">{samples.search.clear}</Button>
            <Button>{samples.search.add}</Button>
          </EmptyState>
        </Card>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.firstCaption}>
        <Card className="w-full max-w-120">
          <EmptyState
            icon={<UsersIcon />}
            title={samples.first.title}
            description={samples.first.description}
            titleAs="h3"
          >
            <Button>{samples.first.add}</Button>
          </EmptyState>
        </Card>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
