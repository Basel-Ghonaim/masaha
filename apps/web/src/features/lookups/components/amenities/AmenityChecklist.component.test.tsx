import type { AdminAmenity } from '@masaha/shared/lookups';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AmenityChecklist } from './AmenityChecklist';

const amenity = (id: number, nameEn: string, nameAr: string, isActive = true): AdminAmenity => ({
  id,
  key: nameEn.toLowerCase(),
  nameAr,
  nameEn,
  icon: 'wifi',
  isActive,
});

const AMENITIES = [amenity(1, 'Internet', 'إنترنت'), amenity(2, 'Generator', 'مولّد', false)];

/** The checklist of a space that has the retired Generator, the amenities answered by `answer`. */
function renderChecklist(answer: () => FakeAnswer = () => ok(AMENITIES), disabled = false) {
  fakeTransport(answer);
  const onValueChange = vi.fn<(ids: number[]) => void>();
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <AmenityChecklist
        source="admin"
        label="The list's amenities"
        value={[2]}
        linked={[2]}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </Wrapper>,
  );
  return { ...rendered, onValueChange };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AmenityChecklist', () => {
  it('is a group named by its label, a checkbox named by each amenity, a retired one marked', async () => {
    renderChecklist();

    expect(await screen.findByRole('checkbox', { name: 'Internet' })).not.toBeChecked();
    expect(screen.getByRole('group', { name: "The list's amenities" })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Generator Inactive' })).toBeChecked();
  });

  it('hands back the amenities as one is ticked', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderChecklist();

    await user.click(await screen.findByRole('checkbox', { name: 'Internet' }));

    expect(onValueChange).toHaveBeenLastCalledWith([2, 1]);
  });

  it('holds its checkboxes while its form is sent', async () => {
    renderChecklist(undefined, true);

    expect(await screen.findByRole('checkbox', { name: 'Internet' })).toBeDisabled();
  });

  it('says it is loading, then that the list could not be loaded, with a way to try again', async () => {
    renderChecklist(() => refused(403, { type: 'forbidden' }));

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(await screen.findByText('We couldn’t load the amenities')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('the owner’s checklist names a retired amenity, marked, and drops it when unticked', async () => {
    fakeTransport(() =>
      ok({
        governorates: [],
        amenities: [{ id: 1, key: 'internet', nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi' }],
      }),
    );
    const onValueChange = vi.fn<(ids: number[]) => void>();
    // The owner's form, holding the value the checklist hands back.
    function OwnerForm() {
      const [value, setValue] = useState([1, 2]);
      return (
        <AmenityChecklist
          source="public"
          label="The list's amenities"
          value={value}
          linked={[1, 2]}
          retired={[{ id: 2, nameAr: 'مولّد', nameEn: 'Generator' }]}
          onValueChange={(ids) => {
            onValueChange(ids);
            setValue(ids);
          }}
          disabled={false}
        />
      );
    }
    const Wrapper = queryWrapper();
    const { container } = render(
      <Wrapper>
        <OwnerForm />
      </Wrapper>,
    );

    const generator = await screen.findByRole('checkbox', {
      name: 'Generator No longer on the platform’s list',
    });
    expect(generator).toBeChecked();
    expect(screen.getAllByRole('checkbox')).toEqual([
      screen.getByRole('checkbox', { name: 'Internet' }),
      generator,
    ]);
    // Named and marked in the list, it needs no count under it.
    expect(container).not.toHaveTextContent(/stays? linked to the space/);

    await userEvent.click(generator);

    expect(onValueChange).toHaveBeenLastCalledWith([1]);
    expect(generator).not.toBeChecked();
    expect(generator).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderChecklist();
    await screen.findByRole('checkbox', { name: 'Internet' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
