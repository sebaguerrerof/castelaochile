begin;
create function pg_temp.care_assert(ok boolean,label text) returns text language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;return label;end $$;
create function pg_temp.care_denied(stmt text,label text,expected text default '42501') returns text language plpgsql as $$
begin begin execute stmt;exception when others then if sqlstate<>expected then raise exception 'Wrong error % for %',sqlstate,label;end if;return label;end;raise exception 'Unexpected success: %',label;end $$;
create temporary table report_fixture_ids(kind text primary key,id uuid);
grant select,insert on report_fixture_ids to authenticated;
insert into auth.users(id,email) select ('a1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'reports-fixture-'||n||'@example.test' from generate_series(1,5)n;
insert into public.admin_users(user_id,role,is_active) values
('a1000000-0000-4000-8000-000000000003','viewer',true),('a1000000-0000-4000-8000-000000000004','viewer',true),('a1000000-0000-4000-8000-000000000005','editor',true);
insert into public.patient_profiles(id,auth_user_id,email,display_name) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','reports-fixture-1@example.test','Reporte A QA'),
('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','reports-fixture-2@example.test','Reporte B QA');
insert into public.care_staff_capabilities(user_id,capabilities) values
('a1000000-0000-4000-8000-000000000003',array['care.patient.read','care.records.read','care.records.create']),
('a1000000-0000-4000-8000-000000000004',array['care.directory.read','care.patient.read','care.records.read','care.records.create','care.assignments.manage']);
insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','psychology',now()-interval '2 days','a1000000-0000-4000-8000-000000000004'),
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','direction',now()-interval '2 days','a1000000-0000-4000-8000-000000000004'),
('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004','direction',now()-interval '2 days','a1000000-0000-4000-8000-000000000004');
insert into public.care_episodes(id,patient_id,started_at,status,created_by) select ('a3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('a2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,now()-interval '2 days','active','a1000000-0000-4000-8000-000000000004' from generate_series(1,2)n;
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,reason,version) select id,'active',started_at,'a1000000-0000-4000-8000-000000000004','Fixture neutro QA',1 from public.care_episodes where patient_id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002');
set local role anon;
select pg_temp.care_denied($$select * from public.care_daily_reports$$,'Anon no reports');
select pg_temp.care_denied($$select public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',current_date)$$,'Anon no generation');
reset role;set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='not_required','No incorporation no obligations');
select pg_temp.care_denied($$select public.care_report_configure('enrol',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000001','starts_on',(now() at time zone 'America/Santiago')::date-1,'ends_on','','version',0,'reason','Fixture QA'))$$,'No backdated incorporation','P0001');
select public.care_report_configure('enrol',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000001','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on','','version',0,'reason','Incorporación QA'));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='configuration_pending','No configured rule never produces omitted');
select pg_temp.care_denied($$select public.care_report_configure('rule',jsonb_build_object('kind','morning','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:00','close_next_day',true,'basis','active_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('state'),'required_fields',jsonb_build_array('state'),'reason','Configuración QA','confirm_approved',false))$$,'Rule requires explicit approval','P0001');
select public.care_report_configure('rule',jsonb_build_object('kind','morning','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:00','close_next_day',true,'basis','active_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('state','planning'),'required_fields',jsonb_build_array('state'),'reason','Campos y ventana sintéticos QA','confirm_approved',true));
select public.care_report_configure('rule',jsonb_build_object('kind','evening','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:00','close_next_day',true,'basis','active_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('activities'),'required_fields',jsonb_build_array('activities'),'reason','Campos y ventana sintéticos QA','confirm_approved',true));
select pg_temp.care_assert(jsonb_array_length(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots')=2,'Two report kinds per local day');
insert into report_fixture_ids select kind,id from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000001';
select pg_temp.care_assert((select count(*)=2 from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000001'),'Unique patient day kind');
select public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date);
select pg_temp.care_assert((select count(*)=2 from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000001'),'Generation replay idempotent');
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date-1)->'slots'->0->>'state'='not_required','Prelaunch days excluded');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert((select count(*)=2 from public.care_report_obligations),'A sees own expected slots');
select pg_temp.care_denied($$select public.care_reports_prepare('a2000000-0000-4000-8000-000000000002',(now() at time zone 'America/Santiago')::date)$$,'Patient cannot generate B obligations');
select pg_temp.care_denied($$select public.care_report_configure('enrol','{}')$$,'Patient cannot configure own eligibility');
select public.care_report_write('draft',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',0,'answers',jsonb_build_object('state','Borrador privado neutral QA','planning','')));
select pg_temp.care_assert((select count(*)=0 from public.care_daily_reports),'Draft does not count as submitted');
select pg_temp.care_assert(public.care_report_editor((select id from report_fixture_ids where kind='morning'))->'draft'->'answers'->>'state'='Borrador privado neutral QA','Own draft persists');
select pg_temp.care_denied($$select public.care_report_write('draft',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',0,'answers','{}'::jsonb))$$,'Draft stale version rejected','40001');
select pg_temp.care_denied($$select public.care_report_write('draft',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',1,'answers','{"medical_instruction":"forged"}'::jsonb))$$,'Unknown report fields rejected','P0001');
select pg_temp.care_denied($$select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',1,'answers','{"state":"QA"}'::jsonb,'submission_key','a4000000-0000-4000-8000-000000000001','confirm_submit',false))$$,'Explicit send confirmation required','P0001');
select pg_temp.care_denied($$select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',1,'answers','{"state":""}'::jsonb,'submission_key','a4000000-0000-4000-8000-000000000001','confirm_submit',true))$$,'Required configured answers validated on send','P0001');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select pg_temp.care_assert((select count(*)=0 from public.care_daily_reports),'Staff sees no private draft as report');
select pg_temp.care_denied($$select public.care_report_editor((select id from report_fixture_ids where kind='morning'))$$,'Staff cannot read patient draft RPC');
select pg_temp.care_denied($$select * from private.care_report_drafts$$,'Staff no private draft table grant');
select pg_temp.care_denied($$select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning')))$$,'Professional cannot impersonate patient send');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',1,'answers',jsonb_build_object('state','Autorreporte enviado neutral QA','planning',''),'submission_key','a4000000-0000-4000-8000-000000000001','confirm_submit',true));
select pg_temp.care_assert((select count(*)=1 from public.care_daily_reports),'Real send persists once');
select pg_temp.care_assert(public.care_report_editor((select id from report_fixture_ids where kind='morning'))->'draft'='null'::jsonb,'Sent draft removed from private working copy');
select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',1,'answers',jsonb_build_object('state','Autorreporte enviado neutral QA','planning',''),'submission_key','a4000000-0000-4000-8000-000000000001','confirm_submit',true));
select pg_temp.care_assert((select count(*)=1 from public.care_report_revisions),'Same submission key returns original success without duplicate');
select pg_temp.care_denied($$select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',0,'draft_version',0,'answers','{"state":"Second QA"}'::jsonb,'submission_key','a4000000-0000-4000-8000-000000000002','confirm_submit',true))$$,'Different stale send cannot overwrite original','40001');
select pg_temp.care_denied($$select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',1,'draft_version',0,'answers','{"state":"Second QA"}'::jsonb,'submission_key','a4000000-0000-4000-8000-000000000001','confirm_submit',true))$$,'Idempotency key cannot be reused with changed content','P0001');
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='on_time','First send classified in time');
select pg_temp.care_denied($$select public.care_report_write('review',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',1,'comment','Forjado'))$$,'Patient cannot review professionally');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select public.care_report_write('review',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',1,'comment','Comentario reservado de coordinación QA'));
select public.care_report_write('review',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',1,'comment','No duplicar QA'));
select pg_temp.care_assert((select count(*)=1 from public.care_report_reviews),'Review replay idempotent per professional/version');
select pg_temp.care_assert(public.care_report_review_comments((select id from report_fixture_ids where kind='morning'))->0->>'comment'='Comentario reservado de coordinación QA','Scoped staff can read private coordination review');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select pg_temp.care_denied($$select public.care_report_review_comments((select id from report_fixture_ids where kind='morning'))$$,'Patient cannot read internal review comment');
select pg_temp.care_assert((select count(*)=1 from public.care_report_reviews),'Patient sees review acknowledgement only');
select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',1,'draft_version',0,'answers',jsonb_build_object('state','Autorreporte corregido neutral QA','planning',''),'submission_key','a4000000-0000-4000-8000-000000000003','confirm_submit',true,'reason','Corrección propia QA'));
select pg_temp.care_assert((select version=2 and updated_at=first_submitted_at from public.care_daily_reports),'Correction advances version and preserves first send (transaction clock)');
select pg_temp.care_assert((select count(*)=2 from public.care_report_revisions),'Original answers and correction preserved');
select pg_temp.care_assert(not exists(select 1 from public.care_report_reviews v join public.care_daily_reports r on r.id=v.report_id where v.reviewed_version=r.version),'Old review does not certify new revision');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select pg_temp.care_denied($$select public.care_report_write('review',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning'),'report_version',1,'comment','Versión antigua'))$$,'Review rejects stale report version','40001');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select pg_temp.care_assert((select count(*)=0 from public.care_daily_reports),'B cannot read A sent body');
select pg_temp.care_assert((select count(*)=0 from public.care_report_revisions),'B cannot read A versions');
select pg_temp.care_denied($$select public.care_report_editor((select id from report_fixture_ids where kind='morning'))$$,'B cannot read A editor');
select pg_temp.care_denied($$select public.care_report_write('draft',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='morning')))$$,'B cannot mutate A draft');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',true);
select pg_temp.care_assert((select count(*)=0 from public.care_daily_reports),'CMS editor no report body inheritance');
select pg_temp.care_denied($$select public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)$$,'CMS editor no generation inheritance');
select pg_temp.care_denied($$delete from public.care_report_revisions$$,'Direct deletion of report history forbidden');
select pg_temp.care_denied($$insert into public.care_daily_reports(answers) values('{}')$$,'Direct sent body write forbidden');
reset role;
-- Time-bound fixture for actual close/late operations, not a clock parameter available to patients.
update public.care_report_obligations set opens_at=now()-interval '2 hours',generated_at=now()-interval '1 hour',closes_at=now()-interval '5 minutes' where id=(select id from report_fixture_ids where kind='evening');
set local role authenticated;select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots'->1->>'state'='omitted','Only generated required obligation becomes omitted after actual closure');
select public.care_report_write('submit',jsonb_build_object('obligation_id',(select id from report_fixture_ids where kind='evening'),'report_version',0,'draft_version',0,'answers',jsonb_build_object('activities','Relato tardío neutral QA'),'submission_key','a4000000-0000-4000-8000-000000000004','confirm_submit',true));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots'->1->>'state'='late','Late send distinct from omission');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select public.care_report_configure('rule',jsonb_build_object('kind','morning','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:01','close_next_day',false,'basis','active_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('state'),'required_fields',jsonb_build_array('state'),'reason','Cambio de plazo QA','confirm_approved',true));
select pg_temp.care_assert((select closes_at>now() from public.care_report_obligations where id=(select id from report_fixture_ids where kind='morning')),'New rule cannot change existing deadline');
select public.care_report_configure('enrol',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000002','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on','','version',0,'reason','Incorporación B QA'));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000002',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='data_incomplete','Missed generation shows incomplete quality not patient omission');
select pg_temp.care_assert((select count(*)=0 from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000002' and kind='morning'),'Generator after deadline does not create retroactive missed obligation');
select public.care_report_configure('exempt',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000002','kind','evening','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on',(now() at time zone 'America/Santiago')::date,'reason','Exención interna QA'));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000002',(now() at time zone 'America/Santiago')::date)->'slots'->1->>'state'='not_required','Explicit exemption removes unsent still-open requirement');
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000002',(now() at time zone 'America/Santiago')::date)->'slots'->1->>'quality'='explicit_exemption','Exempt generated row has truthful generic explanation without internal reason');
select pg_temp.care_assert((select count(*)=1 from public.care_report_obligation_changes),'Open exemption preserves prior expectation history');
select public.care_report_configure('exempt',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000001','kind','both','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on',(now() at time zone 'America/Santiago')::date,'reason','Exención posterior QA'));
select pg_temp.care_assert((select bool_and(required) from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000001'),'Exemption does not rewrite sent or closed expectation');
select pg_temp.care_denied($$select public.care_report_configure('enrol',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000001','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on','','version',0,'reason','Version obsoleta QA'))$$,'Enrollment concurrency protected','40001');
reset role;
-- Independent third patient: eligibility, DST and real generation failure rollback.
-- Transaction clock makes first send exactly equal to the synthetic deadline.
update public.care_report_obligations set opens_at=now()-interval '2 hours',generated_at=now()-interval '1 hour',closes_at=now() where id=(select id from report_fixture_ids where kind='morning');
set local role authenticated;select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000001',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='on_time','First send exactly at deadline remains in time after close/correction');
reset role;
insert into auth.users(id,email) values('a1000000-0000-4000-8000-000000000006','reports-fixture-6@example.test');
insert into public.patient_profiles(id,auth_user_id,email,display_name) values('a2000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000006','reports-fixture-6@example.test','Reporte C QA');
insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by) values('a2000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','direction',now()-interval '2 days','a1000000-0000-4000-8000-000000000004');
insert into public.care_episodes(id,patient_id,started_at,status,created_by) values('a3000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000003',now()-interval '2 days','paused','a1000000-0000-4000-8000-000000000004');
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,reason,version) values('a3000000-0000-4000-8000-000000000003','paused',now()-interval '2 days','a1000000-0000-4000-8000-000000000004','Pausa neutra QA',1);
set local role authenticated;select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select public.care_report_configure('enrol',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000003','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on','','version',0,'reason','Incorporación C QA'));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000003',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'quality'='no_active_episode','Paused at window opening excluded');
select pg_temp.care_assert((select count(*)=0 from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000003'),'Pause never produces retroactive omitted rows');
reset role;
-- A synthetic historical activation enables independent agenda rule checks.
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,reason,version) values('a3000000-0000-4000-8000-000000000003','active',now()-interval '1 day','a1000000-0000-4000-8000-000000000004','Activación sintética QA',2);
update public.care_episodes set status='active',version=2 where id='a3000000-0000-4000-8000-000000000003';
set local role authenticated;
select public.care_report_configure('rule',jsonb_build_object('kind','morning','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:00','close_next_day',true,'basis','agenda_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('state'),'required_fields',jsonb_build_array('state'),'reason','Regla de agenda QA','confirm_approved',true));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000003',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'quality'='no_expected_agenda','Agenda-days rule excludes active patient without expected agenda');
-- Window exception before generation moves its opening to tomorrow for this fixture only.
select public.care_report_configure('window',jsonb_build_object('patient_id','a2000000-0000-4000-8000-000000000003','kind','morning','starts_on',(now() at time zone 'America/Santiago')::date,'ends_on',(now() at time zone 'America/Santiago')::date,'opens_local','23:59','closes_local','00:00','close_next_day',true,'reason','Ventana excepcional QA'));
select public.care_report_configure('rule',jsonb_build_object('kind','morning','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:00','close_next_day',true,'basis','active_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('state'),'required_fields',jsonb_build_array('state'),'reason','Regla activa QA','confirm_approved',true));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000003',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='not_open','Individual override is resolved before global window');
reset role;
delete from public.care_report_exemptions where patient_id='a2000000-0000-4000-8000-000000000003' and opens_local is not null;
create function pg_temp.fail_report_generation() returns trigger language plpgsql as $$begin if new.patient_id='a2000000-0000-4000-8000-000000000003' and new.kind='morning' then raise exception 'Synthetic generation failure';end if;return new;end $$;
create trigger qa_generation_failure before insert on public.care_report_obligations for each row execute function pg_temp.fail_report_generation();
set local role authenticated;
select pg_temp.care_denied($$select public.care_reports_prepare('a2000000-0000-4000-8000-000000000003',(now() at time zone 'America/Santiago')::date)$$,'Actual failed generation transaction reports error','P0001');
select pg_temp.care_assert((select count(*)=0 from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000003' and kind='morning'),'Failed generation creates no expected row');
reset role;drop trigger qa_generation_failure on public.care_report_obligations;
set local role authenticated;
select public.care_report_configure('rule',jsonb_build_object('kind','morning','effective_on',(now() at time zone 'America/Santiago')::date,'opens_local','00:00','closes_local','00:01','close_next_day',false,'basis','active_days','weekdays',jsonb_build_array(1,2,3,4,5,6,7),'fields',jsonb_build_array('state'),'required_fields',jsonb_build_array('state'),'reason','Cierre sintético QA','confirm_approved',true));
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000003',(now() at time zone 'America/Santiago')::date)->'slots'->0->>'state'='data_incomplete','Failed generation followed by missed window is quality gap, not omission');
reset role;
-- Historical fixtures only, never accessible through a backdating action.
update public.care_report_enrolments set starts_on='2026-09-06' where patient_id='a2000000-0000-4000-8000-000000000003';
insert into public.care_report_rules(kind,effective_on,opens_local,closes_local,close_next_day,basis,weekdays,fields,required_fields,approved_by,reason) values('morning','2026-09-06','00:30','02:00',false,'active_days',array[1,2,3,4,5,6,7],array['state'],array['state'],'a1000000-0000-4000-8000-000000000004','Ventana inexistente sintética QA');
set local role authenticated;
select pg_temp.care_assert(public.care_reports_prepare('a2000000-0000-4000-8000-000000000003','2026-09-06')->'slots'->0->>'quality'='invalid_civil_window','DST nonexistent opening is incomplete quality');
select pg_temp.care_assert((select count(*)=0 from public.care_report_obligations where patient_id='a2000000-0000-4000-8000-000000000003' and local_day='2026-09-06'),'DST invalid window creates no omission');
reset role;
update public.care_assignments set ends_at=now() where professional_id='a1000000-0000-4000-8000-000000000003';
set local role authenticated;select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select pg_temp.care_assert((select count(*)=0 from public.care_daily_reports),'Assignment revocation hides sent reports with prior JWT');
select pg_temp.care_denied($$select public.care_report_review_comments((select id from report_fixture_ids where kind='morning'))$$,'Revocation hides internal review');
reset role;
update public.patient_profiles set is_active=false where id='a2000000-0000-4000-8000-000000000001';
set local role authenticated;select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert((select count(*)=0 from public.care_daily_reports),'Suspended patient cannot read prior reports');
select pg_temp.care_denied($$select public.care_report_editor((select id from report_fixture_ids where kind='morning'))$$,'Suspended patient loses saved draft access');
reset role;
rollback;
