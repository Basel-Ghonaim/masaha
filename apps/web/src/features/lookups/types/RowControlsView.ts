/**
 * One control of a row, ready to render. `disabled`: it has nothing to do, such as the first row's up
 * arrow. `waiting`: the server is still answering, or asked to wait; the control keeps its place in
 * the focus order and ignores presses until then.
 */
type Control = { label: string; disabled: boolean; waiting: boolean };

/** A row's controls, ready to render: its shown switch and its two arrows, each named. */
export type RowControlsView = {
  shown: Control & { checked: boolean; toggle: (checked: boolean) => void };
  up: Control & { move: () => void };
  down: Control & { move: () => void };
};
