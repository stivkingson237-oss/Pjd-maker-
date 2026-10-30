-- Orders must be created by the validated SECURITY DEFINER checkout RPC.
-- A buyer must never be able to insert an order directly with a forged paid status or total.
drop policy if exists orders_insert_own on public.orders;
revoke insert on public.orders from anon, authenticated;
