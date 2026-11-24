-- Keep server-only upload completion aligned with the existing active Direction role.
begin;
create or replace function public.library_finish_attachment(aid uuid, ready boolean, actor uuid) returns void language plpgsql security definer set search_path = '' as $$
declare mid uuid;
begin
  perform pg_advisory_xact_lock(81871008);
  select material_id into mid from public.patient_library_attachments where id=aid and state='pending' for update;
  if not found then raise exception 'Carga no disponible'; end if;
  if not exists(select 1 from public.admin_users a left join public.therapeutic_staff_permissions p on p.user_id=a.user_id where a.user_id=actor and a.is_active and (a.role::text='superadmin' or p.manage_content)) then raise exception 'Acceso denegado'; end if;
  if ready and not exists(select 1 from storage.objects o join public.patient_library_attachments a on o.name=a.object_key where a.id=aid and o.bucket_id='patient-library') then raise exception 'Objeto no disponible'; end if;
  if ready then
    update public.patient_library_attachments set state='retired' where id=(select replaces_id from public.patient_library_attachments where id=aid);
  end if;
  update public.patient_library_attachments set state=case when ready then 'ready' else 'failed' end where id=aid;
  update public.patient_library_materials set version=version+1,updated_at=now() where id=mid;
  insert into public.patient_library_audit(actor_id,action,resource_id) values(actor,case when ready then 'library.upload_ready' else 'library.upload_failed' end,aid);
end $$;
revoke all on function public.library_finish_attachment(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.library_finish_attachment(uuid,boolean,uuid) to service_role;
commit;