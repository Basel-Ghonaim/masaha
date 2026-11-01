import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Meter } from '.';

describe('Meter', () => {
  it('is a named meter with its value', () => {
    render(<Meter label="Seats taken" value={27} max={40} valueText="27 of 40" />);

    const meter = screen.getByRole('meter', { name: 'Seats taken' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '40');
    expect(meter).toHaveAttribute('aria-valuenow', '27');
    expect(meter).toHaveAttribute('aria-valuetext', '27 of 40');
  });

  it('as progress is a progressbar', () => {
    render(<Meter kind="progress" label="Uploading the photo" value={30} max={100} />);

    expect(screen.getByRole('progressbar', { name: 'Uploading the photo' })).toHaveAttribute(
      'aria-valuenow',
      '30',
    );
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('keeps its value inside its bounds', () => {
    render(<Meter label="Seats taken" value={45} max={40} />);

    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '40');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Meter label="Seats taken" value={27} max={40} />
        <Meter kind="progress" tone="warning" label="Uploading the photo" value={30} max={100} />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
