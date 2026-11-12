import { StatCard } from '@shared/design-system';
import { Link } from 'react-router';
import type { AdminOverviewView } from '../../hooks/admin/useAdminOverview';

type TilesView = Extract<AdminOverviewView, { state: 'ready' }>['tiles'];

/**
 * «ملخص المنصة»: the platform's five figures, each a link to the list it counts, with its helper;
 * two columns from 768 px, three from 1024 px and five from 1280 px (DI7).
 */
export function PlatformTiles({ tiles }: { tiles: TilesView }) {
  return (
    <section aria-label={tiles.label}>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tiles.items.map((tile) => (
          <li key={tile.key} className="flex">
            <Link
              to={tile.href}
              className="flex flex-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <StatCard
                label={tile.label}
                value={tile.value}
                helper={tile.helper}
                className="flex-1 hover:bg-hover"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
