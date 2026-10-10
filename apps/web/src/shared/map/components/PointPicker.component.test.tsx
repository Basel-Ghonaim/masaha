import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import type { MapPoint } from '../types/MapPoint';
import { PointPicker } from './PointPicker';

// jsdom lays nothing out, so Leaflet cannot place a click or a drag here: those are proven by hand in
// the browser. What the map shows, names and holds is proven here, with the real Leaflet.

const BOX = { south: 31.18, north: 31.64, west: 34.17, east: 34.62 };
const LABEL = 'Map: click to place the pin';
// The isolates a value inserted into a sentence is wrapped in (shared/localisation's isolate).
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

function renderPicker(value: MapPoint | null) {
  const onChange = vi.fn<(point: MapPoint) => void>();
  const rendered = render(
    <PointPicker value={value} onChange={onChange} bounds={BOX} label={LABEL} />,
  );
  return { ...rendered, onChange };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PointPicker', () => {
  it('loads its map, named by its label, inside a left-to-right box', async () => {
    startPreferences('ar');
    renderPicker(null);

    const map = await screen.findByRole('application', { name: LABEL });
    expect(map.closest('[dir]')).toHaveAttribute('dir', 'ltr');
  });

  it("credits OpenStreetMap's contributors, linked to its copyright page", async () => {
    startPreferences('en');
    renderPicker(null);

    const credit = await screen.findByRole('link', { name: '© OpenStreetMap contributors' });
    expect(credit).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  });

  it('keeps the name OpenStreetMap in the Arabic credit', async () => {
    startPreferences('ar');
    renderPicker(null);

    expect(await screen.findByRole('link', { name: '© مساهمو OpenStreetMap' })).toBeVisible();
  });

  it.each([
    ['en', 'left', 'right', 'Zoom in', 'Zoom out'],
    ['ar', 'right', 'left', 'تكبير', 'تصغير'],
  ] as const)(
    'in %s, puts the zoom at the start, named in the language, and the credit at the end',
    async (language, start, end, zoomIn, zoomOut) => {
      startPreferences(language);
      const { container } = renderPicker(null);

      const zoom = await screen.findByRole('button', { name: zoomIn });
      expect(screen.getByRole('button', { name: zoomOut })).toBeInTheDocument();
      expect(zoom.closest('.leaflet-top')).toHaveClass(`leaflet-${start}`);
      expect(
        container.querySelector('.leaflet-control-attribution')?.closest('.leaflet-bottom'),
      ).toHaveClass(`leaflet-${end}`);
    },
  );

  it('shows no pin until a point is placed', async () => {
    startPreferences('en');
    renderPicker(null);

    await screen.findByRole('application', { name: LABEL });
    expect(screen.queryByRole('button', { name: /^Pin at/ })).not.toBeInTheDocument();
  });

  it('shows the pin at its point, named by its coordinates, and renames it when it moves', async () => {
    startPreferences('en');
    const { rerender, onChange } = renderPicker({ lat: 31.5205, lng: 34.4535 });

    expect(await screen.findByRole('button', { name: /^Pin at/ })).toHaveAttribute(
      'title',
      `Pin at ${FSI}31.52050, 34.45350${PDI}`,
    );

    rerender(
      <PointPicker
        value={{ lat: 31.3, lng: 34.3 }}
        onChange={onChange}
        bounds={BOX}
        label={LABEL}
      />,
    );
    expect(screen.getByRole('button', { name: /^Pin at/ })).toHaveAttribute(
      'title',
      `Pin at ${FSI}31.30000, 34.30000${PDI}`,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  // jsdom gives the map no size, so each of Leaflet's loads asks for one tile: a load is settled by
  // firing that tile's `load` or `error`, and a move of the pin far away pans the map into a new one.

  /** The tiles the map's loads have asked for and that have neither loaded nor failed yet. */
  async function pendingTiles(container: HTMLElement) {
    await screen.findByRole('application', { name: LABEL });
    let tiles: Element[] = [];
    await waitFor(() => {
      tiles = [...container.querySelectorAll('img.leaflet-tile:not(.leaflet-tile-loaded)')];
      expect(tiles).not.toHaveLength(0);
    });
    return tiles;
  }

  it('says the map did not load when its tiles fail', async () => {
    startPreferences('en');
    const { container } = renderPicker(null);

    for (const tile of await pendingTiles(container)) fireEvent.error(tile);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The map didn’t load. Enter the coordinates instead.',
    );
  });

  it('says so too when a later load fails, after an earlier one loaded', async () => {
    startPreferences('en');
    const { container, rerender, onChange } = renderPicker(null);
    for (const tile of await pendingTiles(container)) fireEvent.load(tile);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(
      <PointPicker
        value={{ lat: 31.6, lng: 34.6 }}
        onChange={onChange}
        bounds={BOX}
        label={LABEL}
      />,
    );
    for (const tile of await pendingTiles(container)) fireEvent.error(tile);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The map didn’t load. Enter the coordinates instead.',
    );
  });

  it('says nothing while a load is under way, nor once its tiles have loaded', async () => {
    startPreferences('en');
    const { container } = renderPicker(null);
    const tiles = await pendingTiles(container);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    for (const tile of tiles) fireEvent.load(tile);
    await waitFor(() => {
      expect(container.querySelectorAll('img.leaflet-tile-loaded')).toHaveLength(tiles.length);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
