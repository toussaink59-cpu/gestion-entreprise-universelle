-- Phase 1 — conformité à la spécification fonctionnelle Devis et Factures (§5) :
-- un devis accepté peut être annulé pour fermer le solde non facturé, avec la
-- permission quotes:cancel et un motif. Les transitions permises sont désormais
-- sent -> cancelled et accepted -> cancelled ; rejected et cancelled restent terminaux.
--
-- Aucune facture ne peut être émise à ce jour (seuls des brouillons existent hors de
-- cette migration) : il n'y a donc pas de solde déjà facturé à protéger. La future
-- migration d'émission des factures DEVRA ajouter ici le contrôle « aucune facture
-- émise non annulée » avant d'autoriser l'annulation d'un devis facturé en tout ou partie.

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

revoke all on function public.cancel_quote(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_quote(uuid, uuid, text) to authenticated;
