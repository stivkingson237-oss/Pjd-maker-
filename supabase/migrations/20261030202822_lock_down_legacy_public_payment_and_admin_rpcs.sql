-- Remove anonymous execution from internal/privileged RPCs.
revoke all on function public.doge_confirm_payment(text,text) from public, anon, authenticated;
grant execute on function public.doge_confirm_payment(text,text) to service_role;
revoke all on function public.enforce_seller_product_plan_limits() from public, anon, authenticated;
revoke execute on function public.get_pjd_admin_prospects() from anon;
revoke execute on function public.publish_pjd_bot_product(uuid) from anon;
revoke execute on function public.send_pjd_admin_prospect_invite(uuid,text) from anon;

create or replace function public.get_pjd_download_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare caller_role text; result jsonb;
begin
  select u.role into caller_role from public.users u where u.id = auth.uid();
  if coalesce(caller_role, '') <> 'admin' then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'downloads_total',(select count(*) from public.pjd_content_events where event_type='download'),
    'downloads_people',(select count(distinct coalesce(user_id::text,visitor_id)) from public.pjd_content_events where event_type='download'),
    'listens_total',(select count(*) from public.pjd_content_events where event_type='listen'),
    'listens_people',(select count(distinct coalesce(user_id::text,visitor_id)) from public.pjd_content_events where event_type='listen'),
    'products',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'title',p.title,'people',coalesce(e.people,0),
        'downloads',coalesce(e.downloads,0),'listens',coalesce(e.listens,0),
        'stored_downloads',coalesce(p.downloads,0)
      ) order by greatest(coalesce(e.downloads,0),coalesce(p.downloads,0)) desc,p.created_at desc)
      from public.digital_products p
      left join (
        select product_id,
          count(*) filter(where event_type='download') downloads,
          count(distinct coalesce(user_id::text,visitor_id)) filter(where event_type='download') people,
          count(*) filter(where event_type='listen') listens
        from public.pjd_content_events group by product_id
      ) e on e.product_id=p.id
      where p.status is distinct from 'deleted'
    ),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke execute on function public.get_pjd_download_stats() from anon;