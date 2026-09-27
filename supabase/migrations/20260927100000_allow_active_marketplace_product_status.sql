-- Keep marketplace product status aligned with the public marketplace visibility policy.
-- Seller publication may create a product directly as active.
ALTER TABLE public.marketplace_products DROP CONSTRAINT IF EXISTS marketplace_products_status_check;
ALTER TABLE public.marketplace_products
  ADD CONSTRAINT marketplace_products_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'pending'::text,
    'approved'::text,
    'active'::text,
    'rejected'::text,
    'archived'::text
  ]));