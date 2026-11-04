import type { QuoteDiscountType } from "@/lib/security/quote-draft-validation";

export type QuoteActionState = {
  error: string | null;
};

export type QuoteLineFormValue = {
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  discount_type: QuoteDiscountType;
  discount_value: string;
};

export type QuoteDraftInitialValues = {
  quoteId?: string;
  customerId: string;
  issueDate: string;
  validUntil: string;
  subject: string;
  terms: string;
  notes: string;
  lines: QuoteLineFormValue[];
};

export type QuoteCustomerOption = {
  id: string;
  name: string;
  active: boolean;
};
