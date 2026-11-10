import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../../lib/cn';
import { useDirection } from '../../../lib/DirectionProvider';
import { sortableStep, type SortableLayout } from '../../../lib/sortableKeys';
import { SORTABLE_TRANSITION, sortableTransition } from '../../../lib/sortableMotion';

/** What a sortable's words are told of an item: its name, and where it stands among how many. */
export type SortablePlace = { name: string; position: number; count: number };

/**
 * Every word a sortable says, given by its caller: the layer holds none of its own. Each step of a
 * move is said in the sortable's live region, by the mouse, a finger or the keyboard alike.
 */
export type SortableWords = {
  /** What a handle is, said in place of its role: «عنصر قابل للترتيب». */
  roleDescription: string;
  /** How to move an item from the keyboard, said with each handle. */
  instructions: string;
  lifted: (place: SortablePlace) => string;
  moved: (place: SortablePlace) => string;
  dropped: (place: SortablePlace) => string;
  cancelled: (place: SortablePlace) => string;
  /** Why a lift is refused while the sortable is held (`disabled`); silent without it. */
  held?: (place: SortablePlace) => string;
};

/** The props of the element an item is dragged by: the whole tile, or a handle inside it. */
export type SortableHandleProps = {
  ref: (node: HTMLElement | null) => void;
  role: 'button';
  tabIndex: 0;
  'aria-roledescription': string;
  'aria-describedby': string;
  /** Set only while the item is lifted or dragged: at rest a handle is no toggle. */
  'aria-pressed'?: true;
  'aria-disabled': boolean;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onMouseDown?: (event: unknown) => void;
  onTouchStart?: (event: unknown) => void;
};

/** An item as it is drawn: its handle's props, and whether it is lifted or being dragged. */
export type SortableItemState = {
  handleProps: SortableHandleProps;
  /** Lifted from the keyboard, moving with the arrows. */
  lifted: boolean;
  /** Dragged by the mouse or a finger. */
  dragging: boolean;
};

export type SortableProps<Id extends UniqueIdentifier> = {
  /** The items' ids, in their order. */
  items: readonly Id[];
  layout: SortableLayout;
  /** The list's accessible name. */
  label: string;
  words: SortableWords;
  /** An item's name, as its words say it. */
  nameOf: (id: Id) => string;
  /** Called once per move, when an item is dropped in a new place, with the new order. */
  onMove: (next: Id[], moved: Id) => void;
  /** Holds every move: nothing lifts, and `held` says why. */
  disabled?: boolean;
  /** The list's layout classes: a grid's columns, its gaps. */
  className?: string;
  renderItem: (id: Id, state: SortableItemState) => ReactNode;
};

// dnd-kit's own announcements are English; the sortable says each step in its own live region, so
// dnd-kit's stays silent.
const SILENT: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

const LIFT_KEYS = new Set([' ', 'Enter']);

/** The keyboard's lift: the item lifted, and the order shown while it moves. */
type Lift<Id> = { id: Id; order: Id[] };

/** Whether two lists hold the same ids, in any order. */
const sameMembers = <Id,>(a: readonly Id[], b: readonly Id[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * A list or a grid its user reorders by dragging: with a mouse (from 6 px of movement, so a click
 * on a button inside an item stays a click), with a finger (after a 250 ms press, so a swipe still
 * scrolls the page) and from the keyboard, with no visible buttons: Space or Enter lifts the
 * focused item, the arrows move it (in a grid left and right follow the reading direction; a list
 * moves up and down), Home and End take it to the ends, Space or Enter drops it, Escape puts it
 * back (an overlay around the list stays open), and Tab, or the focus leaving for another element,
 * drops it where it is. A control inside a handle keeps its own keys. Each step is said in the
 * caller's words. The order shown while an item is lifted is the sortable's own; `onMove` gives the
 * new order once dropped.
 */
export function Sortable<Id extends UniqueIdentifier>({
  items,
  layout,
  label,
  words,
  nameOf,
  onMove,
  disabled = false,
  className,
  renderItem,
}: SortableProps<Id>) {
  const direction = useDirection() === 'rtl' ? 'rtl' : 'ltr';
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const [said, setSaid] = useState('');
  // The keyboard's lift: the item lifted, and the order shown while it moves. Its ref is read by the
  // handlers, which may run twice for one key (a key, then the blur it causes) before a render.
  const [lift, setLiftState] = useState<Lift<Id> | null>(null);
  const liftRef = useRef<Lift<Id> | null>(null);
  const setLift = (next: Lift<Id> | null) => {
    liftRef.current = next;
    setLiftState(next);
  };
  // The handle a keyboard step gives the focus back to, once it has drawn.
  const focusAfterStep = useRef<Id | null>(null);
  const [dragging, setDragging] = useState(false);
  // The place a pointer's drag was last said at: its start counts as one.
  const saidOver = useRef<UniqueIdentifier | null>(null);
  const handles = useRef(new Map<Id, HTMLElement>());

  // A lift whose items changed under it (a photo added, say) is over.
  const lifted = lift !== null && sameMembers(lift.order, items) ? lift : null;
  const order = lifted?.order ?? (items as Id[]);

  const placeOf = (id: Id, within: readonly Id[] = order): SortablePlace => ({
    name: nameOf(id),
    position: within.indexOf(id) + 1,
    count: within.length,
  });

  // A step moves the lifted item's element, which can lose the focus: it is given back, after the
  // sortable's own steps only, never after a render its caller causes.
  useLayoutEffect(() => {
    const id = focusAfterStep.current;
    if (id === null) return;
    focusAfterStep.current = null;
    const handle = handles.current.get(id);
    if (handle && document.activeElement !== handle) handle.focus();
  }, [lift]);

  const register = useCallback((id: Id, node: HTMLElement | null) => {
    if (node) handles.current.set(id, node);
    else handles.current.delete(id);
  }, []);

  const drop = (current: Lift<Id>) => {
    setLift(null);
    setSaid(words.dropped(placeOf(current.id, current.order)));
    const changed = current.order.some((id, index) => id !== items[index]);
    if (changed) onMove(current.order, current.id);
  };

  const cancel = (current: Lift<Id>) => {
    focusAfterStep.current = current.id;
    setLift(null);
    setSaid(words.cancelled(placeOf(current.id, items)));
  };
  // The window's listener below cancels with this render's items and words.
  const latestCancel = useRef(cancel);
  useLayoutEffect(() => {
    latestCancel.current = cancel;
  });

  // Escape puts a lifted item back, and ends a drag (dnd-kit's own listener cancels it). An overlay
  // around the list listens for Escape on the document in the capture phase (Radix's), before any
  // handler of the list: so the sortable listens on the window, earlier still, and prevents the
  // key's default, which keeps the overlay open.
  useEffect(() => {
    if (lift === null && !dragging) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (liftRef.current !== null) latestCancel.current(liftRef.current);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [lift, dragging]);

  const keyDown = (id: Id, event: KeyboardEvent<HTMLElement>) => {
    const current = liftRef.current?.id === id ? liftRef.current : null;
    if (current === null) {
      // A control inside the handle (a delete button on a tile) keeps its own keys.
      if (event.target !== event.currentTarget || !LIFT_KEYS.has(event.key)) return;
      event.preventDefault();
      if (disabled) {
        if (words.held) setSaid(words.held(placeOf(id)));
        return;
      }
      focusAfterStep.current = id;
      setLift({ id, order: [...items] });
      setSaid(words.lifted(placeOf(id, items)));
      return;
    }
    if (event.key === 'Tab') {
      drop(current);
      return;
    }
    if (LIFT_KEYS.has(event.key)) {
      event.preventDefault();
      drop(current);
      return;
    }
    const index = current.order.indexOf(id);
    const next = sortableStep(index, current.order.length, event.key, layout, direction);
    if (next === null) return;
    event.preventDefault();
    if (next === index) return;
    const moved = arrayMove(current.order, index, next);
    focusAfterStep.current = id;
    setLift({ id, order: moved });
    setSaid(words.moved(placeOf(id, moved)));
  };

  // The focus leaving for another element ends a lift, as Tab does: the item stays where it is. A
  // blur with no element to go to is the handle's own move in the page, and keeps the lift.
  const blur = (id: Id, event: FocusEvent<HTMLElement>) => {
    const current = liftRef.current;
    if (current?.id !== id) return;
    if (event.relatedTarget instanceof Element && event.relatedTarget !== event.currentTarget) {
      drop(current);
    }
  };

  // The mouse's and the finger's drag, said in the same words.
  const dragStart = ({ active }: DragStartEvent) => {
    saidOver.current = active.id;
    setDragging(true);
    setSaid(words.lifted(placeOf(active.id as Id, items)));
  };
  const dragOver = ({ active, over }: DragOverEvent) => {
    // dnd-kit's first collision is the item itself, right after the start: its lift is still said.
    if (over === null || over.id === saidOver.current) return;
    saidOver.current = over.id;
    setSaid(
      words.moved({
        name: nameOf(active.id as Id),
        position: items.indexOf(over.id as Id) + 1,
        count: items.length,
      }),
    );
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false);
    const from = items.indexOf(active.id as Id);
    const to = over === null ? from : items.indexOf(over.id as Id);
    const next = arrayMove([...items], from, to);
    setSaid(words.dropped(placeOf(active.id as Id, next)));
    if (from !== to) onMove(next, active.id as Id);
  };
  const dragCancel = ({ active }: { active: { id: UniqueIdentifier } }) => {
    setDragging(false);
    setSaid(words.cancelled(placeOf(active.id as Id, items)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements: SILENT,
        screenReaderInstructions: { draggable: words.instructions },
      }}
      onDragStart={dragStart}
      onDragOver={dragOver}
      onDragEnd={dragEnd}
      onDragCancel={dragCancel}
    >
      <SortableContext
        items={order}
        strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
        disabled={disabled}
      >
        <ul
          aria-label={label}
          className={cn(layout === 'list' ? 'flex flex-col gap-2' : 'grid gap-2', className)}
        >
          {order.map((id) => (
            <SortableItem
              key={id}
              id={id}
              lifted={lifted?.id === id}
              disabled={disabled}
              roleDescription={words.roleDescription}
              register={register}
              onKeyDown={keyDown}
              onBlur={blur}
              renderItem={renderItem}
            />
          ))}
        </ul>
      </SortableContext>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {said}
      </div>
    </DndContext>
  );
}

function SortableItem<Id extends UniqueIdentifier>({
  id,
  lifted,
  disabled,
  roleDescription,
  register,
  onKeyDown,
  onBlur,
  renderItem,
}: {
  id: Id;
  lifted: boolean;
  disabled: boolean;
  roleDescription: string;
  register: (id: Id, node: HTMLElement | null) => void;
  onKeyDown: (id: Id, event: KeyboardEvent<HTMLElement>) => void;
  onBlur: (id: Id, event: FocusEvent<HTMLElement>) => void;
  renderItem: SortableProps<Id>['renderItem'];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    attributes: { roleDescription },
    transition: SORTABLE_TRANSITION,
  });
  const handleRef = useCallback(
    (node: HTMLElement | null) => {
      setActivatorNodeRef(node);
      register(id, node);
    },
    [id, register, setActivatorNodeRef],
  );

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: sortableTransition(transition),
      }}
      className={cn('relative min-w-0', isDragging && 'z-sticky')}
    >
      {renderItem(id, {
        handleProps: {
          ...listeners,
          ref: handleRef,
          role: 'button',
          tabIndex: 0,
          'aria-roledescription': attributes['aria-roledescription'],
          'aria-describedby': attributes['aria-describedby'],
          ...((lifted || isDragging) && { 'aria-pressed': true }),
          'aria-disabled': disabled,
          onKeyDown: (event) => {
            onKeyDown(id, event);
          },
          onBlur: (event) => {
            onBlur(id, event);
          },
        },
        lifted,
        dragging: isDragging,
      })}
    </li>
  );
}
