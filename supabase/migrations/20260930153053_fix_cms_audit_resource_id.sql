create or replace function private.cms_audit_change() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    insert into public.admin_audit_log(actor_id, action, resource_type, resource_id, metadata)
    values (auth.uid(), lower(tg_op), tg_table_name,
      case when tg_table_name = 'site_settings' then null else (to_jsonb(new)->>'id')::uuid end,
      jsonb_build_object('module', 'cms', 'key', to_jsonb(new)->>'id'));
  end if;
  if tg_op = 'UPDATE' then new.updated_at := clock_timestamp(); end if;
  return new;
end; $$;
revoke all on function private.cms_audit_change() from public, anon, authenticated;
