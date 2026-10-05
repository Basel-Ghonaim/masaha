import { useCopy } from '@shared/copy';
import type { DashboardPageName } from './navigation';
import { PageHeader } from './shell/PageHeader';

/**
 * A dashboard page with no screen of its own: its title in the top bar, from its navigation item,
 * and nothing more.
 */
export function PlaceholderPage({ name }: { name: DashboardPageName }) {
  const copy = useCopy();

  return <PageHeader title={copy.dashboard.pages[name]} />;
}
