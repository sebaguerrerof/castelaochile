-- Step 10: additive standing authorizations; installation never schedules a job.
begin;
create table private.care_operational_rules (
 id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patient_profiles(id),
 kind text not null check(kind in ('report_omitted','commitment_overdue')),
 revision integer generated always as identity(start with 2) unique,enabled boolean not null,grace_hours integer not null check(grace_hours between 0 and 168),
 approved_by uuid not null references auth.users(id),reason text not null check(length(btrim(reason)) between 3 and 600),effective_at timestamptz not null default now()
);
create index care_operational_rule_patient on private.care_operational_rules(patient_id,kind,revision desc);
create index care_operational_rule_author on private.care_operational_rules(approved_by);
alter table public.care_alerts drop constraint care_alerts_rule_version_check;
alter table public.care_alerts add constraint care_alerts_rule_version_check check(rule_version>=1);
alter table public.care_alerts add column operational_rule_id uuid references private.care_operational_rules(id);
create index care_alert_rule on public.care_alerts(operational_rule_id);
create table private.care_jobs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 kind text not null check(kind in ('weekly','monthly','operations')),patients uuid[] not null check(cardinality(patients) between 1 and 50),
 context_key text not null,include_family boolean not null,include_decisions boolean not null,
 enabled boolean not null default true,version integer not null default 1 check(version>0),
 next_due_at timestamptz not null,reason text not null check(length(btrim(reason)) between 3 and 600),created_at timestamptz not null default now(),
 unique(owner_id,kind,context_key)
);
create index care_job_due on private.care_jobs(next_due_at,id) where enabled;
create table private.care_job_runs (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references private.care_jobs(id),job_version integer not null,
 period_key text not null,start_day date not null,state text not null default 'pending' check(state in ('pending','failed','succeeded')),
 attempts integer not null default 0 check(attempts between 0 and 5),next_attempt_at timestamptz not null default now(),
 error_code text check(error_code in ('permission','generation','database')),inform_id uuid references private.care_informs(id),
 created_at timestamptz not null default now(),finished_at timestamptz,unique(job_id,period_key)
);
create index care_job_run_due on private.care_job_runs(next_attempt_at,id) where state<>'succeeded' and attempts<5;
create index care_job_run_parent on private.care_job_runs(job_id,created_at desc,id);
create index care_job_run_inform on private.care_job_runs(inform_id);
create table private.care_job_attempts (
 id uuid primary key default gen_random_uuid(),run_id uuid not null references private.care_job_runs(id),attempt integer not null check(attempt between 1 and 5),
 started_at timestamptz not null,finished_at timestamptz not null,state text not null check(state in ('failed','succeeded')),
 error_code text check(error_code in ('permission','generation','database')),unique(run_id,attempt)
);
create table private.care_scheduler_state (
 id boolean primary key default true check(id),last_started_at timestamptz,last_finished_at timestamptz,
 last_cron_at timestamptz,ticks bigint not null default 0
);
insert into private.care_scheduler_state(id)values(true);
alter table private.care_operational_rules enable row level security;
alter table private.care_jobs enable row level security;
alter table private.care_job_runs enable row level security;
alter table private.care_job_attempts enable row level security;
alter table private.care_scheduler_state enable row level security;
revoke all on private.care_operational_rules,private.care_jobs,private.care_job_runs,private.care_job_attempts,private.care_scheduler_state from public,anon,authenticated,service_role;

create function private.care_job_can() returns boolean language sql stable security definer set search_path='' as $$
 select private.care_can('care.decisions.manage') and private.care_can('care.directory.read') and private.care_can('care.patient.read') and private.care_can('care.records.read') and private.care_can('care.reports.export')
$$;
create function private.care_job_context(patients uuid[]) returns text language sql stable security definer set search_path='' as $$
 select md5(patients::text||private.care_can('care.family.read')::text||private.care_can('care.decisions.manage')::text)
$$;
create function private.care_job_allowed(jid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_job_can() and exists(select 1 from private.care_jobs j where j.id=jid and j.owner_id=auth.uid()
 and j.context_key=private.care_job_context(j.patients) and not exists(select 1 from unnest(j.patients)pid where not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read')))
$$;
create function private.care_job_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare jid uuid:=nullif(p->>'id','')::uuid;pid uuid:=nullif(p->>'patient_id','')::uuid;kind text:=p->>'kind';patients uuid[];j private.care_jobs;
 note text:=btrim(coalesce(p->>'reason',''));expected integer:=nullif(p->>'version','')::integer;day date:=(now() at time zone 'America/Santiago')::date;start_day date;key text;result uuid;prior uuid;
begin
 if not private.care_job_can() then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if length(note) not between 3 and 600 then raise exception 'Explica brevemente esta autorización';end if;
 if op='create' then
  if (p->>'confirm')::boolean is distinct from true or kind is null or kind not in('weekly','monthly','operations') then raise exception 'Confirma la programación y el alcance';end if;
  if pid is not null and not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  select array_agg(x.id order by x.id) into patients from public.patient_profiles x where private.care_scope(x.id,'care.patient.read') and private.care_scope(x.id,'care.records.read') and (pid is null or x.id=pid);
  if patients is null or cardinality(patients)>50 then raise exception 'Selecciona un paciente; alcance vacío o superior a 50';end if;
  key:=private.care_job_context(patients);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||kind||key,100));
  select id into result from private.care_jobs where owner_id=auth.uid() and care_jobs.kind=kind and context_key=key;
  if result is not null then return result;end if;
  if (select count(*) from private.care_jobs where owner_id=auth.uid())>=25 then raise exception 'Límite de 25 programaciones por responsable';end if;
  insert into private.care_jobs(owner_id,kind,patients,context_key,include_family,include_decisions,next_due_at,reason)
  values(auth.uid(),kind,patients,key,private.care_can('care.family.read'),true,case when kind='weekly' then (date_trunc('week',day::timestamp)+interval '7 days') at time zone 'America/Santiago' when kind='monthly' then (date_trunc('month',day::timestamp)+interval '1 month') at time zone 'America/Santiago' else now() end,note) returning id into result;
 elsif op='rule' then
  if not private.care_can('care.alerts.review') or pid is null or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if kind is null or kind not in('report_omitted','commitment_overdue') or (p->>'confirm')::boolean is distinct from true or (p->>'enabled')::boolean is null or (p->>'grace_hours')::integer is null then raise exception 'Confirma una regla operativa válida';end if;
  perform pg_advisory_xact_lock(hashtextextended(pid::text||kind,101));
  select id into prior from private.care_operational_rules where patient_id=pid and care_operational_rules.kind=kind order by revision desc limit 1;
  if prior is distinct from nullif(p->>'previous','')::uuid then raise exception 'La regla cambió; recarga' using errcode='40001';end if;
  insert into private.care_operational_rules(patient_id,kind,enabled,grace_hours,approved_by,reason)values(pid,kind,(p->>'enabled')::boolean,(p->>'grace_hours')::integer,auth.uid(),note) returning id into result;
 else
  if not private.care_job_allowed(jid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
  select * into j from private.care_jobs where id=jid for update;
  if expected is null or j.version<>expected then raise exception 'La programación cambió' using errcode='40001';end if;
  result:=jid;
  if op in('pause','resume') then update private.care_jobs set enabled=(op='resume'),version=version+1,reason=note where id=jid;
  elsif op='run_now' then
   if not j.enabled then raise exception 'La programación está pausada';end if;
   start_day:=case when j.kind='weekly' then date_trunc('week',day::timestamp)::date-7 when j.kind='monthly' then (date_trunc('month',day::timestamp)-interval '1 month')::date else day end;
   key:=case when j.kind='operations' then date_trunc('minute',now())::text else start_day::text end;
   insert into private.care_job_runs(job_id,job_version,period_key,start_day) values(jid,j.version,key,start_day)on conflict(job_id,period_key)do nothing;
  elsif op='retry' then
   if not j.enabled then raise exception 'La programación está pausada';end if;
   update private.care_job_runs set state='pending',next_attempt_at=now() where id=nullif(p->>'run_id','')::uuid and job_id=jid and state='failed' and attempts<5;
   if not found then raise exception 'Intento no disponible o límite de cinco alcanzado';end if;
  else raise exception 'Acción inválida';end if;
 end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'job_'||op,result);
 return result;
end $$;
create function public.care_job_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_job_write(op,p)$$;

create function private.care_job_visible(jid uuid)returns boolean language sql stable security definer set search_path=''as $$
 select private.care_job_can()and exists(select 1 from private.care_jobs j where j.id=jid and(not j.include_family or private.care_can('care.family.read'))and not exists(select 1 from unnest(j.patients)pid where not private.care_scope(pid,'care.patient.read')or not private.care_scope(pid,'care.records.read')))
$$;
create function private.care_job_view(page integer default 1,team boolean default false,kind_filter text default 'all',state_filter text default 'all') returns jsonb language plpgsql security definer set search_path='' as $$
declare jobs jsonb;runs jsonb;rules jsonb;heartbeat jsonb;registered boolean:=false;allowed_jobs uuid[];
begin
 if not private.care_job_can() then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>10000 or kind_filter is null or kind_filter not in('all','weekly','monthly','operations')or state_filter is null or state_filter not in('all','pending','failed','succeeded')then raise exception 'Filtro o página inválidos';end if;
 select array_agg(j.id)into allowed_jobs from private.care_jobs j where(case when team then private.care_job_visible(j.id)else private.care_job_allowed(j.id)end)and(kind_filter='all'or j.kind=kind_filter);
 select coalesce(jsonb_agg((to_jsonb(j)-'context_key')||jsonb_build_object('can_control',private.care_job_allowed(j.id),'owner_label',(select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Responsable autorizado')from auth.users u where u.id=j.owner_id))||jsonb_build_object('scope',(select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name)order by p.display_name,p.id)from public.patient_profiles p where p.id=any(j.patients)))),'[]') into jobs from(select x.*from private.care_jobs x where x.id=any(allowed_jobs)order by x.created_at desc,x.id limit 25 offset(case when team then(page-1)*25 else 0 end))j;
 select coalesce(jsonb_agg(x),'[]') into runs from(select r.*,j.kind,j.enabled job_enabled,
 case when r.inform_id is not null and private.care_inform_user_allowed(r.inform_id,auth.uid())then r.inform_id end available_inform_id,
 (select coalesce(jsonb_agg(to_jsonb(a)-'id'-'run_id' order by attempt),'[]')from private.care_job_attempts a where a.run_id=r.id)history
 from private.care_job_runs r join private.care_jobs j on j.id=r.job_id where j.id=any(allowed_jobs)and(state_filter='all'or r.state=state_filter) order by r.created_at desc,r.id limit 25 offset(page-1)*25)x;
 -- A revoked report ID is never returned, including via the raw FK.
 select coalesce(jsonb_agg(r-'inform_id'),'[]') into runs from jsonb_array_elements(runs)r;
 select coalesce(jsonb_agg(to_jsonb(r) order by revision desc),'[]') into rules from (select x.*,p.display_name from private.care_operational_rules x join public.patient_profiles p on p.id=x.patient_id where private.care_can('care.alerts.review') and private.care_scope(x.patient_id,'care.patient.read') and private.care_scope(x.patient_id,'care.records.read') order by revision desc limit 100 offset(page-1)*100)r;
 if to_regclass('cron.job') is not null then execute $q$select exists(select 1 from cron.job where jobname='castelao-care-tick' and active and command='select private.care_scheduler_tick();')$q$ into registered;end if;
 select jsonb_build_object('registered',registered,'last_finished_at',last_finished_at,'last_cron_at',last_cron_at,'healthy',registered and last_cron_at>now()-interval '5 minutes')into heartbeat from private.care_scheduler_state where id;
 insert into private.care_audit(actor_id,action)values(auth.uid(),'job_read');
 return jsonb_build_object('jobs',jobs,'runs',runs,'rules',rules,'scheduler',heartbeat,'total',(select count(*)from private.care_job_runs r where r.job_id=any(allowed_jobs)and(state_filter='all'or r.state=state_filter)),'total_jobs',coalesce(cardinality(allowed_jobs),0),
 'rules_total',(select count(*)from private.care_operational_rules r where private.care_can('care.alerts.review')and private.care_scope(r.patient_id,'care.patient.read')and private.care_scope(r.patient_id,'care.records.read')));
end $$;
create function private.care_job_read(page integer default 1)returns jsonb language sql security definer set search_path=''as $$select private.care_job_view(page,false)$$;
create function public.care_job_read(page integer default 1) returns jsonb language sql security invoker set search_path='' as $$select private.care_job_read(page)$$;

create function private.care_rule_context(patients uuid[])returns jsonb language plpgsql stable security definer set search_path=''as $$
declare result jsonb;
begin
 if not private.care_job_can()or not private.care_can('care.alerts.review')or patients is null or cardinality(patients)>25 or exists(select 1 from unnest(patients)pid where not private.care_scope(pid,'care.patient.read')or not private.care_scope(pid,'care.records.read'))then raise exception 'Recurso no disponible'using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]')into result from(select distinct on(x.patient_id,x.kind)x.*,p.display_name from private.care_operational_rules x join public.patient_profiles p on p.id=x.patient_id where x.patient_id=any(patients)order by x.patient_id,x.kind,x.revision desc)r;
 return result;
end $$;
create function public.care_rule_context(patients uuid[])returns jsonb language sql security invoker set search_path=''as $$select private.care_rule_context(patients)$$;

create function private.care_scheduler_tick() returns integer language plpgsql security invoker set search_path='' as $$
declare j private.care_jobs;r private.care_job_runs;day date;key text;rid uuid;started timestamptz;code text;done integer:=0;had_report boolean;
 old_sub text:=coalesce(current_setting('request.jwt.claim.sub',true),'');old_claims text:=coalesce(current_setting('request.jwt.claims',true),'');
begin
 -- EXECUTE is owner-only; no public, authenticated or service role endpoint.
 if not pg_try_advisory_xact_lock(10101010) then return 0;end if;
 update private.care_scheduler_state set last_started_at=clock_timestamp()where id;
 for j in select * from private.care_jobs where enabled and next_due_at<=now() order by next_due_at,id limit 25 for update skip locked loop
  day:=(j.next_due_at at time zone 'America/Santiago')::date;
  if j.kind='weekly' then day:=day-7;elsif j.kind='monthly' then day:=(day-interval '1 month')::date;else day:=(now()at time zone 'America/Santiago')::date;end if;
  key:=case when j.kind='operations' then date_trunc('minute',now())::text else day::text end;
  insert into private.care_job_runs(job_id,job_version,period_key,start_day)values(j.id,j.version,key,day)on conflict(job_id,period_key)do nothing;
  update private.care_jobs set next_due_at=case when kind='weekly' then (((next_due_at at time zone 'America/Santiago')::date+7)::timestamp at time zone 'America/Santiago') when kind='monthly' then ((next_due_at at time zone 'America/Santiago')+interval '1 month')at time zone 'America/Santiago' else date_trunc('minute',now())+interval '1 minute' end where id=j.id;
 end loop;
 for r in select x.* from private.care_job_runs x join private.care_jobs cfg on cfg.id=x.job_id where cfg.enabled and x.state<>'succeeded' and x.attempts<5 and x.next_attempt_at<=now() order by x.next_attempt_at,x.id limit 25 for update of x skip locked loop
  select * into j from private.care_jobs where id=r.job_id;
  -- A queued cursor can outlive a pause committed after its selection.
  if not j.enabled then continue;end if;
  started:=clock_timestamp();rid:=null;code:=null;
  perform set_config('request.jwt.claim.sub',j.owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',j.owner_id,'role','authenticated')::text,true);
  begin
   if not private.care_job_allowed(j.id) then raise exception 'Recurso no disponible' using errcode='42501';end if;
   if j.kind='operations' then
    -- Prepare only currently open windows (today/previous-day cross-midnight); never fill missed days as omissions.
    foreach rid in array j.patients loop
     perform private.care_reports_prepare(rid,(now() at time zone 'America/Santiago')::date-1);
     perform private.care_reports_prepare(rid,(now() at time zone 'America/Santiago')::date);
    end loop;
    rid:=null;perform private.care_operational_sync(j.patients);
   else
    perform pg_advisory_xact_lock(hashtextextended(j.owner_id::text||j.kind||r.start_day::text||j.context_key,90));
    select exists(select 1 from private.care_informs where created_by=j.owner_id and kind=j.kind and start_day=r.start_day and scope_key=j.context_key)into had_report;
    rid:=private.care_inform_write('generate',jsonb_build_object('kind',j.kind,'start_day',r.start_day,'patient_ids',to_jsonb(j.patients)));
    if not had_report and current_setting('application_name')like 'pg_cron%'then
     update private.care_inform_versions set snapshot=case when jsonb_typeof(snapshot->'comparison_previous')='object'then jsonb_set(jsonb_set(snapshot,'{quality,scheduler_verified}','true'),'{comparison_previous,quality,scheduler_verified}','true')else jsonb_set(snapshot,'{quality,scheduler_verified}','true')end where inform_id=rid and revision=1;
    end if;
   end if;
  exception when others then rid:=null;code:=case when sqlstate='42501'then 'permission' when sqlstate='P0001'then 'generation'else 'database'end;
  end;
  update private.care_job_runs set attempts=attempts+1,state=case when code is null then 'succeeded'else 'failed'end,error_code=code,inform_id=rid,
  next_attempt_at=now()+make_interval(mins=>case r.attempts when 0 then 1 when 1 then 5 when 2 then 15 else 60 end),finished_at=clock_timestamp()where id=r.id;
  insert into private.care_job_attempts(run_id,attempt,started_at,finished_at,state,error_code)values(r.id,r.attempts+1,started,clock_timestamp(),case when code is null then 'succeeded'else 'failed'end,code);
  perform set_config('request.jwt.claim.sub',old_sub,true);perform set_config('request.jwt.claims',old_claims,true);
  done:=done+1;
 end loop;
 -- Expire abandoned leases; keep objects linked to their attempt, never delete ready PDFs.
 update private.care_inform_exports set state='failed',error_code='expired',finished_at=now()where state='pending'and expires_at<=now();
 update private.care_scheduler_state set last_finished_at=clock_timestamp(),ticks=ticks+1,last_cron_at=case when current_setting('application_name')like 'pg_cron%'then clock_timestamp()else last_cron_at end where id;
 return done;
end $$;

create function private.care_inform_compare(rid uuid,rev integer default null,page integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.care_informs;v private.care_inform_versions;previous_day date;previous jsonb;sources jsonb;count_sources integer;task_ids text;
begin
 if not private.care_inform_user_allowed(rid,auth.uid())then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into i from private.care_informs where id=rid;
 if i.created_by<>auth.uid() or i.include_family<>private.care_can('care.family.read') or i.include_decisions<>private.care_can('care.decisions.manage') then raise exception 'Compara con el mismo responsable y contexto de permisos' using errcode='42501';end if;
 select coalesce(string_agg(t.id::text,','order by t.id),'')into task_ids from private.care_delegated_tasks t where t.patient_id=any(i.patients)and t.assignee_id=auth.uid()and private.care_delegate_eligible(t.patient_id,auth.uid());
 if not i.include_decisions and i.scope_key<>md5(i.patients::text||i.include_family::text||i.include_decisions::text||task_ids)then raise exception 'Cambió el contexto de acciones delegadas'using errcode='42501';end if;
 if page is null or page<1 or page>1000 then raise exception 'Página inválida';end if;
 select * into v from private.care_inform_versions where inform_id=rid and revision=coalesce(rev,i.revision);
 if v.inform_id is null then raise exception 'Recurso no disponible'using errcode='42501';end if;
 previous_day:=case when i.kind='weekly' then i.start_day-7 else(i.start_day-interval '1 month')::date end;
 if previous_day<(now()at time zone 'America/Santiago')::date-366 then raise exception 'Comparación fuera del último año';end if;
 previous:=v.snapshot->'comparison_previous';
 if jsonb_typeof(previous)is distinct from 'object'then raise exception 'Regenera el informe para preparar una comparación congelada';end if;
 count_sources:=jsonb_array_length(previous->'sources');
 select coalesce(jsonb_agg(s),'[]')into sources from(select s from jsonb_array_elements(previous->'sources')with ordinality as x(s,n)where n>(page-1)*25 and n<=page*25 order by n)q;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_compare',rid);
 return jsonb_build_object('current_start',i.start_day,'current_end',i.end_day,'previous_start',previous_day,'previous_end',i.start_day,'revision',v.revision,'population',cardinality(i.patients),'data_cutoff',v.snapshot->'data_cutoff',
 'current_counts',v.snapshot->'counts','current_quality',v.snapshot->'quality','previous',(previous-'sources')||jsonb_build_object('sources',sources,'source_total',count_sources),
 'current_entries',v.snapshot->'comparison_current_entries','previous_entries',v.snapshot->'comparison_previous_entries');
end $$;
create function public.care_inform_compare(rid uuid,rev integer default null,page integer default 1)returns jsonb language sql security invoker set search_path=''as $$select private.care_inform_compare(rid,rev,page)$$;

create or replace function private.care_inform_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
  if p ? 'patient_ids' then
   if jsonb_typeof(p->'patient_ids')<>'array' or jsonb_array_length(p->'patient_ids') not between 1 and 50 or pid is not null then raise exception 'Alcance explícito inválido';end if;
   select array_agg(distinct x::uuid order by x::uuid) into patients from jsonb_array_elements_text(p->'patient_ids')x;
   if exists(select 1 from unnest(patients)id where not private.care_scope(id,'care.patient.read') or not private.care_scope(id,'care.records.read')) then raise exception 'Recurso no disponible'using errcode='42501';end if;
  else
   select array_agg(x.id order by x.id) into patients from public.patient_profiles x where private.care_scope(x.id,'care.patient.read') and (pid is null or x.id=pid);
  end if;
  if patients is null or cardinality(patients)>50 then raise exception 'Selecciona un paciente; alcance vacío o superior a 50';end if;
  -- Recipient-only task instructions have their own current visibility scope.
  select coalesce(string_agg(t.id::text,',' order by t.id),'') into task_ids from private.care_delegated_tasks t
  where t.patient_id=any(patients) and t.assignee_id=auth.uid() and private.care_delegate_eligible(t.patient_id,auth.uid());
  key:=md5(patients::text||private.care_can('care.family.read')::text||private.care_can('care.decisions.manage')::text||case when private.care_can('care.decisions.manage')then ''else task_ids end);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||kind||day::text||key,90));
  select * into i from private.care_informs where created_by=auth.uid() and care_informs.kind=kind and start_day=day and scope_key=key;
  if i.id is not null then return i.id;end if;
  snapshot:=private.care_inform_pair(patients,lo,hi,kind,day,now());
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
   snapshot:=private.care_inform_pair(i.patients,i.start_at,i.end_at,i.kind,i.start_day,now());
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
create function private.care_operational_sync(patients uuid[]) returns integer language plpgsql security definer set search_path='' as $$
declare added integer;closed integer;
begin
 with scope as materialized(select * from private.care_dashboard_scope() where patients is null or pid=any(patients)) update public.care_report_obligations o set closed_at=now() from scope s where o.patient_id=s.pid and o.closes_at<=now() and o.closed_at is null;
 get diagnostics closed=row_count;
 with scope as materialized(select * from private.care_dashboard_scope() where patients is null or pid=any(patients)), sources as(
  select o.patient_id,'report_omitted' as kind,o.id as source_id,o.closes_at as triggered_at from public.care_report_obligations o join scope s on s.pid=o.patient_id
   where o.required and o.closed_at is not null and not exists(select 1 from public.care_daily_reports r where r.id=o.id)
  union all select c.patient_id,'commitment_overdue',c.id,c.due_at from public.care_commitments c join scope s on s.pid=c.patient_id where c.status='pending' and c.due_at<now())
 insert into public.care_alerts(patient_id,kind,source_id,triggered_at,rule_version,operational_rule_id)
 select s.patient_id,s.kind,s.source_id,s.triggered_at,coalesce(r.revision,1),r.id from sources s
 left join lateral(select x.* from private.care_operational_rules x where x.patient_id=s.patient_id and x.kind=s.kind order by revision desc limit 1)r on true
 where coalesce(r.enabled,true) and s.triggered_at+make_interval(hours=>coalesce(r.grace_hours,0))<now() on conflict(patient_id,kind,source_id) do nothing;
 get diagnostics added=row_count;
 if added>0 or closed>0 then insert into private.care_audit(actor_id,action) values(auth.uid(),'care.dashboard.sync');end if;
 return added;
end $$;
create or replace function private.care_dashboard_sync() returns integer language sql security definer set search_path=''as $$select private.care_operational_sync(null)$$;
revoke all on function private.care_operational_sync(uuid[]) from public,anon,authenticated,service_role;

create function public.care_job_supervision(page integer default 1)returns jsonb language sql security invoker set search_path=''as $$select private.care_job_view(page,true)$$;
create or replace function private.care_inform_snapshot(patients uuid[],lo timestamptz,hi timestamptz,seen timestamptz) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
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
create function private.care_inform_pair(patients uuid[],lo timestamptz,hi timestamptz,kind text,day date,seen timestamptz)returns jsonb language plpgsql stable security definer set search_path=''as $$
declare previous_day date:=case when kind='weekly'then day-7 else(day-interval '1 month')::date end;current_snapshot jsonb;previous_snapshot jsonb;current_entries integer;previous_entries integer;
begin
 select private.care_inform_snapshot(patients,lo,hi,seen),case when previous_day>=(now()at time zone 'America/Santiago')::date-366 then private.care_inform_snapshot(patients,previous_day::timestamp at time zone 'America/Santiago',lo,seen)end,
 (select count(distinct e.patient_id)from public.care_episodes e where e.patient_id=any(patients)and e.created_at<=seen and e.started_at>=lo and e.started_at<hi),
 (select count(distinct e.patient_id)from public.care_episodes e where e.patient_id=any(patients)and e.created_at<=seen and e.started_at>=previous_day::timestamp at time zone 'America/Santiago'and e.started_at<lo)
 into current_snapshot,previous_snapshot,current_entries,previous_entries;
 return current_snapshot||jsonb_build_object('comparison_previous',previous_snapshot,'comparison_current_entries',current_entries,'comparison_previous_entries',previous_entries);
end $$;

create or replace function private.care_inform_read(rid uuid,rev integer default null,page integer default 1,full_sources boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.care_informs;v private.care_inform_versions;sources jsonb;history jsonb;pdf jsonb;comparison_allowed boolean:=false;task_ids text;
begin
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>1000 then raise exception 'Página inválida';end if;
 select * into i from private.care_informs where id=rid;
 select * into v from private.care_inform_versions where inform_id=rid and revision=coalesce(rev,i.revision);
 if v.inform_id is null then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if i.created_by=auth.uid()and i.include_family=private.care_can('care.family.read')and i.include_decisions=private.care_can('care.decisions.manage')then
  comparison_allowed:=coalesce(jsonb_typeof(v.snapshot->'comparison_previous')='object',false)and(case when i.kind='weekly'then i.start_day-7 else(i.start_day-interval '1 month')::date end)>=(now()at time zone 'America/Santiago')::date-366;
  if comparison_allowed and not i.include_decisions then
   select coalesce(string_agg(t.id::text,','order by t.id),'')into task_ids from private.care_delegated_tasks t where t.patient_id=any(i.patients)and t.assignee_id=auth.uid()and private.care_delegate_eligible(t.patient_id,auth.uid());
   comparison_allowed:=i.scope_key=md5(i.patients::text||i.include_family::text||i.include_decisions::text||task_ids);
  end if;
 end if;
 select coalesce(jsonb_agg(s),'[]') into sources from (select s from jsonb_array_elements(v.snapshot->'sources')with ordinality as x(s,n) where full_sources or n>(page-1)*25 and n<=page*25 order by n)q;
 select jsonb_agg(jsonb_build_object('revision',x.revision,'state',x.state,'generated_at',x.generated_at,'reason',x.reason,'reviewed_at',x.reviewed_at) order by x.revision desc) into history from private.care_inform_versions x where x.inform_id=rid;
 select jsonb_build_object('id',e.id,'state',e.state,'bytes',e.bytes,'sha256',e.sha256,'object_key',case when e.state='ready' then e.object_key end,'error_code',e.error_code) into pdf
 from private.care_inform_exports e where e.inform_id=rid and e.revision=v.revision order by (e.state='ready')desc,e.created_at desc,e.id desc limit 1;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_read',rid);
 return jsonb_build_object('inform',to_jsonb(i)-'scope_key'-'patients','version',(to_jsonb(v)-'snapshot')||jsonb_build_object('comparison_available',comparison_allowed),'history',history,'pdf',pdf,
 'snapshot',(v.snapshot-'sources'-'comparison_previous'-'comparison_current_entries'-'comparison_previous_entries')||jsonb_build_object('sources',sources,'source_total',jsonb_array_length(v.snapshot->'sources')));
end $$;
create function public.care_job_filtered(page integer default 1,team boolean default false,kind_filter text default 'all',state_filter text default 'all')returns jsonb language sql security invoker set search_path=''as $$select private.care_job_view(page,team,kind_filter,state_filter)$$;
-- Explicit deny-by-default for every new function; the scheduler has no application grant.
revoke all on function private.care_job_can(),private.care_job_context(uuid[]),private.care_job_allowed(uuid),private.care_job_write(text,jsonb),public.care_job_write(text,jsonb),private.care_job_read(integer),public.care_job_read(integer),private.care_scheduler_tick(),private.care_inform_compare(uuid,integer,integer),public.care_inform_compare(uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function private.care_job_write(text,jsonb),public.care_job_write(text,jsonb),private.care_job_read(integer),public.care_job_read(integer),private.care_inform_compare(uuid,integer,integer),public.care_inform_compare(uuid,integer,integer) to authenticated;
revoke all on function private.care_rule_context(uuid[]),public.care_rule_context(uuid[])from public,anon,authenticated,service_role;
grant execute on function private.care_rule_context(uuid[]),public.care_rule_context(uuid[])to authenticated;
revoke all on function private.care_job_visible(uuid),private.care_job_view(integer,boolean,text,text),public.care_job_supervision(integer)from public,anon,authenticated,service_role;
grant execute on function private.care_job_view(integer,boolean,text,text),public.care_job_supervision(integer)to authenticated;
revoke all on function private.care_inform_pair(uuid[],timestamptz,timestamptz,text,date,timestamptz)from public,anon,authenticated,service_role;
revoke all on function public.care_job_filtered(integer,boolean,text,text)from public,anon,authenticated,service_role;
grant execute on function public.care_job_filtered(integer,boolean,text,text)to authenticated;
commit;
