-- PJD Market: security hardening for financial/RLS surfaces
-- Applied only through Supabase migrations; do not execute from the browser.

-- 1) Never allow client roles to invoke privileged financial RPCs.
revoke execute on function public.credit_affiliate_wallet(uuid,numeric,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.approve_affiliate_commission(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_payment_and_credit_sellers(uuid) from public, anon, authenticated;
revoke execute on function public.settle_marketplace_payment(uuid,text) from public, anon, authenticated;

-- 2) Keep payout requests available only to signed-in users.
revoke execute on function public.request_affiliate_payout(numeric,text,text) from public, anon;
revoke execute on function public.request_seller_withdrawal(numeric,text,text) from public, anon;

-- 3) Prevent direct client writes to financial ledgers and webhook-event storage.
revoke insert, update, delete on public.wallet_transactions from public, anon, authenticated;
revoke insert, update, delete on public.affiliate_commissions from public, anon, authenticated;
revoke insert, update, delete on public.affiliate_payouts from public, anon, authenticated;
revoke insert, update, delete on public.payment_webhook_events from public, anon, authenticated;
revoke insert, update, delete on public.withdrawal_requests from public, anon, authenticated;

-- 4) Webhook events are server-side data: RLS on, with no browser policies.
alter table public.payment_webhook_events enable row level security;

-- 5) Prevent privilege escalation through the application users table.
create or replace function public.prevent_user_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.balance := old.balance;
    new.suspended := old.suspended;
    new.shop_id := old.shop_id;
    new.referred_by := old.referred_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_user_privilege_escalation on public.users;
create trigger trg_prevent_user_privilege_escalation
before update on public.users
for each row execute function public.prevent_user_privilege_escalation();

-- 6) Prevent future accidental auto-exposure of newly-created public functions.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- 7) Prevent future accidental broad table exposure.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;

comment on function public.prevent_user_privilege_escalation() is
  'PJD security: ordinary users cannot alter role, balance, suspension, shop ownership, or referral owner fields.';
