import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Sortable, type SortablePlace, type SortableProps } from '.';
import { DirectionProvider } from '../../../lib/DirectionProvider';
import { Sheet, SheetContent, SheetTitle } from '../../overlays/Sheet';

const NAMES: Record<string, string> = { a: 'واتساب', b: 'هاتف', c: 'بريد' };

const where = ({ name, position, count }: SortablePlace) =>
  `${name}، ${String(position)} من ${String(count)}`;

const WORDS = {
  roleDescription: 'وسيلة قابلة للترتيب',
  instructions: 'اضغط المسافة لرفع الوسيلة، ثم الأسهم لنقلها، ثم المسافة لوضعها',
  lifted: (place: SortablePlace) => `رُفعت ${where(place)}`,
  moved: (place: SortablePlace) => `نُقلت ${where(place)}`,
  dropped: (place: SortablePlace) => `وُضعت ${where(place)}`,
  cancelled: (place: SortablePlace) => `أُعيدت ${where(place)}`,
  held: ({ name }: SortablePlace) => `لا يمكن نقل ${name} الآن`,
};

/** Three contacts in a list, ordered by their handles, the order kept as the caller would. */
function Contacts({
  onMove,
  layout = 'list',
  disabled,
  dir = 'rtl',
}: {
  onMove: SortableProps<string>['onMove'];
  layout?: 'list' | 'grid';
  disabled?: boolean;
  dir?: 'rtl' | 'ltr';
}) {
  const [items, setItems] = useState(['a', 'b', 'c']);
  return (
    <DirectionProvider dir={dir}>
      <Sortable
        items={items}
        layout={layout}
        label="وسائل التواصل"
        words={WORDS}
        nameOf={(id) => NAMES[id] ?? id}
        disabled={disabled}
        onMove={(next, moved) => {
          setItems(next);
          onMove(next, moved);
        }}
        renderItem={(id, { handleProps, lifted }) => (
          <div>
            <span {...handleProps} aria-label={`رتّب ${NAMES[id] ?? id}`}>
              ⋮
            </span>
            <span>{NAMES[id]}</span>
            {lifted ? <span>مرفوعة</span> : null}
          </div>
        )}
      />
    </DirectionProvider>
  );
}

const handle = (name: string) => screen.getByRole('button', { name: `رتّب ${name}` });
const said = () => document.querySelector('[aria-live="assertive"][aria-atomic="true"]');
const shown = () =>
  screen
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace('⋮', '').replace('مرفوعة', ''));

describe('Sortable', () => {
  it('lifts the focused item with Space, saying its place in the caller’s words', async () => {
    const user = userEvent.setup();
    render(<Contacts onMove={vi.fn()} />);

    handle('هاتف').focus();
    await user.keyboard(' ');

    expect(said()).toHaveTextContent('رُفعت هاتف، 2 من 3');
    expect(handle('هاتف')).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves a lifted item down a list, then drops it, calling onMove once with the new order', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Contacts onMove={onMove} />);

    handle('واتساب').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');

    expect(said()).toHaveTextContent('نُقلت واتساب، 2 من 3');
    expect(shown()).toEqual(['هاتف', 'واتساب', 'بريد']);
    expect(handle('واتساب')).toHaveFocus();
    expect(onMove).not.toHaveBeenCalled();

    await user.keyboard(' ');

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(['b', 'a', 'c'], 'a');
    expect(said()).toHaveTextContent('وُضعت واتساب، 2 من 3');
    expect(handle('واتساب')).not.toHaveAttribute('aria-pressed');
  });

  it('puts a lifted item back with Escape, calling nothing, and keeps the Sheet around it open', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <Sheet defaultOpen>
        <SheetContent side="end" aria-describedby={undefined}>
          <SheetTitle>تعديل التواصل</SheetTitle>
          <Contacts onMove={onMove} />
        </SheetContent>
      </Sheet>,
    );

    handle('واتساب').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: 'تعديل التواصل' })).toBeInTheDocument();
    expect(shown()).toEqual(['واتساب', 'هاتف', 'بريد']);
    expect(said()).toHaveTextContent('أُعيدت واتساب، 1 من 3');
    expect(onMove).not.toHaveBeenCalled();
  });

  it('keeps the focus on an item moved up and put back with Escape', async () => {
    const user = userEvent.setup();
    render(<Contacts onMove={vi.fn()} />);

    handle('بريد').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard('{Escape}');

    expect(shown()).toEqual(['واتساب', 'هاتف', 'بريد']);
    expect(handle('بريد')).toHaveFocus();
  });

  it('drops a lifted item when the focus leaves for a field, and leaves the field its focus', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    function WithField() {
      const [note, setNote] = useState('');
      return (
        <>
          <label>
            ملاحظة
            <input
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
          </label>
          <Contacts onMove={onMove} />
        </>
      );
    }
    render(<WithField />);

    handle('واتساب').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    await user.click(screen.getByRole('textbox', { name: 'ملاحظة' }));
    await user.keyboard('ديسكورد');

    expect(screen.getByRole('textbox', { name: 'ملاحظة' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'ملاحظة' })).toHaveValue('ديسكورد');
    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(['b', 'a', 'c'], 'a');
    expect(handle('واتساب')).not.toHaveAttribute('aria-pressed');
  });

  it('leaves Space and Enter to a control inside a handle', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    render(
      <Sortable
        items={['a', 'b']}
        layout="grid"
        label="صور المساحة"
        words={WORDS}
        nameOf={(id) => NAMES[id] ?? id}
        onMove={vi.fn()}
        renderItem={(id, { handleProps }) => (
          <div {...handleProps} aria-label={`رتّب ${NAMES[id] ?? id}`}>
            <button type="button" onClick={remove}>
              حذف {NAMES[id]}
            </button>
          </div>
        )}
      />,
    );

    screen.getByRole('button', { name: 'حذف واتساب' }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(remove).toHaveBeenCalledTimes(2);
    expect(said()).toBeEmptyDOMElement();
    expect(handle('واتساب')).not.toHaveAttribute('aria-pressed');
  });

  it('drops a lifted item where it is when Tab moves on', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Contacts onMove={onMove} />);

    handle('بريد').focus();
    await user.keyboard(' ');
    await user.keyboard('{Home}');
    await user.tab();

    expect(onMove).toHaveBeenCalledWith(['c', 'a', 'b'], 'c');
    expect(said()).toHaveTextContent('وُضعت بريد، 1 من 3');
  });

  it('follows the reading direction in a grid: the left arrow moves forward in Arabic', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Contacts onMove={onMove} layout="grid" />);

    handle('واتساب').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowLeft}');
    await user.keyboard(' ');

    expect(onMove).toHaveBeenCalledWith(['b', 'a', 'c'], 'a');
  });

  it('calls nothing when an item is dropped where it was lifted', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Contacts onMove={onMove} />);

    handle('هاتف').focus();
    await user.keyboard(' ');
    await user.keyboard(' ');

    expect(onMove).not.toHaveBeenCalled();
    expect(said()).toHaveTextContent('وُضعت هاتف، 2 من 3');
  });

  it('lifts nothing while held, and says why', async () => {
    const user = userEvent.setup();
    render(<Contacts onMove={vi.fn()} disabled />);

    handle('هاتف').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');

    expect(said()).toHaveTextContent('لا يمكن نقل هاتف الآن');
    expect(shown()).toEqual(['واتساب', 'هاتف', 'بريد']);
    expect(handle('هاتف')).toHaveAttribute('aria-disabled', 'true');
  });

  it('says only the caller’s words: its handles’ role, their instructions, its list’s name', () => {
    render(<Contacts onMove={vi.fn()} />);

    expect(screen.getByRole('list', { name: 'وسائل التواصل' })).toBeInTheDocument();
    expect(handle('واتساب')).toHaveAttribute('aria-roledescription', 'وسيلة قابلة للترتيب');
    expect(handle('واتساب')).toHaveAccessibleDescription(WORDS.instructions);
    // dnd-kit's own words are English.
    expect(document.body).not.toHaveTextContent(/[A-Za-z]/);
  });

  it('has no axe violations at rest and lifted', async () => {
    const user = userEvent.setup();
    const { container } = render(<Contacts onMove={vi.fn()} />);

    expect(await axe(container)).toHaveNoViolations();

    handle('هاتف').focus();
    await user.keyboard(' ');

    expect(await axe(container)).toHaveNoViolations();
  });
});
