import { NavigationType } from 'react-router';

/** Each router's history, by its navigator: whether it still shows the document's first page. */
const histories = new WeakMap<object, { interactionsAtStart: number; left: boolean }>();

/** The person's presses and keys so far: a replace after one is theirs, not a guard's on load. */
let interactions = 0;
if (typeof window !== 'undefined') {
  const note = () => {
    interactions += 1;
  };
  window.addEventListener('pointerdown', note, { capture: true });
  window.addEventListener('keydown', note, { capture: true });
}

/**
 * Whether the page arrived at by `arrival` is still the document's first page, in the history of
 * `navigator`: the page loaded (a pop before any other navigation), or one a guard put in its place
 * before the person did anything (a replace with no press or key since the history began). Any other
 * navigation leaves the first page for good.
 */
export function isFirstPage(navigator: object, arrival: NavigationType): boolean {
  let history = histories.get(navigator);
  if (history === undefined) {
    history = { interactionsAtStart: interactions, left: false };
    histories.set(navigator, history);
  }
  if (history.left) return false;

  const stays =
    arrival === NavigationType.Pop ||
    (arrival === NavigationType.Replace && interactions === history.interactionsAtStart);
  if (!stays) history.left = true;
  return stays;
}
