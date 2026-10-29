/**
 * A link that opens WhatsApp on a chat with `phone`, its message `text` ready to send:
 * `https://wa.me/{the number's digits, without +}?text={the text, encoded}`. The phone is in its
 * stored form (E.164); anything but its digits is left out.
 */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
