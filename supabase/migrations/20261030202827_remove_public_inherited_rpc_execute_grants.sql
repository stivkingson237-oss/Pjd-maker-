revoke execute on function public.get_pjd_admin_prospects() from public, anon;
grant execute on function public.get_pjd_admin_prospects() to authenticated;
revoke execute on function public.publish_pjd_bot_product(uuid) from public, anon;
grant execute on function public.publish_pjd_bot_product(uuid) to authenticated;
revoke execute on function public.send_pjd_admin_prospect_invite(uuid,text) from public, anon;
grant execute on function public.send_pjd_admin_prospect_invite(uuid,text) to authenticated;
revoke execute on function public.get_pjd_download_stats() from public, anon;
grant execute on function public.get_pjd_download_stats() to authenticated;