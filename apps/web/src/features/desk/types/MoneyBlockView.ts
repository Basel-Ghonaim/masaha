import type { PAYMENT_METHODS } from '@masaha/shared/payments';

/** How the desk received the money. */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** The money block (K2), worded and ready to render, with the figures the request is built from. */
export type MoneyBlockView = {
  due: { label: string; amount: string };
  received: {
    label: string;
    /** What the field shows: the due while untouched, else what was typed. */
    text: string;
    change: (text: string) => void;
    error: string | undefined;
    /** Says the field was filled with the due (DI-15), for assistive technology. */
    description: string;
  };
  /** Only while something is received. */
  method: {
    label: string;
    value: PaymentMethod;
    options: { value: PaymentMethod; label: string }[];
    choose: (method: PaymentMethod) => void;
  } | null;
  /** One of the four money facts (DI-26), said politely as it changes. */
  line: string;
  /** «لم يدفع شيئًا» ↔ «استلام المبلغ كاملًا» (DI-12), where paying nothing is an outcome. */
  toggle: { label: string; run: () => void } | null;
  /** The amount received as the agorot the request sends, or the text the contract refuses. */
  amount: number | string;
  recorded: number;
  left: number;
  change: number;
  credit: number;
  untouched: boolean;
};
