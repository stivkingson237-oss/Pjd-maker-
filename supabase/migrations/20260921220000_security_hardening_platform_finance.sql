-- PJD Market security hardening applied to production on 2026-09-21.
-- This migration is idempotent and records the live hardening changes.

alter table public.platform_ledger_entries enable row level security;
alter table public.platform_wallets enable row level security;

revoke select on public.admin_financial_summary from anon, authenticated;

revoke execute on function public.admin_mark_withdrawal(uuid,text,text,text) from public, anon;
grant execute on function public.admin_mark_withdrawal(uuid,text,text,text) to authenticated;
revoke execute on function public.admin_process_withdrawal(uuid,text,text) from public, anon;
grant execute on function public.admin_process_withdrawal(uuid,text,text) to authenticated;
revoke execute on function public.admin_request_withdrawal(numeric,text,text,text) from public, anon;
grant execute on function public.admin_request_withdrawal(numeric,text,text,text) to authenticated;
revoke execute on function public.pjd_fulfill_physical_order(uuid) from public, anon, authenticated;
revoke execute on function public.pjd_order_payment_fulfillment_trigger() from public, anon, authenticated;
revoke execute on function public.platform_post_credit(text,numeric,text,uuid,text,boolean) from public, anon, authenticated;
revoke execute on function public.set_withdrawal_store_id() from public, anon, authenticated;
revoke execute on function public.sync_digital_product_pdf_preview() from public, anon, authenticated;
revoke execute on function public.sync_platform_affiliate_reserve() from public, anon, authenticated;
revoke execute on function public.sync_platform_order_finance() from public, anon, authenticated;
revoke execute on function public.sync_platform_subscription_finance() from public, anon, authenticated;
revoke execute on function public.set_seller_order_status(uuid,text) from public, anon;
grant execute on function public.set_seller_order_status(uuid,text) to authenticated;

-- Remove exact duplicate indexes already present in production.
drop index if exists public.idx_marketplace_products_shop;
drop index if exists public.idx_notifications_user_created;
drop index if exists public.idx_order_items_seller;
drop index if exists public.reviews_one_per_buyer_order_product;
drop index if exists public.idx_shop_followers_shop_id;
drop index if exists public.shop_followers_shop_user_uidx;

-- Restrict seller/withdrawal writes to authenticated sessions.
drop policy if exists marketplace_products_owner_write on public.marketplace_products;
create policy marketplace_products_owner_write on public.marketplace_products
  for all to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists withdrawals_insert_own on public.withdrawals;
create policy withdrawals_insert_own on public.withdrawals
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists withdrawals_select_own on public.withdrawals;
create policy withdrawals_select_own on public.withdrawals
  for select to authenticated
  using (auth.uid() = user_id);

-- Restrict wallet transaction history to authenticated owners.
drop policy if exists wallet_transactions_select_own on public.wallet_transactions;
create policy wallet_transactions_select_own on public.wallet_transactions
  for select to authenticated
  using (auth.uid() = user_id);
