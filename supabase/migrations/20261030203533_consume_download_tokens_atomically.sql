create or replace function public.consume_download_token(p_product_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_product_id is null or p_user_id is null then return null; end if;
  with candidate as (
    select dt.id
    from public.download_tokens dt
    where dt.product_id = p_product_id
      and dt.user_id = p_user_id
      and (dt.expires_at is null or dt.expires_at > now())
      and coalesce(dt.downloads_used, 0) < coalesce(dt.max_downloads, 999999)
    order by dt.created_at desc
    for update skip locked
    limit 1
  )
  update public.download_tokens dt
  set downloads_used = coalesce(dt.downloads_used, 0) + 1
  from candidate c
  where dt.id = c.id
  returning dt.id into v_id;
  return v_id;
end;
$$;
revoke all on function public.consume_download_token(uuid,uuid) from public, anon, authenticated;
grant execute on function public.consume_download_token(uuid,uuid) to service_role;
