-- Ambassadeur vendeur : statistiques privées et agrégées du recrutement.
-- Ne retourne aucune identité de filleul : uniquement des compteurs pour l'ambassadeur connecté.

create or replace function public.get_my_seller_recruitment_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  recruited_count integer := 0;
  published_count integer := 0;
  active_count integer := 0;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  with referred as (
    select distinct r.referred_id
    from public.referrals r
    where r.referrer_id = uid
      and r.referred_id is not null
  ),
  seller_candidates as (
    select ref.referred_id
    from referred ref
    left join public.users u on u.id = ref.referred_id
    left join public.shops s on s.owner_id = ref.referred_id
    where lower(coalesce(u.role,'')) in ('seller','vendeur','admin','les_deux')
       or s.id is not null
  )
  select count(*) into recruited_count from seller_candidates;

  with referred as (
    select distinct r.referred_id
    from public.referrals r
    where r.referrer_id = uid
      and r.referred_id is not null
  ),
  sellers as (
    select distinct ref.referred_id
    from referred ref
    left join public.users u on u.id = ref.referred_id
    left join public.shops s on s.owner_id = ref.referred_id
    where lower(coalesce(u.role,'')) in ('seller','vendeur','admin','les_deux')
       or s.id is not null
  ),
  published_sellers as (
    select distinct p.seller_id as id
    from public.marketplace_products p
    join sellers s on s.referred_id = p.seller_id
    where lower(coalesce(p.status,'')) in ('active','approved','actif','approuvé')
    union
    select distinct p.seller_id as id
    from public.digital_products p
    join sellers s on s.referred_id = p.seller_id
    where lower(coalesce(p.status,'')) in ('active','approved','actif','approuvé')
  )
  select count(*) into published_count from published_sellers;

  with referred as (
    select distinct r.referred_id
    from public.referrals r
    where r.referrer_id = uid
      and r.referred_id is not null
  ),
  sellers as (
    select distinct ref.referred_id
    from referred ref
    left join public.users u on u.id = ref.referred_id
    left join public.shops s on s.owner_id = ref.referred_id
    where (lower(coalesce(u.role,'')) in ('seller','vendeur','admin','les_deux') or s.id is not null)
      and coalesce(u.suspended,false) = false
      and coalesce(lower(s.status),'active') = 'active'
  )
  select count(*) into active_count from sellers;

  return jsonb_build_object(
    'recruited', recruited_count,
    'published', published_count,
    'active', active_count
  );
end;
$$;

revoke all on function public.get_my_seller_recruitment_stats() from public, anon;
grant execute on function public.get_my_seller_recruitment_stats() to authenticated;
