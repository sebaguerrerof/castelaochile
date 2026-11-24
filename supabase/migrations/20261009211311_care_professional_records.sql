-- Professional records: drafts/reserves physically private; no medical automation.
begin;
create table public.care_session_records (
 id uuid primary key, patient_id uuid not null references public.patient_profiles(id) on delete restrict,
 event_id uuid not null references public.care_events(id) on delete restrict,
 author_id uuid not null references auth.users(id) on delete restrict,
 specialty text not null check(specialty in ('psychology','recovery','psychiatry')),
 occurred_at timestamptz not null, status text not null default 'draft' check(status in ('draft','final')),
 version integer not null default 1, revision integer not null default 0, first_finalized_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(patient_id,event_id,author_id,specialty),
 check((status='draft' and revision=0 and first_finalized_at is null) or (status='final' and revision>0 and first_finalized_at is not null))
);
create index care_record_patient_date on public.care_session_records(patient_id,occurred_at desc,id);
create index care_record_author on public.care_session_records(author_id);
create index care_record_event on public.care_session_records(event_id);
create table private.care_record_drafts (
 record_id uuid primary key references public.care_session_records(id) on delete restrict,
 payload jsonb not null, reserved_note text not null default '', summary_body text not null default '',
 summary_visibility text not null check(summary_visibility in ('none','coordination','patient')),
 request_intervention boolean not null, request_body text not null default '', request_due_at timestamptz,
 saved_at timestamptz not null default now()
);
create table private.care_record_versions (
 id uuid primary key default gen_random_uuid(), record_id uuid not null references public.care_session_records(id) on delete restrict,
 revision integer not null, occurred_at timestamptz not null, payload jsonb not null,
 reason text not null check(length(btrim(reason)) between 3 and 300),
 actor_id uuid not null references auth.users(id) on delete restrict, recorded_at timestamptz not null default now(),
 unique(record_id,revision)
);
create index care_record_version_actor on private.care_record_versions(actor_id);
create table private.care_record_reserves (
 version_id uuid primary key references private.care_record_versions(id) on delete restrict, body text not null check(length(body)<=1200)
);
create table private.care_record_readers (
 record_id uuid not null references public.care_session_records(id) on delete restrict,
 reader_id uuid not null references auth.users(id) on delete restrict,
 granted_by uuid not null references auth.users(id) on delete restrict, granted_at timestamptz not null default now(),
 primary key(record_id,reader_id)
);
create index care_record_reader_user on private.care_record_readers(reader_id);
create index care_record_reader_actor on private.care_record_readers(granted_by);
create table public.care_record_summaries (
 record_id uuid not null references public.care_session_records(id) on delete restrict, revision integer not null,
 visibility text not null check(visibility in ('coordination','patient')), body text not null check(length(btrim(body)) between 3 and 600),
 recorded_at timestamptz not null default now(), primary key(record_id,revision)
);
create table public.care_intervention_requests (
 id uuid primary key default gen_random_uuid(), record_id uuid not null unique references public.care_session_records(id) on delete restrict,
 patient_id uuid not null references public.patient_profiles(id) on delete restrict,
 source_revision integer not null, requested_by uuid not null references auth.users(id) on delete restrict,
 body text not null check(length(btrim(body)) between 3 and 600), due_at timestamptz,
 state text not null default 'open' check(state in ('open','received')), created_at timestamptz not null default now(),
 received_by uuid references auth.users(id) on delete restrict, received_at timestamptz,
 check((state='open' and received_by is null and received_at is null) or (state='received' and received_by is not null and received_at is not null))
);
create index care_request_patient on public.care_intervention_requests(patient_id);
create index care_request_author on public.care_intervention_requests(requested_by);
create index care_request_receiver on public.care_intervention_requests(received_by);
create index care_request_queue on public.care_intervention_requests(state,created_at,id);
create table private.care_record_operations (
 operation_key uuid primary key, record_id uuid not null references public.care_session_records(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict, op text not null, fingerprint text not null,
 recorded_at timestamptz not null default now()
);
create index care_record_operation_parent on private.care_record_operations(record_id);
create index care_record_operation_actor on private.care_record_operations(actor_id);

create function private.care_record_allowed(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_session_records r where r.id=rid and private.care_scope(r.patient_id,'care.patient.read')
   and ((r.author_id=auth.uid() and private.care_scope(r.patient_id,'care.records.create')) or (r.status='final' and private.care_scope(r.patient_id,'care.records.read'))))
$$;
create function private.care_record_summary_allowed(rid uuid,vis text) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_record_allowed(rid) or exists(select 1 from public.care_session_records r where r.id=rid and r.status='final' and vis='patient' and private.care_self(r.patient_id))
$$;
alter table public.care_session_records enable row level security;
alter table public.care_record_summaries enable row level security;
alter table public.care_intervention_requests enable row level security;
alter table private.care_record_drafts enable row level security;
alter table private.care_record_versions enable row level security;
alter table private.care_record_reserves enable row level security;
alter table private.care_record_readers enable row level security;
alter table private.care_record_operations enable row level security;
revoke all on public.care_session_records,public.care_record_summaries,public.care_intervention_requests from public,anon,authenticated,service_role;
grant select on public.care_session_records,public.care_record_summaries,public.care_intervention_requests to authenticated;
revoke all on private.care_record_drafts,private.care_record_versions,private.care_record_reserves,private.care_record_readers,private.care_record_operations from public,anon,authenticated,service_role;
create policy care_record_metadata_read on public.care_session_records for select to authenticated using(private.care_record_allowed(id));
create policy care_record_summary_read on public.care_record_summaries for select to authenticated using(private.care_record_summary_allowed(record_id,visibility));
create policy care_request_read on public.care_intervention_requests for select to authenticated using
 (private.care_scope(patient_id,'care.patient.read') and ((requested_by=auth.uid() and private.care_scope(patient_id,'care.records.create')) or private.care_scope(patient_id,'care.decisions.manage')));

create function private.care_record_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p->>'id')::uuid;pid uuid:=(p->>'patient_id')::uuid;eid uuid:=(p->>'event_id')::uuid;
 r public.care_session_records;e public.care_events;prior private.care_record_operations;
 payload jsonb:=p->'payload';field text;val jsonb;allowed text[];key uuid:=(p->>'operation_key')::uuid;
 happened timestamptz:=(p->>'occurred_at')::timestamptz;kind text:=p->>'specialty';vid uuid;
 summary text:=btrim(coalesce(p->>'summary_body',''));vis text:=p->>'summary_visibility';reserve text:=btrim(coalesce(p->>'reserved_note',''));
 req boolean:=coalesce((p->>'request_intervention')::boolean,false);reqbody text:=btrim(coalesce(p->>'request_body',''));reqdue timestamptz:=nullif(p->>'request_due_at','')::timestamptz;
begin
 if op not in ('draft','finalize','amend') or rid is null or key is null then raise exception 'Operación inválida';end if;
 if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') or not exists
  (select 1 from public.care_assignments a where a.patient_id=pid and a.professional_id=auth.uid() and a.specialty=kind and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
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
  when 'recovery' then array['punctuality_observation','responsibilities','autonomy','organisation','initiative','behaviour']
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
  delete from private.care_record_drafts where record_id=rid;
 end if;
 insert into private.care_record_operations(operation_key,record_id,actor_id,op,fingerprint) values(key,rid,auth.uid(),op,md5(p::text));
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.record.'||op,rid);
 return rid;
end $$;
create function public.care_record_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_record_write(op,p) $$;

create function private.care_record_read(rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.care_session_records;d private.care_record_drafts;reserve_allowed boolean;can_write boolean;v jsonb;
begin
 if not private.care_record_allowed(rid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into r from public.care_session_records where id=rid;
 can_write:=r.author_id=auth.uid() and private.care_scope(r.patient_id,'care.records.create') and exists
  (select 1 from public.care_assignments a where a.patient_id=r.patient_id and a.professional_id=auth.uid() and a.specialty=r.specialty and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()));
 reserve_allowed:=r.author_id=auth.uid() or exists(select 1 from private.care_record_readers x where x.record_id=rid and x.reader_id=auth.uid());
 if r.author_id=auth.uid() then select * into d from private.care_record_drafts where record_id=rid;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'revision',h.revision,'occurred_at',h.occurred_at,'payload',h.payload,'reason',h.reason,'recorded_at',h.recorded_at,
  'summary',(select jsonb_build_object('body',s.body,'visibility',s.visibility) from public.care_record_summaries s where s.record_id=rid and s.revision=h.revision),
  'reserved_note',case when reserve_allowed then (select n.body from private.care_record_reserves n where n.version_id=h.id) end) order by h.revision desc),'[]'::jsonb)
 into v from private.care_record_versions h where h.record_id=rid;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.record.read',rid);
 return jsonb_build_object('record',to_jsonb(r),'draft',case when d.record_id is not null then to_jsonb(d) end,'versions',v,'can_write',can_write,'can_reserved',reserve_allowed,
  'readers',case when r.author_id=auth.uid() then (select coalesce(jsonb_agg(reader_id),'[]'::jsonb) from private.care_record_readers where record_id=rid) else '[]'::jsonb end);
end $$;
create function public.care_record_read(rid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_record_read(rid) $$;

create function private.care_record_access_manage(rid uuid,reader uuid,grant_access boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.care_session_records;
begin
 select * into r from public.care_session_records where id=rid;
 if r.id is null or r.author_id<>auth.uid() or not private.care_scope(r.patient_id,'care.patient.read') or not private.care_scope(r.patient_id,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if grant_access then
  if not exists(select 1 from public.admin_users u join public.care_staff_capabilities c on c.user_id=u.user_id join public.care_assignments a on a.professional_id=u.user_id
   where u.user_id=reader and u.is_active and c.capabilities @> array['care.patient.read','care.records.read'] and a.patient_id=r.patient_id and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())) then raise exception 'Lector no habilitado' using errcode='42501';end if;
  insert into private.care_record_readers(record_id,reader_id,granted_by) values(rid,reader,auth.uid()) on conflict do nothing;
 else delete from private.care_record_readers where record_id=rid and reader_id=reader;end if;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),case when grant_access then 'care.record.grant' else 'care.record.revoke' end,rid);
 return rid;
end $$;
create function public.care_record_access_manage(rid uuid,reader uuid,grant_access boolean) returns uuid language sql security invoker set search_path='' as $$ select private.care_record_access_manage(rid,reader,grant_access) $$;
create function private.care_request_receive(request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.care_intervention_requests;
begin
 select * into r from public.care_intervention_requests where id=request_id for update;
 if r.id is null or not private.care_scope(r.patient_id,'care.patient.read') or not private.care_scope(r.patient_id,'care.decisions.manage') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if r.state='open' then update public.care_intervention_requests set state='received',received_by=auth.uid(),received_at=now() where id=request_id;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.request.receive',request_id);end if;
 return request_id;
end $$;
create function public.care_request_receive(request_id uuid) returns uuid language sql security invoker set search_path='' as $$ select private.care_request_receive(request_id) $$;
create function private.care_record_shared(pid uuid,page integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.care_self(pid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page<1 or page>10000 or page is null then raise exception 'Página inválida';end if;
 return jsonb_build_object('total',(select count(*) from public.care_record_summaries s join public.care_session_records r on r.id=s.record_id and r.revision=s.revision where r.patient_id=pid and r.status='final' and s.visibility='patient'),
 'summaries',coalesce((select jsonb_agg(x order by x.occurred_at desc,x.record_id) from
  (select s.record_id,s.revision,s.body,r.occurred_at,r.specialty from public.care_record_summaries s join public.care_session_records r on r.id=s.record_id and r.revision=s.revision
   where r.patient_id=pid and r.status='final' and s.visibility='patient' order by r.occurred_at desc,r.id offset (page-1)*25 limit 25)x),'[]'::jsonb));
end $$;
create function public.care_record_shared(pid uuid,page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select private.care_record_shared(pid,page) $$;
create function private.care_record_events(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(x order by x.starts_at desc,x.id) from (select e.* from public.care_events e join public.care_event_participants a on a.event_id=e.id
  where a.patient_id=pid and e.professional_id=auth.uid() and e.status<>'cancelled' order by e.starts_at desc,e.id limit 25)x),'[]'::jsonb);
end $$;
create function public.care_record_events(pid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_record_events(pid) $$;
revoke all on function private.care_record_allowed(uuid),private.care_record_summary_allowed(uuid,text),private.care_record_write(text,jsonb),public.care_record_write(text,jsonb),
 private.care_record_read(uuid),public.care_record_read(uuid),private.care_record_access_manage(uuid,uuid,boolean),public.care_record_access_manage(uuid,uuid,boolean),
 private.care_request_receive(uuid),public.care_request_receive(uuid),private.care_record_shared(uuid,integer),public.care_record_shared(uuid,integer),private.care_record_events(uuid),public.care_record_events(uuid) from public,anon,authenticated,service_role;
grant execute on function private.care_record_allowed(uuid),private.care_record_summary_allowed(uuid,text),private.care_record_write(text,jsonb),public.care_record_write(text,jsonb),
 private.care_record_read(uuid),public.care_record_read(uuid),private.care_record_access_manage(uuid,uuid,boolean),public.care_record_access_manage(uuid,uuid,boolean),
 private.care_request_receive(uuid),public.care_request_receive(uuid),private.care_record_shared(uuid,integer),public.care_record_shared(uuid,integer),private.care_record_events(uuid),public.care_record_events(uuid) to authenticated;
commit;
