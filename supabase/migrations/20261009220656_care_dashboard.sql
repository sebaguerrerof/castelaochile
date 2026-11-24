-- Local dashboard: operational rules v1, no clinical automation or scheduler.
begin;
create table public.care_followup_reviews (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patient_profiles(id),
 revision bigint generated always as identity unique, color text not null check(color in ('green','yellow','red')),
 occurred_at timestamptz not null, review_at timestamptz not null, actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), check(review_at>occurred_at)
);
create index care_followup_patient on public.care_followup_reviews(patient_id,revision desc);
create index care_followup_actor on public.care_followup_reviews(actor_id);
create table private.care_followup_notes (
 review_id uuid primary key references public.care_followup_reviews(id), reason text not null check(length(btrim(reason)) between 3 and 600),
 record_id uuid not null references public.care_session_records(id), record_revision integer not null check(record_revision>0)
);
create index care_followup_record on private.care_followup_notes(record_id);
create table public.care_alerts (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patient_profiles(id),
 kind text not null check(kind in ('report_omitted','commitment_overdue')), source_id uuid not null,
 rule_version integer not null default 1 check(rule_version=1), triggered_at timestamptz not null,
 created_at timestamptz not null default now(), state text not null default 'open' check(state in ('open','received','resolved')),
 version integer not null default 1, updated_by uuid references auth.users(id), updated_at timestamptz not null default now(),
 unique(patient_id,kind,source_id)
);
create index care_alert_patient_state on public.care_alerts(patient_id,state,triggered_at desc);
create index care_alert_actor on public.care_alerts(updated_by);
create table private.care_alert_history (
 id uuid primary key default gen_random_uuid(), alert_id uuid not null references public.care_alerts(id), version integer not null,
 state text not null, reason text not null check(length(btrim(reason)) between 3 and 600), actor_id uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(), unique(alert_id,version)
);
create index care_alert_history_actor on private.care_alert_history(actor_id);
alter table public.care_followup_reviews enable row level security;
alter table private.care_followup_notes enable row level security;
alter table public.care_alerts enable row level security;
alter table private.care_alert_history enable row level security;
revoke all on public.care_followup_reviews,private.care_followup_notes,public.care_alerts,private.care_alert_history from public,anon,authenticated,service_role;
grant select on public.care_followup_reviews,public.care_alerts to authenticated;
create policy care_followup_read on public.care_followup_reviews for select to authenticated using(private.care_scope(patient_id,'care.patient.read') and private.care_scope(patient_id,'care.records.read'));
create policy care_alert_read on public.care_alerts for select to authenticated using(private.care_scope(patient_id,'care.patient.read') and private.care_scope(patient_id,'care.records.read'));

create function private.care_dashboard_scope() returns table(pid uuid) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.care_can('care.directory.read') or not private.care_can('care.patient.read') or not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return query select distinct a.patient_id from public.care_assignments a where a.professional_id=auth.uid() and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now());
end $$;
create function private.care_dashboard_start(days integer,cutoff timestamptz) returns timestamptz language plpgsql stable security invoker set search_path='' as $$
begin
 if days is null or days not in (7,30,90) or cutoff is null or not isfinite(cutoff) or cutoff>now() then raise exception 'Periodo inválido';end if;
 -- midnight may be skipped at the spring transition: the IANA day starts at 01:00 then.
 return (((cutoff at time zone 'America/Santiago')::date-(days-1))::timestamp at time zone 'America/Santiago');
end $$;
create function private.care_dashboard_instant(civil timestamp) returns timestamptz language plpgsql stable security invoker set search_path='' as $$
begin return private.care_civil_instant(civil);exception when others then return null;end $$;
create function private.care_dashboard_quality(days integer,cutoff timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at timestamptz:=private.care_dashboard_start(days,cutoff);missing bigint;invalid bigint;unconfigured bigint;
begin
 -- Set-based windows: no per-patient RPC loop and no retrospective generated rows.
 with scope as materialized(select * from private.care_dashboard_scope()),
 slots as (select s.pid,d::date as day,k.kind,en.starts_on,en.ends_on,r.weekdays,r.basis,ex.id as exempt_id,
  private.care_dashboard_instant(d::date+coalesce(w.opens_local,r.opens_local)) as opens,
  private.care_dashboard_instant((d::date+case when coalesce(w.close_next_day,r.close_next_day) then 1 else 0 end)+coalesce(w.closes_local,r.closes_local)) as closes
  from scope s join public.care_report_enrolments en on en.patient_id=s.pid
  cross join generate_series((start_at at time zone 'America/Santiago')::date-1,(cutoff at time zone 'America/Santiago')::date,interval '1 day') d
  cross join (values('morning'),('evening')) k(kind)
  left join lateral(select rr.* from public.care_report_rules rr where rr.kind=k.kind and rr.effective_on<=d::date order by rr.effective_on desc,rr.revision desc limit 1)r on true
  left join lateral(select x.id from public.care_report_exemptions x where x.patient_id=s.pid and d::date between x.starts_on and x.ends_on and x.kind in (k.kind,'both') and x.opens_local is null order by x.revision desc limit 1)ex on true
  left join lateral(select x.* from public.care_report_exemptions x where x.patient_id=s.pid and d::date between x.starts_on and x.ends_on and x.kind=k.kind and x.opens_local is not null order by x.revision desc limit 1)w on true
  where d::date>=en.starts_on and (en.ends_on is null or d::date<=en.ends_on)),
 eligible as(select t.* from slots t where t.exempt_id is null and extract(isodow from t.day)::integer=any(t.weekdays)
  and (t.opens is null or exists(select 1 from public.care_episodes e where e.patient_id=t.pid and e.started_at<=t.opens and (e.ended_at is null or e.ended_at>t.opens)
   and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=t.opens order by h.effective_at desc,h.version desc limit 1)='active'))
  and (t.basis='active_days' or exists(select 1 from public.care_events e join public.care_event_participants p on p.event_id=e.id where p.patient_id=t.pid and e.status<>'cancelled' and (e.starts_at at time zone 'America/Santiago')::date=t.day)))
 select count(*) filter(where t.closes>=start_at and t.closes<=cutoff and not exists(select 1 from public.care_report_obligations o where o.patient_id=t.pid and o.local_day=t.day and o.kind=t.kind)),
  count(*) filter(where t.day>=(start_at at time zone 'America/Santiago')::date and (t.opens is null or t.closes is null)) into missing,invalid from eligible t;
 select count(*) into unconfigured from private.care_dashboard_scope() s join public.care_report_enrolments en on en.patient_id=s.pid
  where en.starts_on<=(cutoff at time zone 'America/Santiago')::date and (en.ends_on is null or en.ends_on>=(start_at at time zone 'America/Santiago')::date)
  and exists(select 1 from (values('morning'),('evening'))k(kind) where not exists(select 1 from public.care_report_rules r where r.kind=k.kind and r.effective_on<=(cutoff at time zone 'America/Santiago')::date));
 return jsonb_build_object('missing_windows',missing,'invalid_windows',invalid,'unconfigured_patients',unconfigured,'scheduler_verified',false);
end $$;
create function private.care_dashboard_sync() returns integer language plpgsql security definer set search_path='' as $$
declare added integer;closed integer;
begin
 with scope as materialized(select * from private.care_dashboard_scope()) update public.care_report_obligations o set closed_at=now() from scope s where o.patient_id=s.pid and o.closes_at<=now() and o.closed_at is null;
 get diagnostics closed=row_count;
 with scope as materialized(select * from private.care_dashboard_scope()), sources as(
  select o.patient_id,'report_omitted' as kind,o.id as source_id,o.closes_at as triggered_at from public.care_report_obligations o join scope s on s.pid=o.patient_id
   where o.required and o.closed_at is not null and not exists(select 1 from public.care_daily_reports r where r.id=o.id)
  union all select c.patient_id,'commitment_overdue',c.id,c.due_at from public.care_commitments c join scope s on s.pid=c.patient_id where c.status='pending' and c.due_at<now())
 insert into public.care_alerts(patient_id,kind,source_id,triggered_at) select patient_id,kind,source_id,triggered_at from sources on conflict(patient_id,kind,source_id) do nothing;
 get diagnostics added=row_count;
 if added>0 or closed>0 then insert into private.care_audit(actor_id,action) values(auth.uid(),'care.dashboard.sync');end if;
 return added;
end $$;
create function public.care_dashboard_sync() returns integer language sql security invoker set search_path='' as $$select private.care_dashboard_sync()$$;
create function private.care_followup_manage(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid:=(p->>'patient_id')::uuid;rid uuid;previous bigint;source_revision integer;v public.care_alerts;stamp timestamptz;review timestamptz;why text:=btrim(p->>'reason');
begin
 if op='assessment' then
  if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read') or not private.care_scope(pid,'care.alerts.review') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('care.followup:'||pid::text,0));
  select revision into previous from public.care_followup_reviews where patient_id=pid order by revision desc limit 1;
  if coalesce(previous,0) is distinct from (p->>'version')::bigint then raise exception 'La valoración cambió' using errcode='40001';end if;
  stamp:=(p->>'occurred_at')::timestamptz;review:=(p->>'review_at')::timestamptz;
  if stamp is null or review is null or not isfinite(stamp) or not isfinite(review) or stamp>now() or review<=now() or (p->>'color') not in ('green','yellow','red')
   or coalesce(length(why),0) not between 3 and 600 or not coalesce((p->>'confirm_approved')::boolean,false) then raise exception 'Valoración, motivo, vigencia y confirmación requeridos';end if;
  select r.revision into source_revision from public.care_session_records r where r.id=(p->>'record_id')::uuid and r.patient_id=pid and r.status='final' for share;
  if not found then raise exception 'Selecciona evidencia finalizada del paciente';end if;
  insert into public.care_followup_reviews(patient_id,color,occurred_at,review_at,actor_id) values(pid,p->>'color',stamp,review,auth.uid()) returning id into rid;
  insert into private.care_followup_notes(review_id,reason,record_id,record_revision) values(rid,why,(p->>'record_id')::uuid,source_revision);
 elsif op in ('receive','resolve') then
  select * into v from public.care_alerts where id=(p->>'id')::uuid for update;
  if v.id is null or not private.care_scope(v.patient_id,'care.patient.read') or not private.care_scope(v.patient_id,'care.records.read') or not private.care_scope(v.patient_id,'care.alerts.review') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if v.version is distinct from (p->>'version')::integer then raise exception 'La alerta cambió' using errcode='40001';end if;
  if v.state='resolved' or (op='receive' and v.state<>'open') or coalesce(length(why),0) not between 3 and 600 then raise exception 'Estado o motivo inválido';end if;
  update public.care_alerts set state=case when op='resolve' then 'resolved' else 'received' end,version=version+1,updated_by=auth.uid(),updated_at=now() where id=v.id returning id into rid;
  insert into private.care_alert_history(alert_id,version,state,reason,actor_id) values(rid,v.version+1,case when op='resolve' then 'resolved' else 'received' end,why,auth.uid());
 else raise exception 'Operación no disponible';end if;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.followup.'||op,rid);return rid;
end $$;
create function public.care_followup_manage(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_followup_manage(op,p)$$;
create function private.care_followup_read(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.followup.read',pid);
 return jsonb_build_object('cutoff',now(),'reviews',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('reason',n.reason,'record_id',n.record_id,'record_revision',n.record_revision) order by r.revision desc) from public.care_followup_reviews r join private.care_followup_notes n on n.review_id=r.id where r.patient_id=pid),'[]'::jsonb),
  'alerts',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('history',coalesce((select jsonb_agg(to_jsonb(h) order by h.version desc) from private.care_alert_history h where h.alert_id=a.id),'[]'::jsonb)) order by a.triggered_at desc) from public.care_alerts a where a.patient_id=pid),'[]'::jsonb));
end $$;
create function public.care_followup_read(pid uuid) returns jsonb language sql security invoker set search_path='' as $$select private.care_followup_read(pid)$$;

-- Only metadata sources are returned; never clinical payloads, drafts or reserves.
create function private.care_dashboard_sources(metric text,days integer,category text default '',page integer default 1,day date default null,cutoff timestamptz default now()) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at timestamptz:=private.care_dashboard_start(days,cutoff);result jsonb;total bigint;
begin
 if page is null or page<1 or page>10000 or metric not in ('attendance','reports','records') then raise exception 'Consulta inválida';end if;
 with scope as materialized(select * from private.care_dashboard_scope()), rows as(
  select a.patient_id,p.display_name,e.id as source_id,e.starts_at as occurred_at,e.title as label,a.attendance as category,e.professional_id,null::text as specialty,null::date as local_day
   from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.pid=a.patient_id join public.patient_profiles p on p.id=a.patient_id
   where metric='attendance' and e.status='completed' and e.closed_at<=cutoff and e.ends_at<=cutoff and e.starts_at>=start_at and e.starts_at<cutoff
  union all select o.patient_id,p.display_name,o.id,o.closes_at,o.kind,case when r.id is null then 'omitted' when r.first_submitted_at<=o.closes_at then 'on_time' else 'late' end,null,null,o.local_day
   from public.care_report_obligations o join scope s on s.pid=o.patient_id join public.patient_profiles p on p.id=o.patient_id left join public.care_daily_reports r on r.id=o.id and r.first_submitted_at<=cutoff
   where metric='reports' and o.required and o.closed_at<=cutoff and o.closes_at>=start_at and o.closes_at<=cutoff
  union all select a.patient_id,p.display_name,e.id,e.ends_at,e.title,'pending_record',e.professional_id,x.specialty,null
   from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.pid=a.patient_id join public.patient_profiles p on p.id=a.patient_id
   join lateral(select distinct ca.specialty from public.care_assignments ca join public.admin_users u on u.user_id=ca.professional_id and u.is_active join public.care_staff_capabilities c on c.user_id=u.user_id and c.capabilities @> array['care.patient.read','care.records.create']
    where ca.professional_id=e.professional_id and ca.patient_id=a.patient_id and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()) and ((e.kind in ('group','individual') and ca.specialty='psychology') or e.kind=ca.specialty))x on true
   where metric='records' and e.status='completed' and e.ends_at>=start_at and e.ends_at<cutoff and e.closed_at<=cutoff and not exists(select 1 from public.care_session_records r where r.patient_id=a.patient_id and r.event_id=e.id and r.author_id=e.professional_id and r.specialty=x.specialty and r.status='final' and r.first_finalized_at<=cutoff)),
 filtered as(select * from rows r where (care_dashboard_sources.category='' or r.category=care_dashboard_sources.category) and (day is null or (r.occurred_at at time zone 'America/Santiago')::date=day)),
 paged as(select * from filtered order by occurred_at desc,patient_id,source_id,specialty offset (page-1)*25 limit 25)
 select (select count(*) from filtered),coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb) into total,result;
 return jsonb_build_object('total',total,'rows',result,'start_at',start_at,'cutoff',cutoff);
end $$;
create function public.care_dashboard_sources(metric text,days integer,category text default '',page integer default 1,day date default null,cutoff timestamptz default now()) returns jsonb language sql security invoker set search_path='' as $$select private.care_dashboard_sources(metric,days,category,page,day,cutoff)$$;

create function private.care_dashboard(days integer default 30) returns jsonb language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz:=now();start_at timestamptz:=private.care_dashboard_start(days,cutoff);att jsonb;rep jsonb;series jsonb;patients jsonb;active bigint;alerts bigint;requests bigint;pending bigint;
begin
 perform private.care_dashboard_sync();
 insert into private.care_audit(actor_id,action) values(auth.uid(),'care.dashboard.read');
 with scope as materialized(select * from private.care_dashboard_scope()), a as(select p.attendance from public.care_event_participants p join scope s on s.pid=p.patient_id join public.care_events e on e.id=p.event_id where e.status='completed' and e.closed_at<=cutoff and e.ends_at<=cutoff and e.starts_at>=start_at and e.starts_at<cutoff)
 select jsonb_build_object('present',count(*) filter(where attendance='present'),'absent',count(*) filter(where attendance='absent'),'justified',count(*) filter(where attendance='justified'),'pending',count(*) filter(where attendance='pending'),'total',count(*)) into att from a;
 with scope as materialized(select * from private.care_dashboard_scope()), o as(select o.*,r.first_submitted_at from public.care_report_obligations o join scope s on s.pid=o.patient_id left join public.care_daily_reports r on r.id=o.id and r.first_submitted_at<=cutoff where o.required and o.closed_at<=cutoff and o.closes_at>=start_at and o.closes_at<=cutoff)
 select jsonb_build_object('on_time',count(*) filter(where first_submitted_at<=closes_at),'late',count(*) filter(where first_submitted_at>closes_at),'omitted',count(*) filter(where first_submitted_at is null),'total',count(*)) into rep from o;
 with scope as materialized(select * from private.care_dashboard_scope()), a as(select (e.starts_at at time zone 'America/Santiago')::date as day,count(*) as total,count(*) filter(where p.attendance='present') as completed from public.care_event_participants p join scope s on s.pid=p.patient_id join public.care_events e on e.id=p.event_id where e.status='completed' and e.closed_at<=cutoff and e.ends_at<=cutoff and e.starts_at>=start_at and e.starts_at<cutoff group by 1),
 r as(select (o.closes_at at time zone 'America/Santiago')::date as day,count(*) as total,count(*) filter(where d.first_submitted_at<=o.closes_at) as completed from public.care_report_obligations o join scope s on s.pid=o.patient_id left join public.care_daily_reports d on d.id=o.id and d.first_submitted_at<=cutoff where o.required and o.closed_at<=cutoff and o.closes_at>=start_at and o.closes_at<=cutoff group by 1)
 select coalesce(jsonb_agg(jsonb_build_object('day',coalesce(a.day,r.day),'attendance_n',coalesce(a.completed,0),'attendance_N',coalesce(a.total,0),'reports_n',coalesce(r.completed,0),'reports_N',coalesce(r.total,0)) order by coalesce(a.day,r.day)),'[]'::jsonb) into series from a full join r using(day);
 with scope as materialized(select * from private.care_dashboard_scope()), latest as(select distinct on(patient_id) * from public.care_followup_reviews order by patient_id,revision desc),
 stock as(select e.patient_id from public.care_episodes e join scope s on s.pid=e.patient_id where e.started_at<=cutoff and (e.ended_at is null or e.ended_at>cutoff) and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=cutoff order by h.effective_at desc,h.version desc limit 1)='active'),
 alert_count as(select a.patient_id,count(*) as n from public.care_alerts a join scope s on s.pid=a.patient_id where a.state<>'resolved' group by a.patient_id),
 next_request as(select distinct on(patient_id) * from public.care_intervention_requests where state='open' order by patient_id,due_at nulls last,created_at,id)
 select (select count(*) from stock),(select coalesce(sum(n),0) from alert_count),
 (select count(*) from public.care_intervention_requests r join scope s on s.pid=r.patient_id where r.state='open' and private.care_scope(r.patient_id,'care.decisions.manage')),
 coalesce(jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'is_active',p.is_active,'treatment_active',st.patient_id is not null,
 'color',case when l.color='red' then 'red' when l.review_at>cutoff then l.color else 'gray' end,'review_expired',l.review_at<=cutoff,'review_at',l.review_at,'review_id',l.id,
 'alerts',coalesce(ac.n,0),'request_id',case when private.care_scope(p.id,'care.decisions.manage') then nr.id end,'request_due',case when private.care_scope(p.id,'care.decisions.manage') then nr.due_at end) order by p.display_name,p.id),'[]'::jsonb)
 into active,alerts,requests,patients from scope s join public.patient_profiles p on p.id=s.pid left join latest l on l.patient_id=p.id left join stock st on st.patient_id=p.id left join alert_count ac on ac.patient_id=p.id left join next_request nr on nr.patient_id=p.id;
 pending:=((private.care_dashboard_sources('records',days))->>'total')::bigint;
 return jsonb_build_object('cutoff',cutoff,'start_at',start_at,'days',days,'active',active,'alerts',alerts,'requests',requests,'pending_records',pending,'attendance',att,'reports',rep,'series',series,'scoped_total',jsonb_array_length(patients),'quality',private.care_dashboard_quality(days,cutoff));
end $$;
create function public.care_dashboard(days integer default 30) returns jsonb language sql security invoker set search_path='' as $$select private.care_dashboard(days)$$;

create function private.care_dashboard_patients(q text default '',page integer default 1,filter text default 'all') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;total bigint;
begin
 if page is null or page<1 or page>10000 or q is null or length(q)>100 or filter is null or filter not in ('all','active','review','red','gray') then raise exception 'Filtro inválido';end if;
 with scope as materialized(select * from private.care_dashboard_scope()), latest as(select distinct on(patient_id) * from public.care_followup_reviews order by patient_id,revision desc),
 stocks as(select e.patient_id from public.care_episodes e join scope s on s.pid=e.patient_id where e.started_at<=now() and (e.ended_at is null or e.ended_at>now()) and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=now() order by h.effective_at desc,h.version desc limit 1)='active'),
 ac as(select a.patient_id,count(*) as n from public.care_alerts a join scope s on s.pid=a.patient_id where a.state<>'resolved' group by a.patient_id),
 nr as(select distinct on(patient_id) * from public.care_intervention_requests where state='open' order by patient_id,due_at nulls last,created_at,id),
 rows as(select p.id,p.display_name,p.is_active,st.patient_id is not null as treatment_active,case when l.color='red' then 'red' when l.review_at>now() then l.color else 'gray' end as color,l.review_at<=now() as review_expired,l.review_at,l.id as review_id,coalesce(ac.n,0) as alerts,
  case when private.care_scope(p.id,'care.decisions.manage') then nr.id end as request_id,case when private.care_scope(p.id,'care.decisions.manage') then nr.due_at end as request_due
  from scope s join public.patient_profiles p on p.id=s.pid left join latest l on l.patient_id=p.id left join stocks st on st.patient_id=p.id left join ac on ac.patient_id=p.id left join nr on nr.patient_id=p.id),
 filtered as(select * from rows r where position(lower(btrim(q)) in lower(r.display_name))>0 and (filter='all' or (filter='active' and r.treatment_active) or (filter in ('red','gray') and r.color=filter) or (filter='review' and (r.color in ('red','yellow','gray') or r.alerts>0 or r.review_expired or r.request_id is not null)))),
 paged as(select * from filtered order by case color when 'red' then 0 when 'yellow' then 1 when 'gray' then 2 else 3 end,alerts desc,display_name,id offset (page-1)*25 limit 25)
 select (select count(*) from filtered),coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb) into total,result;
 return jsonb_build_object('total',total,'patients',result);
end $$;
create function public.care_dashboard_patients(q text default '',page integer default 1,filter text default 'all') returns jsonb language sql security invoker set search_path='' as $$select private.care_dashboard_patients(q,page,filter)$$;
create function private.care_dashboard_alerts(page integer default 1,state text default 'open') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare total bigint;rows jsonb;
begin
 if page is null or page<1 or page>10000 or state is null or state not in ('open','received','resolved','all','pending') then raise exception 'Filtro inválido';end if;
 with scope as materialized(select * from private.care_dashboard_scope()), filtered as(select a.*,p.display_name from public.care_alerts a join scope s on s.pid=a.patient_id join public.patient_profiles p on p.id=a.patient_id where care_dashboard_alerts.state='all' or a.state=care_dashboard_alerts.state or (care_dashboard_alerts.state='pending' and a.state<>'resolved')),paged as(select * from filtered order by triggered_at,id offset (page-1)*25 limit 25)
 select (select count(*) from filtered),coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb) into total,rows;
 return jsonb_build_object('total',total,'alerts',rows,'last_action',(select jsonb_build_object('state',a.state,'at',a.updated_at) from public.care_alerts a join private.care_dashboard_scope() s on s.pid=a.patient_id where a.updated_by=auth.uid() and a.version>1 order by a.updated_at desc,a.id limit 1));
end $$;
create function public.care_dashboard_alerts(page integer default 1,state text default 'open') returns jsonb language sql security invoker set search_path='' as $$select private.care_dashboard_alerts(page,state)$$;

revoke all on function private.care_dashboard_scope(),private.care_dashboard_start(integer,timestamptz),private.care_dashboard_instant(timestamp),private.care_dashboard_quality(integer,timestamptz),private.care_dashboard_sync(),public.care_dashboard_sync(),private.care_followup_manage(text,jsonb),public.care_followup_manage(text,jsonb),private.care_followup_read(uuid),public.care_followup_read(uuid),private.care_dashboard_sources(text,integer,text,integer,date,timestamptz),public.care_dashboard_sources(text,integer,text,integer,date,timestamptz),private.care_dashboard(integer),public.care_dashboard(integer) from public,anon,authenticated,service_role;
grant execute on function private.care_dashboard_scope(),private.care_dashboard_start(integer,timestamptz),private.care_dashboard_instant(timestamp),private.care_dashboard_quality(integer,timestamptz),private.care_dashboard_sync(),public.care_dashboard_sync(),private.care_followup_manage(text,jsonb),public.care_followup_manage(text,jsonb),private.care_followup_read(uuid),public.care_followup_read(uuid),private.care_dashboard_sources(text,integer,text,integer,date,timestamptz),public.care_dashboard_sources(text,integer,text,integer,date,timestamptz),private.care_dashboard(integer),public.care_dashboard(integer) to authenticated;
revoke all on function private.care_dashboard_patients(text,integer,text),public.care_dashboard_patients(text,integer,text),private.care_dashboard_alerts(integer,text),public.care_dashboard_alerts(integer,text) from public,anon,authenticated,service_role;
grant execute on function private.care_dashboard_patients(text,integer,text),public.care_dashboard_patients(text,integer,text),private.care_dashboard_alerts(integer,text),public.care_dashboard_alerts(integer,text) to authenticated;
commit;
