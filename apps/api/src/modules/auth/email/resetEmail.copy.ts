// The words of the reset email, the only email Masaha sends (docs/backend/security.md › Passwords).
// The email is sent by the API, which has no copy catalogue, so its words live here, in both
// languages, held to one shape as the web's catalogues are (docs/frontend/localisation.md). The
// Arabic is the design's (docs/design: Reset email.html). A translation may leave a line unused: the
// English block of the design is shorter.

export interface ResetEmailCopy {
  subject: string;
  /** The inbox's preview line. */
  preview: string;
  brand: string;
  greeting: (name: string) => string;
  request: string;
  instruction: string;
  action: string;
  validity: string;
  footer: string;
}

export const ENGLISH = {
  subject: 'Set a new password — Masaha',
  preview: 'A link to set a new password for your Masaha account, valid for one hour.',
  brand: 'Masaha',
  greeting: (name) => `Hi ${name},`,
  request: 'you asked to set a new password for your Masaha account.',
  instruction: 'Press the button to choose the new password.',
  action: 'Set a new password',
  validity: 'The link is valid for one hour. If you didn’t ask for this, ignore this email.',
  footer: 'Masaha — the directory of coworking spaces in the Gaza Strip',
} satisfies ResetEmailCopy;

export const ARABIC = {
  subject: 'تعيين كلمة مرور جديدة — مساحة',
  preview: 'رابط لتعيين كلمة مرور جديدة لحسابك في مساحة، صالح لمدة ساعة.',
  brand: 'مساحة',
  greeting: (name) => `مرحبًا ${name}،`,
  request: 'طلبت تعيين كلمة مرور جديدة لحسابك في مساحة.',
  instruction: 'اضغط الزر لاختيار كلمة المرور الجديدة.',
  action: 'تعيين كلمة مرور جديدة',
  validity: 'الرابط صالح لمدة ساعة. إذا لم تطلب ذلك فتجاهل هذه الرسالة.',
  footer: 'مساحة — دليل مساحات العمل المشتركة في قطاع غزة',
} satisfies ResetEmailCopy;
