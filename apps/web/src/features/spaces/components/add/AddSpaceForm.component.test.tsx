import { createQueryClient } from '@shared/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { AreaField } from '../../types/AreaField';
import { AddSpaceForm } from './AddSpaceForm';

// The page fills the area field from another capability; this one stands in for it, built from the
// design system's Select, which reads its Field as that one does.
const areaField: AreaField = ({ value, onValueChange, disabled, ref }) => (
  <Select
    value={value === null ? '' : String(value)}
    onValueChange={(option) => {
      onValueChange(Number(option));
    }}
    disabled={disabled}
  >
    <SelectTrigger ref={ref}>
      <SelectValue placeholder="Choose" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="11">Al-Rimal</SelectItem>
    </SelectContent>
  </Select>
);

// The isolates a value inserted into a sentence is wrapped in: left to right, and first strong.
const LRI = String.fromCodePoint(0x2066);
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);
// The example's space, which never breaks.
const NBSP = String.fromCharCode(0xa0);

const OPTIONAL = [
  'Name in Arabic',
  'Description in Arabic',
  'Description in English',
  'Address in English',
  'Landmark in Arabic',
  'Landmark in English',
];
const REQUIRED = ['Name in English', 'Address in Arabic', 'Coordinates'];

function renderForm() {
  fakeTransport(() => ok([]));
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AddSpaceForm areaField={areaField} onCreated={vi.fn()} />
    </QueryClientProvider>,
  );
}

/** The Field that holds the control named `label`. */
const fieldOf = (label: string) => screen.getByLabelText(label).closest('[data-slot=field]');

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AddSpaceForm', () => {
  it('holds the basics and the location, each under its heading, and one submit', async () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Area' })).toBeInTheDocument();
    expect(
      await screen.findByRole('application', { name: /^Map of the Gaza Strip/ }),
    ).toBeVisible();
    const submits = screen.getAllByRole('button', { name: 'Add space' });
    expect(submits).toHaveLength(1);
    expect(submits[0]).toBeEnabled();
  });

  it('marks every field that may stay empty "Optional", and no other', () => {
    renderForm();

    for (const label of OPTIONAL) {
      expect(fieldOf(label)).toHaveTextContent('Optional');
    }
    for (const label of REQUIRED) {
      expect(fieldOf(label)).not.toHaveTextContent('Optional');
    }
    expect(
      screen.getByRole('combobox', { name: 'Area' }).closest('[data-slot=field]'),
    ).not.toHaveTextContent('Optional');
  });

  it('writes each text in its own language and direction, the coordinates left to right', () => {
    renderForm();

    expect(screen.getByLabelText('Name in Arabic')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByLabelText('Name in English')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('Description in Arabic')).toHaveAttribute('lang', 'ar');
    expect(screen.getByLabelText('Coordinates')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('Coordinates')).toHaveAccessibleDescription(
      `Latitude, then longitude, as a map copies them: ${LRI}31.52,${NBSP}34.45${PDI}`,
    );
  });

  it('moves the pin to the coordinates typed in their field', async () => {
    renderForm();
    await screen.findByRole('application', { name: /^Map of the Gaza Strip/ });
    expect(screen.queryByRole('button', { name: /^Pin at/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Coordinates'), '31.52, 34.45');

    expect(await screen.findByRole('button', { name: /^Pin at/ })).toHaveAttribute(
      'title',
      `Pin at ${FSI}31.52000, 34.45000${PDI}`,
    );
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderForm();
    await screen.findByRole('application', { name: /^Map of the Gaza Strip/ });

    expect(await axe(container)).toHaveNoViolations();
  });
});
