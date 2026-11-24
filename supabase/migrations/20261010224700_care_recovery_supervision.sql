-- Additive Recovery supervision. No retrospective obligations or clinical score.
begin;
create function private.care_rc_module_start() returns timestamptz language sql stable security definer set search_path='' as $$
 select created_at from public.care_recovery_rubrics where id='c0000000-0000-4000-8000-000000000001'
$$;
create function private.care_rc_supervision_rows(p jsonb,cutoff timestamptz)
returns table(patient_id uuid,source_id uuid,kind text,category text,occurred_at timestamptz,label text,revision integer,week_start date,rubric_id uuid,mode text,due_at timestamptz,review_at timestamptz,declared_self boolean,overdue boolean,review_due boolean)
language sql stable security definer set search_path='' as $$
 with scope as materialized(select * from private.care_metric_scope(p,cutoff)),
 events as materialized(select s.pid,e.* from scope s join public.care_event_participants ep on ep.patient_id=s.pid join public.care_events e on e.id=ep.event_id
 where e.status='completed' and e.starts_at>=greatest(s.start_at,private.care_rc_module_start()) and e.ends_at<=cutoff and e.closed_at<=cutoff
 and e.kind in ('recovery','sport','group') and exists(select 1 from public.care_assignments a join public.admin_users u on u.user_id=a.professional_id and u.is_active
 join public.care_staff_capabilities cap on cap.user_id=u.user_id and cap.capabilities @> array['care.patient.read','care.records.create']
 where a.patient_id=s.pid and a.professional_id=e.professional_id and a.specialty='recovery' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))),
 weekly as (select distinct pid,date_trunc('week',starts_at at time zone 'America/Santiago')::date week_day from events),
 commitments as (select c.*,coalesce(v.outcome,'pending') professional_outcome from scope s join public.care_commitments c on c.patient_id=s.pid
 left join lateral(select outcome from private.care_recovery_commitment_reviews v where v.commitment_id=c.id order by version desc limit 1)v on true
 where c.source_record_id is not null and c.created_at<=cutoff and (c.status='pending' or c.created_at>=s.start_at or c.due_at>=s.start_at or c.review_at>=s.start_at))
 select s.pid,r.id,'activity',case when v.payload->>'support' in ('constant','frequent','occasional','none') then v.payload->>'support' else 'not_observable' end,
 r.occurred_at,'Actividad Recovery',r.revision,null::date,null::uuid,null::text,null::timestamptz,null::timestamptz,false,false,false
 from scope s join public.care_session_records r on r.patient_id=s.pid and r.specialty='recovery' and r.status='final'
 join private.care_record_versions v on v.record_id=r.id and v.revision=r.revision
 where r.occurred_at>=s.start_at and r.occurred_at<cutoff and r.first_finalized_at<=cutoff
 union all select c.patient_id,c.id,'commitment',case when c.status='cancelled' then 'cancelled' else c.professional_outcome end,c.created_at,c.title,c.version,null,null,null,c.due_at,c.review_at,
 c.confirmation='self',c.status='pending' and c.due_at<cutoff,c.status<>'cancelled' and c.professional_outcome='pending' and c.review_at<cutoff from commitments c
 union all select e.pid,e.id,'record_expected',case when exists(select 1 from public.care_session_records r where r.patient_id=e.pid and r.event_id=e.id and r.specialty='recovery' and r.status='final') then 'final'
 when exists(select 1 from public.care_session_records r where r.patient_id=e.pid and r.event_id=e.id and r.specialty='recovery' and r.status='draft' and r.author_id=auth.uid()) then 'draft' else 'pending' end,
 e.starts_at,e.title,null,null,null,null,null,null,false,false,false from events e
 union all select w.pid,r.id,'weekly_expected',case when r.status='final' then 'final' when r.status='draft' then 'draft' else 'pending' end,
 w.week_day::timestamp at time zone 'America/Santiago','Revisión semanal',r.revision,w.week_day,r.rubric_id,r.mode,null,null,false,false,false
 from weekly w left join lateral(select id,status,revision,rubric_id,mode from public.care_recovery_weeks r where r.patient_id=w.pid and r.week_start=w.week_day
 and (r.status='final' or r.author_id=auth.uid()) order by (status='final') desc,revision desc,id limit 1)r on true
 where (w.week_day+7)::timestamp at time zone 'America/Santiago'<=cutoff
$$;
create function private.care_rc_supervision(p jsonb default '{}',source_kind text default 'activity',source_category text default '',page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cutoff timestamptz:=now();result jsonb;begin
 if coalesce(p->>'period','30') not in ('7','30','90') then raise exception 'Periodo Recovery inválido';end if;
 if source_kind not in ('activity','commitment','record_expected','weekly_expected') or source_category not in ('','constant','frequent','occasional','none','not_observable','pending','fulfilled','unfulfilled','unverifiable','cancelled','overdue','review_due','final','draft') or page is null or page<1 or page>10000 then raise exception 'Filtro inválido';end if;
 -- Materialize one authorised population and one cutoff for counts and drilldown.
 with rows as materialized(select * from private.care_rc_supervision_rows(p,cutoff)),
 filtered as (select r.*,pf.display_name from rows r join public.patient_profiles pf on pf.id=r.patient_id where r.kind=source_kind
 and (source_category='' or source_category=r.category or source_category='overdue' and r.overdue or source_category='review_due' and r.review_due)),
 selected as(select * from filtered order by occurred_at desc,patient_id,source_id offset (page-1)*25 limit 25)
 select jsonb_build_object('contract',1,'cutoff',cutoff,'module_start',private.care_rc_module_start(),
 'start_at',(select min(start_at) from private.care_metric_scope(p,cutoff)),'population',(select count(*)from private.care_metric_scope(p,cutoff)),
 'counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select kind,category,count(*) n from rows group by kind,category)x),
 'overdue',(select count(*)from rows where kind='commitment' and overdue),'review_due',(select count(*)from rows where kind='commitment' and review_due),
 'total',(select count(*)from filtered),'rows',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)from selected x)) into result;
 return result;
end $$;
create function public.care_rc_supervision(p jsonb default '{}',source_kind text default 'activity',source_category text default '',page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select private.care_rc_supervision(p,source_kind,source_category,page) $$;
revoke all on function private.care_rc_module_start(),private.care_rc_supervision_rows(jsonb,timestamptz),private.care_rc_supervision(jsonb,text,text,integer),public.care_rc_supervision(jsonb,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function private.care_rc_supervision(jsonb,text,text,integer),public.care_rc_supervision(jsonb,text,text,integer) to authenticated;
commit;
