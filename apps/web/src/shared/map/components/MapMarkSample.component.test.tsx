import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapMarkSample } from './MapMarkSample';

describe('MapMarkSample', () => {
  it('draws a legend’s mark on the light theme, as the map draws it on its light tiles', () => {
    const { container } = render(<MapMarkSample mark={{ shape: 'hollow', tone: 'success' }} />);

    const mark = container.querySelector('.map-mark');
    expect(mark).toHaveClass('map-mark-hollow', 'map-tone-success');
    expect(mark?.querySelector('span')).toHaveAttribute('data-theme', 'light');
  });
});
