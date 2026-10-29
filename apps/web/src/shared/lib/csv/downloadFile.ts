/**
 * Saves a CSV text as a file named `name` on the viewer's device: a UTF-8 `text/csv` Blob, followed
 * through a link that is never added to the page, its address let go once the save has begun.
 */
export function downloadFile(name: string, text: string): void {
  const address = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = address;
  link.download = name;
  link.click();
  URL.revokeObjectURL(address);
}
