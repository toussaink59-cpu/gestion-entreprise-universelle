-- Phase 2A — réponse du client et annulation d'un devis transmis.
-- Acceptation : acteur, date, méthode et référence de preuve obligatoires.
-- Aucune facture n'est créée ici : le devis accepté reste un document commercial.
-- L'annulation est limitée aux devis transmis (pas encore acceptés) tant que les factures
-- n'existent pas ; l'annulation d'un devis accepté sera traitée avec le rattachement aux factures.

-- ---------------------------------------------------------------------------
-- Cohérence des états en base
-- ---------------------------------------------------------------------------
alter table public.quotes
  add constraint quotes_acceptance_method_check
  check (
    acceptance_method is null
    or acceptance_method in ('email', 'whatsapp', 'phone', 'signed_document', 'in_person', 'other')
  );

alter table public.quotes
  add constraint quotes_accepted_complete_check
  check (
    status <> 'accepted'
    or (
      accepted_at is not null
      and acceptance_method is not null
      and acceptance_reference is not null
      and length(btrim(acceptance_reference)) between 1 and 200
    )
  );

alter table public.quotes
  add constraint quotes_rejected_complete_check
  check (status <> 'rejected' or rejected_at is not null);

alter table public.quotes
  add constraint quotes_cancelled_complete_check
  check (
    status <> 'cancelled'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
      and length(btrim(cancellation_reason)) between 3 and 500
    )
  );

-- ---------------------------------------------------------------------------
-- Réponse du client : accepté ou refusé
-- ---------------------------------------------------------------------------
create function public.record_quote_response(
  p_company_id uuid,
  p_quote_id uuid,
  p_decision text,
  p_method text default null,
  p_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_quote public.quotes%rowtype;
  v_company public.companies%rowtype;
  v_reference text := nullif(btrim(p_reference), '');
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_company_id is null or p_quote_id is null then
    raise exception 'Entreprise et devis requis' using errcode = '22023';
  end if;

  if p_decision is null or p_decision not in ('accepted', 'rejected') then
    raise exception 'Décision invalide' using errcode = '22023';
  end if;

  if not app.has_permission(p_company_id, 'quotes', 'validate') then
    raise exception 'Permission d''enregistrer la réponse du client refusée' using errcode = '42501';
  end if;

  select * into v_company
  from public.companies c
  where c.id = p_company_id and c.status = 'active';

  if not found then
    raise exception 'Entreprise active introuvable' using errcode = '42501';
  end if;

  select * into v_quote
  from public.quotes q
  where q.id = p_quote_id and q.company_id = p_company_id
  for update;

  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;

  if v_quote.status <> 'sent' then
    raise exception 'Seul un devis transmis peut recevoir une réponse' using errcode = '55000';
  end if;

  if v_reference is not null and length(v_reference) > 200 then
    raise exception 'Référence trop longue' using errcode = '22023';
  end if;

  if p_decision = 'accepted' then
    if p_method is null
       or p_method not in ('email', 'whatsapp', 'phone', 'signed_document', 'in_person', 'other') then
      raise exception 'Méthode d''acceptation invalide' using errcode = '22023';
    end if;

    if v_reference is null then
      raise exception 'Une référence de preuve est obligatoire pour une acceptation' using errcode = '22023';
    end if;

    if v_quote.valid_until < (now() at time zone v_company.timezone)::date then
      raise exception 'Le devis est expiré : il ne peut plus être accepté' using errcode = '22023';
    end if;

    update public.quotes
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = v_actor,
        acceptance_method = p_method,
        acceptance_reference = v_reference,
        updated_by = v_actor,
        updated_at = now()
    where id = v_quote.id and company_id = p_company_id;
  else
    if p_method is not null
       and p_method not in ('email', 'whatsapp', 'phone', 'signed_document', 'in_person', 'other') then
      raise exception 'Méthode invalide' using errcode = '22023';
    end if;

    update public.quotes
    set status = 'rejected',
        rejected_at = now(),
        rejected_by = v_actor,
        acceptance_method = p_method,
        acceptance_reference = v_reference,
        updated_by = v_actor,
        updated_at = now()
    where id = v_quote.id and company_id = p_company_id;
  end if;

  perform app.log_event(
    p_company_id,
    case p_decision when 'accepted' then 'quotes.accepted' else 'quotes.rejected' end,
    'quotes',
    v_quote.id,
    jsonb_build_object(
      'quote_number', v_quote.quote_number,
      'total_amount', v_quote.total_amount,
      'method', p_method
    )
  );
end;
$$;

revoke all on function public.record_quote_response(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_quote_response(uuid, uuid, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Annulation d'un devis transmis (propriétaire et administrateur : quotes:cancel)
-- ---------------------------------------------------------------------------
create function public.cancel_quote(
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

  if v_quote.status <> 'sent' then
    raise exception 'Seul un devis transmis, sans réponse, peut être annulé' using errcode = '55000';
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
      'total_amount', v_quote.total_amount
    )
  );
end;
$$;

revoke all on function public.cancel_quote(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_quote(uuid, uuid, text) to authenticated;
