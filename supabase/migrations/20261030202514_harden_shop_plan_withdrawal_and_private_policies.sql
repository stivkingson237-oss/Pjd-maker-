-- Protect seller-controlled shop records from self-awarding paid tiers or verification.
create or replace function public.guard_shop_plan_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_standard_rate numeric := 8;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.owner_id = auth.uid() then
      select coalesce(sp.commission_rate, 8)
        into v_standard_rate
      from public.seller_plans sp
      where sp.code = 'standard' and sp.active = true
      limit 1;
      new.plan_code := 'standard';
      new.commission_rate := coalesce(v_standard_rate, 8);
      new.certification_status := 'standard';
      new.certified_at := null;
      new.certified_by := null;
    end if;
    return new;
  end if;

  if old.owner_id = auth.uid() then
    if new.owner_id is distinct from old.owner_id
       or new.plan_code is distinct from old.plan_code
       or new.commission_rate is distinct from old.commission_rate
       or new.status is distinct from old.status
       or new.certification_status is distinct from old.certification_status
       or new.certified_at is distinct from old.certified_at
       or new.certified_by is distinct from old.certified_by then
      raise exception 'Les paramètres commerciaux et la certification sont réservés à PJD Market.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_shop_plan_fields on public.shops;
create trigger trg_guard_shop_plan_fields
before insert or update on public.shops
for each row execute function public.guard_shop_plan_fields();

drop policy if exists withdrawal_requests_insert_own on public.withdrawal_requests;
create policy withdrawal_requests_insert_own
on public.withdrawal_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and amount > 0
  and status = 'pending'
  and currency = 'XAF'
  and risk_score = 'faible'
  and decided_at is null
  and decided_by is null
  and exists (
    select 1 from public.shops s
    where s.id::text = store_id
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists subscription_owner_read on public.subscriptions;
create policy subscription_owner_read
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on function public.start_new_seller_trial() from public, anon, authenticated;
revoke all on function public.guard_shop_plan_fields() from public, anon, authenticated;
