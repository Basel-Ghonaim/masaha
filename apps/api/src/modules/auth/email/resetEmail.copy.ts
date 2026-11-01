// The words of the reset email, the only email Masaha sends (docs/backend/security.md › Passwords).
// The email is sent by the API, which has no copy catalogue, so its words live here, in both
// languages, held to one shape as the web's catalogues are (docs/frontend/localisation.md). The
// Arabic is the design's (docs/design: Reset email.html), except the greeting, which names no one. A translation may leave a line unused: the
// English block of the design is shorter.

export interface ResetEmailCopy {
  subject: string;
  /** The inbox's preview line. */
  preview: string;
  brand: string;
  /** No name: the account's name is free text that registration never checked. */
  greeting: string;
  request: string;
  instruction: string;
  action: string;
  /** Under the button, before the link as text: a mail client may strip the button (AC-021). */
  copyLink: string;
  validity: string;
  footer: string;
}

export const ENGLISH = {
  subject: 'Set a new password — Masaha',
  preview: 'A link to set a new password for your Masaha account, valid for one hour.',
  brand: 'Masaha',
  greeting: 'Hi,',
  request: 'you asked to set a new password for your Masaha account.',
  instruction: 'Press the button to choose the new password.',
  action: 'Set a new password',
  copyLink: 'If the button doesn’t work, copy this link:',
  validity: 'The link is valid for one hour. If you didn’t ask for this, ignore this email.',
  footer: 'Masaha — the directory of coworking spaces in the Gaza Strip',
} satisfies ResetEmailCopy;

export const ARABIC = {
  subject: 'تعيين كلمة مرور جديدة — مساحة',
  preview: 'رابط لتعيين كلمة مرور جديدة لحسابك في مساحة، صالح لمدة ساعة.',
  brand: 'مساحة',
  greeting: 'مرحبًا،',
  request: 'طلبت تعيين كلمة مرور جديدة لحسابك في مساحة.',
  instruction: 'اضغط الزر لاختيار كلمة المرور الجديدة.',
  action: 'تعيين كلمة مرور جديدة',
  copyLink: 'إن لم يعمل الزر، انسخ هذا الرابط:',
  validity: 'الرابط صالح لمدة ساعة. إذا لم تطلب ذلك فتجاهل هذه الرسالة.',
  footer: 'مساحة — دليل مساحات العمل المشتركة في قطاع غزة',
} satisfies ResetEmailCopy;
