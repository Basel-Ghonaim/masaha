import { useMemo, useRef, type RefObject } from 'react';

/**
 * Each row's menu button, by its person, for the dialogs the page holds: a row is drawn again, or
 * swapped between a card and a table row, while its dialog stays open, so the focus returns to the
 * button the person has when the dialog closes, never to one that is gone.
 */
export function useRowTriggers() {
  const triggers = useRef(new Map<number, HTMLButtonElement>());
  return useMemo(
    () => ({
      /** The ref of the person `id`'s menu button. */
      register: (id: number) => (element: HTMLButtonElement | null) => {
        if (element !== null) triggers.current.set(id, element);
        else triggers.current.delete(id);
      },
      /** A ref that reads the person `id`'s menu button as it is when the dialog reads it. */
      focusOf: (id: number): RefObject<HTMLElement | null> => ({
        get current() {
          return triggers.current.get(id) ?? null;
        },
      }),
    }),
    [],
  );
}
