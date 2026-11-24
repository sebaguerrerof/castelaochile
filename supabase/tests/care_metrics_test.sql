begin;
create function pg_temp.care_assert(v boolean,label text) returns text language plpgsql as $$begin if v is distinct from true then raise exception 'FAIL: %',label;end if;return label;end $$;
create function pg_temp.care_denied(stmt text,label text,expected text default '42501') returns text language plpgsql as $$begin begin execute stmt;exception when others then if sqlstate<>expected then raise exception 'Wrong error % for %: %',sqlstate,label,sqlerrm;end if;return label;end;raise exception 'Unexpected success: %',label;end $$;
create function pg_temp.id(kind integer,n integer) returns uuid language sql as $$select ('d'||kind||'000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.assess(color text default 'green',version bigint default 0) returns jsonb language sql as $$select jsonb_build_object('patient_id',pg_temp.id(2,1),'version',version,'color',color,'occurred_at',now()-interval '1 hour','review_at',now()+interval '2 days','reason','Valoración neutral QA','record_id',pg_temp.id(4,1),'confirm_approved',true)$$;
insert into auth.users(id,email) select pg_temp.id(1,n),'metrics-fixture-'||n||'@example.test' from generate_series(1,6)n;
insert into public.admin_users(user_id,role,is_active) select pg_temp.id(1,n),(case when n=6 then 'editor' else 'viewer' end)::public.admin_role,true from generate_series(3,6)n;
insert into public.patient_profiles(id,auth_user_id,email,display_name) select pg_temp.id(2,n),pg_temp.id(1,n),'metrics-fixture-'||n||'@example.test','Persona dashboard QA '||n from generate_series(1,2)n;
insert into public.care_staff_capabilities(user_id,capabilities) select pg_temp.id(1,n),array['care.directory.read','care.patient.read','care.records.read','care.records.create']||case when n=5 then array['care.alerts.review','care.decisions.manage'] else array[]::text[] end from generate_series(3,5)n;
insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by) values
 (pg_temp.id(2,1),pg_temp.id(1,3),'psychology',now()-interval '20 days',pg_temp.id(1,5)),
 (pg_temp.id(2,1),pg_temp.id(1,5),'direction',now()-interval '20 days',pg_temp.id(1,5)),
 (pg_temp.id(2,1),pg_temp.id(1,5),'psychology',now()-interval '20 days',pg_temp.id(1,5)),
 (pg_temp.id(2,2),pg_temp.id(1,4),'psychology',now()-interval '20 days',pg_temp.id(1,5)),
 (pg_temp.id(2,2),pg_temp.id(1,5),'direction',now()-interval '20 days',pg_temp.id(1,5));
insert into public.care_episodes(id,patient_id,started_at,status,created_by) select pg_temp.id(5,n),pg_temp.id(2,n),now()-interval '20 days','active',pg_temp.id(1,5) from generate_series(1,2)n;
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,reason,version) select pg_temp.id(5,n),'active',now()-interval '20 days',pg_temp.id(1,5),'Historia neutral QA',1 from generate_series(1,2)n;
insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)
 select pg_temp.id(3,n),'Actividad QA '||n,'individual',now()-interval '2 hours',now()-interval '1 hour',pg_temp.id(1,case when n=5 then 4 else 3 end),'in_person',case when n=6 then 'cancelled' when n=7 then 'scheduled' else 'completed' end,case when n=7 then null else now()-interval '30 minutes' end,pg_temp.id(1,5) from generate_series(1,7)n;
insert into public.care_event_participants(event_id,patient_id,attendance) select pg_temp.id(3,n),pg_temp.id(2,case when n=5 then 2 else 1 end),case n when 2 then 'absent' when 3 then 'justified' when 4 then 'pending' else 'present' end from generate_series(1,7)n;
insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at,status,revision,first_finalized_at) values
 (pg_temp.id(4,1),pg_temp.id(2,1),pg_temp.id(3,1),pg_temp.id(1,3),'psychology',now()-interval '2 hours','final',1,now()-interval '20 minutes'),
 (pg_temp.id(4,2),pg_temp.id(2,1),pg_temp.id(3,2),pg_temp.id(1,3),'psychology',now()-interval '2 hours','draft',0,null);
insert into public.care_report_rules(id,kind,effective_on,opens_local,closes_local,close_next_day,basis,weekdays,fields,required_fields,approved_by,reason) values
 (pg_temp.id(6,1),'morning',(now() at time zone 'America/Santiago')::date-20,'08:00','10:00',false,'active_days',array[1,2,3,4,5,6,7],array['state'],array['state'],pg_temp.id(1,5),'Regla QA');
insert into public.care_report_obligations(id,patient_id,local_day,kind,rule_id,opens_at,closes_at,fields,required_fields,required,requirement_reason,generated_at,closed_at)
 select pg_temp.id(7,n),pg_temp.id(2,1),(now() at time zone 'America/Santiago')::date-n,'morning',pg_temp.id(6,1),now()-n*interval '1 day'-interval '2 hours',now()-n*interval '1 day',array['state'],array['state'],n<>4,'Obligación QA',now()-n*interval '1 day'-interval '1 hour',null from generate_series(1,4)n;
insert into public.care_daily_reports(id,patient_id,author_id,answers,first_submitted_at) select pg_temp.id(7,n),pg_temp.id(2,1),pg_temp.id(1,1),'{"state":"Autorreporte neutral QA"}',now()-n*interval '1 day'+case when n=1 then interval '0' else interval '1 minute' end from generate_series(1,2)n;
insert into public.care_commitments(id,patient_id,title,due_at,responsible_kind,visibility,origin,created_by) values(pg_temp.id(8,1),pg_temp.id(2,1),'Compromiso QA',now()-interval '1 day','patient','coordination','professional',pg_temp.id(1,3));

-- Make registration timestamps explicit for reproducible historical cuts.
update public.care_episodes set created_at=now()-interval '20 days';
update public.care_episode_history set recorded_at=effective_at;
update public.care_event_participants set recorded_at=now()-interval '20 minutes';
update public.care_events set created_at=now()-interval '3 hours';
insert into public.therapy_groups(id,name) values(pg_temp.id(9,1),'Grupo métricas A'),(pg_temp.id(9,2),'Grupo métricas B');
insert into public.therapy_group_memberships(group_id,patient_id) values(pg_temp.id(9,1),pg_temp.id(2,1)),(pg_temp.id(9,2),pg_temp.id(2,2));
insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,recorded_at,reason,version) values
(pg_temp.id(8,1),'Compromiso QA',now()-interval '1 day','pending','coordination',null,'',pg_temp.id(1,3),now()-interval '2 days','Creación QA',1),
(pg_temp.id(8,1),'Compromiso QA',now()-interval '1 day','completed','coordination','self','Resultado QA',pg_temp.id(1,1),now()-interval '1 day'-interval '1 hour','Cumplimiento QA',2),
(pg_temp.id(8,1),'Compromiso QA',now()-interval '1 day','completed','coordination','professional','Resultado QA',pg_temp.id(1,3),now()-interval '30 minutes','Verificación QA',3);
insert into private.care_record_versions(record_id,revision,occurred_at,payload,reason,actor_id,recorded_at) values
(pg_temp.id(4,1),1,now()-interval '2 hours','{"objective":"Objetivo QA","evolution":"improved","facts":"No debe salir en las métricas"}','Finalización QA',pg_temp.id(1,3),now()-interval '20 minutes');
create function pg_temp.n(p jsonb,m text,c text,cut timestamptz default now()) returns integer language sql as $$select coalesce((select (b->>'n')::integer from jsonb_array_elements(public.care_metrics(p,cut)->'counts')b where b->>'metric'=m and b->>'category'=c),0)$$;
set local role anon;
select pg_temp.care_denied($$select public.care_metrics()$$,'Anonymous denied metrics');
select pg_temp.care_denied($$select public.care_metric_sources('{}','attendance')$$,'Anonymous denied sources');
reset role;set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,1)::text,true);
select pg_temp.care_denied($$select public.care_metrics()$$,'Patient denied internal metrics');
select pg_temp.care_denied($$select public.care_metric_options()$$,'Patient denied internal filter options');
select set_config('request.jwt.claim.sub',pg_temp.id(1,6)::text,true);
select pg_temp.care_denied($$select public.care_metrics()$$,'CMS editor no clinical bypass');
select set_config('request.jwt.claim.sub',pg_temp.id(1,5)::text,true);
select public.care_dashboard_sync();
select pg_temp.care_assert(pg_temp.n('{}','alerts','report_omitted_open')=1 and pg_temp.n('{}','alerts','commitment_overdue_open')=1,'Newly opened alerts count before any manual action');
select pg_temp.care_assert(public.care_metrics()->>'population'='2','Unique scope despite repeated specialties');
select pg_temp.care_assert(pg_temp.n('{}','attendance','present')=2,'Weighted aggregate two presents among five eligible');
select pg_temp.care_assert(public.care_metric_sources('{}','attendance')->>'total'='5','Sources denominator matches aggregate');
select pg_temp.care_assert(pg_temp.n('{}','attendance','absent')=1 and pg_temp.n('{}','attendance','justified')=1 and pg_temp.n('{}','attendance','pending')=1,'Four attendance categories without cancelled or planned');
select pg_temp.care_assert(pg_temp.n('{}','reports','on_time')=1 and pg_temp.n('{}','reports','late')=1 and pg_temp.n('{}','reports','omitted')=1,'Report first send with exemptions excluded');
select pg_temp.care_assert(pg_temp.n('{}','commitments','completed_professional')=1,'Confirmed completion at current cut');
select pg_temp.care_assert(pg_temp.n('{}','commitment_time','on_time')=1,'Verification does not move completion past deadline');
select pg_temp.care_assert(pg_temp.n('{}','commitments','completed_self',now()-interval '45 minutes')=1,'Historical cut preserves own confirmation before verification');
select pg_temp.care_assert(pg_temp.n('{}','evolution','improved')=1,'Professional categorical evolution without numeric score');
select pg_temp.care_assert(pg_temp.n('{}','records','final')=1 and pg_temp.n('{}','records','pending_record')=4,'Session records based on authorized actual responsibility');
select pg_temp.care_assert(pg_temp.n('{}','flows','admission')=2,'Admission events separate from unique stock');
select pg_temp.care_assert(pg_temp.n('{}','stock','active')=2,'Active unique people at cut');
select pg_temp.care_assert(pg_temp.n('{}','participation','unobserved')=2,'Text observation coverage not invented participation scale');
select pg_temp.care_assert(public.care_metrics(jsonb_build_object('group',pg_temp.id(9,1)))->>'population'='1','Current group cohort applied to whole metrics set');
select pg_temp.care_assert(public.care_metric_sources(jsonb_build_object('group',pg_temp.id(9,1)),'attendance')->>'total'='4','Group evidence matches filtered denominator');
select pg_temp.care_assert(pg_temp.n(jsonb_build_object('professional',pg_temp.id(1,4)),'attendance','present')=1,'Professional filters actual session responsibility');
select pg_temp.care_assert(public.care_metrics(jsonb_build_object('patient',pg_temp.id(2,1)))->>'population'='1','Individual metric scope');
select pg_temp.care_assert(public.care_metric_sources('{"type":"sport"}','attendance')->>'total'='0','Type filter empty with no fictitious observations');
select pg_temp.care_assert(pg_temp.n('{"type":"individual"}','reports','on_time')=0,'Activity type excludes unattributed reports');
select pg_temp.care_assert((public.care_metrics('{"period":"7"}')->'comparison'->>'available')::boolean,'Seven day equivalent prior interval exists');
select pg_temp.care_assert(public.care_metrics('{"period":"7"}')->'comparison'->>'population'='2','Prior population eligibility explicit');
select pg_temp.care_assert(not (public.care_metrics('{"period":"episode"}')->'comparison'->>'available')::boolean,'Variable episode windows not falsely compared');
select pg_temp.care_assert(public.care_metrics('{"period":"episode"}')->>'without_episode'='0','Episode windows use existing episode starts');
select pg_temp.care_assert(public.care_metrics('{"period":"90"}')->>'version'='1','Contract version provided');
select pg_temp.care_assert(jsonb_array_length(public.care_metric_options()->'groups')=2,'Only authorized current groups offered');
select pg_temp.care_assert(jsonb_array_length(public.care_metric_options()->'professionals')=3,'Options deduplicate professional specialties');
select pg_temp.care_assert(public.care_metrics()::text not like '%No debe salir%' and public.care_metric_sources('{}','evolution')::text not like '%No debe salir%','Neither aggregate nor source carries clinical payload');
select pg_temp.care_denied($$select private.care_metric_rows('{}',now())$$,'Internal unpaged rows cannot be invoked');
select pg_temp.care_denied($$select public.care_metrics('{"period":"365"}')$$,'Invalid period rejected','P0001');
select pg_temp.care_denied($$select public.care_metrics('{"extra":"x"}')$$,'Unknown filter rejected','P0001');
select pg_temp.care_denied($$select public.care_metrics('{}',now()+interval '1 day')$$,'Future cutoff rejected','P0001');
select pg_temp.care_denied($$select public.care_metric_sources('{}','attendance','',0)$$,'Invalid page rejected','P0001');
select pg_temp.care_denied($$select public.care_metric_sources('{}','secret')$$,'Unknown metric rejected','P0001');
select set_config('request.jwt.claim.sub',pg_temp.id(1,3)::text,true);
select pg_temp.care_assert(public.care_metrics()->>'population'='1','Professional cannot aggregate outside assigned people');
select pg_temp.care_denied($$select public.care_metrics(jsonb_build_object('patient',pg_temp.id(2,2)))$$,'Cross patient filter denied');
select pg_temp.care_denied($$select public.care_metrics(jsonb_build_object('group',pg_temp.id(9,2)))$$,'Cross group filter denied');
select pg_temp.care_denied($$select public.care_metrics(jsonb_build_object('professional',pg_temp.id(1,4)))$$,'Unrelated professional filter denied');
select pg_temp.care_assert(jsonb_array_length(public.care_metric_options()->'groups')=1,'Filter options do not leak other groups');
reset role;
-- A later effective reschedule/correction must not rewrite earlier cuts.
insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,recorded_at,reason,version) values(pg_temp.id(8,1),'Compromiso QA',now()+interval '1 day','pending','coordination',null,'',pg_temp.id(1,3),now()+interval '1 hour','Reprogramación QA',4);
insert into public.care_attendance_history(event_id,patient_id,attendance,punctuality,participation,actor_id,recorded_at,reason,version) values(pg_temp.id(3,1),pg_temp.id(2,1),'absent',null,'',pg_temp.id(1,3),now()+interval '1 hour','Corrección futura QA',2);
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,3)::text,true);
select pg_temp.care_assert(pg_temp.n('{}','commitment_time','on_time')=1,'Future reschedule excluded at earlier cutoff');
select pg_temp.care_assert(pg_temp.n('{}','attendance','present')=1,'Future attendance correction excluded');
reset role;
-- Discharge, phase-only change, readmission and pause: effective events vs stock.
update public.care_episodes set ended_at=now()-interval '2 days',status='discharged' where id=pg_temp.id(5,1);
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,recorded_at,reason,version) values
(pg_temp.id(5,1),'discharged',now()-interval '2 days',pg_temp.id(1,5),now()-interval '2 days','Egreso QA',2),
(pg_temp.id(5,1),'discharged',now()-interval '36 hours',pg_temp.id(1,5),now()-interval '36 hours','Cambio de fase QA',3),
(pg_temp.id(5,2),'paused',now()-interval '3 days',pg_temp.id(1,5),now()-interval '3 days','Pausa QA',2);
insert into public.care_episodes(id,patient_id,started_at,status,created_by,created_at) values(pg_temp.id(5,3),pg_temp.id(2,1),now()-interval '1 day','active',pg_temp.id(1,5),now()-interval '1 day');
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,recorded_at,reason,version) values(pg_temp.id(5,3),'active',now()-interval '1 day',pg_temp.id(1,5),now()-interval '1 day','Reincorporación QA',1);
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,5)::text,true);
select pg_temp.care_assert(pg_temp.n('{}','flows','readmission')=1,'Reincorporation is new episode rather than overwritten admission');
select pg_temp.care_assert(pg_temp.n('{}','flows','discharged')=1,'Phase-only changes do not duplicate effective discharge');
select pg_temp.care_assert(pg_temp.n('{}','stock','active')=1,'Paused person outside active stock despite enabled account');
select pg_temp.care_assert(pg_temp.n('{}','stock','active',now()-interval '4 days')=2,'Historical stock uses effective status at historical cut');
select pg_temp.care_assert(pg_temp.n('{"period":"episode"}','reports','late')=0,'Episode period excludes earlier episode obligations for each patient');
select pg_temp.care_assert(pg_temp.n(jsonb_build_object('period','episode','patient',pg_temp.id(2,1)),'flows','readmission')=1,'Individual period starts at most recent recorded admission');
reset role;
-- Half-open first bound, record corrections and Chile daylight saving.
insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by,created_at)
select pg_temp.id(3,10+n),'Límite QA '||n,'individual',private.care_dashboard_start(7,now())-n*interval '1 microsecond',private.care_dashboard_start(7,now())+interval '1 hour',pg_temp.id(1,3),'in_person','completed',private.care_dashboard_start(7,now())+interval '2 hours',pg_temp.id(1,5),private.care_dashboard_start(7,now())-interval '1 day' from generate_series(0,1)n;
insert into public.care_event_participants(event_id,patient_id,attendance,recorded_at)select pg_temp.id(3,10+n),pg_temp.id(2,1),'present',private.care_dashboard_start(7,now())+interval '2 hours' from generate_series(0,1)n;
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,5)::text,true);
select pg_temp.care_assert(pg_temp.n('{"period":"7"}','attendance','present')=3,'Inclusive start includes exact boundary; prior microsecond excluded');
select pg_temp.care_assert(public.care_metrics('{"period":"7"}','2026-09-08T15:00:00Z')->'comparison'->>'cutoff'='2026-09-01T16:00:00+00:00','Equivalent comparison preserves Chile civil hour across spring DST');
select pg_temp.care_assert(public.care_metrics('{"period":"7"}','2026-09-08T15:00:00Z')->>'start_at'='2026-09-02T04:00:00+00:00','Seven civil days use IANA midnight and not 86400 seconds');
select pg_temp.care_assert(public.care_metric_sources('{}','attendance','nonsense')->>'total'='0','Unknown category cannot broaden evidence');
reset role;
insert into public.care_report_obligation_changes(obligation_id,actor_id,recorded_at,was_required,is_required,old_reason,reason)values(pg_temp.id(7,1),pg_temp.id(1,5),now()+interval '1 hour',true,false,'Obligación QA','Exención futura QA');
update public.care_report_obligations set required=false where id=pg_temp.id(7,1);
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,5)::text,true);
select pg_temp.care_assert(pg_temp.n('{}','reports','on_time')=1,'Later exemption cannot rewrite earlier report denominator');
reset role;select pg_temp.care_assert(exists(select 1 from private.care_audit where actor_id=pg_temp.id(1,5) and action='care.metrics.read'),'Metric reads audited without clinical contents');
reset role;update public.patient_profiles set is_active=false where id=pg_temp.id(2,1);
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,3)::text,true);
select pg_temp.care_assert(pg_temp.n('{}','stock','active')=1,'Portal suspension does not discharge treatment');
reset role;update public.care_assignments set ends_at=now() where professional_id=pg_temp.id(1,3);
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,3)::text,true);
select pg_temp.care_assert(public.care_metrics()->>'population'='0','Revocation reflected with prior JWT');
select pg_temp.care_assert(public.care_metric_sources('{}','attendance')->>'total'='0','Revocation removes sources');
reset role;update public.admin_users set is_active=false where user_id=pg_temp.id(1,5);
set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.id(1,5)::text,true);
select pg_temp.care_denied($$select public.care_metrics()$$,'Suspended director rejected');
reset role;rollback;
