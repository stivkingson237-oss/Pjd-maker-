-- Normalize physical product status before the marketplace_products CHECK constraint runs.
-- Physical products are published immediately; legacy/unknown incoming values become approved.
create or replace function public.force_physical_product_public()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status is null
     or new.status not in ('approved','active','actif') then
    new.status := 'approved';
  end if;
  return new;
end;
$function$;
