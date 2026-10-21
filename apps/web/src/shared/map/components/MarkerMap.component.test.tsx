import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import type { MapPoint } from '../types/MapPoint';
import type { MapMarker, MarkerMapProps } from '../types/MarkerMapProps';
import { MarkerMap } from './MarkerMap';

// jsdom lays nothing out, so where a tap lands and how the map pans are proven by hand in the
// browser. What the map names, holds and hands back is proven here, with the real Leaflet.

const BOX = { south: 31.18, north: 31.64, west: 34.17, east: 34.62 };
const LABEL = 'Map of spaces';

const MARKERS: MapMarker[] = [
  {
    id: 1,
    point: { lat: 31.52, lng: 34.45 },
    mark: { shape: 'filled', tone: 'success' },
    label: 'Focus Hub — Available',
    name: { text: 'Focus Hub' },
  },
  {
    id: 2,
    point: { lat: 31.3, lng: 34.3 },
    mark: { shape: 'dashed', tone: 'muted' },
    label: 'Sea Desk — No live status',
    name: { text: 'Sea Desk' },
  },
];

function renderMap(props: Partial<MarkerMapProps> = {}) {
  const onSelect = vi.fn<(id: number) => void>();
  const rendered = render(
    <MarkerMap
      markers={MARKERS}
      selectedId={null}
      onSelect={onSelect}
      bounds={BOX}
      user={null}
      focus={null}
      pick={null}
      onViewChange={null}
      label={LABEL}
      failed="The map didn’t load. Browse the spaces in the list."
      overlay={(map) => (
        <>
          <p>Legend</p>
          <button type="button" onClick={map.focusSelected}>
            Back to the selected mark
          </button>
          <button type="button" onClick={map.focusMap}>
            To the map
          </button>
        </>
      )}
      under={(map) => (
        <button type="button" onClick={map.focusMap}>
          Under the map
        </button>
      )}
      {...props}
    />,
  );
  return { ...rendered, onSelect };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MarkerMap', () => {
  it('names each mark as a button with its label and pressed state, and selects it on a click and on Enter', async () => {
    startPreferences('en');
    const { onSelect } = renderMap({ selectedId: 2 });

    const focus = await screen.findByRole('button', { name: 'Focus Hub — Available' });
    const sea = screen.getByRole('button', { name: 'Sea Desk — No live status' });
    expect(focus).toHaveAttribute('aria-pressed', 'false');
    expect(sea).toHaveAttribute('aria-pressed', 'true');
    expect(focus).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('application', { name: LABEL })).toBeInTheDocument();
    expect(screen.getByText('Legend')).toBeInTheDocument();
    // Drawn under the map, outside it, with the same controls.
    const under = screen.getByRole('button', { name: 'Under the map' });
    expect(screen.getByRole('application', { name: LABEL }).contains(under)).toBe(false);
    fireEvent.click(under);
    expect(screen.getByRole('application', { name: LABEL })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the selected mark' }));
    expect(sea).toHaveFocus();

    fireEvent.click(focus);
    expect(onSelect).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(sea, { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('while picking, the marks leave the tab order and a tap places the point', async () => {
    startPreferences('en');
    const onPick = vi.fn<(point: MapPoint) => void>();
    const { onSelect } = renderMap({
      pick: { onPick, keys: 'The arrow keys move the map under the mark in the centre.' },
    });

    const map = await screen.findByRole('application', { name: LABEL });
    expect(map).toHaveAccessibleDescription(
      'The arrow keys move the map under the mark in the centre.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'To the map' }));
    expect(map).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Focus Hub — Available' })).not.toBeInTheDocument();
    const marks = map.querySelectorAll('.map-mark');
    expect(marks).toHaveLength(2);
    for (const mark of marks) expect(mark).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(marks[0] as Element, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(map);
    expect(onPick).toHaveBeenCalledTimes(1);
    const placed = onPick.mock.calls[0]?.[0];
    expect(typeof placed?.lat).toBe('number');
    expect(typeof placed?.lng).toBe('number');
  });

  it('its line shows when its tiles fail', async () => {
    startPreferences('en');
    const { container } = renderMap();
    await screen.findByRole('application', { name: LABEL });
    let tiles: Element[] = [];
    await waitFor(() => {
      tiles = [...container.querySelectorAll('img.leaflet-tile:not(.leaflet-tile-loaded)')];
      expect(tiles).not.toHaveLength(0);
    });

    for (const tile of tiles) fireEvent.error(tile);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The map didn’t load. Browse the spaces in the list.',
    );
  });
});
