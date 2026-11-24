/** What a press lands on that can take the focus back: a control, a link, or an element with a tabindex. */
const CONTROL = 'button, a[href], input, select, textarea, [role="button"], [tabindex]';

// The control the pointer last pressed, and whether the listener that notes it is registered.
let lastPressed: HTMLElement | null = null;
let listening = false;

function notePress(event: PointerEvent): void {
  const control = event.target instanceof Element ? event.target.closest(CONTROL) : null;
  lastPressed = control instanceof HTMLElement ? control : null;
}

/**
 * Starts noting the control each press lands on, once, when the first AdaptiveDialog mounts, and
 * keeps it: on Safari, macOS and iOS alike, a pressed button does not take the focus, so the
 * focused element alone cannot say what opened the dialog. Importing the layer registers nothing.
 */
export function listenForPresses(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('pointerdown', notePress, { capture: true });
}

/**
 * What opened the dialog, read as it opens, before the dialog moves the focus: the focused element,
 * or, when nothing is (the page itself has it, after a press on Safari), the control last pressed,
 * while it is still in the page.
 */
export function openerNow(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) return active;
  return lastPressed?.isConnected === true ? lastPressed : null;
}
