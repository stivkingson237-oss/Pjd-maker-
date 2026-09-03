alter table public.shops alter column commission_rate set default 8.00;
update public.shops s set commission_rate=p.commission_rate from public.seller_plans p where p.code=s.plan_code and p.active=true and s.commission_rate is distinct from p.commission_rate;
comment on column public.shops.commission_rate is 'Marketplace commission percentage determined by the seller plan. Current tiers: Standard 8%, Gold 5%, Platinum 3%, Diamond 1.5%.';
