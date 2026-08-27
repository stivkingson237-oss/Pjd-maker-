-- Public visitors must be able to see published products on the marketplace.
-- Purchase/download actions remain protected in the application and storage policies.

drop policy if exists "Produits approuvés visibles publiquement" on public.digital_products;
create policy "Produits publiés visibles publiquement"
  on public.digital_products
  for select
  to public
  using (status in ('approved', 'active', 'actif', 'approuvé'));

drop policy if exists "marketplace_products_public_read" on public.marketplace_products;
create policy "marketplace_products_public_read"
  on public.marketplace_products
  for select
  to public
  using (status in ('approved', 'active', 'actif', 'approuvé'));
