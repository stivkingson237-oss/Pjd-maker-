-- PJD Maker: normalize legacy French order statuses to the values used by the customer UI.
CREATE OR REPLACE FUNCTION public.normalize_order_status()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  NEW.status := CASE lower(coalesce(NEW.status,''))
    WHEN 'en_attente' THEN 'pending'
    WHEN 'pending' THEN 'pending'
    WHEN 'confirmee' THEN 'confirmed'
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'preparation' THEN 'processing'
    WHEN 'processing' THEN 'processing'
    WHEN 'expedition' THEN 'shipped'
    WHEN 'shipped' THEN 'shipped'
    WHEN 'livree' THEN 'delivered'
    WHEN 'livré' THEN 'delivered'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'terminee' THEN 'delivered'
    WHEN 'annulee' THEN 'cancelled'
    WHEN 'annulé' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'payé' THEN 'paid'
    WHEN 'paye' THEN 'paid'
    WHEN 'paid' THEN 'paid'
    ELSE NEW.status
  END;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_normalize_order_status ON public.orders;
CREATE TRIGGER trg_normalize_order_status BEFORE INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.normalize_order_status();
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','confirmed','processing','shipped','delivered','cancelled'));
