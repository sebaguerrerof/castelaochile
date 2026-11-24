-- Preserve existing identity checks after recovering an interrupted create/register operation.
begin;
create or replace function private.demo_remove_data(bid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.demo_batches;r record;removed integer;progress integer;leftover integer;turn integer:=0;targets jsonb;before_users jsonb;before_staff jsonb;
begin
 if not private.care_is_director()then raise exception 'Solo Dirección administra la demostración'using errcode='42501';end if;
 perform pg_advisory_xact_lock(818710121);select * into b from private.demo_batches where id=bid for update;
 if not found then raise exception 'Demo no disponible';end if;
 if b.state='removed'then return jsonb_build_object('state','removed','files','[]'::jsonb,'accounts','[]'::jsonb);end if;
 if b.state<>'removing'then
  perform private.demo_collect(bid);
  -- Collect captures only new marked identities; then compare the protected accounts around deletion.
  before_users:=private.demo_user_fingerprints(bid);
  before_staff:=private.demo_staff_fingerprints(bid);
  select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket,'key',key)),'[]')into targets from(
   select 'patient-library'::text bucket,a.object_key key from public.patient_library_attachments a join private.demo_objects o on o.batch_id=bid and o.relation='public.patient_library_attachments'::regclass and o.row_key=jsonb_build_object('id',a.id)
   union select 'care-informs',e.object_key from private.care_inform_exports e join private.demo_objects o on o.batch_id=bid and o.relation='private.care_inform_exports'::regclass and o.row_key=jsonb_build_object('id',e.id)
  )files;
  update private.demo_batches set files=targets,state='removing'where id=bid;
  loop
   progress:=0;turn:=turn+1;if turn>100 then raise exception 'No fue posible resolver las dependencias de demo';end if;
   for r in select relation,row_key from private.demo_objects where batch_id=bid and relation<>'auth.users'::regclass order by relation,row_key loop
    begin
     execute format('delete from %s x where %s',r.relation,private.demo_key_match(r.relation,'x','$1'))using r.row_key;
     delete from private.demo_objects where batch_id=bid and relation=r.relation and row_key=r.row_key;
     progress:=progress+1;
    exception when foreign_key_violation then null;end;
   end loop;
   select count(*)into leftover from private.demo_objects where batch_id=bid and relation<>'auth.users'::regclass;
   exit when leftover=0;if progress=0 then raise exception 'Hay relaciones fuera de la demo. No se eliminó ningún registro.';end if;
  end loop;
  -- Hash only protected identity fields; volatile sign-in metadata is excluded.
  if before_users is distinct from private.demo_user_fingerprints(bid)or before_staff is distinct from private.demo_staff_fingerprints(bid)then raise exception 'Las cuentas anteriores deben conservarse intactas';end if;
  insert into public.admin_audit_log(actor_id,action,resource_type,resource_id,metadata)values(auth.uid(),'demo.data_removed','demonstration',bid,jsonb_build_object('synthetic',true));
 end if;
 return jsonb_build_object('state','removing','files',(select files from private.demo_batches where id=bid),'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'email',email)),'[]')from private.demo_accounts where batch_id=bid));
end$$;
commit;
