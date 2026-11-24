-- Step 9: deterministic authorized snapshots. No remote jobs or patient exports.
begin;
create table private.care_informs (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('weekly','monthly')),
 start_day date not null,end_day date not null,start_at timestamptz not null,end_at timestamptz not null,
 patients uuid[] not null check(cardinality(patients) between 1 and 50),scope_key text not null,
 include_family boolean not null,include_decisions boolean not null,contract integer not null default 1 check(contract=1),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),revision integer not null default 1,
 unique(created_by,kind,start_day,scope_key,contract),check(end_at>start_at and end_day>start_day)
);
create index care_inform_creator on private.care_informs(created_by,created_at desc,id);
create table private.care_inform_versions (
 inform_id uuid not null references private.care_informs(id),revision integer not null,
 snapshot jsonb not null,state text not null check(state in ('generated','reviewed')),
 generated_by uuid not null references auth.users(id),generated_at timestamptz not null default now(),
 reason text not null check(length(btrim(reason)) between 3 and 600),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,review_note text not null default '',
 primary key(inform_id,revision),check((state='generated' and reviewed_by is null and reviewed_at is null) or
 (state='reviewed' and reviewed_by is not null and reviewed_at is not null and length(btrim(review_note)) between 3 and 600))
);
create index care_inform_generator on private.care_inform_versions(generated_by);
create index care_inform_reviewer on private.care_inform_versions(reviewed_by);
create table private.care_inform_exports (
 id uuid primary key default gen_random_uuid(),inform_id uuid not null,revision integer not null,
 actor_id uuid not null references auth.users(id),token uuid not null default gen_random_uuid(),
 object_key text not null unique,state text not null default 'pending' check(state in ('pending','ready','failed')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '10 minutes',
 finished_at timestamptz,bytes integer,sha256 text,error_code text,
 foreign key(inform_id,revision) references private.care_inform_versions(inform_id,revision),
 check(state<>'ready' or bytes between 100 and 5242880 and sha256~'^[a-f0-9]{64}$'),
 check(error_code is null or error_code in ('render','upload','expired','finalize','permission'))
);
create index care_inform_export_parent on private.care_inform_exports(inform_id,revision,created_at desc);
create index care_inform_export_actor on private.care_inform_exports(actor_id);
create unique index care_inform_export_pending on private.care_inform_exports(inform_id,revision) where state='pending';
create unique index care_inform_export_ready on private.care_inform_exports(inform_id,revision) where state='ready';
alter table private.care_informs enable row level security;
alter table private.care_inform_versions enable row level security;
alter table private.care_inform_exports enable row level security;
revoke all on private.care_informs,private.care_inform_versions,private.care_inform_exports from public,anon,authenticated,service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('care-informs','care-informs',false,5242880,array['application/pdf']);
-- Even unrelated permissive Storage policies cannot grant application access.
create policy care_inform_storage_private on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'care-informs') with check(bucket_id<>'care-informs');

create function private.care_inform_user_allowed(rid uuid,uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select uid is not null and exists(select 1 from private.care_informs i join public.admin_users a on a.user_id=uid and a.is_active
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

create function private.care_inform_sources(patients uuid[],lo timestamptz,hi timestamptz,seen timestamptz)
 returns table(patient_id uuid,source_id uuid,metric text,category text,occurred_at timestamptz,label text,revision integer,body text,author_id uuid,carried boolean)
 language sql stable security definer set search_path='' as $$
 with events as materialized(select p.patient_id,e.*,p.attendance,p.participation from public.care_events e
 join public.care_event_participants p on p.event_id=e.id where p.patient_id=any(patients) and e.status='completed'
 and e.closed_at<=seen and e.starts_at>=lo and e.starts_at<hi and e.ends_at<=hi
 and (e.kind<>'family' or private.care_scope(p.patient_id,'care.family.read'))),
 records as materialized(select r.*,v.payload,v.revision as source_revision,v.occurred_at as source_at
 from public.care_session_records r join lateral(select v.* from private.care_record_versions v
 where v.record_id=r.id and v.recorded_at<=seen order by v.revision desc limit 1)v on true
 where r.patient_id=any(patients) and r.status='final' and v.occurred_at>=lo and v.occurred_at<hi),
 expected as materialized(select e.*,case when e.kind in ('group','individual') then 'psychology' else e.kind end specialty from events e
 where e.kind in ('group','individual','recovery','psychiatry','family') and private.care_delegate_eligible(e.patient_id,e.professional_id)
 and (e.kind='family' or exists(select 1 from public.care_assignments a where a.patient_id=e.patient_id and a.professional_id=e.professional_id
 and a.specialty=case when e.kind in ('group','individual') then 'psychology' else e.kind end
 and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())))
 and (e.kind<>'family' or exists(select 1 from public.care_staff_capabilities c where c.user_id=e.professional_id and 'care.family.read'=any(c.capabilities))))
 select e.patient_id,e.id,'attendance',e.attendance,e.starts_at,e.title,null::integer,null::text,e.professional_id,false from events e where e.kind<>'family'
 union all select e.patient_id,e.id,'records',case when exists(select 1 from public.care_session_records r
 where r.patient_id=e.patient_id and r.event_id=e.id and r.author_id=e.professional_id and r.specialty=e.specialty
 and r.status='final' and r.first_finalized_at<=seen) or e.kind='family' and exists(select 1 from public.care_family_records f
 where f.patient_id=e.patient_id and f.event_id=e.id and f.author_id=e.professional_id and f.status='final' and f.first_finalized_at<=seen)
 then 'final' else 'pending_record' end,e.ends_at,e.title,null,null,e.professional_id,false from expected e
 union all select r.patient_id,r.id,'evolution',r.payload->>'evolution',r.source_at,r.specialty,r.source_revision,
 concat_ws(E'\n',nullif('Objetivo: '||(r.payload->>'objective'),'Objetivo: '),nullif('Hechos: '||(r.payload->>'facts'),'Hechos: '),
 nullif('Avances: '||(r.payload->>'progress'),'Avances: '),nullif('Dificultades: '||(r.payload->>'difficulties'),'Dificultades: '),nullif('Próxima acción: '||(r.payload->>'next_action'),'Próxima acción: ')),r.author_id,false from records r
 union all select o.patient_id,o.id,'reports',case when r.id is null then 'omitted' when r.first_submitted_at<=o.closes_at then 'on_time' else 'late' end,
 o.closes_at,o.kind,r.version,o.local_day::text,r.author_id,false from public.care_report_obligations o
 left join public.care_daily_reports r on r.id=o.id and r.first_submitted_at<=seen
 where o.patient_id=any(patients) and o.required and o.closes_at>=lo and o.closes_at<hi
 union all select r.patient_id,r.id,'self_reports','autodeclared',o.closes_at,o.local_day::text,r.version,
 concat_ws(E'\n',nullif('Estado autodeclarado: '||(r.answers->>'state'),'Estado autodeclarado: '),nullif('Planificación: '||(r.answers->>'planning'),'Planificación: '),nullif('Compromiso: '||(r.answers->>'commitment'),'Compromiso: '),nullif('Actividades: '||(r.answers->>'activities'),'Actividades: '),nullif('Dificultades: '||(r.answers->>'difficulties'),'Dificultades: '),nullif('Herramientas: '||(r.answers->>'tools'),'Herramientas: '),nullif('Próximo plan: '||(r.answers->>'next_plan'),'Próximo plan: ')),r.author_id,false
 from public.care_daily_reports r join public.care_report_obligations o on o.id=r.id
 where r.patient_id=any(patients) and o.closes_at>=lo and o.closes_at<hi and r.first_submitted_at<=seen
 union all select c.patient_id,c.id,'commitments',case when c.status='completed' then 'completed_'||c.confirmation else 'pending' end,
 c.due_at,c.title,c.version,c.result,c.confirmed_by,false from public.care_commitments c
 where c.patient_id=any(patients) and c.due_at>=lo and c.due_at<hi and c.status<>'cancelled'
 union all select a.patient_id,a.id,'alerts',a.kind||'_'||a.state,a.triggered_at,a.kind,a.version,null,a.updated_by,a.triggered_at<lo
 from public.care_alerts a where a.patient_id=any(patients) and a.triggered_at<hi and (a.triggered_at>=lo or a.state<>'resolved')
 union all select r.patient_id,s.record_id,'summaries',s.visibility,s.recorded_at,'Resumen compartido',s.revision,s.body,r.author_id,false
 from public.care_record_summaries s join public.care_session_records r on r.id=s.record_id
 where r.patient_id=any(patients) and s.recorded_at>=lo and s.recorded_at<hi and s.recorded_at<=seen
 union all select a.patient_id,a.id,'autonomy',v.payload->>'status',v.occurred_at,a.dimension,v.revision,v.payload->>'evidence',a.author_id,false
 from public.care_autonomy_observations a join lateral(select v.* from private.care_autonomy_versions v where v.observation_id=a.id and v.recorded_at<=seen order by v.revision desc limit 1)v on true
 where a.patient_id=any(patients) and a.status='final' and v.occurred_at>=lo and v.occurred_at<hi
 union all select f.patient_id,f.id,'family','final',v.occurred_at,'Sesión familiar',v.revision,v.payload->>'objective',f.author_id,false
 from public.care_family_records f join lateral(select v.* from private.care_family_versions v where v.record_id=f.id and v.recorded_at<=seen order by v.revision desc limit 1)v on true
 where f.patient_id=any(patients) and private.care_scope(f.patient_id,'care.family.read') and f.status='final' and v.occurred_at>=lo and v.occurred_at<hi
 union all select f.patient_id,a.record_id,'family_agreements',a.state,a.due_at,a.title,a.source_revision,a.result,f.author_id,a.due_at<lo
 from private.care_family_agreements a join public.care_family_records f on f.id=a.record_id
 where f.patient_id=any(patients) and private.care_scope(f.patient_id,'care.family.read') and f.status='final' and a.state<>'cancelled'
 and (a.due_at>=lo and a.due_at<hi or a.due_at<hi and a.state='pending')
 union all select d.patient_id,d.id,'decisions',d.state,coalesce(d.planned_at,d.created_at),'Decisión de dirección',d.revision,d.decision||case when d.result<>'' then E'\nResultado: '||d.result else '' end,d.responsible_id,d.created_at<lo
 from private.care_decisions d where d.patient_id=any(patients) and private.care_direction(d.patient_id) and d.revision>0
 and d.created_at<seen and (d.planned_at>=lo and d.planned_at<hi or d.state='active' and d.planned_at<hi)
 union all select t.patient_id,t.id,'tasks',t.state,coalesce(t.due_at,e.ends_at,t.created_at),t.instruction,t.version,
 nullif(concat_ws(E'\n',nullif(t.result,''),nullif(t.verification,'')),''),t.assignee_id,t.created_at<lo
 from private.care_delegated_tasks t left join public.care_events e on e.id=t.event_id and e.status<>'cancelled'
 where t.patient_id=any(patients) and (private.care_direction(t.patient_id) or t.assignee_id=auth.uid() and private.care_delegate_eligible(t.patient_id,auth.uid()))
 and (t.created_at>=lo and t.created_at<hi or t.created_at<hi and t.state in ('pending','in_progress','reported'))
 union all select r.patient_id,r.id,'requests',r.state,r.created_at,'Solicitud de intervención',r.source_revision,r.body,r.requested_by,r.created_at<lo
 from public.care_intervention_requests r where r.patient_id=any(patients) and private.care_direction(r.patient_id)
 and (r.created_at>=lo and r.created_at<hi or r.created_at<hi and r.state='open')
 union all select r.patient_id,r.id,'followup',case when r.review_at>seen then r.color else 'gray' end,r.occurred_at,'Valoración profesional',r.revision::integer,
 'Próxima revisión: '||to_char(r.review_at at time zone 'America/Santiago','YYYY-MM-DD HH24:MI'),r.actor_id,r.occurred_at<lo
 from public.care_followup_reviews r where r.patient_id=any(patients) and r.id=(select x.id from public.care_followup_reviews x
 where x.patient_id=r.patient_id and x.occurred_at<hi order by x.revision desc limit 1)
$$;

create function private.care_inform_snapshot(patients uuid[],lo timestamptz,hi timestamptz,seen timestamptz) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare rows jsonb;counts jsonb;people jsonb;quality jsonb;needs_review jsonb;n integer;
begin
 with sources as materialized(select * from private.care_inform_sources(patients,lo,hi,seen)),
 enriched as(select s.*,p.display_name,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Autor no identificado') author_label
 from sources s join public.patient_profiles p on p.id=s.patient_id left join auth.users u on u.id=s.author_id)
 select coalesce(jsonb_agg(to_jsonb(e) order by e.occurred_at,e.patient_id,e.metric,e.source_id),'[]'),count(*) into rows,n from enriched e;
 if n>1000 then raise exception 'El alcance supera 1000 fuentes. Genera un informe individual.';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by metric,category),'[]') into counts from
 (select metric,category,count(*)::integer n from jsonb_to_recordset(rows)as s(metric text,category text,carried boolean)
 where not carried group by metric,category)x;
 select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name) order by p.display_name,p.id) into people from public.patient_profiles p where p.id=any(patients);
 select coalesce(jsonb_agg(jsonb_build_object('id',x.patient_id,'display_name',x.display_name,'reasons',x.reasons) order by x.display_name,x.patient_id),'[]') into needs_review from
 (select s.patient_id,p.display_name,jsonb_agg(distinct s.reason)reasons from
 (select patient_id,case
 when metric='records' and category='pending_record' then 'Registro de sesión pendiente'
 when metric='reports' and category in('omitted','late') then 'Reporte omitido o tardío'
 when metric='alerts' and category not like '%_resolved' then 'Alerta operativa sin resolver'
 when metric='requests' and category='open' then 'Solicitud de intervención pendiente'
 when metric='tasks' and category in('pending','in_progress','reported') then 'Acción delegada pendiente de verificación'
 when metric='family_agreements' and category='pending' then 'Acuerdo familiar pendiente'
 when metric='followup' and category in('red','yellow','gray') then 'Valoración profesional por revisar'
 end reason from jsonb_to_recordset(rows)as r(patient_id uuid,metric text,category text))s
 join public.patient_profiles p on p.id=s.patient_id where s.reason is not null group by s.patient_id,p.display_name)x;
 select jsonb_build_object('without_obligations',(select count(*) from unnest(patients)pid where not exists(select 1 from public.care_report_obligations o where o.patient_id=pid and o.closes_at>=lo and o.closes_at<hi)),
 'unrecorded_attendance',(select count(*) from jsonb_to_recordset(rows)as s(metric text,category text) where metric='attendance' and category='pending'),
 'pending_records',(select count(*) from jsonb_to_recordset(rows)as s(metric text,category text) where metric='records' and category='pending_record'),
 'scheduler_verified',false,'family_included',private.care_can('care.family.read'),'decisions_included',private.care_can('care.decisions.manage')) into quality;
 return jsonb_build_object('contract',1,'data_cutoff',seen,'population',cardinality(patients),'patients',people,'needs_review',needs_review,'counts',counts,'quality',quality,'sources',rows);
end $$;

create function private.care_inform_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare kind text:=p->>'kind';day date;until_day date;lo timestamptz;hi timestamptz;pid uuid:=nullif(p->>'patient_id','')::uuid;
 patients uuid[];key text;task_ids text;rid uuid:=nullif(p->>'id','')::uuid;i private.care_informs;v private.care_inform_versions;snapshot jsonb;expected integer:=(p->>'version')::integer;note text:=btrim(coalesce(p->>'reason',''));
begin
 if auth.uid() is null or not private.care_can('care.directory.read') or not private.care_can('care.patient.read') or not private.care_can('care.records.read') or not private.care_can('care.reports.export') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if op='generate' then
  if kind not in ('weekly','monthly') or kind is null then raise exception 'Periodo inválido';end if;
  day:=coalesce(nullif(p->>'start_day','')::date,case when kind='weekly' then date_trunc('week',now() at time zone 'America/Santiago')::date-7 else (date_trunc('month',now() at time zone 'America/Santiago')-interval '1 month')::date end);
  if not isfinite(day) or (kind='weekly' and extract(isodow from day)<>1) or (kind='monthly' and extract(day from day)<>1) then raise exception 'Selecciona lunes o primer día del mes';end if;
  until_day:=case when kind='weekly' then day+7 else (day+interval '1 month')::date end;
  lo:=day::timestamp at time zone 'America/Santiago';hi:=until_day::timestamp at time zone 'America/Santiago';
  if hi>now() or day<(now() at time zone 'America/Santiago')::date-366 then raise exception 'Solo periodos cerrados del último año';end if;
  if pid is not null and not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  select array_agg(x.id order by x.id) into patients from public.patient_profiles x where private.care_scope(x.id,'care.patient.read') and (pid is null or x.id=pid);
  if patients is null or cardinality(patients)>50 then raise exception 'Selecciona un paciente; alcance vacío o superior a 50';end if;
  -- Recipient-only task instructions have their own current visibility scope.
  select coalesce(string_agg(t.id::text,',' order by t.id),'') into task_ids from private.care_delegated_tasks t
  where t.patient_id=any(patients) and t.assignee_id=auth.uid() and private.care_delegate_eligible(t.patient_id,auth.uid());
  key:=md5(patients::text||private.care_can('care.family.read')::text||private.care_can('care.decisions.manage')::text||case when private.care_can('care.decisions.manage')then ''else task_ids end);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||kind||day::text||key,90));
  select * into i from private.care_informs where created_by=auth.uid() and care_informs.kind=kind and start_day=day and scope_key=key;
  if i.id is not null then return i.id;end if;
  snapshot:=private.care_inform_snapshot(patients,lo,hi,now());
  insert into private.care_informs(kind,start_day,end_day,start_at,end_at,patients,scope_key,include_family,include_decisions,created_by)
  values(kind,day,until_day,lo,hi,patients,key,private.care_can('care.family.read'),private.care_can('care.decisions.manage'),auth.uid()) returning id into rid;
  insert into private.care_inform_versions(inform_id,revision,snapshot,state,generated_by,reason)values(rid,1,snapshot,'generated',auth.uid(),'Generación determinista inicial');
 else
  if rid is null or not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(rid::text,91));select * into i from private.care_informs where id=rid for update;
  if expected is null or i.revision<>expected then raise exception 'El informe cambió' using errcode='40001';end if;
  if length(note) not between 3 and 600 then raise exception 'Explica brevemente la revisión';end if;
  select * into v from private.care_inform_versions where inform_id=rid and revision=i.revision;
  if op='regenerate' then
   if i.created_by<>auth.uid() then raise exception 'Solo generador original' using errcode='42501';end if;
   if i.include_family<>private.care_can('care.family.read') or i.include_decisions<>private.care_can('care.decisions.manage') then raise exception 'Cambió el contexto de permisos; genera otro informe con tu alcance actual';end if;
   select coalesce(string_agg(t.id::text,',' order by t.id),'') into task_ids from private.care_delegated_tasks t
   where t.patient_id=any(i.patients) and t.assignee_id=auth.uid() and private.care_delegate_eligible(t.patient_id,auth.uid());
   if not i.include_decisions and i.scope_key<>md5(i.patients::text||i.include_family::text||i.include_decisions::text||task_ids)then raise exception 'Cambió el alcance de acciones delegadas; genera otro informe';end if;
   snapshot:=private.care_inform_snapshot(i.patients,i.start_at,i.end_at,now());
   insert into private.care_inform_versions(inform_id,revision,snapshot,state,generated_by,reason)values(rid,i.revision+1,snapshot,'generated',auth.uid(),note);
  elsif op='review' then
   if v.state<>'generated' or (p->>'confirm_review')::boolean is distinct from true then raise exception 'Confirma revisar las fuentes del informe generado';end if;
   insert into private.care_inform_versions(inform_id,revision,snapshot,state,generated_by,generated_at,reason,reviewed_by,reviewed_at,review_note)
   values(rid,i.revision+1,v.snapshot,'reviewed',v.generated_by,v.generated_at,'Revisión explícita del informe',auth.uid(),now(),note);
  else raise exception 'Acción inválida';end if;
  update private.care_informs set revision=revision+1 where id=rid;
 end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_'||op,rid);
 return rid;
end $$;
create function public.care_inform_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_inform_write(op,p)$$;

create function private.care_inform_read(rid uuid,rev integer default null,page integer default 1,full_sources boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.care_informs;v private.care_inform_versions;sources jsonb;history jsonb;pdf jsonb;
begin
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>1000 then raise exception 'Página inválida';end if;
 select * into i from private.care_informs where id=rid;
 select * into v from private.care_inform_versions where inform_id=rid and revision=coalesce(rev,i.revision);
 if v.inform_id is null then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select coalesce(jsonb_agg(s),'[]') into sources from (select s from jsonb_array_elements(v.snapshot->'sources')with ordinality as x(s,n) where full_sources or n>(page-1)*25 and n<=page*25 order by n)q;
 select jsonb_agg(jsonb_build_object('revision',x.revision,'state',x.state,'generated_at',x.generated_at,'reason',x.reason,'reviewed_at',x.reviewed_at) order by x.revision desc) into history from private.care_inform_versions x where x.inform_id=rid;
 select jsonb_build_object('id',e.id,'state',e.state,'bytes',e.bytes,'sha256',e.sha256,'object_key',case when e.state='ready' then e.object_key end,'error_code',e.error_code) into pdf
 from private.care_inform_exports e where e.inform_id=rid and e.revision=v.revision order by (e.state='ready')desc,e.created_at desc,e.id desc limit 1;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_read',rid);
 return jsonb_build_object('inform',to_jsonb(i)-'scope_key'-'patients','version',to_jsonb(v)-'snapshot','history',history,'pdf',pdf,
 'snapshot',(v.snapshot-'sources')||jsonb_build_object('sources',sources,'source_total',jsonb_array_length(v.snapshot->'sources')));
end $$;
create function public.care_inform_read(rid uuid,rev integer default null,page integer default 1,full_sources boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.care_inform_read(rid,rev,page,full_sources)$$;

create function private.care_inform_list(page integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare total integer;rows jsonb;
begin
 if not private.care_can('care.reports.export') or not private.care_can('care.patient.read') or not private.care_can('care.records.read') or not private.care_can('care.directory.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>1000 then raise exception 'Página inválida';end if;
 select count(*) into total from private.care_informs i where private.care_inform_user_allowed(i.id,auth.uid());
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (select i.id,i.kind,i.start_day,i.end_day,i.revision,v.state,cardinality(i.patients)population
 from private.care_informs i join private.care_inform_versions v on v.inform_id=i.id and v.revision=i.revision
 where private.care_inform_user_allowed(i.id,auth.uid()) order by i.created_at desc,i.id limit 25 offset (page-1)*25)x;
 return jsonb_build_object('total',total,'rows',rows);
end $$;
create function public.care_inform_list(page integer default 1) returns jsonb language sql security invoker set search_path='' as $$select private.care_inform_list(page)$$;

create function private.care_inform_pdf_begin(rid uuid,rev integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare e private.care_inform_exports;new_id uuid:=gen_random_uuid();
begin
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if not exists(select 1 from private.care_inform_versions where inform_id=rid and revision=rev) then raise exception 'Revisión inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text||rev::text,92));
 select * into e from private.care_inform_exports where inform_id=rid and revision=rev and state='ready';
 if e.id is not null then return to_jsonb(e)-'token';end if;
 select * into e from private.care_inform_exports where inform_id=rid and revision=rev and state='pending';
 if e.id is not null and e.expires_at>now() then raise exception 'Exportación en curso' using errcode='55P03';end if;
 update private.care_inform_exports set state='failed',error_code='expired',finished_at=now() where inform_id=rid and revision=rev and state='pending';
 if (select count(*) from private.care_inform_exports where inform_id=rid and revision=rev)>=5 then raise exception 'Cinco intentos fallidos; revisar operación antes de regenerar';end if;
 insert into private.care_inform_exports(id,inform_id,revision,actor_id,object_key)values(new_id,rid,rev,auth.uid(),rid::text||'/'||rev::text||'/'||new_id::text||'.pdf') returning * into e;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_pdf_begin',rid);
 return to_jsonb(e);
end $$;
create function public.care_inform_pdf_begin(rid uuid,rev integer) returns jsonb language sql security invoker set search_path='' as $$select private.care_inform_pdf_begin(rid,rev)$$;

-- Only the server service client can commit Storage bytes. User JWTs cannot forge readiness.
create function private.care_inform_pdf_finish(eid uuid,lease uuid,success boolean,byte_count integer default null,digest text default null,code text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare e private.care_inform_exports;
begin
 select * into e from private.care_inform_exports where id=eid for update;
 if e.id is null or e.token<>lease or e.state<>'pending' or e.expires_at<=now() then raise exception 'Intento inválido';end if;
 if not private.care_inform_user_allowed(e.inform_id,e.actor_id) then success:=false;code:='permission';end if;
 if success then
  if byte_count is null or byte_count not between 100 and 5242880 or digest is null or digest!~'^[a-f0-9]{64}$' or not exists(select 1 from storage.objects o where o.bucket_id='care-informs' and o.name=e.object_key and (o.metadata->>'size')::bigint=byte_count and o.metadata->>'mimetype'='application/pdf') then raise exception 'PDF no verificado en Storage';end if;
  update private.care_inform_exports set state='ready',finished_at=now(),bytes=byte_count,sha256=digest where id=eid;
 else
  if code not in ('render','upload','expired','finalize','permission') or code is null then code:='finalize';end if;
  update private.care_inform_exports set state='failed',finished_at=now(),error_code=code where id=eid;
 end if;
 insert into private.care_audit(actor_id,action,resource_id)values(e.actor_id,case when success then 'inform_pdf_ready' else 'inform_pdf_failed' end,e.inform_id);
 return success;
end $$;
create function public.care_inform_pdf_finish(eid uuid,lease uuid,success boolean,byte_count integer default null,digest text default null,code text default null) returns boolean language sql security invoker set search_path='' as $$select private.care_inform_pdf_finish(eid,lease,success,byte_count,digest,code)$$;

create function private.care_inform_download(rid uuid,rev integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select jsonb_build_object('object_key',e.object_key,'bytes',e.bytes,'sha256',e.sha256,'kind',i.kind,'start_day',i.start_day) into result
 from private.care_inform_exports e join private.care_informs i on i.id=e.inform_id where e.inform_id=rid and e.revision=rev and e.state='ready';
 if result is null then raise exception 'PDF no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_pdf_download',rid);
 return result;
end $$;
create function public.care_inform_download(rid uuid,rev integer) returns jsonb language sql security invoker set search_path='' as $$select private.care_inform_download(rid,rev)$$;

revoke all on function private.care_inform_user_allowed(uuid,uuid),private.care_inform_sources(uuid[],timestamptz,timestamptz,timestamptz),private.care_inform_snapshot(uuid[],timestamptz,timestamptz,timestamptz),private.care_inform_write(text,jsonb),public.care_inform_write(text,jsonb),private.care_inform_read(uuid,integer,integer,boolean),public.care_inform_read(uuid,integer,integer,boolean),private.care_inform_list(integer),public.care_inform_list(integer),private.care_inform_pdf_begin(uuid,integer),public.care_inform_pdf_begin(uuid,integer),private.care_inform_pdf_finish(uuid,uuid,boolean,integer,text,text),public.care_inform_pdf_finish(uuid,uuid,boolean,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function private.care_inform_write(text,jsonb),public.care_inform_write(text,jsonb),private.care_inform_read(uuid,integer,integer,boolean),public.care_inform_read(uuid,integer,integer,boolean),private.care_inform_list(integer),public.care_inform_list(integer),private.care_inform_pdf_begin(uuid,integer),public.care_inform_pdf_begin(uuid,integer) to authenticated;
grant execute on function private.care_inform_pdf_finish(uuid,uuid,boolean,integer,text,text),public.care_inform_pdf_finish(uuid,uuid,boolean,integer,text,text) to service_role;
revoke all on function private.care_inform_download(uuid,integer),public.care_inform_download(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.care_inform_download(uuid,integer),public.care_inform_download(uuid,integer) to authenticated;
commit;
