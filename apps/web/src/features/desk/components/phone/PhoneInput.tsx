import { useCopy } from '@shared/copy';
import { Input, type InputProps } from '@shared/design-system';

/**
 * The desk's phone field: a mobile number, left to right, with its example «+970 59 000 0000»
 * (G13.14), wherever the desk asks one — the check-out's and «تحصيل»'s unpaid part, «تسجيل دين», the
 * subscription sheet, a customer's edit.
 */
export function PhoneInput(props: Omit<InputProps, 'type' | 'dir'>) {
  const copy = useCopy();
  return (
    <Input
      type="tel"
      dir="ltr"
      autoComplete="off"
      placeholder={copy.desk.debt.phonePlaceholder}
      {...props}
    />
  );
}
