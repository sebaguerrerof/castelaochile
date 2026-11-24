-- RC-01. Additive qualitative Recovery fields; no rubric approval or defaults.
begin;
alter table public.care_commitments add column source_record_id uuid references public.care_session_records(id) on delete restrict;
alter table public.care_commitments add column review_at timestamptz;
alter table public.care_commitments add column verification_method text;
create index care_commitment_source_record on public.care_commitments(source_record_id);
create index care_commitment_review_due on public.care_commitments(patient_id,review_at) where review_at is not null;
create table private.care_recovery_commitment_reviews (
 id uuid primary key default gen_random_uuid(),commitment_id uuid not null references public.care_commitments(id) on delete restrict,
 version integer not null, outcome text not null check(outcome in ('pending','fulfilled','unfulfilled','unverifiable')),
 result text not null check(length(btrim(result)) between 3 and 600),evidence text not null check(length(btrim(evidence)) between 3 and 600),
 support text not null check(length(btrim(support)) between 3 and 600),difficulties text not null check(length(btrim(difficulties)) between 3 and 600),
 actor_id uuid not null references auth.users(id) on delete restrict,recorded_at timestamptz not null default now(),
 reason text not null check(length(btrim(reason)) between 3 and 300),unique(commitment_id,version)
);
create index care_rc_review_actor on private.care_recovery_commitment_reviews(actor_id);
alter table private.care_recovery_commitment_reviews enable row level security;
revoke all on private.care_recovery_commitment_reviews from public,anon,authenticated,service_role;

create function private.care_rc_validate_activity(rid uuid,pid uuid,eid uuid,payload jsonb,final boolean) returns void language plpgsql security definer set search_path='' as $$
declare k text;expected text;date_value timestamptz;
begin
 if not final then return;end if;
 if coalesce(payload->>'activity_type','') not in ('individual','sport','weekly_planning','commitment_review','group') or
 coalesce(payload->>'recovery_participation','') not in ('full','partial','absent','justified') or
 coalesce(payload->>'support','') not in ('constant','frequent','occasional','none','not_observable') or
 coalesce(payload->>'evidence_source','') not in ('observed','plan','task','patient_report','third_party') then raise exception 'Selecciona actividad, participación, apoyo y fuente';end if;
 foreach k in array array['facts','progress','difficulties','evidence','support_details'] loop
  if length(btrim(coalesce(payload->>k,'')))<3 then raise exception 'Registra % o constancia expresa no observable',k;end if;
 end loop;
 if payload->>'recovery_participation'<>'full' and length(btrim(coalesce(payload->>'participation_reason','')))<3 then raise exception 'Motiva participación parcial o ausencia';end if;
 if payload->>'recovery_participation' in ('absent','justified') and payload->>'support'<>'not_observable' then raise exception 'Ausencia no acredita ausencia de apoyo';end if;
 expected:=case payload->>'recovery_participation' when 'full' then 'present' when 'partial' then 'present' when 'absent' then 'absent' else 'justified' end;
 if not exists(select 1 from public.care_event_participants where event_id=eid and patient_id=pid and attendance=expected) then raise exception 'Participación incompatible con asistencia; corrige su fuente';end if;
 if length(btrim(coalesce(payload->>'commitment_title','')))>0 then
  if length(btrim(payload->>'commitment_title')) not between 3 and 160 or length(btrim(coalesce(payload->>'commitment_method','')))<3 or
     coalesce(payload->>'commitment_responsible','') not in ('patient','self') or nullif(payload->>'recovery_commitment_id','') is null or
     length(btrim(coalesce(payload->>'no_commitment_reason','')))>0 then raise exception 'Define compromiso real o excepción motivada';end if;
  perform (payload->>'recovery_commitment_id')::uuid;
  foreach k in array array['commitment_due_at','commitment_review_at'] loop
   date_value:=nullif(payload->>k,'')::timestamptz;if date_value is null or not isfinite(date_value) then raise exception 'Plazo y revisión requeridos';end if;
  end loop;
 else
  if length(btrim(coalesce(payload->>'no_commitment_reason','')))<3 then raise exception 'Registra por qué no se acordó nuevo compromiso';end if;
 end if;
end $$;

create function private.care_rc_commitment_from_record(rid uuid,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.care_session_records;c public.care_commitments;cid uuid;expected_responsible uuid;
begin
 if length(btrim(coalesce(payload->>'commitment_title','')))=0 then return;end if;
 select * into r from public.care_session_records where id=rid;
 if r.author_id<>auth.uid() or r.specialty<>'recovery' or r.status<>'final' or not private.care_scope(r.patient_id,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 cid:=(payload->>'recovery_commitment_id')::uuid;
 expected_responsible:=case when payload->>'commitment_responsible'='self' then auth.uid() end;
 select * into c from public.care_commitments where id=cid for update;
 if c.id is null then
  perform private.care_planning_manage('commitment',jsonb_build_object('id',cid,'version',0,'patient_id',r.patient_id,'title',payload->>'commitment_title','due_at',payload->>'commitment_due_at','visibility','coordination','status','pending','source_event_id',r.event_id,'responsible_id',coalesce(expected_responsible::text,''),'reason','Acuerdo del registro Recovery'));
  update public.care_commitments set source_record_id=rid,review_at=(payload->>'commitment_review_at')::timestamptz,verification_method=btrim(payload->>'commitment_method') where id=cid;
 else
  if c.patient_id<>r.patient_id or c.source_record_id is distinct from rid or c.created_by<>auth.uid() or c.responsible_id is distinct from expected_responsible then raise exception 'Compromiso de otro registro o responsable';end if;
  if (c.title,c.due_at,c.review_at,c.verification_method) is distinct from (btrim(payload->>'commitment_title'),(payload->>'commitment_due_at')::timestamptz,(payload->>'commitment_review_at')::timestamptz,btrim(payload->>'commitment_method')) then
   if c.status<>'pending' or exists(select 1 from private.care_recovery_commitment_reviews where commitment_id=cid and outcome<>'pending') then raise exception 'Conserva compromiso revisado; acuerda uno nuevo expresamente';end if;
   perform private.care_planning_manage('commitment',jsonb_build_object('id',cid,'version',c.version,'patient_id',r.patient_id,'title',payload->>'commitment_title','due_at',payload->>'commitment_due_at','visibility',c.visibility,'status','pending','reason','Enmienda del acuerdo Recovery'));
   update public.care_commitments set review_at=(payload->>'commitment_review_at')::timestamptz,verification_method=btrim(payload->>'commitment_method') where id=cid;
  end if;
 end if;
end $$;
create or replace function private.care_record_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p->>'id')::uuid;pid uuid:=(p->>'patient_id')::uuid;eid uuid:=(p->>'event_id')::uuid;
 r public.care_session_records;e public.care_events;prior private.care_record_operations;
 payload jsonb:=p->'payload';field text;val jsonb;allowed text[];key uuid:=(p->>'operation_key')::uuid;
 happened timestamptz:=(p->>'occurred_at')::timestamptz;kind text:=p->>'specialty';vid uuid;
 summary text:=btrim(coalesce(p->>'summary_body',''));vis text:=p->>'summary_visibility';reserve text:=btrim(coalesce(p->>'reserved_note',''));
 req boolean:=coalesce((p->>'request_intervention')::boolean,false);reqbody text:=btrim(coalesce(p->>'request_body',''));reqdue timestamptz:=nullif(p->>'request_due_at','')::timestamptz;
begin
 if op not in ('draft','finalize','amend') or rid is null or key is null then raise exception 'OperaciÃ³n invÃ¡lida';end if;
 if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') or not exists
  (select 1 from public.care_assignments a where a.patient_id=pid and a.professional_id=auth.uid() and a.specialty=kind and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
 then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into e from public.care_events where id=eid;
 if e.id is null or e.professional_id<>auth.uid() or e.status='cancelled' or not exists
  (select 1 from public.care_event_participants a where a.event_id=eid and a.patient_id=pid) then raise exception 'SesiÃ³n no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('care.record:'||rid::text,0));
 select * into r from public.care_session_records where id=rid for update;
 if r.id is not null and (r.author_id<>auth.uid() or r.patient_id<>pid or r.event_id<>eid or r.specialty<>kind) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into prior from private.care_record_operations where operation_key=key;
 if prior.operation_key is not null then
  if prior.actor_id=auth.uid() and prior.record_id=rid and prior.op=op and prior.fingerprint=md5(p::text) then return rid;end if;
  raise exception 'Identificador de operaciÃ³n ya utilizado';end if;
 if coalesce(r.version,0) is distinct from (p->>'version')::integer then raise exception 'El registro cambiÃ³' using errcode='40001';end if;
 if (op='finalize' and r.status='final') or (op='amend' and coalesce(r.status,'draft')<>'final') then raise exception 'Estado del registro no permite esta operaciÃ³n';end if;
 if happened is null or not isfinite(happened) or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Fecha o campos invÃ¡lidos';end if;
 allowed:=array['objective','evolution','facts','account','interpretation','difficulties','participation','commitment_note','next_action']||case kind
  when 'psychology' then array['motivation','progress','recommendations']
  when 'recovery' then array['punctuality_observation','responsibilities','autonomy','organisation','initiative','behaviour','activity_type','recovery_participation','participation_reason','support','support_details','progress','evidence','evidence_source','no_commitment_reason','recovery_commitment_id','commitment_title','commitment_due_at','commitment_review_at','commitment_method','commitment_responsible']
  when 'psychiatry' then array['control','adherence_reported','adherence_observed','medical_indications','medical_changes','next_visit','shareable_alert'] else array[]::text[] end;
 for field,val in select * from jsonb_each(payload) loop
  if not field=any(allowed) or jsonb_typeof(val)<>'string' or length(val#>>'{}')>600 then raise exception 'Campo no autorizado o demasiado largo';end if;
 end loop;
 if kind='psychiatry' and (length(coalesce(payload->>'medical_indications',''))>0 or length(coalesce(payload->>'medical_changes',''))>0 or
  exists(select 1 from private.care_record_versions v where v.record_id=rid and (length(coalesce(v.payload->>'medical_indications',''))>0 or length(coalesce(v.payload->>'medical_changes',''))>0)))
  and not private.care_scope(pid,'care.medical.create') then raise exception 'IndicaciÃ³n mÃ©dica no autorizada' using errcode='42501';end if;
 if kind='psychiatry' and nullif(payload->>'next_visit','') is not null then perform private.care_civil_instant((payload->>'next_visit')::timestamp);end if;
 if length(reserve)>1200 or length(summary)>600 or vis not in ('none','coordination','patient') or vis is null or
  (vis='none' and length(summary)>0) or (vis<>'none' and length(summary)<3) or length(reqbody)>600 or (req and length(reqbody)<3)
  or (reqdue is not null and (not isfinite(reqdue) or reqdue<now())) then raise exception 'Revisa resumen, reserva y solicitud';end if;
 if op<>'draft' then
  if not coalesce((p->>'confirm_finalize')::boolean,false) then raise exception 'Confirma finalizar';end if;
  if happened>now() or e.status<>'completed' or exists(select 1 from public.care_event_participants a where a.event_id=eid and a.patient_id=pid and a.attendance='pending') then raise exception 'Finaliza solo hechos ocurridos, con sesiÃ³n realizada y asistencia registrada';end if;
  if length(btrim(coalesce(payload->>'objective','')))<3 or coalesce(payload->>'evolution','') not in ('improved','stable','worsened','not_evaluable') then raise exception 'Registra objetivo y evoluciÃ³n sin preselecciÃ³n';end if;
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
   values(rid,r.revision,happened,payload,case when op='finalize' then 'FinalizaciÃ³n original' else btrim(p->>'reason') end,auth.uid()) returning id into vid;
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
create or replace function private.care_planning_manage(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;pid uuid;first_id uuid;sid uuid;starts timestamptz;ends timestamptz;effective timestamptz;local_start timestamp;
  duration interval;weeks integer;idx integer;patients uuid[];old_event public.care_events;old_plan public.care_personal_plans;
  old_commitment public.care_commitments;old_attendance public.care_event_participants;state text;is_patient boolean;
  old_version integer;vis text;responsible uuid;
begin
  if auth.uid() is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());pid:=nullif(p->>'patient_id','')::uuid;
  if op in ('plan','commitment') then
    effective:=case when op='plan' then (p->>'planned_for')::timestamptz else (p->>'due_at')::timestamptz end;
    if effective is null or not isfinite(effective) then raise exception 'Fecha invÃ¡lida'; end if;
  end if;
  if op='event' then
    patients:=array(select distinct value::uuid from jsonb_array_elements_text(p->'patients'));
    if cardinality(patients) not between 1 and 100 or patients is null
      or exists(select 1 from unnest(patients) x where not private.care_scope(x,'care.records.create') or not private.care_scope(x,'care.patient.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    starts:=(p->>'starts_at')::timestamptz;ends:=(p->>'ends_at')::timestamptz;
    if starts is null or ends is null or not isfinite(starts) or not isfinite(ends) or ends<=starts or ends-starts>interval '24 hours' then raise exception 'Fechas no vÃ¡lidas'; end if;
    perform private.care_civil_instant(starts at time zone 'America/Santiago');
    weeks:=coalesce((p->>'weeks')::integer,1);
    if weeks not between 1 and 12 then raise exception 'Recurrencia no vÃ¡lida'; end if;
    select * into old_event from public.care_events where id=rid for update;
    if found then
      if not private.care_event_write(rid) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if old_event.version is distinct from (p->>'version')::integer then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
      if old_event.status<>'scheduled' or weeks<>1 then raise exception 'Solo se edita una instancia programada'; end if;
      -- Participant list is immutable for existing instances; changes require a new event, with cancellation/history of the old one.
      if patients is distinct from array(select patient_id from public.care_event_participants where event_id=rid order by patient_id)
        and (select array_agg(x order by x) from unnest(patients)x) is distinct from array(select patient_id from public.care_event_participants where event_id=rid order by patient_id)
        then raise exception 'No se alteran participantes de una instancia existente'; end if;
      update public.care_events set title=btrim(p->>'title'),kind=p->>'kind',starts_at=starts,ends_at=ends,modality=p->>'modality',location=coalesce(p->>'location',''),version=version+1 where id=rid;
      insert into public.care_event_history(event_id,title,starts_at,ends_at,status,actor_id,reason,version)
        select id,title,starts_at,ends_at,status,auth.uid(),btrim(p->>'reason'),version from public.care_events where id=rid;
    else
      if coalesce((p->>'version')::int,0)<>0 then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
      first_id:=rid;duration:=ends-starts;local_start:=starts at time zone 'America/Santiago';
      if weeks>1 then insert into private.care_event_series(created_by,local_start,weeks) values(auth.uid(),local_start,weeks) returning id into sid; end if;
      for idx in 0..weeks-1 loop
        if idx>0 then rid:=gen_random_uuid(); end if;
        effective:=private.care_civil_instant(local_start+idx*interval '7 days');
        insert into public.care_events(id,series_id,title,kind,starts_at,ends_at,professional_id,modality,location,created_by)
          values(rid,sid,btrim(p->>'title'),p->>'kind',effective,effective+duration,auth.uid(),p->>'modality',coalesce(p->>'location',''),auth.uid());
        insert into public.care_event_participants(event_id,patient_id) select rid,x from unnest(patients)x;
        insert into public.care_event_history(event_id,title,starts_at,ends_at,status,actor_id,reason,version)
          select id,title,starts_at,ends_at,status,auth.uid(),'ProgramaciÃ³n',version from public.care_events where id=rid;
      end loop;
      rid:=first_id;
    end if;
  elsif op='event_close' then
    if not private.care_event_write(rid) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    select * into old_event from public.care_events where id=rid for update;
    if old_event.version is distinct from (p->>'version')::int then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
    state:=p->>'status';
    if old_event.status<>'scheduled' or state not in ('completed','cancelled') or (state='completed' and old_event.ends_at>now()) then raise exception 'Evento no cerrable'; end if;
    update public.care_events set status=state,closed_at=now(),version=version+1 where id=rid;
    insert into public.care_event_history(event_id,title,starts_at,ends_at,status,actor_id,reason,version)
      select id,title,starts_at,ends_at,status,auth.uid(),btrim(p->>'reason'),version from public.care_events where id=rid;
  elsif op='attendance' then
    if not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    -- Lock event as well as participant: closing and attendance corrections cannot race.
    select * into old_event from public.care_events where id=rid for update;
    if not found or old_event.status<>'completed' or old_event.closed_at is null then raise exception 'Cierra primero una actividad realizada'; end if;
    select * into old_attendance from public.care_event_participants where event_id=rid and patient_id=pid for update;
    if not found then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if old_attendance.version is distinct from (p->>'version')::int then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
    if p->>'attendance'<>'present' and (nullif(p->>'punctuality','') is not null or length(btrim(coalesce(p->>'participation','')))>0) then raise exception 'Registra participaciÃ³n y puntualidad solo cuando fueron observadas en asistencia presente'; end if;
    update public.care_event_participants set attendance=p->>'attendance',punctuality=nullif(p->>'punctuality',''),participation=btrim(coalesce(p->>'participation','')),
      observed_by=auth.uid(),recorded_at=now(),version=version+1 where event_id=rid and patient_id=pid;
    insert into public.care_attendance_history(event_id,patient_id,attendance,punctuality,participation,actor_id,reason,version)
      select event_id,patient_id,attendance,punctuality,participation,auth.uid(),btrim(p->>'reason'),version from public.care_event_participants where event_id=rid and patient_id=pid;
  elsif op in ('plan','plan_complete') then
    pid:=private.library_patient();
    if pid is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    select * into old_plan from public.care_personal_plans where id=rid for update;
    if found then
      if old_plan.patient_id<>pid then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if old_plan.version is distinct from (p->>'version')::int then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
      if old_plan.status<>'planned' then raise exception 'Plan cerrado; crea otro si corresponde'; end if;
      if op='plan_complete' then update public.care_personal_plans set status='completed',completed_at=now(),version=version+1 where id=rid;
      else update public.care_personal_plans set title=btrim(p->>'title'),planned_for=(p->>'planned_for')::timestamptz,status=p->>'status',version=version+1 where id=rid; end if;
    else
      if op='plan_complete' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if coalesce((p->>'version')::int,0)<>0 then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
      insert into public.care_personal_plans(id,patient_id,title,planned_for,created_by) values(rid,pid,btrim(p->>'title'),(p->>'planned_for')::timestamptz,auth.uid());
    end if;
    insert into public.care_plan_history(plan_id,title,planned_for,status,actor_id,reason,version)
      select id,title,planned_for,status,auth.uid(),case when op='plan_complete' then 'Completado por el paciente' else btrim(p->>'reason') end,version from public.care_personal_plans where id=rid;
  elsif op in ('commitment','commitment_complete','commitment_verify') then
    select * into old_commitment from public.care_commitments where id=rid for update;
    if found then pid:=old_commitment.patient_id; end if;
    is_patient:=private.care_self(pid);
    if not is_patient and (not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if op in ('commitment_complete','commitment_verify') and not is_patient and old_commitment.source_record_id is not null then raise exception 'Revisa este compromiso desde Recovery con evidencia';end if;
    if op in ('commitment_complete','commitment_verify') and coalesce(length(btrim(p->>'result')),0)<3 then raise exception 'Registra un resultado breve'; end if;
    if old_commitment.id is not null then
      if is_patient and old_commitment.visibility<>'patient' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if old_commitment.version is distinct from (p->>'version')::int then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
      if op='commitment_verify' then
        if is_patient or old_commitment.status<>'completed' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
        update public.care_commitments set confirmation='professional',confirmed_by=auth.uid(),result=btrim(p->>'result'),version=version+1 where id=rid;
      elsif op='commitment_complete' then
        if old_commitment.status<>'pending' or (is_patient and old_commitment.responsible_kind<>'patient') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
        update public.care_commitments set status='completed',completed_at=now(),confirmed_by=auth.uid(),confirmation=case when is_patient then 'self' else 'professional' end,result=btrim(p->>'result'),version=version+1 where id=rid;
      else
        if old_commitment.status<>'pending' or (is_patient and (old_commitment.origin<>'self' or old_commitment.created_by<>auth.uid())) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
        vis:=case when is_patient then 'patient' else coalesce(p->>'visibility','coordination') end;
        if not is_patient and vis='patient' and old_commitment.visibility<>'patient' and not coalesce((p->>'confirm_publish')::bool,false) then raise exception 'Confirma la publicaciÃ³n al paciente'; end if;
        update public.care_commitments set title=btrim(p->>'title'),due_at=(p->>'due_at')::timestamptz,status=p->>'status',visibility=vis,version=version+1 where id=rid;
      end if;
    else
      if op<>'commitment' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if coalesce((p->>'version')::int,0)<>0 then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
      vis:=case when is_patient then 'patient' else coalesce(p->>'visibility','coordination') end;
      if not is_patient and vis='patient' and not coalesce((p->>'confirm_publish')::bool,false) then raise exception 'Confirma la publicaciÃ³n al paciente'; end if;
      responsible:=case when is_patient then null else nullif(p->>'responsible_id','')::uuid end;
      if responsible is not null and not exists(select 1 from public.admin_users a join public.care_assignments b on b.professional_id=a.user_id where a.user_id=responsible and a.is_active and b.patient_id=pid and b.starts_at<=now() and (b.ends_at is null or b.ends_at>now())) then raise exception 'Responsable sin asignaciÃ³n vigente'; end if;
      if nullif(p->>'source_event_id','') is not null and not exists(select 1 from public.care_event_participants where event_id=(p->>'source_event_id')::uuid and patient_id=pid) then raise exception 'Actividad no vinculada a este paciente'; end if;
      insert into public.care_commitments(id,patient_id,title,due_at,source_event_id,responsible_kind,responsible_id,visibility,origin,created_by)
        values(rid,pid,btrim(p->>'title'),(p->>'due_at')::timestamptz,nullif(p->>'source_event_id','')::uuid,case when responsible is null then 'patient' else 'professional' end,responsible,vis,case when is_patient then 'self' else 'professional' end,auth.uid());
    end if;
    insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,reason,version)
      select id,title,due_at,status,visibility,confirmation,result,auth.uid(),btrim(p->>'reason'),version from public.care_commitments where id=rid;
  elsif op='goals' then
    if not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    perform 1 from public.patient_profiles where id=pid for update;
    select version into old_version from public.care_patient_goals where patient_id=pid;
    if coalesce(old_version,0) is distinct from (p->>'version')::int then raise exception 'El registro cambiÃ³' using errcode='40001'; end if;
    insert into public.care_patient_goals(patient_id,objectives,updated_by,version) values(pid,btrim(p->>'objectives'),auth.uid(),1)
      on conflict(patient_id) do update set objectives=excluded.objectives,updated_by=auth.uid(),updated_at=now(),version=care_patient_goals.version+1;
    insert into public.care_goal_history(patient_id,objectives,actor_id,version) select patient_id,objectives,auth.uid(),version from public.care_patient_goals where patient_id=pid;
    rid:=pid;
  else raise exception 'OperaciÃ³n no disponible';
  end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.planning.'||op,rid);
  return rid;
end $$;

create function private.care_rc_commitment_review(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid:=(p->>'id')::uuid;c public.care_commitments;k text;outcome text:=p->>'outcome';
begin
 select * into c from public.care_commitments where id=cid for update;
 if c.id is null or c.source_record_id is null or c.status='cancelled' or not private.care_scope(c.patient_id,'care.records.create') or not private.care_scope(c.patient_id,'care.patient.read') or not exists
 (select 1 from public.care_assignments where patient_id=c.patient_id and professional_id=auth.uid() and specialty in ('recovery','direction') and starts_at<=now() and (ends_at is null or ends_at>now())) then raise exception 'Recurso no disponible' using errcode='42501';end if;
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
create function public.care_rc_commitment_review(p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_rc_commitment_review(p) $$;
create function private.care_rc_commitments(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('reviews',coalesce((select jsonb_agg(to_jsonb(v)order by version desc)from private.care_recovery_commitment_reviews v where v.commitment_id=c.id),'[]'::jsonb)) order by c.review_at,c.id)from public.care_commitments c where c.patient_id=pid and c.source_record_id is not null),'[]'::jsonb);
end $$;
create function public.care_rc_commitments(pid uuid)returns jsonb language sql security invoker set search_path='' as $$select private.care_rc_commitments(pid)$$;
revoke all on function private.care_rc_validate_activity(uuid,uuid,uuid,jsonb,boolean),private.care_rc_commitment_from_record(uuid,jsonb),private.care_rc_commitment_review(jsonb),public.care_rc_commitment_review(jsonb),private.care_rc_commitments(uuid),public.care_rc_commitments(uuid) from public,anon,authenticated,service_role;
grant execute on function private.care_rc_commitment_review(jsonb),public.care_rc_commitment_review(jsonb),private.care_rc_commitments(uuid),public.care_rc_commitments(uuid) to authenticated;
commit;
