-- User-authorized model: superadmin is centre Direction; professional roles have assigned scope.
begin;
alter type public.admin_role add value if not exists 'psychologist';
alter type public.admin_role add value if not exists 'psychiatrist';
alter type public.admin_role add value if not exists 'recovery_coach';

create function private.care_is_director(uid uuid default auth.uid()) returns boolean
 language sql stable security definer set search_path='' as $$
 select uid is not null and exists(select 1 from public.admin_users where user_id=uid and is_active and role::text='superadmin')
$$;
revoke all on function private.care_is_director(uuid) from public,anon,service_role;
grant execute on function private.care_is_director(uuid) to authenticated;

create function private.care_role_capabilities(role_name text) returns text[] language sql immutable set search_path='' as $$
 select case
 when role_name='superadmin' then array['care.directory.read','care.patient.read','care.records.create','care.records.read','care.alerts.review','care.assignments.manage','care.medical.create','care.family.read','care.decisions.manage','care.reports.export']
 when role_name='psychiatrist' then array['care.directory.read','care.patient.read','care.records.create','care.records.read','care.alerts.review','care.medical.create']
 when role_name in ('psychologist','recovery_coach') then array['care.directory.read','care.patient.read','care.records.create','care.records.read','care.alerts.review']
 else array[]::text[] end
$$;
revoke all on function private.care_role_capabilities(text) from public,anon,authenticated,service_role;

create function private.care_sync_staff_role() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' and new.role::text in ('superadmin','psychologist','psychiatrist','recovery_coach')) or (tg_op='UPDATE' and new.role is distinct from old.role) then
  insert into public.care_staff_capabilities(user_id,capabilities) values(new.user_id,private.care_role_capabilities(new.role::text))
   on conflict(user_id)do update set capabilities=excluded.capabilities;
 end if;
 return new;
end $$;
revoke all on function private.care_sync_staff_role() from public,anon,authenticated,service_role;
create trigger care_staff_role after insert or update of role on public.admin_users for each row execute function private.care_sync_staff_role();
insert into public.care_staff_capabilities(user_id,capabilities)
 select user_id,private.care_role_capabilities(role::text) from public.admin_users where role::text='superadmin'
 on conflict(user_id)do update set capabilities=excluded.capabilities;

create or replace function private.care_can(cap text) returns boolean language sql stable security definer set search_path='' as $$
 select cap=any(private.care_role_capabilities('superadmin')) and (private.care_is_director() or exists(
 select 1 from public.admin_users a join public.care_staff_capabilities c on c.user_id=a.user_id
 where a.user_id=auth.uid() and a.is_active and cap=any(c.capabilities)))
$$;
create or replace function private.care_scope(pid uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_can(cap) and exists(select 1 from public.patient_profiles where id=pid)
 and (private.care_is_director() or exists(select 1 from public.care_assignments where patient_id=pid and professional_id=auth.uid()
 and starts_at<=now() and(ends_at is null or ends_at>now())))
$$;
create function private.care_specialty_allowed(pid uuid,kind text) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_scope(pid,'care.records.create') and (private.care_is_director() or exists(
 select 1 from public.care_assignments x join public.admin_users a on a.user_id=x.professional_id and a.is_active
 where x.patient_id=pid and x.professional_id=auth.uid() and x.specialty=kind and x.starts_at<=now() and(x.ends_at is null or x.ends_at>now())
 and (a.role::text in ('editor','viewer') or a.role::text=case kind when 'psychology' then 'psychologist' when 'psychiatry' then 'psychiatrist' when 'recovery' then 'recovery_coach' end)))
$$;
revoke all on function private.care_specialty_allowed(uuid,text) from public,anon,service_role;
grant execute on function private.care_specialty_allowed(uuid,text) to authenticated;

-- All centre metadata is readable by active Direction. Private tables still have zero direct grants.
do $$declare t record;begin
 for t in select tablename from pg_tables where schemaname='public'and tablename like 'care_%' loop
  execute format('create policy care_director_read on public.%I for select to authenticated using ((select private.care_is_director()))',t.tablename);
 end loop;
end $$;
create or replace function private.library_can(cap text) returns boolean language sql stable security definer set search_path = '' as $$
  select private.care_is_director() and cap in ('access','content','read') or auth.uid() is not null and exists (
    select 1 from public.therapeutic_staff_permissions p join public.admin_users a on a.user_id=p.user_id
    where p.user_id=auth.uid() and a.is_active and case cap
      when 'access' then p.manage_access when 'content' then p.manage_content
      when 'read' then p.read_content or p.manage_content else false end)
$$;

create or replace function private.care_dashboard_scope() returns table(pid uuid) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.care_can('care.directory.read') or not private.care_can('care.patient.read') or not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return query select p.id from public.patient_profiles p where private.care_scope(p.id,'care.patient.read');
end $$;

create or replace function private.care_record_allowed(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_session_records r where r.id=rid and private.care_scope(r.patient_id,'care.patient.read')
   and (private.care_is_director() or (r.author_id=auth.uid() and private.care_scope(r.patient_id,'care.records.create')) or (r.status='final' and private.care_scope(r.patient_id,'care.records.read'))))
$$;

create or replace function private.care_read_note(id uuid,kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n jsonb; pid uuid; author uuid;
begin
  if kind='reserved' then select to_jsonb(r),patient_id,author_id into n,pid,author from private.care_reserved_notes r where r.id=care_read_note.id;
  elsif kind='family' then select to_jsonb(r),patient_id,author_id into n,pid,author from private.care_family_notes r where r.id=care_read_note.id;
  else raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if n is null or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read')
    or (kind='family' and not private.care_scope(pid,'care.family.read'))
    or (not private.care_is_director() and author is distinct from auth.uid() and not exists(select 1 from private.care_note_readers g where g.note_id=care_read_note.id and g.kind=care_read_note.kind and g.user_id=auth.uid()))
    then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.note.read.'||kind,id);
  return n;
end $$;

create or replace function private.care_record_read(rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.care_session_records;d private.care_record_drafts;reserve_allowed boolean;can_write boolean;v jsonb;
begin
 if not private.care_record_allowed(rid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into r from public.care_session_records where id=rid;
 can_write:=r.author_id=auth.uid() and private.care_scope(r.patient_id,'care.records.create') and private.care_specialty_allowed(r.patient_id,r.specialty);
 reserve_allowed:=private.care_is_director() or r.author_id=auth.uid() or exists(select 1 from private.care_record_readers x where x.record_id=rid and x.reader_id=auth.uid());
 if r.author_id=auth.uid() or private.care_is_director() then select * into d from private.care_record_drafts where record_id=rid;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'revision',h.revision,'occurred_at',h.occurred_at,'payload',h.payload,'reason',h.reason,'recorded_at',h.recorded_at,
  'summary',(select jsonb_build_object('body',s.body,'visibility',s.visibility) from public.care_record_summaries s where s.record_id=rid and s.revision=h.revision),
  'reserved_note',case when reserve_allowed then (select n.body from private.care_record_reserves n where n.version_id=h.id) end) order by h.revision desc),'[]'::jsonb)
 into v from private.care_record_versions h where h.record_id=rid;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.record.read',rid);
 return jsonb_build_object('record',to_jsonb(r),'draft',case when d.record_id is not null then to_jsonb(d) end,'versions',v,'can_write',can_write,'can_reserved',reserve_allowed,
  'readers',case when r.author_id=auth.uid() then (select coalesce(jsonb_agg(reader_id),'[]'::jsonb) from private.care_record_readers where record_id=rid) else '[]'::jsonb end);
end $$;

create or replace function private.care_record_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p->>'id')::uuid;pid uuid:=(p->>'patient_id')::uuid;eid uuid:=(p->>'event_id')::uuid;
 r public.care_session_records;e public.care_events;prior private.care_record_operations;
 payload jsonb:=p->'payload';field text;val jsonb;allowed text[];key uuid:=(p->>'operation_key')::uuid;
 happened timestamptz:=(p->>'occurred_at')::timestamptz;kind text:=p->>'specialty';vid uuid;
 summary text:=btrim(coalesce(p->>'summary_body',''));vis text:=p->>'summary_visibility';reserve text:=btrim(coalesce(p->>'reserved_note',''));
 req boolean:=coalesce((p->>'request_intervention')::boolean,false);reqbody text:=btrim(coalesce(p->>'request_body',''));reqdue timestamptz:=nullif(p->>'request_due_at','')::timestamptz;
begin
 if op not in ('draft','finalize','amend') or rid is null or key is null then raise exception 'Operación inválida';end if;
 if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') or not private.care_specialty_allowed(pid,kind)
 then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into e from public.care_events where id=eid;
 if e.id is null or e.professional_id<>auth.uid() or e.status='cancelled' or not exists
  (select 1 from public.care_event_participants a where a.event_id=eid and a.patient_id=pid) then raise exception 'Sesión no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('care.record:'||rid::text,0));
 select * into r from public.care_session_records where id=rid for update;
 if r.id is not null and (r.author_id<>auth.uid() or r.patient_id<>pid or r.event_id<>eid or r.specialty<>kind) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into prior from private.care_record_operations where operation_key=key;
 if prior.operation_key is not null then
  if prior.actor_id=auth.uid() and prior.record_id=rid and prior.op=op and prior.fingerprint=md5(p::text) then return rid;end if;
  raise exception 'Identificador de operación ya utilizado';end if;
 if coalesce(r.version,0) is distinct from (p->>'version')::integer then raise exception 'El registro cambió' using errcode='40001';end if;
 if (op='finalize' and r.status='final') or (op='amend' and coalesce(r.status,'draft')<>'final') then raise exception 'Estado del registro no permite esta operación';end if;
 if happened is null or not isfinite(happened) or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Fecha o campos inválidos';end if;
 allowed:=array['objective','evolution','facts','account','interpretation','difficulties','participation','commitment_note','next_action']||case kind
  when 'psychology' then array['motivation','progress','recommendations']
  when 'recovery' then array['punctuality_observation','responsibilities','autonomy','organisation','initiative','behaviour','activity_type','recovery_participation','participation_reason','support','support_details','progress','evidence','evidence_source','no_commitment_reason','recovery_commitment_id','commitment_title','commitment_due_at','commitment_review_at','commitment_method','commitment_responsible']
  when 'psychiatry' then array['control','adherence_reported','adherence_observed','medical_indications','medical_changes','next_visit','shareable_alert'] else array[]::text[] end;
 for field,val in select * from jsonb_each(payload) loop
  if not field=any(allowed) or jsonb_typeof(val)<>'string' or length(val#>>'{}')>600 then raise exception 'Campo no autorizado o demasiado largo';end if;
 end loop;
 if kind='psychiatry' and (length(coalesce(payload->>'medical_indications',''))>0 or length(coalesce(payload->>'medical_changes',''))>0 or
  exists(select 1 from private.care_record_versions v where v.record_id=rid and (length(coalesce(v.payload->>'medical_indications',''))>0 or length(coalesce(v.payload->>'medical_changes',''))>0)))
  and not private.care_scope(pid,'care.medical.create') then raise exception 'Indicación médica no autorizada' using errcode='42501';end if;
 if kind='psychiatry' and nullif(payload->>'next_visit','') is not null then perform private.care_civil_instant((payload->>'next_visit')::timestamp);end if;
 if length(reserve)>1200 or length(summary)>600 or vis not in ('none','coordination','patient') or vis is null or
  (vis='none' and length(summary)>0) or (vis<>'none' and length(summary)<3) or length(reqbody)>600 or (req and length(reqbody)<3)
  or (reqdue is not null and (not isfinite(reqdue) or reqdue<now())) then raise exception 'Revisa resumen, reserva y solicitud';end if;
 if op<>'draft' then
  if not coalesce((p->>'confirm_finalize')::boolean,false) then raise exception 'Confirma finalizar';end if;
  if happened>now() or e.status<>'completed' or exists(select 1 from public.care_event_participants a where a.event_id=eid and a.patient_id=pid and a.attendance='pending') then raise exception 'Finaliza solo hechos ocurridos, con sesión realizada y asistencia registrada';end if;
  if length(btrim(coalesce(payload->>'objective','')))<3 or coalesce(payload->>'evolution','') not in ('improved','stable','worsened','not_evaluable') then raise exception 'Registra objetivo y evolución sin preselección';end if;
  if vis='patient' and not coalesce((p->>'confirm_publish')::boolean,false) then raise exception 'Confirma compartir resumen';end if;
  if op='amend' and coalesce(length(btrim(p->>'reason')),0) not between 3 and 300 then raise exception 'Motivo de enmienda requerido';end if;
  if req and exists(select 1 from public.care_intervention_requests where record_id=rid) then raise exception 'Ya existe solicitud para este registro; consulta su estado';end if;
 end if;
 if kind='recovery' then perform private.care_rc_validate_activity(rid,pid,eid,payload,op<>'draft');end if;
 if r.id is null then
  insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at) values(rid,pid,eid,auth.uid(),kind,happened) returning * into r;
 else
  update public.care_session_records set version=version+1,updated_at=now(),occurred_at=case when op='draft' and status='final' then occurred_at else happened end where id=rid returning * into r;
 end if;
 if op='draft' then
  insert into private.care_record_drafts(record_id,payload,reserved_note,summary_body,summary_visibility,request_intervention,request_body,request_due_at)
   values(rid,payload,reserve,summary,vis,req,reqbody,reqdue)
   on conflict(record_id) do update set payload=excluded.payload,reserved_note=excluded.reserved_note,summary_body=excluded.summary_body,summary_visibility=excluded.summary_visibility,request_intervention=excluded.request_intervention,request_body=excluded.request_body,request_due_at=excluded.request_due_at,saved_at=now();
 else
  update public.care_session_records set status='final',revision=revision+1,first_finalized_at=coalesce(first_finalized_at,now()),occurred_at=happened where id=rid returning * into r;
  insert into private.care_record_versions(record_id,revision,occurred_at,payload,reason,actor_id)
   values(rid,r.revision,happened,payload,case when op='finalize' then 'Finalización original' else btrim(p->>'reason') end,auth.uid()) returning id into vid;
  insert into private.care_record_reserves(version_id,body) values(vid,reserve);
  if vis<>'none' then insert into public.care_record_summaries(record_id,revision,visibility,body) values(rid,r.revision,vis,summary);end if;
  if req then insert into public.care_intervention_requests(record_id,patient_id,source_revision,requested_by,body,due_at) values(rid,pid,r.revision,auth.uid(),reqbody,reqdue);end if;
  if kind='recovery' then perform private.care_rc_commitment_from_record(rid,payload);end if;
  delete from private.care_record_drafts where record_id=rid;
 end if;
 insert into private.care_record_operations(operation_key,record_id,actor_id,op,fingerprint) values(key,rid,auth.uid(),op,md5(p::text));
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.record.'||op,rid);
 return rid;
end $$;

create or replace function private.care_rc_writer(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_scope(pid,'care.records.create') and (private.care_is_director() or exists(select 1 from public.care_assignments where patient_id=pid and professional_id=auth.uid() and specialty in ('recovery','direction') and starts_at<=now() and (ends_at is null or ends_at>now())))$$;

create or replace function private.care_rc_commitment_review(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid:=(p->>'id')::uuid;c public.care_commitments;k text;outcome text:=p->>'outcome';
begin
 select * into c from public.care_commitments where id=cid for update;
 if c.id is null or c.source_record_id is null or c.status='cancelled' or not private.care_scope(c.patient_id,'care.records.create') or not private.care_scope(c.patient_id,'care.patient.read') or not private.care_rc_writer(c.patient_id) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if c.version is distinct from (p->>'version')::integer then raise exception 'El compromiso cambió' using errcode='40001';end if;
 if outcome is null or outcome not in ('pending','fulfilled','unfulfilled','unverifiable') then raise exception 'Selecciona resultado de revisión';end if;
 foreach k in array array['result','evidence','support','difficulties'] loop
  if coalesce(length(btrim(p->>k)),0) not between 3 and 600 then raise exception 'Registra % o constancia expresa',k;end if;
 end loop;
 if coalesce(length(btrim(p->>'reason')),0) not between 3 and 300 then raise exception 'Motivo requerido';end if;
 update public.care_commitments set version=version+1,status=case when outcome='fulfilled' then 'completed' else 'pending' end,
 completed_at=case when outcome='fulfilled' then coalesce(completed_at,now()) else null end,
 confirmation=case when outcome='fulfilled' then 'professional' when confirmation='self' then 'self' else null end,
 confirmed_by=case when outcome='fulfilled' then auth.uid() when confirmation='self' then confirmed_by else null end
 where id=cid returning * into c;
 insert into private.care_recovery_commitment_reviews(commitment_id,version,outcome,result,evidence,support,difficulties,actor_id,reason)
 values(cid,c.version,outcome,btrim(p->>'result'),btrim(p->>'evidence'),btrim(p->>'support'),btrim(p->>'difficulties'),auth.uid(),btrim(p->>'reason'));
 insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,reason,version)
 values(cid,c.title,c.due_at,c.status,c.visibility,c.confirmation,c.result,auth.uid(),'Revisión Recovery registrada',c.version);
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.recovery.commitment.review',cid);return cid;
end $$;

create or replace function private.care_delegate_eligible(pid uuid,uid uuid,direction boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_is_director(uid) and exists(select 1 from public.patient_profiles where id=pid) or exists(select 1 from public.admin_users u join public.care_staff_capabilities c on c.user_id=u.user_id join public.care_assignments a on a.professional_id=u.user_id
 where u.user_id=uid and u.is_active and a.patient_id=pid and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
 and c.capabilities @> case when direction then array['care.patient.read','care.records.read','care.decisions.manage'] else array['care.patient.read','care.records.create'] end)
$$;

create or replace function private.care_inform_user_allowed(rid uuid,uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_is_director(uid) and exists(select 1 from private.care_informs where id=rid) or uid is not null and exists(select 1 from private.care_informs i join public.admin_users a on a.user_id=uid and a.is_active
 join public.care_staff_capabilities c on c.user_id=uid where i.id=rid
 and c.capabilities @> array['care.directory.read','care.patient.read','care.records.read','care.reports.export']
 and (i.created_by=uid or 'care.decisions.manage'=any(c.capabilities))
 and (not i.include_family or 'care.family.read'=any(c.capabilities))
 and (not i.include_decisions or 'care.decisions.manage'=any(c.capabilities))
 and not exists(select 1 from unnest(i.patients)pid where not exists(select 1 from public.care_assignments x
 where x.patient_id=pid and x.professional_id=uid and x.starts_at<=now() and (x.ends_at is null or x.ends_at>now())))
 and ('care.decisions.manage'=any(c.capabilities) or not exists(
 select 1 from private.care_inform_versions v cross join lateral jsonb_array_elements(v.snapshot->'sources')s
 where v.inform_id=i.id and s->>'metric'='tasks' and not exists(select 1 from private.care_delegated_tasks t
 where t.id=(s->>'source_id')::uuid and t.assignee_id=uid and private.care_delegate_eligible(t.patient_id,uid)))))
$$;

create or replace function private.care_family_read(rid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.care_family_records;writer boolean;versions jsonb;
begin select * into f from public.care_family_records where id=rid;writer:=f.author_id=auth.uid() and private.care_scope(f.patient_id,'care.records.create');
 if f.id is null or not private.care_scope(f.patient_id,'care.records.read') or not private.care_scope(f.patient_id,'care.patient.read') or not private.care_scope(f.patient_id,'care.family.read') or not(private.care_is_director() or writer or f.status='final' and private.care_scope(f.patient_id,'care.records.read'))then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('reserved_note',case when private.care_is_director() or writer or exists(select 1 from private.care_note_readers g where g.note_id=v.reserved_note_id and g.kind='family' and g.user_id=auth.uid())then (select n.body from private.care_family_notes n where n.id=v.reserved_note_id)end)order by v.revision desc),'[]'::jsonb)into versions from private.care_family_versions v where v.record_id=rid;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.family.read',rid);
 return jsonb_build_object('record',to_jsonb(f),'can_write',writer,'draft',case when writer or private.care_is_director() then (select to_jsonb(d)from private.care_family_drafts d where d.record_id=rid)end,'versions',versions,'eligible_readers',case when writer then coalesce((select jsonb_agg(distinct ca.professional_id)from public.care_assignments ca join public.admin_users u on u.user_id=ca.professional_id and u.is_active join public.care_staff_capabilities c on c.user_id=u.user_id where ca.patient_id=f.patient_id and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()) and c.capabilities @> array['care.patient.read','care.records.read','care.family.read']),'[]'::jsonb)else '[]'::jsonb end,'readers',case when writer then coalesce((select jsonb_agg(jsonb_build_object('note_id',g.note_id,'user_id',g.user_id))from private.care_note_readers g join private.care_family_versions v on v.reserved_note_id=g.note_id where v.record_id=rid and g.kind='family'),'[]'::jsonb)else '[]'::jsonb end,'agreements',coalesce((select jsonb_agg(to_jsonb(ag)||jsonb_build_object('history',(select jsonb_agg(to_jsonb(h)order by h.id desc)from private.care_family_agreement_history h where h.agreement_id=ag.id))order by ag.due_at,ag.id)from private.care_family_agreements ag where ag.record_id=rid),'[]'::jsonb));end $$;

create or replace function private.care_family_list(pid uuid,period text default '30',page integer default 1)returns jsonb language plpgsql security definer set search_path='' as $$
declare start_at timestamptz;result jsonb;total bigint;expected bigint;performed bigint;finalized bigint;source_rows jsonb;due bigint;completed bigint;events jsonb;
begin if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.records.read') or page is null or page<1 or page>10000 then raise exception 'Recurso no disponible' using errcode='42501';end if;start_at:=private.care_recovery_start(pid,period);
 with rows as materialized(select r.* from public.care_family_records r where r.patient_id=pid and (private.care_is_director() or r.status='final' or r.author_id=auth.uid() and private.care_scope(pid,'care.records.create')) and r.occurred_at>=start_at and r.occurred_at<=now()),paged as(select * from rows order by occurred_at desc,id offset(page-1)*25 limit 25)select(select count(*)from rows),coalesce((select jsonb_agg(to_jsonb(paged))from paged),'[]'::jsonb)into total,result;
 select count(*),count(*)filter(where e.status='completed' and e.closed_at<=now()),count(*)filter(where e.status='completed' and e.closed_at<=now() and exists(select 1 from public.care_family_records r where r.patient_id=pid and r.event_id=e.id and r.status='final'))into expected,performed,finalized from public.care_events e join public.care_event_participants t on t.event_id=e.id and t.patient_id=pid where e.kind='family' and e.status<>'cancelled' and e.ends_at<=now() and e.starts_at>=start_at and e.starts_at<now();
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)into source_rows from(select e.id,e.title,e.starts_at,e.status from public.care_events e join public.care_event_participants t on t.event_id=e.id and t.patient_id=pid where e.kind='family' and e.status<>'cancelled' and e.ends_at<=now() and e.starts_at>=start_at and e.starts_at<now() order by e.starts_at desc,e.id offset(page-1)*25 limit 25)x;
 select count(*),count(*)filter(where ag.state='completed')into due,completed from private.care_family_agreements ag where ag.patient_id=pid and ag.state<>'cancelled' and ag.due_at>=start_at and ag.due_at<now();
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'starts_at',x.starts_at)),'[]'::jsonb)into events from(select e.* from public.care_events e join public.care_event_participants t on t.event_id=e.id and t.patient_id=pid where e.kind='family' and e.professional_id=auth.uid() and e.status='completed' and e.ends_at<=now() order by e.starts_at desc limit 25)x;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.family.list',pid);
 return jsonb_build_object('start_at',start_at,'cutoff',now(),'total',total,'rows',result,'sessions',jsonb_build_object('expected',expected,'performed',performed,'finalized',finalized),'agreements',jsonb_build_object('due',due,'completed',completed),'events',events,'sources',source_rows);end $$;

create or replace function private.care_autonomy_list(pid uuid,period text default '30',page integer default 1)returns jsonb language plpgsql security definer set search_path='' as $$
declare start_at timestamptz;result jsonb;series jsonb;total bigint;
begin if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read') or page is null or page<1 or page>10000 then raise exception 'Recurso no disponible' using errcode='42501';end if;start_at:=private.care_recovery_start(pid,period);
 with rows as materialized(select a.* from public.care_autonomy_observations a where a.patient_id=pid and (private.care_is_director() or a.status='final' or a.author_id=auth.uid() and private.care_scope(pid,'care.records.create')) and a.occurred_at>=start_at and a.occurred_at<=now()),paged as(select * from rows order by occurred_at desc,id offset(page-1)*25 limit 25)select(select count(*)from rows),coalesce((select jsonb_agg(to_jsonb(paged))from paged),'[]'::jsonb)into total,result;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'dimension',a.dimension,'rubric_id',a.rubric_id,'author_id',a.author_id,'occurred_at',v.occurred_at,'revision',v.revision,'status',v.payload->>'status','level',v.payload->>'level')order by v.occurred_at,a.id),'[]'::jsonb)into series from public.care_autonomy_observations a join lateral(select v.* from private.care_autonomy_versions v where v.observation_id=a.id order by v.revision desc limit 1)v on true where a.patient_id=pid and a.status='final' and v.occurred_at>=start_at and v.occurred_at<=now();
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.autonomy.list',pid);
 return jsonb_build_object('start_at',start_at,'cutoff',now(),'total',total,'rows',result,'series',series);end $$;

create or replace function private.care_autonomy_read(oid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.care_autonomy_observations;writer boolean;
begin select * into a from public.care_autonomy_observations where id=oid;writer:=a.author_id=auth.uid() and private.care_scope(a.patient_id,'care.records.create') and exists(select 1 from public.care_assignments ca where ca.patient_id=a.patient_id and ca.professional_id=auth.uid() and ca.specialty='recovery' and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()));
 if a.id is null or not private.care_scope(a.patient_id,'care.patient.read') or not(private.care_is_director() or writer or a.status='final' and private.care_scope(a.patient_id,'care.records.read'))then raise exception 'Recurso no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.autonomy.read',oid);
 return jsonb_build_object('observation',to_jsonb(a),'can_write',writer,'rubric',(select to_jsonb(r)from public.care_recovery_rubrics r where r.id=a.rubric_id),'draft',case when writer or private.care_is_director() then (select to_jsonb(d) from private.care_autonomy_drafts d where observation_id=oid)end,'versions',coalesce((select jsonb_agg(to_jsonb(v)order by v.revision desc)from private.care_autonomy_versions v where v.observation_id=oid),'[]'::jsonb));end $$;

create or replace function private.care_rc_week_read(wid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.care_recovery_weeks;begin select * into w from public.care_recovery_weeks where id=wid;
 if w.id is null or not private.care_scope(w.patient_id,'care.records.read') or w.status='draft' and w.author_id<>auth.uid() and not private.care_is_director() then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return jsonb_build_object('week',to_jsonb(w),'can_write',w.author_id=auth.uid() and private.care_rc_writer(w.patient_id),'draft',case when w.author_id=auth.uid() or private.care_is_director() then (select to_jsonb(d) from private.care_recovery_week_drafts d where week_id=wid)end,'versions',(select coalesce(jsonb_agg(to_jsonb(v) order by revision desc),'[]'::jsonb)from private.care_recovery_week_versions v where week_id=wid),'levels_allowed',private.care_rc_levels(w.patient_id,w.rubric_id,w.week_start));
end $$;

create or replace function private.care_recovery_legacy_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p->>'id')::uuid;pid uuid;src uuid;happened timestamptz;expected integer:=(p->>'version')::integer;final boolean;payload jsonb:=p->'payload';a public.care_autonomy_observations;f public.care_family_records;rub public.care_recovery_rubrics;rec public.care_session_records;ev public.care_events;ag private.care_family_agreements;dim jsonb;item jsonb;level jsonb;reserve uuid;ref text;reader uuid;note uuid;family uuid;
begin
 if auth.uid() is null or rid is null or expected is null or p is null then raise exception 'Recurso no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('recovery-family:'||rid::text,0));
 if op in ('rubric_save','rubric_approve','rubric_retire') then
  if not private.care_can('care.decisions.manage') or not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('rubric:'||coalesce(p->>'family_id',rid::text),0));select * into rub from public.care_recovery_rubrics where id=rid for update;
  if rub.id is not null and rub.revision<>expected then raise exception 'El registro cambió' using errcode='40001';end if;
  if op='rubric_save' then
   if rub.id is not null and rub.state<>'draft' then raise exception 'Una rúbrica aprobada es inmutable';end if;
   if jsonb_typeof(p->'dimensions') is distinct from 'array' or jsonb_array_length(p->'dimensions') not between 1 and 8 or length(btrim(coalesce(p->>'name',''))) not between 3 and 100 then raise exception 'Define nombre y dimensiones';end if;
   if (select count(distinct d->>'key') from jsonb_array_elements(p->'dimensions')d)<>jsonb_array_length(p->'dimensions') then raise exception 'Dimensiones repetidas';end if;
   for dim in select * from jsonb_array_elements(p->'dimensions') loop
    if jsonb_typeof(dim) is distinct from 'object' or exists(select 1 from jsonb_object_keys(dim)k where k not in ('key','levels')) or coalesce(dim->>'key','') not in ('organisation','schedule','obligations','independence','initiative','coherence','family_support','habits') or jsonb_typeof(dim->'levels') is distinct from 'array' or jsonb_array_length(dim->'levels') not between 2 and 6 then raise exception 'Dimensión o niveles inválidos';end if;
    if (select count(distinct l->>'label') from jsonb_array_elements(dim->'levels')l)<>jsonb_array_length(dim->'levels') or (select count(distinct l->>'key') from jsonb_array_elements(dim->'levels')l)<>jsonb_array_length(dim->'levels') then raise exception 'Niveles repetidos';end if;
    for level in select * from jsonb_array_elements(dim->'levels') loop
     if jsonb_typeof(level) is distinct from 'object' or exists(select 1 from jsonb_object_keys(level)k where k not in ('key','label')) or jsonb_typeof(level->'label') is distinct from 'string' or length(btrim(coalesce(level->>'label',''))) not between 2 and 80 or coalesce(level->>'key','') !~ '^[a-z0-9_]{1,30}$' then raise exception 'Nivel inválido';end if;
    end loop;
   end loop;
   if rub.id is null then
    if expected<>0 then raise exception 'Versión inválida' using errcode='40001';end if;
    family:=coalesce(nullif(p->>'family_id','')::uuid,rid);
    if family<>rid and not exists(select 1 from public.care_recovery_rubrics r where r.family_id=family) then raise exception 'Familia de rúbrica no disponible';end if;
    insert into public.care_recovery_rubrics(id,family_id,version,name,dimensions,ordered,created_by) values(rid,family,coalesce((select max(r.version)+1 from public.care_recovery_rubrics r where r.family_id=family),1),btrim(p->>'name'),p->'dimensions',coalesce((p->>'ordered')::boolean,false),auth.uid());
   else update public.care_recovery_rubrics set name=btrim(p->>'name'),dimensions=p->'dimensions',ordered=coalesce((p->>'ordered')::boolean,false),revision=revision+1 where id=rid;end if;
  elsif op='rubric_approve' then
   if rub.state is distinct from 'draft' or not coalesce((p->>'confirm_approval')::boolean,false) or length(btrim(coalesce(p->>'approval_reference',''))) not between 3 and 300 then raise exception 'Acredita aprobación del equipo y referencia';end if;
   update public.care_recovery_rubrics set state='approved',approved_by=auth.uid(),approved_at=now(),approval_reference=btrim(p->>'approval_reference'),revision=revision+1 where id=rid;
  else
   if rub.state is distinct from 'approved' or length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Indica motivo de retiro';end if;
   update public.care_recovery_rubrics set state='retired',revision=revision+1 where id=rid;
  end if;
  insert into private.care_rubric_history(rubric_id,snapshot,actor_id,reason)select rid,to_jsonb(r),auth.uid(),coalesce(nullif(btrim(p->>'reason'),''),op) from public.care_recovery_rubrics r where id=rid;
 elsif op in ('autonomy_draft','autonomy_final','autonomy_amend') then
  select * into a from public.care_autonomy_observations where id=rid for update;
  src:=coalesce(a.record_id,(p->>'record_id')::uuid);select * into rec from public.care_session_records where id=src for share;pid:=rec.patient_id;
  if not private.care_specialty_allowed(pid,'recovery') or rec.id is null or rec.specialty<>'recovery' or rec.status<>'final' or rec.author_id<>auth.uid() or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if a.id is not null and (a.author_id<>auth.uid() or a.version<>expected) then raise exception 'El registro cambió' using errcode='40001';end if;
  if a.id is null and expected<>0 then raise exception 'Versión inválida' using errcode='40001';end if;
  select * into rub from public.care_recovery_rubrics where id=case when a.id is not null then a.rubric_id else nullif(p->>'rubric_id','')::uuid end for share;
  if a.id is null and nullif(p->>'rubric_id','') is not null and (rub.state is distinct from 'approved' or exists(select 1 from public.care_recovery_rubrics newer where newer.family_id=rub.family_id and newer.state<>'draft' and newer.version>rub.version)) then raise exception 'Selecciona una versión vigente y aprobada';end if;
  ref:=coalesce(a.dimension,p->>'dimension');
  if ref is null or ref not in ('organisation','schedule','obligations','independence','initiative','coherence','family_support','habits') then raise exception 'Selecciona dimensión';end if;
  if rub.id is not null and not exists(select 1 from jsonb_array_elements(rub.dimensions)d where d->>'key'=ref) then raise exception 'Dimensión ajena a la rúbrica';end if;
  happened:=(p->>'occurred_at')::timestamptz;final:=op<>'autonomy_draft';
  if happened is null or not isfinite(happened) or happened>now() or jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload)k where k not in ('status','level','evidence')) or exists(select 1 from jsonb_each(payload)j where jsonb_typeof(j.value)<>'string') or length(coalesce(payload->>'evidence',''))>600 then raise exception 'Observación inválida';end if;
  if coalesce(payload->>'status','') not in ('','evaluated','not_evaluable') then raise exception 'Estado inválido';end if;
  if final and (payload->>'status' not in ('evaluated','not_evaluable') or nullif(payload->>'status','') is null or length(btrim(coalesce(payload->>'evidence','')))<3 or not coalesce((p->>'confirm_final')::boolean,false)) then raise exception 'Confirma evaluación o no evaluable y evidencia';end if;
  if nullif(payload->>'level','') is not null and (rub.id is null or payload->>'status'<>'evaluated' or not exists(select 1 from jsonb_array_elements(rub.dimensions)d cross join jsonb_array_elements(d->'levels')l where d->>'key'=ref and l->>'key'=payload->>'level')) then raise exception 'Nivel no autorizado';end if;
  if final and rub.id is not null and payload->>'status'='evaluated' and nullif(payload->>'level','') is null then raise exception 'Selecciona nivel aprobado';end if;
  if (op='autonomy_amend') is distinct from (coalesce(a.status,'draft')='final') and final then raise exception 'Usa enmienda para preservar original';end if;
  if op='autonomy_amend' and length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Motivo de enmienda requerido';end if;
  if a.id is null then insert into public.care_autonomy_observations(id,patient_id,record_id,source_revision,dimension,rubric_id,author_id,occurred_at)values(rid,pid,src,rec.revision,ref,rub.id,auth.uid(),happened);else update public.care_autonomy_observations set version=version+1 where id=rid;end if;
  if final then
   update public.care_autonomy_observations set status='final',occurred_at=happened,revision=revision+1,first_finalized_at=coalesce(first_finalized_at,now()) where id=rid returning * into a;
   insert into private.care_autonomy_versions(observation_id,revision,occurred_at,payload,reason,actor_id)values(rid,a.revision,happened,payload,case when op='autonomy_amend' then btrim(p->>'reason') else 'Finalización original' end,auth.uid());delete from private.care_autonomy_drafts where observation_id=rid;
  else insert into private.care_autonomy_drafts(observation_id,payload,occurred_at)values(rid,payload,happened)on conflict(observation_id)do update set payload=excluded.payload,occurred_at=excluded.occurred_at,saved_at=now();end if;
 elsif op in ('family_draft','family_final','family_amend') then
  select * into f from public.care_family_records where id=rid for update;src:=coalesce(f.event_id,(p->>'event_id')::uuid);pid:=coalesce(f.patient_id,(p->>'patient_id')::uuid);select * into ev from public.care_events where id=src for share;
  if ev.id is null or ev.kind<>'family' or ev.professional_id<>auth.uid() or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.records.create') or not exists(select 1 from public.care_event_participants t where t.event_id=src and t.patient_id=pid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if f.id is not null and (f.author_id<>auth.uid() or f.version<>expected) then raise exception 'El registro cambió' using errcode='40001';end if;
  if f.id is null and expected<>0 then raise exception 'Versión inválida' using errcode='40001';end if;
  happened:=(p->>'occurred_at')::timestamptz;final:=op<>'family_draft';
  if happened is null or not isfinite(happened) or happened>now() or jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload)k where k not in ('objective','participants','source','communication','limits','responsibilities','support','progress','observations')) or length(coalesce(p->>'reserved_note',''))>2000 then raise exception 'Registro inválido';end if;
  for ref,item in select * from jsonb_each(payload) loop if ref<>'participants' and (jsonb_typeof(item)<>'string' or length(item#>>'{}')>600) then raise exception 'Campo inválido';end if;end loop;
  if jsonb_typeof(payload->'participants') is distinct from 'array' or jsonb_array_length(payload->'participants')>6 then raise exception 'Participantes inválidos';end if;
  for item in select * from jsonb_array_elements(payload->'participants') loop if jsonb_typeof(item)<>'object' or length(btrim(coalesce(item->>'label',''))) not between 2 and 60 or length(btrim(coalesce(item->>'relationship',''))) not between 2 and 50 or exists(select 1 from jsonb_object_keys(item)k where k not in ('label','relationship')) then raise exception 'Usa identificación mínima y vínculo';end if;end loop;
  if final and (length(btrim(coalesce(payload->>'objective','')))<3 or jsonb_array_length(payload->'participants')<1 or coalesce(payload->>'source','') not in ('observed','family_report','patient_report') or not coalesce((p->>'confirm_final')::boolean,false) or ev.status<>'completed' or ev.ends_at>now() or not exists(select 1 from public.care_event_participants t where t.event_id=src and t.patient_id=pid and t.attendance<>'pending')) then raise exception 'Confirma fuente, objetivo, participantes y actividad realizada';end if;
  if final and (op='family_amend') is distinct from (coalesce(f.status,'draft')='final') then raise exception 'Usa enmienda para preservar original';end if;
  if op='family_amend' and length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Motivo de enmienda requerido';end if;
  if f.id is null then insert into public.care_family_records(id,patient_id,event_id,author_id,occurred_at)values(rid,pid,src,auth.uid(),happened);else update public.care_family_records set version=version+1 where id=rid;end if;
  if final then
   update public.care_family_records set status='final',occurred_at=happened,revision=revision+1,first_finalized_at=coalesce(first_finalized_at,now()) where id=rid returning * into f;
   if length(btrim(coalesce(p->>'reserved_note','')))>0 then insert into private.care_family_notes(patient_id,author_id,body,occurred_at)values(pid,auth.uid(),btrim(p->>'reserved_note'),happened)returning id into reserve;end if;
   insert into private.care_family_versions(record_id,revision,occurred_at,payload,reserved_note_id,reason,actor_id)values(rid,f.revision,happened,payload,reserve,case when op='family_amend' then btrim(p->>'reason') else 'Finalización original' end,auth.uid());delete from private.care_family_drafts where record_id=rid;
  else insert into private.care_family_drafts(record_id,payload,reserved_note,occurred_at)values(rid,payload,coalesce(p->>'reserved_note',''),happened)on conflict(record_id)do update set payload=excluded.payload,reserved_note=excluded.reserved_note,occurred_at=excluded.occurred_at,saved_at=now();end if;
 elsif op in ('family_grant','family_revoke') then
  select * into f from public.care_family_records where id=rid for update;pid:=f.patient_id;reader:=(p->>'reader')::uuid;note:=(p->>'note_id')::uuid;
  if f.id is null or f.author_id<>auth.uid() or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if op='family_grant' then
   if not exists(select 1 from private.care_family_versions v where v.record_id=rid and v.reserved_note_id=note) or not exists(select 1 from public.care_assignments ca join public.admin_users u on u.user_id=ca.professional_id and u.is_active join public.care_staff_capabilities c on c.user_id=u.user_id where ca.patient_id=pid and ca.professional_id=reader and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()) and c.capabilities @> array['care.patient.read','care.records.read','care.family.read']) then raise exception 'Lector no autorizado';end if;
   insert into private.care_note_readers(note_id,kind,user_id,granted_by)values(note,'family',reader,auth.uid())on conflict do nothing;
  else delete from private.care_note_readers g using private.care_family_versions v where v.record_id=rid and v.reserved_note_id=g.note_id and g.kind='family' and g.user_id=reader;end if;
 elsif op in ('agreement','agreement_complete','agreement_cancel','agreement_unshare') then
  select * into ag from private.care_family_agreements where id=rid for update;src:=coalesce(ag.record_id,(p->>'record_id')::uuid);select * into f from public.care_family_records where id=src for share;pid:=f.patient_id;
  if f.id is null or f.status<>'final' or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if ag.id is not null and (ag.version<>expected or ag.state<>'pending' and op<>'agreement_unshare') then raise exception 'El registro cambió o ya se cerró' using errcode='40001';end if;
  if ag.id is null and (expected<>0 or op<>'agreement') then raise exception 'Acuerdo no disponible';end if;
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Motivo requerido';end if;
  if op='agreement_unshare' then
   update private.care_family_agreements set share_patient=false,version=version+1,updated_by=auth.uid(),updated_at=now() where id=rid;
  elsif op='agreement' then
   if nullif(p->>'due_at','') is null or not isfinite((p->>'due_at')::timestamptz) or length(btrim(coalesce(p->>'title',''))) not between 3 and 160 or length(btrim(coalesce(p->>'responsible',''))) not between 2 and 80 or length(coalesce(p->>'patient_body',''))>300 or coalesce((p->>'share_patient')::boolean,false) and (not coalesce((p->>'confirm_publish')::boolean,false) or length(btrim(coalesce(p->>'patient_body','')))<3) then raise exception 'Revisa acuerdo, responsable, fecha y publicación';end if;
   if ag.id is null then insert into private.care_family_agreements(id,record_id,source_revision,patient_id,title,responsible,due_at,share_patient,patient_body,created_by,updated_by)values(rid,src,f.revision,pid,btrim(p->>'title'),btrim(p->>'responsible'),(p->>'due_at')::timestamptz,coalesce((p->>'share_patient')::boolean,false),coalesce(p->>'patient_body',''),auth.uid(),auth.uid());
   else update private.care_family_agreements set title=btrim(p->>'title'),responsible=btrim(p->>'responsible'),due_at=(p->>'due_at')::timestamptz,share_patient=coalesce((p->>'share_patient')::boolean,false),patient_body=coalesce(p->>'patient_body',''),version=version+1,updated_by=auth.uid(),updated_at=now() where id=rid;end if;
  else
   if op='agreement_complete' and length(btrim(coalesce(p->>'result','')))<3 then raise exception 'Resultado requerido';end if;
   update private.care_family_agreements set state=case when op='agreement_complete' then 'completed' else 'cancelled' end,result=coalesce(p->>'result',''),completed_at=case when op='agreement_complete' then now() end,version=version+1,updated_by=auth.uid(),updated_at=now() where id=rid;
  end if;
  insert into private.care_family_agreement_history(agreement_id,snapshot,reason,actor_id)select rid,to_jsonb(x),btrim(p->>'reason'),auth.uid() from private.care_family_agreements x where id=rid;
 else raise exception 'Acción no disponible';end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.recovery_family.'||op,rid);return rid;
end $$;
commit;
