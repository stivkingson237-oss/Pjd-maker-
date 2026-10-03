-- Récompenses financières du programme Ambassadeur PJD Market.
-- Les montants restent configurables par l'administration et sont à 0 par défaut.

create table if not exists public.ambassador_reward_settings (
  milestone_key text primary key,
  label text not null,
  metric text not null check (metric in ('recruited','published','active')),
  target integer not null check (target > 0),
  reward_amount numeric(14,2) not null default 0 check (reward_amount >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ambassador_reward_settings(milestone_key,label,metric,target,reward_amount,active) values
('recruited_5','5 vendeurs recrutés','recruited',5,0,true),
('recruited_10','10 vendeurs recrutés','recruited',10,0,true),
('recruited_20','20 vendeurs recrutés','recruited',20,0,true),
('published_5','5 vendeurs ayant publié','published',5,0,true),
('active_10','10 vendeurs actifs','active',10,0,true)
on conflict (milestone_key) do nothing;

create table if not exists public.ambassador_rewards (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  milestone_key text not null references public.ambassador_reward_settings(milestone_key),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'credited' check (status in ('credited','reversed')),
  created_at timestamptz not null default now(),
  unique (affiliate_id,milestone_key)
);

alter table public.ambassador_reward_settings enable row level security;
alter table public.ambassador_rewards enable row level security;
revoke all on table public.ambassador_reward_settings from anon, authenticated;
revoke all on table public.ambassador_rewards from anon, authenticated;
grant select on table public.ambassador_reward_settings to authenticated;
create policy ambassador_reward_settings_read on public.ambassador_reward_settings for select to authenticated using (true);

create or replace function public.get_my_ambassador_rewards() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); aid uuid; stats jsonb; out jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select a.id into aid from public.affiliates a where a.user_id=uid limit 1;
 if aid is null then raise exception 'Affiliate profile required'; end if;
 stats:=public.get_my_seller_recruitment_stats();
 select coalesce(jsonb_agg(jsonb_build_object('milestone_key',s.milestone_key,'label',s.label,'metric',s.metric,'target',s.target,'reward_amount',s.reward_amount,'active',s.active,'eligible',s.active and coalesce((stats->>s.metric)::integer,0)>=s.target,'credited',exists(select 1 from public.ambassador_rewards ar where ar.affiliate_id=aid and ar.milestone_key=s.milestone_key and ar.status='credited')) order by s.target,s.milestone_key),'[]'::jsonb) into out from public.ambassador_reward_settings s;
 return out;
end; $$;

create or replace function public.claim_my_ambassador_rewards() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); aid uuid; stats jsonb; s public.ambassador_reward_settings; metric_value integer; inserted_count integer:=0; credited_total numeric:=0;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select a.id into aid from public.affiliates a where a.user_id=uid for update;
 if aid is null then raise exception 'Affiliate profile required'; end if;
 stats:=public.get_my_seller_recruitment_stats();
 for s in select * from public.ambassador_reward_settings where active and reward_amount>0 order by target,milestone_key loop
  metric_value:=coalesce((stats->>s.metric)::integer,0);
  if metric_value>=s.target then
   insert into public.ambassador_rewards(affiliate_id,milestone_key,amount) values(aid,s.milestone_key,s.reward_amount) on conflict (affiliate_id,milestone_key) do nothing;
   if found then
    update public.affiliates set available_commission=coalesce(available_commission,0)+s.reward_amount,total_commission=coalesce(total_commission,0)+s.reward_amount,updated_at=now() where id=aid;
    inserted_count:=inserted_count+1; credited_total:=credited_total+s.reward_amount;
   end if;
  end if;
 end loop;
 return jsonb_build_object('credited_count',inserted_count,'credited_total',credited_total);
end; $$;

revoke all on function public.get_my_ambassador_rewards() from public, anon;
grant execute on function public.get_my_ambassador_rewards() to authenticated;
revoke all on function public.claim_my_ambassador_rewards() from public, anon;
grant execute on function public.claim_my_ambassador_rewards() to authenticated;

create or replace function public.update_ambassador_reward_settings(p_recruited_5 numeric,p_recruited_10 numeric,p_recruited_20 numeric,p_published_5 numeric,p_active_10 numeric) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrateur requis'; end if;
 update public.ambassador_reward_settings set reward_amount=greatest(0,coalesce(p_recruited_5,0)),updated_at=now() where milestone_key='recruited_5';
 update public.ambassador_reward_settings set reward_amount=greatest(0,coalesce(p_recruited_10,0)),updated_at=now() where milestone_key='recruited_10';
 update public.ambassador_reward_settings set reward_amount=greatest(0,coalesce(p_recruited_20,0)),updated_at=now() where milestone_key='recruited_20';
 update public.ambassador_reward_settings set reward_amount=greatest(0,coalesce(p_published_5,0)),updated_at=now() where milestone_key='published_5';
 update public.ambassador_reward_settings set reward_amount=greatest(0,coalesce(p_active_10,0)),updated_at=now() where milestone_key='active_10';
 return (select coalesce(jsonb_agg(to_jsonb(s) order by s.target,s.milestone_key),'[]'::jsonb) from public.ambassador_reward_settings s);
end; $$;
revoke all on function public.update_ambassador_reward_settings(numeric,numeric,numeric,numeric,numeric) from public, anon;
grant execute on function public.update_ambassador_reward_settings(numeric,numeric,numeric,numeric,numeric) to authenticated;
