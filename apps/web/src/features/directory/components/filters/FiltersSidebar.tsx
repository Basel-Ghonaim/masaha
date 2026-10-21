import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import type { ReactNode } from 'react';
import type { FiltersView } from '../../types/FiltersView';

/** From 1024 px, the filters beside the results: a named aside holding a card, with «مسح». */
export function FiltersSidebar({
  sidebar,
  children,
}: {
  sidebar: FiltersView['sidebar'];
  children: ReactNode;
}) {
  return (
    <aside id="directory-filters" aria-label={sidebar.title} className="lg:col-span-3">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{sidebar.title}</h2>
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              disabled={sidebar.clear.disabled}
              onClick={sidebar.clear.run}
            >
              {sidebar.clear.label}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </aside>
  );
}
