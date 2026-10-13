import type { AdminAmenity } from '@masaha/shared/lookups';
import { render, screen } from '@testing-library/react';
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

  it('has no accessibility violations', async () => {
    const { container } = renderChecklist();
    await screen.findByRole('checkbox', { name: 'Internet' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
