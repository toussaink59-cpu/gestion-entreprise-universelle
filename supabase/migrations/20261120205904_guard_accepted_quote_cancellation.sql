-- Protège l'annulation d'un devis accepté lorsqu'un brouillon de facture existe.
-- Le brouillon doit être abandonné avant l'annulation du devis.
-- Le verrouillage du devis sérialise cette opération avec la création
-- d'un brouillon par create_invoice_draft_from_quote().

create or replace function public.cancel_quote(
  p_company_id uuid,
  p_quote_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_quote public.quotes%rowtype;
  v_reason text := btrim(p_reason);
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_company_id is null or p_quote_id is null then
    raise exception 'Entreprise et devis requis' using errcode = '22023';
  end if;

  if not app.has_permission(p_company_id, 'quotes', 'cancel') then
    raise exception 'Permission d''annuler un devis refusée' using errcode = '42501';
  end if;

  if v_reason is null or length(v_reason) not between 3 and 500 then
    raise exception 'Le motif d''annulation doit contenir entre 3 et 500 caractères' using errcode = '22023';
  end if;

  select * into v_quote
  from public.quotes q
  where q.id = p_quote_id and q.company_id = p_company_id
  for update;

  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;

  if v_quote.status not in ('sent', 'accepted') then
    raise exception 'Seul un devis transmis ou accepté peut être annulé' using errcode = '55000';
  end if;

  -- Un devis accepté ne peut pas être annulé tant qu'une facture
  -- brouillon qui lui est rattachée n'a pas été abandonnée.
  if v_quote.status = 'accepted' and exists (
    select 1
    from public.invoices i
    where i.company_id = v_quote.company_id
      and i.source_quote_id = v_quote.id
      and i.status = 'draft'
  ) then
    raise exception 'Le brouillon de facture lié doit être abandonné avant l''annulation du devis'
      using errcode = '55000';
  end if;

  update public.quotes
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_actor,
      cancellation_reason = v_reason,
      updated_by = v_actor,
      updated_at = now()
  where id = v_quote.id and company_id = p_company_id;

  perform app.log_event(
    p_company_id,
    'quotes.cancelled',
    'quotes',
    v_quote.id,
    jsonb_build_object(
      'quote_number', v_quote.quote_number,
      'total_amount', v_quote.total_amount,
      'previous_status', v_quote.status
    )
  );
end;
$$;

revoke all on function public.cancel_quote(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.cancel_quote(uuid, uuid, text)
  to authenticated;