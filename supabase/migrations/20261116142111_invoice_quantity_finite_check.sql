-- NaN can satisfy the existing quantity > 0 check in PostgreSQL.
-- Keep invoice quantities strictly positive and finite.
ALTER TABLE public.invoice_lines
  ADD CONSTRAINT invoice_lines_quantity_finite_check
  CHECK (quantity < 'Infinity'::numeric);
