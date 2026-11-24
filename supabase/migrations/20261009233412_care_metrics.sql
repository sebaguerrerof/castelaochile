-- Step 6: read-only, versioned metrics. Current assignments authorize historical evidence.
begin;
create function private.care_metric_scope(p jsonb,cutoff timestamptz) returns table(pid uuid,start_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare period text:=coalesce(p->>'period','30'); patient uuid:=nullif(p->>'patient','')::uuid; grp uuid:=nullif(p->>'group','')::uuid; prof uuid:=nullif(p->>'professional','')::uuid; kind text:=coalesce(p->>'type',''); base timestamptz;
begin
 if p is null or jsonb_typeof(p)<>'object' or exists(select 1 from jsonb_object_keys(p)k where k not in ('period','patient','group','professional','type')) or period not in ('7','30','90','episode') or kind not in ('','group','individual','recovery','sport','family','psychiatry') or cutoff is null or not isfinite(cutoff) or cutoff>now() then raise exception 'Filtro inválido';end if;
 perform * from private.care_dashboard_scope();
 if patient is not null and not exists(select 1 from private.care_dashboard_scope()s where s.pid=patient) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if grp is not null and not exists(select 1 from public.therapy_groups g join public.therapy_group_memberships m on m.group_id=g.id join private.care_dashboard_scope()s on s.pid=m.patient_id where g.id=grp and g.is_active and m.is_active) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if prof is not null and not exists(select 1 from public.care_assignments a join private.care_dashboard_scope()s on s.pid=a.patient_id join public.admin_users u on u.user_id=a.professional_id and u.is_active where a.professional_id=prof and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if period<>'episode' then base:=private.care_dashboard_start(period::integer,cutoff);end if;
 return query select s.pid,case when period='episode' then e.started_at else base end from private.care_dashboard_scope()s
 left join lateral(select ep.started_at from public.care_episodes ep where ep.patient_id=s.pid and ep.started_at<=cutoff and ep.created_at<=cutoff order by ep.started_at desc,ep.id limit 1)e on true
 where (patient is null or s.pid=patient) and (grp is null or exists(select 1 from public.therapy_group_memberships m where m.patient_id=s.pid and m.group_id=grp and m.is_active))
 and (prof is null or exists(select 1 from public.care_assignments a where a.patient_id=s.pid and a.professional_id=prof and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())));
end $$;

create function private.care_metric_rows(p jsonb,cutoff timestamptz) returns table(patient_id uuid,source_id uuid,metric text,category text,occurred_at timestamptz,label text,revision integer,detail text) language sql stable security definer set search_path='' as $$
 with scope as materialized(select * from private.care_metric_scope(p,cutoff)),
 events as materialized(select s.pid,e.id,e.kind,e.professional_id,coalesce(h.title,e.title)title,coalesce(h.starts_at,e.starts_at)starts_at,coalesce(h.ends_at,e.ends_at)ends_at,
 coalesce(a.attendance,case when t.recorded_at<=cutoff then t.attendance else 'pending' end)attendance,coalesce(a.participation,case when t.recorded_at<=cutoff then t.participation else '' end)participation
 from scope s join public.care_event_participants t on t.patient_id=s.pid join public.care_events e on e.id=t.event_id
 left join lateral(select h.* from public.care_event_history h where h.event_id=e.id and h.recorded_at<=cutoff order by h.version desc limit 1)h on true
 left join lateral(select a.* from public.care_attendance_history a where a.event_id=e.id and a.patient_id=s.pid and a.recorded_at<=cutoff order by a.version desc limit 1)a on true
 where e.created_at<=cutoff and coalesce(h.status,e.status)='completed' and coalesce(h.recorded_at,e.closed_at)<=cutoff and coalesce(h.ends_at,e.ends_at)<=cutoff and coalesce(h.starts_at,e.starts_at)>=s.start_at and coalesce(h.starts_at,e.starts_at)<cutoff
 and (coalesce(p->>'professional','')='' or e.professional_id=(p->>'professional')::uuid) and (coalesce(p->>'type','')='' or e.kind=p->>'type')),
 commitments as materialized(select s.pid,c.id,h.title,h.due_at,h.status,h.confirmation,(select min(ch.recorded_at) from public.care_commitment_history ch where ch.commitment_id=c.id and ch.status='completed' and ch.recorded_at<=cutoff)completed_at
 from scope s join public.care_commitments c on c.patient_id=s.pid join lateral(select h.* from public.care_commitment_history h where h.commitment_id=c.id and h.recorded_at<=cutoff order by h.version desc limit 1)h on true
 left join public.care_events e on e.id=c.source_event_id
 where h.status<>'cancelled' and h.due_at>=s.start_at and h.due_at<cutoff and (coalesce(p->>'professional','')='' or c.responsible_id=(p->>'professional')::uuid or e.professional_id=(p->>'professional')::uuid)
 and (coalesce(p->>'type','')='' or e.kind=p->>'type')),
 versions as materialized(select s.pid,r.id,r.author_id,r.specialty,v.revision,v.occurred_at,v.payload from scope s join public.care_session_records r on r.patient_id=s.pid
 join lateral(select v.* from private.care_record_versions v where v.record_id=r.id and v.recorded_at<=cutoff order by v.revision desc limit 1)v on true
 left join public.care_events e on e.id=r.event_id
 where v.occurred_at>=s.start_at and v.occurred_at<cutoff and private.care_record_allowed(r.id)
 and (coalesce(p->>'professional','')='' or r.author_id=(p->>'professional')::uuid) and (coalesce(p->>'type','')='' or e.kind=p->>'type')),
 history as materialized(select s.pid,h.id,h.episode_id,h.status,h.effective_at,h.reason,h.version,lag(h.status) over(partition by h.episode_id order by h.effective_at,h.version)previous_status,s.start_at from scope s join public.care_episodes e on e.patient_id=s.pid join public.care_episode_history h on h.episode_id=e.id where h.recorded_at<=cutoff and h.effective_at<cutoff)
 select pid,id,'attendance',attendance,starts_at,title,null::integer,null::text from events
 union all select pid,id,'participation',case when length(btrim(participation))>0 then 'observed' else 'unobserved' end,starts_at,title,null,null from events where attendance='present'
 union all select s.pid,o.id,'reports',case when r.first_submitted_at is null then 'omitted' when r.first_submitted_at<=o.closes_at then 'on_time' else 'late' end,o.closes_at,o.kind,null,o.local_day::text
 from scope s join public.care_report_obligations o on o.patient_id=s.pid left join public.care_daily_reports r on r.id=o.id and r.first_submitted_at<=cutoff
 where coalesce(p->>'type','')='' and o.generated_at<=cutoff and coalesce((select ch.is_required from public.care_report_obligation_changes ch where ch.obligation_id=o.id and ch.recorded_at<=cutoff order by ch.recorded_at desc,ch.id desc limit 1),(select ch.was_required from public.care_report_obligation_changes ch where ch.obligation_id=o.id and ch.recorded_at>cutoff order by ch.recorded_at,ch.id limit 1),o.required) and o.closes_at>=s.start_at and o.closes_at<cutoff and o.closed_at<=cutoff
 union all select pid,id,'commitments',case when status='completed' then 'completed_'||confirmation else 'pending' end,due_at,title,null,null from commitments
 union all select pid,id,'commitment_time',case when status<>'completed' then 'pending' when completed_at<=due_at then 'on_time' else 'late' end,due_at,title,null,null from commitments
 union all select v.pid,v.id,'evolution',v.payload->>'evolution',v.occurred_at,v.specialty||' · '||coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),'Profesional'),v.revision,null from versions v join auth.users u on u.id=v.author_id
 union all select e.pid,e.id,'records',case when exists(select 1 from public.care_session_records r where r.patient_id=e.pid and r.event_id=e.id and r.author_id=e.professional_id and r.first_finalized_at<=cutoff) then 'final' else 'pending_record' end,e.ends_at,e.title,null,null
 from events e where e.kind in ('group','individual','recovery','psychiatry') and exists(select 1 from public.care_assignments ca join public.admin_users u on u.user_id=ca.professional_id and u.is_active join public.care_staff_capabilities c on c.user_id=u.user_id and c.capabilities @> array['care.patient.read','care.records.create'] where ca.patient_id=e.pid and ca.professional_id=e.professional_id and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()) and (ca.specialty=e.kind or (e.kind in ('group','individual') and ca.specialty='psychology')))
 union all select h.pid,h.episode_id,'flows',case when h.previous_status is null then case when exists(select 1 from public.care_episodes ep where ep.patient_id=h.pid and ep.id<>h.episode_id and ep.started_at<h.effective_at and ep.created_at<=cutoff) then 'readmission' else 'admission' end else h.status end,h.effective_at,h.reason,h.version,null from history h
 where coalesce(p->>'type','')='' and h.effective_at>=h.start_at and (h.previous_status is null or (h.status in ('discharged','withdrawn') and h.status is distinct from h.previous_status))
 union all select s.pid,a.id,'alerts',a.kind||'_'||coalesce(h.state,'open'),a.triggered_at,a.kind,coalesce(h.version,1),null from scope s join public.care_alerts a on a.patient_id=s.pid
 left join lateral(select h.* from private.care_alert_history h where h.alert_id=a.id and h.recorded_at<=cutoff order by h.version desc limit 1)h on true
 where coalesce(p->>'type','')='' and a.created_at<=cutoff and a.triggered_at>=s.start_at and a.triggered_at<cutoff
 union all select s.pid,a.id,'alert_history','open',a.created_at,a.kind,1,null from scope s join public.care_alerts a on a.patient_id=s.pid where coalesce(p->>'type','')='' and a.created_at>=s.start_at and a.created_at<cutoff and not exists(select 1 from private.care_alert_history h where h.alert_id=a.id and h.version=1)
 union all select s.pid,a.id,'alert_history',h.state,h.recorded_at,a.kind,h.version,null from scope s join public.care_alerts a on a.patient_id=s.pid join private.care_alert_history h on h.alert_id=a.id where coalesce(p->>'type','')='' and h.recorded_at>=s.start_at and h.recorded_at<cutoff
 union all select s.pid,e.id,'stock','active',cutoff,'Episodio activo',null,null from scope s join public.care_episodes e on e.patient_id=s.pid where e.started_at<=cutoff and e.created_at<=cutoff and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=cutoff and h.recorded_at<=cutoff order by h.effective_at desc,h.version desc limit 1)='active'
 $$;

create function private.care_metric_quality(p jsonb,cutoff timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare range_start timestamptz;missing bigint;invalid bigint;unconfigured bigint;
begin
 select min(s.start_at) into range_start from private.care_metric_scope(p,cutoff)s;
 -- Set-based windows: no per-patient RPC loop and no retrospective generated rows.
 with scope as materialized(select * from private.care_metric_scope(p,cutoff)),
 slots as (select s.pid,d::date as day,k.kind,en.starts_on,en.ends_on,r.weekdays,r.basis,ex.id as exempt_id,
  private.care_dashboard_instant(d::date+coalesce(w.opens_local,r.opens_local)) as opens,
  private.care_dashboard_instant((d::date+case when coalesce(w.close_next_day,r.close_next_day) then 1 else 0 end)+coalesce(w.closes_local,r.closes_local)) as closes
  from scope s join public.care_report_enrolments en on en.patient_id=s.pid
  cross join generate_series((s.start_at at time zone 'America/Santiago')::date-1,(cutoff at time zone 'America/Santiago')::date,interval '1 day') d
  cross join (values('morning'),('evening')) k(kind)
  left join lateral(select rr.* from public.care_report_rules rr where rr.kind=k.kind and rr.effective_on<=d::date and rr.approved_at<=cutoff order by rr.effective_on desc,rr.revision desc limit 1)r on true
  left join lateral(select x.id from public.care_report_exemptions x where x.patient_id=s.pid and x.recorded_at<=cutoff and d::date between x.starts_on and x.ends_on and x.kind in (k.kind,'both') and x.opens_local is null order by x.revision desc limit 1)ex on true
  left join lateral(select x.* from public.care_report_exemptions x where x.patient_id=s.pid and x.recorded_at<=cutoff and d::date between x.starts_on and x.ends_on and x.kind=k.kind and x.opens_local is not null order by x.revision desc limit 1)w on true
  where d::date>=en.starts_on and (en.ends_on is null or d::date<=en.ends_on)),
 eligible as(select t.* from slots t where t.exempt_id is null and extract(isodow from t.day)::integer=any(t.weekdays)
  and (t.opens is null or exists(select 1 from public.care_episodes e where e.patient_id=t.pid and e.started_at<=t.opens and (e.ended_at is null or e.ended_at>t.opens)
   and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=t.opens order by h.effective_at desc,h.version desc limit 1)='active'))
  and (t.basis='active_days' or exists(select 1 from public.care_events e join public.care_event_participants p on p.event_id=e.id where p.patient_id=t.pid and e.status<>'cancelled' and (e.starts_at at time zone 'America/Santiago')::date=t.day)))
 select count(*) filter(where t.closes>=(select s.start_at from private.care_metric_scope(p,cutoff)s where s.pid=t.pid) and t.closes<=cutoff and not exists(select 1 from public.care_report_obligations o where o.patient_id=t.pid and o.local_day=t.day and o.kind=t.kind)),
  count(*) filter(where t.day>=((select s.start_at from private.care_metric_scope(p,cutoff)s where s.pid=t.pid) at time zone 'America/Santiago')::date and (t.opens is null or t.closes is null)) into missing,invalid from eligible t;
 select count(*) into unconfigured from private.care_metric_scope(p,cutoff) s join public.care_report_enrolments en on en.patient_id=s.pid
  where en.starts_on<=(cutoff at time zone 'America/Santiago')::date and (en.ends_on is null or en.ends_on>=(range_start at time zone 'America/Santiago')::date)
  and exists(select 1 from (values('morning'),('evening'))k(kind) where not exists(select 1 from public.care_report_rules r where r.kind=k.kind and r.approved_at<=cutoff and r.effective_on<=(cutoff at time zone 'America/Santiago')::date));
 return jsonb_build_object('missing_windows',missing,'invalid_windows',invalid,'unconfigured_patients',unconfigured,'scheduler_verified',false);
end $$;

create function private.care_metrics(p jsonb default '{}',cutoff timestamptz default now()) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;previous jsonb;stocks jsonb;series jsonb;start_at timestamptz;prev_start timestamptz;prev_cut timestamptz;population integer;no_episode integer;eligible integer;prev_eligible integer;days integer;quality jsonb;
begin
 select min(s.start_at),count(*),count(*) filter(where s.start_at is null),count(*) filter(where exists(select 1 from public.care_episodes e where e.patient_id=s.pid and e.started_at<=cutoff)) into start_at,population,no_episode,eligible from private.care_metric_scope(p,cutoff)s;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.metrics.read',nullif(p->>'patient','')::uuid);
 if coalesce(p->>'period','30')<>'episode' then days:=coalesce(p->>'period','30')::integer;start_at:=private.care_dashboard_start(days,cutoff);prev_cut:=((cutoff at time zone 'America/Santiago')-make_interval(days=>days)) at time zone 'America/Santiago';prev_start:=private.care_dashboard_start(days,prev_cut);
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into previous from(select r.metric,r.category,count(*) n from private.care_metric_rows(p,prev_cut)r group by r.metric,r.category)x;
 select count(*) into prev_eligible from private.care_metric_scope(p,prev_cut)s where exists(select 1 from public.care_episodes e where e.patient_id=s.pid and e.started_at<=prev_cut and e.created_at<=prev_cut);
 end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select r.metric,r.category,count(*) n from private.care_metric_rows(p,cutoff)r group by r.metric,r.category)x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.week,x.metric,x.category),'[]'::jsonb) into series from(select date_trunc('week',r.occurred_at at time zone 'America/Santiago')::date week,r.metric,r.category,count(*) n from private.care_metric_rows(p,cutoff)r group by 1,2,3)x;
 with scope as materialized(select * from private.care_metric_scope(p,cutoff)), points as(select cutoff at union select d::date::timestamp at time zone 'America/Santiago' from generate_series(date_trunc('week',start_at at time zone 'America/Santiago')+interval '7 days',cutoff at time zone 'America/Santiago',interval '7 days')d), stock as(select t.at,count(distinct s.pid)filter(where exists(select 1 from public.care_episodes e where e.patient_id=s.pid and e.started_at<=t.at and e.created_at<=cutoff and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=t.at and h.recorded_at<=cutoff order by h.effective_at desc,h.version desc limit 1)='active')) n from points t left join scope s on true group by t.at) select coalesce(jsonb_agg(to_jsonb(stock) order by at),'[]'::jsonb) into stocks from stock;
 -- Quality is scoped to the same cohort; absence of enrolment is explicit, never fabricated omissions.
 select jsonb_build_object('without_enrolment',count(*)filter(where not exists(select 1 from public.care_report_enrolments en where en.patient_id=s.pid)),'open_required',coalesce(sum((select count(*) from public.care_report_obligations o where o.patient_id=s.pid and o.required and o.closes_at>=s.start_at and o.closes_at<cutoff and o.closed_at is null)),0),'scheduler_verified',false) into quality from private.care_metric_scope(p,cutoff)s;
 return jsonb_build_object('version','1','cutoff',cutoff,'start_at',start_at,'population',population,'without_episode',no_episode,'eligible_population',eligible,'counts',result,'series',series,'stocks',stocks,'quality',quality||private.care_metric_quality(p,cutoff),'comparison',jsonb_build_object('available',days is not null,'start_at',prev_start,'cutoff',prev_cut,'population',prev_eligible,'counts',coalesce(previous,'[]'::jsonb),'quality',case when days is not null then private.care_metric_quality(p,prev_cut) else null end));
end $$;
create function public.care_metrics(p jsonb default '{}',cutoff timestamptz default now()) returns jsonb language sql security invoker set search_path='' as $$select private.care_metrics(p,cutoff)$$;

create function private.care_metric_sources(p jsonb,metric text,category text default '',page integer default 1,cutoff timestamptz default now()) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;total bigint;
begin
 if metric is null or metric not in ('attendance','reports','commitments','commitment_time','participation','evolution','records','flows','alerts','alert_history','stock') or category is null or length(category)>80 or page is null or page<1 or page>10000 then raise exception 'Consulta inválida';end if;
 with rows as materialized(select r.*,pp.display_name from private.care_metric_rows(p,cutoff)r join public.patient_profiles pp on pp.id=r.patient_id where r.metric=care_metric_sources.metric and (care_metric_sources.category='' or r.category=care_metric_sources.category)),paged as(select * from rows order by occurred_at desc,patient_id,source_id,revision offset (page-1)*25 limit 25)
 select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb) into total,result;
 insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.metrics.sources',nullif(p->>'patient','')::uuid);
 return jsonb_build_object('total',total,'rows',result,'cutoff',cutoff);
end $$;
create function public.care_metric_sources(p jsonb,metric text,category text default '',page integer default 1,cutoff timestamptz default now()) returns jsonb language sql security invoker set search_path='' as $$select private.care_metric_sources(p,metric,category,page,cutoff)$$;

create function private.care_metric_options() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin return jsonb_build_object('groups',(select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) from(select distinct g.id,g.name from public.therapy_groups g join public.therapy_group_memberships m on m.group_id=g.id and m.is_active join private.care_dashboard_scope()s on s.pid=m.patient_id where g.is_active)x),'professionals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) from(select distinct a.professional_id id,coalesce(nullif(btrim(au.raw_user_meta_data->>'full_name'),''),split_part(au.email,'@',1),'Profesional') name from public.care_assignments a join private.care_dashboard_scope()s on s.pid=a.patient_id join public.admin_users u on u.user_id=a.professional_id and u.is_active join auth.users au on au.id=u.user_id where a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))x));end $$;
create function public.care_metric_options() returns jsonb language sql security invoker set search_path='' as $$select private.care_metric_options()$$;
revoke all on function private.care_metric_quality(jsonb,timestamptz),private.care_metric_scope(jsonb,timestamptz),private.care_metric_rows(jsonb,timestamptz),private.care_metrics(jsonb,timestamptz),public.care_metrics(jsonb,timestamptz),private.care_metric_sources(jsonb,text,text,integer,timestamptz),public.care_metric_sources(jsonb,text,text,integer,timestamptz),private.care_metric_options(),public.care_metric_options() from public,anon,authenticated,service_role;
grant execute on function private.care_metrics(jsonb,timestamptz),public.care_metrics(jsonb,timestamptz),private.care_metric_sources(jsonb,text,text,integer,timestamptz),public.care_metric_sources(jsonb,text,text,integer,timestamptz),private.care_metric_options(),public.care_metric_options() to authenticated;
commit;
