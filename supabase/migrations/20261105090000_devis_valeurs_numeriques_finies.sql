-- Les devis n'acceptent que des montants et quantités finis.
-- PostgreSQL range NaN au-dessus de tous les nombres : 'NaN' passait les contrôles « >= 0 » et
-- « = » existants et produisait des totaux NaN via un appel direct de save_quote_draft.
-- L'interface valide déjà ses saisies ; cette garde protège aussi les appels directs.

alter table public.quotes
  add constraint quotes_amounts_finite_check
  check (
    subtotal_amount < 'Infinity'::numeric
    and discount_amount < 'Infinity'::numeric
    and tax_amount < 'Infinity'::numeric
    and total_amount < 'Infinity'::numeric
  );

alter table public.quote_lines
  add constraint quote_lines_numbers_finite_check
  check (
    quantity < 'Infinity'::numeric
    and unit_price < 'Infinity'::numeric
    and discount_value < 'Infinity'::numeric
    and base_amount < 'Infinity'::numeric
    and discount_amount < 'Infinity'::numeric
    and taxable_amount < 'Infinity'::numeric
    and tax_amount < 'Infinity'::numeric
    and total_amount < 'Infinity'::numeric
  );
