grant select on public.seller_plans to anon, authenticated;
drop policy if exists seller_plans_active_public_select on public.seller_plans;
create policy seller_plans_active_public_select
on public.seller_plans for select to anon, authenticated
using (active = true);