import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger, type ComboboxProps } from '.';
import { Field } from '../Field';

const AREAS = [
  { value: 'rimal', label: 'Rimal' },
  { value: 'tal-al-hawa', label: 'Tal al-Hawa' },
  { value: 'nuseirat', label: 'Nuseirat camp' },
];

function AreaList() {
  return (
    <ComboboxContent
      searchLabel="Search the areas"
      searchPlaceholder="Type an area"
      listLabel="Areas"
      emptyText="No area matches"
    >
      {AREAS.map((area) => (
        <ComboboxItem key={area.value} value={area.value}>
          {area.label}
        </ComboboxItem>
      ))}
    </ComboboxContent>
  );
}

type AreaFilterProps = (
  | Omit<Extract<ComboboxProps, { type: 'single' }>, 'children'>
  | Omit<Extract<ComboboxProps, { type: 'multiple' }>, 'children'>
) & { summary?: string };

function AreaFilter({ summary = 'Area: all', ...props }: AreaFilterProps) {
  return (
    <Combobox {...props}>
      <ComboboxTrigger>{summary}</ComboboxTrigger>
      <AreaList />
    </Combobox>
  );
}

/** The same list, for a caller that finds its own options: its own search text, and its loading. */
function CallerList({
  search,
  loading,
  options = AREAS,
}: {
  search?: { value: string; onValueChange: (value: string) => void };
  loading?: ReactNode;
  options?: { value: string; label: string }[];
}) {
  return (
    <ComboboxContent
      searchLabel="Search the areas"
      searchPlaceholder="Type an area"
      search={search}
      listLabel="Areas"
      emptyText="No area matches"
      loading={loading}
    >
      {options.map((area) => (
        <ComboboxItem key={area.value} value={area.value}>
          {area.label}
        </ComboboxItem>
      ))}
    </ComboboxContent>
  );
}

describe('Combobox', () => {
  it('is named by its text outside a Field, and by the label inside one; an empty one is marked', () => {
    const { unmount } = render(<AreaFilter type="single" />);

    expect(screen.getByRole('combobox', { name: 'Area: all' })).not.toHaveAttribute('data-empty');
    unmount();

    render(
      <Field label="Space area" error="Choose an area">
        <Combobox type="single">
          <ComboboxTrigger empty>Choose an area</ComboboxTrigger>
          <AreaList />
        </Combobox>
      </Field>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Space area' });

    expect(trigger).toHaveAccessibleDescription('Choose an area');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('data-empty');
  });

  it('opens on a search box and a list named by their props', async () => {
    render(<AreaFilter type="single" />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area: all' }));

    expect(screen.getByRole('combobox', { name: 'Search the areas' })).toHaveFocus();
    expect(screen.getByRole('listbox', { name: 'Areas' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('chooses one value and closes, returning the focus to the trigger', async () => {
    const onValueChange = vi.fn();
    render(<AreaFilter type="single" onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Area: all' });

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: 'Tal al-Hawa' }));

    expect(onValueChange).toHaveBeenCalledWith('tal-al-hawa');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the list open while several values are chosen, and marks them checked', async () => {
    const onValueChange = vi.fn();
    render(<AreaFilter type="multiple" defaultValue={['rimal']} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area: all' }));

    expect(screen.getByRole('option', { name: 'Rimal' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('option', { name: 'Nuseirat camp' }));

    expect(onValueChange).toHaveBeenLastCalledWith(['rimal', 'nuseirat']);
    expect(screen.getByRole('option', { name: 'Nuseirat camp' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await userEvent.click(screen.getByRole('option', { name: 'Rimal' }));

    expect(onValueChange).toHaveBeenLastCalledWith(['nuseirat']);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filters by the text typed, and shows the empty text when nothing matches', async () => {
    render(<AreaFilter type="single" />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area: all' }));
    await userEvent.keyboard('camp');

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Nuseirat camp',
    ]);

    await userEvent.keyboard('zzz');

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No area matches')).toBeInTheDocument();
  });

  it('chooses the highlighted option with the arrow keys and Enter', async () => {
    const onValueChange = vi.fn();
    render(<AreaFilter type="single" onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area: all' }));
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('tal-al-hawa');
  });

  it('closes with Escape and returns the focus to the trigger', async () => {
    render(<AreaFilter type="single" />);
    const trigger = screen.getByRole('combobox', { name: 'Area: all' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('has no accessibility violations, closed or open', async () => {
    render(<AreaFilter type="multiple" defaultValue={['rimal']} />);
    // The list is portalled to <body>, so the whole body is checked. Landmarks belong to a page,
    // not to a component, so that rule is off.
    const options = { rules: { region: { enabled: false } } };

    expect(await axe(document.body, options)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('combobox', { name: 'Area: all' }));

    expect(await axe(document.body, options)).toHaveNoViolations();
  });

  it("with its caller's search, hands each change of the text to the caller and keeps the options it is given", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function CallerSearch() {
      const [text, setText] = useState('');
      return (
        <Combobox type="single">
          <ComboboxTrigger>Area: all</ComboboxTrigger>
          <CallerList
            search={{
              value: text,
              onValueChange: (value) => {
                onValueChange(value);
                setText(value);
              },
            }}
          />
        </Combobox>
      );
    }
    render(<CallerSearch />);

    await user.click(screen.getByRole('combobox', { name: 'Area: all' }));
    const searchBox = screen.getByRole('combobox', { name: 'Search the areas' });
    await user.type(searchBox, 'zzz');

    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(onValueChange).toHaveBeenLastCalledWith('zzz');
    expect(searchBox).toHaveValue('zzz');
    // The caller's search owns the filtering, so its options stand as it gave them.
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Rimal',
      'Tal al-Hawa',
      'Nuseirat camp',
    ]);
  });

  it('shows the loading text in place of the empty text while its options come, with no accessibility violations', async () => {
    const user = userEvent.setup();
    render(
      <Combobox type="single">
        <ComboboxTrigger>Area: all</ComboboxTrigger>
        {/* While the caller's options are on their way there are none: the empty line would be a lie. */}
        <CallerList loading="Searching the areas" options={[]} />
      </Combobox>,
    );

    await user.click(screen.getByRole('combobox', { name: 'Area: all' }));

    expect(screen.getByRole('status')).toHaveTextContent('Searching the areas');
    expect(screen.queryByText('No area matches')).not.toBeInTheDocument();
    // The list is portalled to <body>, so the whole body is checked. Landmarks belong to a page.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
