create or replace function public.guard_shop_plan_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_standard_rate numeric := 8;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.owner_id = auth.uid() then
      select coalesce(sp.commission_rate, 8) into v_standard_rate
      from public.seller_plans sp where sp.code = 'standard' and sp.active = true limit 1;
      new.plan_code := 'standard';
      new.commission_rate := coalesce(v_standard_rate, 8);
      new.certification_status := 'standard';
      new.certified_at := null;
      new.certified_by := null;
    end if;
    return new;
  end if;
  if old.owner_id = auth.uid() and (
    new.owner_id is distinct from old.owner_id or
    new.plan_code is distinct from old.plan_code or
    new.commission_rate is distinct from old.commission_rate or
    new.status is distinct from old.status or
    new.certification_status is distinct from old.certification_status or
    new.certified_at is distinct from old.certified_at or
    new.certified_by is distinct from old.certified_by
  ) then
    raise exception 'Les paramètres commerciaux et la certification sont réservés à PJD Market.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_shop_plan_fields() from public, anon, authenticated;