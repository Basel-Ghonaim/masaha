/** How long the file's address is kept after the click: some browsers begin the save after it. */
const REVOKE_AFTER_MS = 1_000;

/**
 * Saves a CSV text as a file named `name` on the viewer's device: a UTF-8 `text/csv` Blob, followed
 * through a link that is never added to the page, its address let go a moment after the click, once
 * the save has begun (Safari and older Firefox begin it after the click's own tick).
 */
export function downloadFile(name: string, text: string): void {
  const address = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = address;
  link.download = name;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(address);
  }, REVOKE_AFTER_MS);
}
