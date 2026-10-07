/**
 * One control of a row, ready to render. `disabled`: it has nothing to do, such as the first row's up
 * arrow. `waiting`: the server is still answering, or asked to wait; the control keeps its place in
 * the focus order and ignores presses until then.
 */
type Control = { label: string; disabled: boolean; waiting: boolean };

/**
 * A row's switch: named after its row (`label`), with its words beside it when it has some. A switch
 * always has something to do, so it is never disabled; it only waits.
 */
export type SwitchControl = Omit<Control, 'disabled'> & {
  checked: boolean;
  /** The words shown after the switch, as an amenity's row shows them. */
  text?: string;
  toggle: (checked: boolean) => void;
};

/**
 * A row's controls, ready to render: its two arrows, its other switches when it has some (an
 * amenity's filter switch), and its shown switch, each named.
 */
export type RowControlsView = {
  shown: SwitchControl;
  switches?: SwitchControl[];
  up: Control & { move: () => void };
  down: Control & { move: () => void };
};
