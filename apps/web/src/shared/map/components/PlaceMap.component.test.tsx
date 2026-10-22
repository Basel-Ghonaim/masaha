import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { startPreferences } from '../../../test/startPreferences';
import { PlaceMap } from './PlaceMap';

// jsdom lays nothing out: what the map shows, names and holds is proven here, with the real Leaflet.

const POINT = { lat: 31.5203, lng: 34.4512 };
const LABEL = 'Noor Hub on the map';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlaceMap', () => {
  it('the place’s pin is a picture named by its label, not a button', async () => {
    startPreferences('en');
    const { container } = render(
      <PlaceMap point={POINT} label={LABEL} failed="The map didn’t load." />,
    );

    const pin = await screen.findByRole('img', { name: LABEL });
    expect(pin).toHaveClass('map-pin');
    expect(pin).not.toHaveAttribute('tabindex');
    expect(pin).not.toHaveClass('leaflet-marker-draggable');
    expect(screen.queryByRole('button', { name: LABEL })).not.toBeInTheDocument();
    expect(pin.closest('[dir]')).toHaveAttribute('dir', 'ltr');
    expect(
      await screen.findByRole('link', { name: '© OpenStreetMap contributors' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector('.leaflet-tile')).not.toBeNull();
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
