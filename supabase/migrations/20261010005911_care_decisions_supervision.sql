begin;

-- Deliberation never lives in a table exposed to the Data API.
create table private.care_decisions (
 id uuid primary key, patient_id uuid not null references public.patient_profiles(id) on delete restrict,
 author_id uuid not null references auth.users(id) on delete restrict,
 responsible_id uuid references auth.users(id) on delete restrict,
 state text not null default 'draft' check(state in ('draft','active','closed','cancelled')),
 situation text not null default '' check(length(situation)<=600), evaluation text not null default '' check(length(evaluation)<=600),
 decision text not null default '' check(length(decision)<=600), planned_at timestamptz, review_at timestamptz,
 record_id uuid references public.care_session_records(id) on delete restrict, record_revision integer,
 request_id uuid unique references public.care_intervention_requests(id) on delete restrict,
 alert_id uuid references public.care_alerts(id) on delete restrict,
 result text not null default '' check(length(result)<=600), version integer not null default 1 check(version>0),
 revision integer not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((record_id is null)=(record_revision is null)),
 check(planned_at is null or isfinite(planned_at)),check(review_at is null or isfinite(review_at))
);
create index care_decision_patient on private.care_decisions(patient_id,created_at desc,id);
create index care_decision_author on private.care_decisions(author_id);
create index care_decision_responsible on private.care_decisions(responsible_id);
create index care_decision_record on private.care_decisions(record_id);
create index care_decision_alert on private.care_decisions(alert_id);
create table private.care_decision_drafts (
 decision_id uuid primary key references private.care_decisions(id) on delete restrict,
 payload jsonb not null, saved_at timestamptz not null default now()
);
create table private.care_decision_versions (
 decision_id uuid not null references private.care_decisions(id) on delete restrict, revision integer not null check(revision>0),
 snapshot jsonb not null, actor_id uuid not null references auth.users(id) on delete restrict,
 reason text not null check(length(btrim(reason)) between 3 and 600), recorded_at timestamptz not null default now(),
 primary key(decision_id,revision)
);
create index care_decision_version_actor on private.care_decision_versions(actor_id);
-- Only intentionally delegated instruction/result, physically apart from deliberation.
create table private.care_delegated_tasks (
 id uuid primary key, decision_id uuid not null references private.care_decisions(id) on delete restrict,
 patient_id uuid not null references public.patient_profiles(id) on delete restrict,
 assignee_id uuid not null references auth.users(id) on delete restrict,
 instruction text not null check(length(btrim(instruction)) between 3 and 300),
 due_at timestamptz, event_id uuid references public.care_events(id) on delete restrict,
 state text not null default 'pending' check(state in ('pending','in_progress','reported','completed','cancelled')),
 result text not null default '' check(length(result)<=600), verification text not null default '' check(length(verification)<=300),
 reported_at timestamptz, completed_at timestamptz,
 version integer not null default 1 check(version>0), created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(due_at is null or isfinite(due_at)),check(not(due_at is not null and event_id is not null))
);
create index care_task_decision on private.care_delegated_tasks(decision_id);
create index care_task_patient on private.care_delegated_tasks(patient_id);
create index care_task_assignee on private.care_delegated_tasks(assignee_id,state,created_at,id);
create index care_task_event on private.care_delegated_tasks(event_id);
create index care_task_creator on private.care_delegated_tasks(created_by);
create table private.care_task_history (
 task_id uuid not null references private.care_delegated_tasks(id) on delete restrict, version integer not null,
 snapshot jsonb not null, actor_id uuid not null references auth.users(id) on delete restrict,
 reason text not null check(length(btrim(reason)) between 3 and 300), recorded_at timestamptz not null default now(),
 primary key(task_id,version)
);
create index care_task_history_actor on private.care_task_history(actor_id);
alter table private.care_decisions enable row level security;
alter table private.care_decision_drafts enable row level security;
alter table private.care_decision_versions enable row level security;
alter table private.care_delegated_tasks enable row level security;
alter table private.care_task_history enable row level security;
revoke all on private.care_decisions,private.care_decision_drafts,private.care_decision_versions,private.care_delegated_tasks,private.care_task_history from public,anon,authenticated,service_role;

create function private.care_direction(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_scope(pid,'care.patient.read') and private.care_scope(pid,'care.records.read') and private.care_scope(pid,'care.decisions.manage')
$$;
create function private.care_delegate_eligible(pid uuid,uid uuid,direction boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_users u join public.care_staff_capabilities c on c.user_id=u.user_id join public.care_assignments a on a.professional_id=u.user_id
 where u.user_id=uid and u.is_active and a.patient_id=pid and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
 and c.capabilities @> case when direction then array['care.patient.read','care.records.read','care.decisions.manage'] else array['care.patient.read','care.records.create'] end)
$$;

create function private.care_decision_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare did uuid:=(p->>'id')::uuid;pid uuid:=(p->>'patient_id')::uuid;d private.care_decisions;v integer:=coalesce((p->>'version')::integer,0);
 why text:=btrim(coalesce(p->>'reason',''));res text:=btrim(coalesce(p->>'result',''));rid uuid:=nullif(p->>'record_id','')::uuid;
 req uuid:=nullif(p->>'request_id','')::uuid;aid uuid:=nullif(p->>'alert_id','')::uuid;owner uuid:=nullif(p->>'responsible_id','')::uuid;
 planned timestamptz:=nullif(p->>'planned_at','')::timestamptz;review timestamptz:=nullif(p->>'review_at','')::timestamptz;source_revision integer;req_record uuid;req_revision integer;t private.care_delegated_tasks;
begin
 if did is null or not private.care_direction(pid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(did::text,80));
 select * into d from private.care_decisions where id=did for update;
 if (d.id is null and v<>0) or (d.id is not null and (d.patient_id<>pid or d.version<>v)) then raise exception 'La decisión cambió; recarga' using errcode='40001';end if;
 if op in ('decision_draft','decision_final') then
  if d.id is not null and (d.author_id<>auth.uid() or d.state not in ('draft','active')) then raise exception 'Edición no disponible' using errcode='42501';end if;
  if d.id is not null and d.revision>0 and (d.record_id is distinct from rid or d.request_id is distinct from req or d.alert_id is distinct from aid) then raise exception 'Conserva las fuentes originales';end if;
  if length(coalesce(p->>'situation',''))>600 or length(coalesce(p->>'evaluation',''))>600 or length(coalesce(p->>'decision',''))>600 or length(why)>600 then raise exception 'Texto demasiado extenso';end if;
  if req is not null then
   select record_id,r.source_revision into req_record,req_revision from public.care_intervention_requests r where r.id=req and r.patient_id=pid;
   if req_record is null or (rid is not null and rid<>req_record) then raise exception 'Solicitud y registro de origen no coinciden' using errcode='42501';end if;rid:=req_record;
  end if;
  if rid is not null then select r.revision into source_revision from public.care_session_records r where r.id=rid and r.patient_id=pid and r.status='final' for share;
   if source_revision is null then raise exception 'Fuente no disponible' using errcode='42501';end if;
   if req is not null then source_revision:=req_revision;end if;
   if d.revision>0 then source_revision:=d.record_revision;end if;
  end if;
  if req is not null and not exists(select 1 from public.care_intervention_requests r where r.id=req and r.patient_id=pid) then raise exception 'Fuente no disponible' using errcode='42501';end if;
  if aid is not null and not exists(select 1 from public.care_alerts a where a.id=aid and a.patient_id=pid) then raise exception 'Fuente no disponible' using errcode='42501';end if;
  if owner is not null and not private.care_delegate_eligible(pid,owner,true) then raise exception 'Responsable no habilitado' using errcode='42501';end if;
  if (planned is not null and not isfinite(planned)) or (review is not null and not isfinite(review)) then raise exception 'Fecha inválida';end if;
  if op='decision_final' and (coalesce((p->>'confirm_final')::boolean,false)=false or length(btrim(coalesce(p->>'situation','')))<3 or length(btrim(coalesce(p->>'evaluation','')))<3 or length(btrim(coalesce(p->>'decision','')))<3 or owner is null or planned is null or review is null or review<=now()) then raise exception 'Confirma decisión, responsable, fechas y campos';end if;
  if op='decision_final' and d.revision>0 and length(why)<3 then raise exception 'Motivo de enmienda requerido';end if;
  if d.id is null then insert into private.care_decisions(id,patient_id,author_id) values(did,pid,auth.uid()) returning * into d;else update private.care_decisions set version=version+1,updated_at=now() where id=did returning * into d;end if;
  if op='decision_draft' then
   insert into private.care_decision_drafts(decision_id,payload) values(did,jsonb_build_object('situation',coalesce(p->>'situation',''),'evaluation',coalesce(p->>'evaluation',''),'decision',coalesce(p->>'decision',''),'responsible_id',owner,'planned_at',planned,'review_at',review,'record_id',rid,'request_id',req,'alert_id',aid)) on conflict(decision_id) do update set payload=excluded.payload,saved_at=now();
  else
   update private.care_decisions set state='active',situation=btrim(p->>'situation'),evaluation=btrim(p->>'evaluation'),decision=btrim(p->>'decision'),responsible_id=owner,planned_at=planned,review_at=review,record_id=rid,record_revision=source_revision,request_id=req,alert_id=aid,revision=revision+1 where id=did returning * into d;
   delete from private.care_decision_drafts where decision_id=did;
   insert into private.care_decision_versions(decision_id,revision,snapshot,actor_id,reason) values(did,d.revision,to_jsonb(d),auth.uid(),case when d.revision=1 then 'Finalización inicial' else why end);
   if req is not null then perform private.care_request_receive(req);end if;
  end if;
 elsif op in ('decision_close','decision_cancel') then
  if d.id is null or d.state<>'active' or length(why)<3 or length(why)>600 or length(res)>600 or (op='decision_close' and length(res)<3) then raise exception 'Estado, resultado o motivo inválido';end if;
  if op='decision_close' and exists(select 1 from private.care_delegated_tasks where decision_id=did and state not in ('completed','cancelled')) then raise exception 'Revisa las tareas antes de cerrar';end if;
  if op='decision_cancel' then
   for t in update private.care_delegated_tasks set state='cancelled',version=version+1,updated_at=now() where decision_id=did and state not in ('completed','cancelled') returning * loop
    insert into private.care_task_history(task_id,version,snapshot,actor_id,reason) values(t.id,t.version,to_jsonb(t),auth.uid(),'Dirección retiró la acción delegada');
   end loop;
  end if;
  update private.care_decisions set state=case when op='decision_close' then 'closed' else 'cancelled' end,result=res,version=version+1,revision=revision+1,updated_at=now() where id=did returning * into d;
  delete from private.care_decision_drafts where decision_id=did;
  insert into private.care_decision_versions(decision_id,revision,snapshot,actor_id,reason) values(did,d.revision,to_jsonb(d),auth.uid(),why);
 else raise exception 'Operación inválida';end if;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.'||op,did);return did;
end $$;
create function public.care_decision_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_decision_write(op,p) $$;

create function private.care_decision_read(did uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.care_decisions;result jsonb;
begin
 select * into d from private.care_decisions where id=did;
 if d.id is null or not private.care_direction(d.patient_id) or (d.state='draft' and d.author_id<>auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select jsonb_build_object('decision',to_jsonb(d),'draft',case when d.author_id=auth.uid() then (select payload from private.care_decision_drafts where decision_id=did) else null end,
 'versions',coalesce((select jsonb_agg(to_jsonb(v) order by v.revision desc) from private.care_decision_versions v where decision_id=did),'[]'::jsonb),
 'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from private.care_delegated_tasks t where decision_id=did),'[]'::jsonb)) into result;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.decision.read',did);return result;
end $$;
create function public.care_decision_read(did uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_decision_read(did) $$;

create function private.care_decision_list(pid uuid default null,page integer default 1,state text default 'all') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.care_can('care.decisions.manage') or not private.care_can('care.patient.read') or not private.care_can('care.records.read') or (pid is not null and not private.care_direction(pid)) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>10000 or state not in ('all','draft','active','closed','cancelled') then raise exception 'Consulta inválida';end if;
 with eligible as materialized(select d.id,d.patient_id,p.display_name,d.state,d.version,d.revision,d.planned_at,d.review_at,d.author_id,d.responsible_id,d.created_at from private.care_decisions d join public.patient_profiles p on p.id=d.patient_id where private.care_direction(d.patient_id) and (pid is null or d.patient_id=pid) and (d.state<>'draft' or d.author_id=auth.uid()) and (care_decision_list.state='all' or d.state=care_decision_list.state)), paged as(select * from eligible order by created_at desc,id offset (page-1)*25 limit 25)
 select jsonb_build_object('total',(select count(*) from eligible),'rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb)) into result;
 insert into private.care_audit(actor_id,action) values(auth.uid(),'care.decisions.list');return result;
end $$;
create function public.care_decision_list(pid uuid default null,page integer default 1,state text default 'all') returns jsonb language sql security invoker set search_path='' as $$ select private.care_decision_list(pid,page,state) $$;

create function private.care_decision_options(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.care_direction(pid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return jsonb_build_object('responsibles',coalesce((select jsonb_agg(jsonb_build_object('id',u.user_id,'label',coalesce(nullif(a.raw_user_meta_data->>'full_name',''),'Profesional'),'direction',private.care_delegate_eligible(pid,u.user_id,true),'delegate',private.care_delegate_eligible(pid,u.user_id,false)) order by u.user_id) from public.admin_users u join auth.users a on a.id=u.user_id where private.care_delegate_eligible(pid,u.user_id,false) or private.care_delegate_eligible(pid,u.user_id,true)),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,revision,specialty,occurred_at from public.care_session_records where patient_id=pid and status='final' order by occurred_at desc,id limit 25)r),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,created_at,record_id from public.care_intervention_requests where patient_id=pid order by created_at desc,id limit 25)r),'[]'::jsonb),
 'alerts',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,kind,triggered_at from public.care_alerts where patient_id=pid order by triggered_at desc,id limit 25)r),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(r)) from(select e.id,e.title,e.professional_id,e.ends_at from public.care_events e join public.care_event_participants p on p.event_id=e.id where p.patient_id=pid and e.status<>'cancelled' and e.ends_at>=now()-interval '30 days' order by e.starts_at desc,e.id limit 25)r),'[]'::jsonb));
end $$;
create function public.care_decision_options(pid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_decision_options(pid) $$;

create function private.care_task_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare tid uuid:=(p->>'id')::uuid;did uuid;pid uuid;t private.care_delegated_tasks;d private.care_decisions;v integer:=coalesce((p->>'version')::integer,0);
 uid uuid:=nullif(p->>'assignee_id','')::uuid;ev uuid:=nullif(p->>'event_id','')::uuid;due timestamptz:=nullif(p->>'due_at','')::timestamptz;
 why text:=btrim(coalesce(p->>'reason',''));body text:=btrim(coalesce(p->>'instruction',''));res text:=btrim(coalesce(p->>'result',''));director boolean;
begin
 select * into t from private.care_delegated_tasks where id=tid;
 did:=coalesce(t.decision_id,nullif(p->>'decision_id','')::uuid);
 -- Same parent lock as closing: cannot add/execute a task while decision closes.
 perform pg_advisory_xact_lock(hashtextextended(did::text,80));
 select * into d from private.care_decisions where id=did for update;pid:=d.patient_id;
 select * into t from private.care_delegated_tasks where id=tid for update;
 director:=private.care_direction(pid);
 if tid is null or d.id is null or (not director and (t.id is null or t.assignee_id<>auth.uid() or not private.care_delegate_eligible(pid,auth.uid(),false))) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if (t.id is null and v<>0) or (t.id is not null and t.version<>v) then raise exception 'La tarea cambió; recarga' using errcode='40001';end if;
 if d.state<>'active' then raise exception 'Decisión cerrada o no finalizada';end if;
 if op='task_save' then
  if not director then raise exception 'Delegación no disponible' using errcode='42501';end if;
  if t.id is not null and t.state not in ('pending','in_progress') then raise exception 'Estado no editable';end if;
  if length(body)<3 or length(body)>300 or not private.care_delegate_eligible(pid,uid,false) or (due is not null and not isfinite(due)) or (due is not null and ev is not null) then raise exception 'Acción, responsable o fecha inválidos';end if;
  if ev is not null and not exists(select 1 from public.care_events e join public.care_event_participants a on a.event_id=e.id where e.id=ev and a.patient_id=pid and e.professional_id=uid and e.status<>'cancelled') then raise exception 'Agenda no disponible para el responsable' using errcode='42501';end if;
  if t.id is not null and (length(why)<3 or length(why)>300) then raise exception 'Explica el cambio visible al responsable';end if;
  if t.id is null then insert into private.care_delegated_tasks(id,decision_id,patient_id,assignee_id,instruction,due_at,event_id,created_by) values(tid,did,pid,uid,body,due,ev,auth.uid()) returning * into t;why:='Acción delegada';
  else update private.care_delegated_tasks set assignee_id=uid,instruction=body,due_at=due,event_id=ev,state='pending',result='',verification='',reported_at=null,version=version+1,updated_at=now() where id=tid returning * into t;end if;
 elsif op in ('task_start','task_report') then
  if t.assignee_id<>auth.uid() or not private.care_delegate_eligible(pid,auth.uid(),false) then raise exception 'Solo el responsable ejecuta' using errcode='42501';end if;
  if t.state not in ('pending','in_progress') or (op='task_report' and (length(res)<3 or length(res)>600)) then raise exception 'Estado o resultado inválido';end if;
  update private.care_delegated_tasks set state=case when op='task_start' then 'in_progress' else 'reported' end,result=case when op='task_report' then res else result end,reported_at=case when op='task_report' then now() else null end,version=version+1,updated_at=now() where id=tid returning * into t;
  why:=case when op='task_start' then 'Ejecución iniciada' else 'Resultado informado por responsable' end;
 elsif op in ('task_verify','task_return','task_cancel') then
  if not director then raise exception 'Revisión no disponible' using errcode='42501';end if;
  if length(why)<3 or length(why)>300 or (op in ('task_verify','task_return') and t.state<>'reported') or (op='task_cancel' and t.state in ('completed','cancelled')) then raise exception 'Estado o motivo inválido';end if;
  update private.care_delegated_tasks set state=case when op='task_verify' then 'completed' when op='task_return' then 'pending' else 'cancelled' end,verification=why,completed_at=case when op='task_verify' then now() else null end,version=version+1,updated_at=now() where id=tid returning * into t;
 else raise exception 'Operación inválida';end if;
 insert into private.care_task_history(task_id,version,snapshot,actor_id,reason) values(tid,t.version,to_jsonb(t),auth.uid(),why);
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.'||op,tid);return tid;
end $$;
create function public.care_task_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_task_write(op,p) $$;

create function private.care_task_read(tid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.care_delegated_tasks;director boolean;result jsonb;
begin
 select * into t from private.care_delegated_tasks where id=tid;director:=private.care_direction(t.patient_id);
 if t.id is null or (not director and (t.assignee_id<>auth.uid() or not private.care_delegate_eligible(t.patient_id,auth.uid(),false))) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 -- No decision ID, sources or deliberation is returned to a recipient.
 result:=jsonb_build_object('task',to_jsonb(t)-'decision_id','direction',director,'decision_id',case when director then t.decision_id else null end,
 'effective_due_at',case when t.event_id is null then t.due_at else (select ends_at from public.care_events where id=t.event_id and status<>'cancelled') end,
 'agenda_cancelled',t.event_id is not null and exists(select 1 from public.care_events where id=t.event_id and status='cancelled'),
 'history',coalesce((select jsonb_agg(jsonb_build_object('version',h.version,'actor_id',h.actor_id,'reason',h.reason,'recorded_at',h.recorded_at,'snapshot',h.snapshot-'decision_id') order by h.version desc) from private.care_task_history h where h.task_id=tid and (director or h.snapshot->>'assignee_id'=auth.uid()::text)),'[]'::jsonb));
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.task.read',tid);return result;
end $$;
create function public.care_task_read(tid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_task_read(tid) $$;

create function private.care_supervision(days integer default 30,page integer default 1,mode text default 'tasks',professional uuid default null,state text default 'all',pid uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz:=now();start_at timestamptz:=private.care_dashboard_start(days,cutoff);team boolean;result jsonb;
begin
 if not private.care_can('care.patient.read') or not (private.care_can('care.records.create') or private.care_can('care.records.read')) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 team:=private.care_can('care.decisions.manage') and private.care_can('care.records.read');
 if professional is not null and not team and professional<>auth.uid() then raise exception 'Profesional no disponible' using errcode='42501';end if;
 if pid is not null and not private.care_scope(pid,'care.patient.read') then raise exception 'Paciente no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>10000 or mode not in ('tasks','agenda','records','alerts') or state not in ('all','pending','overdue','reported','completed','cancelled','scheduled','in_progress','open','received','resolved') then raise exception 'Consulta inválida';end if;
 with scope as materialized(select p.id,p.display_name from public.patient_profiles p where private.care_scope(p.id,'care.patient.read') and (pid is null or p.id=pid)),
 people as materialized(select distinct u.user_id,coalesce(nullif(a.raw_user_meta_data->>'full_name',''),'Profesional') as label from public.admin_users u join auth.users a on a.id=u.user_id join public.care_assignments ca on ca.professional_id=u.user_id join scope s on s.id=ca.patient_id where u.is_active and ca.starts_at<=cutoff and (ca.ends_at is null or ca.ends_at>cutoff) and (team or u.user_id=auth.uid())),
 task_rows as(select t.id source_id,t.patient_id,s.display_name,t.instruction label,t.assignee_id professional_id,u.label professional_label,t.created_at occurred_at,case when t.event_id is null then t.due_at else e.ends_at end due_at,
 t.state,t.event_id,null::text specialty,null::uuid record_id from private.care_delegated_tasks t join scope s on s.id=t.patient_id join people u on u.user_id=t.assignee_id left join public.care_events e on e.id=t.event_id and e.status<>'cancelled'
 where (team or t.assignee_id=auth.uid()) and private.care_delegate_eligible(t.patient_id,t.assignee_id,false) and (professional is null or t.assignee_id=professional) and (t.created_at>=start_at or t.state not in ('completed','cancelled'))),
 agenda_rows as(select e.id source_id,a.patient_id,s.display_name,e.title label,e.professional_id,u.label professional_label,e.starts_at occurred_at,e.ends_at due_at,e.status state,e.id event_id,null::text specialty,null::uuid record_id
 from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.id=a.patient_id join people u on u.user_id=e.professional_id where e.starts_at>=start_at and e.starts_at<cutoff+interval '7 days' and private.care_delegate_eligible(a.patient_id,e.professional_id,false) and (team or e.professional_id=auth.uid()) and (professional is null or e.professional_id=professional)),
 record_rows as(select e.id source_id,a.patient_id,s.display_name,e.title label,e.professional_id,u.label professional_label,e.ends_at occurred_at,null::timestamptz due_at,case when r.id is null then 'pending' else 'completed' end state,e.id event_id,x.specialty,r.id record_id
 from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.id=a.patient_id join people u on u.user_id=e.professional_id
 join lateral(select distinct ca.specialty from public.care_assignments ca where ca.professional_id=e.professional_id and ca.patient_id=a.patient_id and ca.starts_at<=cutoff and (ca.ends_at is null or ca.ends_at>cutoff) and private.care_delegate_eligible(a.patient_id,ca.professional_id,false) and ((e.kind in ('group','individual') and ca.specialty='psychology') or e.kind=ca.specialty))x on true
 left join public.care_session_records r on r.patient_id=a.patient_id and r.event_id=e.id and r.author_id=e.professional_id and r.specialty=x.specialty and r.status='final'
 where e.status='completed' and e.closed_at<=cutoff and e.ends_at>=start_at and e.ends_at<=cutoff and (team or e.professional_id=auth.uid()) and (professional is null or e.professional_id=professional)
 union all select e.id,a.patient_id,s.display_name,e.title,e.professional_id,u.label,e.ends_at,null::timestamptz,case when exists(select 1 from public.care_family_records f where f.patient_id=a.patient_id and f.event_id=e.id and f.author_id=e.professional_id and f.status='final') then 'completed' else 'pending' end,e.id,'family'::text,(select f.id from public.care_family_records f where f.patient_id=a.patient_id and f.event_id=e.id and f.author_id=e.professional_id and f.status='final' limit 1)
 from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.id=a.patient_id join people u on u.user_id=e.professional_id
 where e.kind='family' and e.status='completed' and e.closed_at<=cutoff and e.ends_at>=start_at and e.ends_at<=cutoff and private.care_scope(a.patient_id,'care.family.read') and private.care_delegate_eligible(a.patient_id,e.professional_id,false)
 and exists(select 1 from public.care_staff_capabilities c where c.user_id=e.professional_id and 'care.family.read'=any(c.capabilities)) and (team or e.professional_id=auth.uid()) and (professional is null or e.professional_id=professional)),
 alert_rows as(select a.id source_id,a.patient_id,s.display_name,a.kind label,auth.uid() professional_id,'Asignada a mi alcance'::text professional_label,a.triggered_at occurred_at,null::timestamptz due_at,a.state,null::uuid event_id,null::text specialty,null::uuid record_id from public.care_alerts a join scope s on s.id=a.patient_id where private.care_scope(a.patient_id,'care.records.read') and (a.triggered_at>=start_at or a.state<>'resolved') and (professional is null or exists(select 1 from public.care_assignments ca where ca.patient_id=a.patient_id and ca.professional_id=professional and ca.starts_at<=cutoff and (ca.ends_at is null or ca.ends_at>cutoff)))),
 raw as(select * from task_rows where mode='tasks' union all select * from agenda_rows where mode='agenda' union all select * from record_rows where mode='records' union all select * from alert_rows where mode='alerts'),
 marked as(select raw.*,case when raw.state in ('pending','in_progress') and raw.due_at<cutoff then 'overdue' else raw.state end category from raw),
 filtered as(select * from marked m where care_supervision.state='all' or m.category=care_supervision.state or (care_supervision.state='pending' and m.category='in_progress')),
 paged as(select * from filtered order by (category='overdue') desc,occurred_at desc,patient_id,source_id,specialty offset (page-1)*25 limit 25)
 select jsonb_build_object('cutoff',cutoff,'start_at',start_at,'team',team,'total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),
 'summary',jsonb_build_object('total',(select count(*) from marked),'pending',(select count(*) from marked where category in ('pending','in_progress','scheduled','open','received')),'overdue',(select count(*) from marked where category='overdue'),'reported',(select count(*) from marked where category='reported'),'completed',(select count(*) from marked where category in ('completed','resolved')),'cancelled',(select count(*) from marked where category='cancelled')),
 'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'label',label) order by label,user_id) from people),'[]'::jsonb)) into result;
 if professional is not null and team and not exists(select 1 from public.care_assignments ca where ca.professional_id=professional and private.care_scope(ca.patient_id,'care.patient.read') and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now())) then raise exception 'Profesional no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action) values(auth.uid(),'care.supervision.read');return result;
end $$;
create function public.care_supervision(days integer default 30,page integer default 1,mode text default 'tasks',professional uuid default null,state text default 'all',pid uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select private.care_supervision(days,page,mode,professional,state,pid) $$;

revoke all on function private.care_direction(uuid),private.care_delegate_eligible(uuid,uuid,boolean),private.care_decision_write(text,jsonb),private.care_decision_read(uuid),private.care_decision_list(uuid,integer,text),private.care_decision_options(uuid),private.care_task_write(text,jsonb),private.care_task_read(uuid),private.care_supervision(integer,integer,text,uuid,text,uuid),public.care_decision_write(text,jsonb),public.care_decision_read(uuid),public.care_decision_list(uuid,integer,text),public.care_decision_options(uuid),public.care_task_write(text,jsonb),public.care_task_read(uuid),public.care_supervision(integer,integer,text,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function private.care_decision_write(text,jsonb),private.care_decision_read(uuid),private.care_decision_list(uuid,integer,text),private.care_decision_options(uuid),private.care_task_write(text,jsonb),private.care_task_read(uuid),private.care_supervision(integer,integer,text,uuid,text,uuid),public.care_decision_write(text,jsonb),public.care_decision_read(uuid),public.care_decision_list(uuid,integer,text),public.care_decision_options(uuid),public.care_task_write(text,jsonb),public.care_task_read(uuid),public.care_supervision(integer,integer,text,uuid,text,uuid) to authenticated;
commit;
