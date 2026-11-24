begin;
create function pg_temp.care_assert(ok boolean,label text) returns text language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; return label; end $$;
create function pg_temp.care_denied(stmt text,label text,expected text default '42501') returns text language plpgsql as $$
begin begin execute stmt;exception when others then if sqlstate<>expected then raise exception 'Wrong error % for %',sqlstate,label;end if;return label;end;raise exception 'Unexpected success: %',label;end $$;
insert into auth.users(id,email) select ('91000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'planning-fixture-'||n||'@example.test' from generate_series(1,6)n;
insert into public.admin_users(user_id,role,is_active) select ('91000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  case when n=6 then 'editor'::public.admin_role else 'viewer'::public.admin_role end,true from generate_series(3,6)n;
insert into public.patient_profiles(id,auth_user_id,email,display_name) values
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','planning-fixture-1@example.test','Persona A QA'),
('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','planning-fixture-2@example.test','Persona B QA');
insert into public.care_staff_capabilities(user_id,capabilities) select ('91000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,array['care.directory.read','care.patient.read','care.records.create'] from generate_series(3,5)n;
insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by) values
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','psychology',now()-interval '1 year','91000000-0000-4000-8000-000000000004'),
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','direction',now()-interval '1 year','91000000-0000-4000-8000-000000000004'),
('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004','direction',now()-interval '1 year','91000000-0000-4000-8000-000000000004'),
('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000005','recovery',now()-interval '1 year','91000000-0000-4000-8000-000000000004');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
select public.care_planning_manage('event',jsonb_build_object('id','93000000-0000-4000-8000-000000000001','version',0,'title','Actividad grupal QA','kind','group','starts_at',now()-interval '2 hours','ends_at',now()-interval '1 hour','modality','in_person','patients',jsonb_build_array('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002')));
select pg_temp.care_assert((select count(*)=1 from public.care_events),'Group activity recorded only once');
select pg_temp.care_assert((select count(*)=2 from public.care_event_participants),'Expected participants linked individually');
select pg_temp.care_assert(jsonb_array_length(public.care_event_roster('93000000-0000-4000-8000-000000000001')->'patients')=2,'Direction sees names of both assigned participants');
select pg_temp.care_assert((public.care_event_roster('93000000-0000-4000-8000-000000000001')->>'can_edit')::boolean,'Direction with full roster scope may edit group event');
select pg_temp.care_assert(jsonb_array_length(public.care_responsibles('92000000-0000-4000-8000-000000000001'))=2 and public.care_responsibles('92000000-0000-4000-8000-000000000001')->0->>'user_id' is not null,'Responsible picker returns only current assigned professional identities');
select pg_temp.care_assert((select count(*)=2 from public.care_event_participants where attendance='pending'),'No inferred absence before closing');
select pg_temp.care_denied($$select public.care_planning_manage('attendance',jsonb_build_object('id','93000000-0000-4000-8000-000000000001','patient_id','92000000-0000-4000-8000-000000000001','version',1,'attendance','absent','reason','QA'))$$,'No absence before closing','P0001');
select public.care_planning_manage('event_close','{"id":"93000000-0000-4000-8000-000000000001","version":1,"status":"completed","reason":"Realizada QA"}');
select pg_temp.care_assert((select count(*)=2 from public.care_event_participants where attendance='pending'),'Closing never converts pending to absent');
select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000001","patient_id":"92000000-0000-4000-8000-000000000001","version":1,"attendance":"present","punctuality":"on_time","participation":"Observación neutra","reason":"Registro QA"}');
select pg_temp.care_assert((select attendance='present' and observed_by='91000000-0000-4000-8000-000000000004' from public.care_event_participants where patient_id='92000000-0000-4000-8000-000000000001'),'Attendance author derived on server');
select pg_temp.care_denied($$select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000001","patient_id":"92000000-0000-4000-8000-000000000001","version":1,"attendance":"absent","reason":"Cambio QA"}')$$,'Concurrent attendance rejected','40001');
select pg_temp.care_denied($$select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000001","patient_id":"92000000-0000-4000-8000-000000000001","version":2,"attendance":"absent","punctuality":"late","reason":"Cambio QA"}')$$,'No invented punctuality for absent participant','P0001');
select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000001","patient_id":"92000000-0000-4000-8000-000000000001","version":2,"attendance":"justified","reason":"Corrección QA"}');
select pg_temp.care_assert((select count(*)=2 from public.care_attendance_history),'Attendance corrections preserve prior evidence');
select pg_temp.care_denied($$select public.care_planning_manage('event',jsonb_build_object('id','93000000-0000-4000-8000-000000000001','version',2,'title','Editar pasado','kind','group','starts_at',now(),'ends_at',now()+interval '1 hour','modality','remote','patients',jsonb_build_array('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002')))$$,'Completed event cannot silently reschedule','P0001');
select public.care_planning_manage('event',jsonb_build_object('id','93000000-0000-4000-8000-000000000002','version',0,'title','Evento futuro QA','kind','individual','starts_at',now()+interval '1 day','ends_at',now()+interval '25 hours','modality','remote','patients',jsonb_build_array('92000000-0000-4000-8000-000000000001')));
select pg_temp.care_denied($$select public.care_planning_manage('event_close','{"id":"93000000-0000-4000-8000-000000000002","version":1,"status":"completed","reason":"Realizada QA"}')$$,'Cannot mark future session completed','P0001');
select public.care_planning_manage('event_close','{"id":"93000000-0000-4000-8000-000000000002","version":1,"status":"cancelled","reason":"Cancelación QA"}');
select pg_temp.care_denied($$select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000002","patient_id":"92000000-0000-4000-8000-000000000001","version":1,"attendance":"absent","reason":"Ausencia QA"}')$$,'Cancelled events have no recorded absences','P0001');
select public.care_planning_manage('event',jsonb_build_object('id','93000000-0000-4000-8000-000000000003','version',0,'title','Serie semanal QA','kind','group','starts_at','2026-08-31T13:00:00Z','ends_at','2026-08-31T14:00:00Z','weeks',2,'modality','remote','patients',jsonb_build_array('92000000-0000-4000-8000-000000000001')));
select pg_temp.care_assert((select count(*)=2 from public.care_events where title='Serie semanal QA'),'Recurrence materialises instances once');
select pg_temp.care_assert((select count(distinct starts_at at time zone 'America/Santiago')=2 and bool_and((starts_at at time zone 'America/Santiago')::time='09:00') from public.care_events where title='Serie semanal QA'),'Weekly recurrence keeps civil time through Santiago DST');
select pg_temp.care_assert((select max(starts_at)-min(starts_at)=interval '167 hours' from public.care_events where title='Serie semanal QA'),'Weekly recurrence uses actual DST instants, not 168 hour UTC arithmetic');
select pg_temp.care_denied($$select private.care_civil_instant('2026-09-06 00:30')$$,'Nonexistent recurrence time rejected','P0001');
select pg_temp.care_denied($$select private.care_civil_instant('2026-04-04 23:30')$$,'Repeated civil time rejected','P0001');
select public.care_planning_manage('goals','{"patient_id":"92000000-0000-4000-8000-000000000001","version":0,"objectives":"Objetivo compartido QA"}');
select public.care_planning_manage('goals','{"patient_id":"92000000-0000-4000-8000-000000000001","version":1,"objectives":"Objetivo actualizado QA"}');
select pg_temp.care_assert((select count(*)=2 from public.care_goal_history),'Shared goals preserve history');
select pg_temp.care_denied($$select public.care_planning_manage('goals','{"patient_id":"92000000-0000-4000-8000-000000000001","version":1,"objectives":"Concurrente QA"}')$$,'Goal concurrency protected','40001');
select public.care_planning_manage('commitment',jsonb_build_object('id','94000000-0000-4000-8000-000000000001','version',0,'patient_id','92000000-0000-4000-8000-000000000001','title','Acuerdo publicado QA','due_at',now()+interval '1 day','visibility','patient','confirm_publish',true,'reason','Acuerdo compartido QA','source_event_id','93000000-0000-4000-8000-000000000001'));
select public.care_planning_manage('commitment',jsonb_build_object('id','94000000-0000-4000-8000-000000000002','version',0,'patient_id','92000000-0000-4000-8000-000000000001','title','Acuerdo equipo QA','due_at',now(),'reason','Coordinación QA'));
select pg_temp.care_denied($$select public.care_planning_manage('commitment',jsonb_build_object('patient_id','92000000-0000-4000-8000-000000000001','title','No publicado QA','due_at',now(),'visibility','patient','reason','Acuerdo QA'))$$,'Commitment publication explicit','P0001');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert((select count(*)=4 from public.care_events),'Patient sees only own agenda instances');
select pg_temp.care_assert((select count(*)=4 from public.care_event_participants),'Patient cannot enumerate other group participants');
select pg_temp.care_assert((select count(*)=1 from public.care_commitments),'Patient cannot see team-only commitment');
select pg_temp.care_assert((select count(*)=1 from public.care_commitment_history),'Patient sees only explicitly shared commitment history');
select pg_temp.care_assert(jsonb_array_length(public.care_agenda('92000000-0000-4000-8000-000000000001',now()-interval '1 day',now()+interval '2 days',true)->'participants')=2,'Patient agenda resolver returns only own attendance per event');
select pg_temp.care_denied($$select public.care_event_roster('93000000-0000-4000-8000-000000000001')$$,'Patient cannot read professional roster identities');
select pg_temp.care_denied($$select public.care_agenda('92000000-0000-4000-8000-000000000002',now()-interval '1 day',now()+interval '2 days',true)$$,'Patient cannot select foreign agenda identity');
select pg_temp.care_denied($$select public.care_agenda('92000000-0000-4000-8000-000000000001',now(),now()+interval '33 days',true)$$,'Agenda rejects unbounded periods','P0001');
select pg_temp.care_denied($$select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000001","patient_id":"92000000-0000-4000-8000-000000000001","version":3,"attendance":"present"}')$$,'Patient cannot self-certify institutional attendance');
select pg_temp.care_denied($$select public.care_planning_manage('event_close','{"id":"93000000-0000-4000-8000-000000000001","version":2,"status":"completed"}')$$,'Patient cannot close institutional event');
select public.care_planning_manage('plan',jsonb_build_object('id','95000000-0000-4000-8000-000000000001','version',0,'patient_id','92000000-0000-4000-8000-000000000002','title','Plan propio QA','planned_for',now()+interval '1 day','reason','Plan personal QA','status','planned'));
select pg_temp.care_assert((select patient_id='92000000-0000-4000-8000-000000000001' from public.care_personal_plans),'Personal plan patient identity ignores forged payload');
select public.care_planning_manage('plan',jsonb_build_object('id','95000000-0000-4000-8000-000000000001','version',1,'title','Plan reprogramado QA','planned_for',now()+interval '2 days','reason','Reprogramación QA','status','planned'));
select pg_temp.care_assert((select count(*)=2 from public.care_plan_history),'Personal reprogramming preserves old schedule');
select pg_temp.care_denied($$select public.care_planning_manage('plan',jsonb_build_object('id','95000000-0000-4000-8000-000000000001','version',1,'title','Concurrente QA','planned_for',now(),'reason','Concurrente QA','status','planned'))$$,'Plan duplicate/stale save rejected','40001');
select public.care_planning_manage('plan_complete','{"id":"95000000-0000-4000-8000-000000000001","version":2}');
select pg_temp.care_assert((select status='completed' and created_by='91000000-0000-4000-8000-000000000001' from public.care_personal_plans),'Completion remains patient self-report');
select pg_temp.care_assert((select status='completed' from public.care_events where id='93000000-0000-4000-8000-000000000001'),'Plan does not modify institutional session');
select pg_temp.care_denied($$select public.care_planning_manage('commitment',jsonb_build_object('id','94000000-0000-4000-8000-000000000001','version',1,'title','Cambiar plazo','due_at',now(),'status','pending','reason','Editar equipo'))$$,'Patient cannot reschedule professional commitment');
select public.care_planning_manage('commitment_complete','{"id":"94000000-0000-4000-8000-000000000001","version":1,"result":"Realizado según paciente QA","reason":"Confirmación propia QA"}');
select pg_temp.care_assert((select confirmation='self' from public.care_commitments where id='94000000-0000-4000-8000-000000000001'),'Self completion not professional verification');
select pg_temp.care_denied($$select public.care_planning_manage('commitment_verify','{"id":"94000000-0000-4000-8000-000000000001","version":2,"result":"Verificado QA","reason":"Verificado QA"}')$$,'Patient cannot professionally verify');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.care_assert((select count(*)=0 from public.care_personal_plans),'Patient B cannot see own A plans');
select pg_temp.care_assert((select count(*)=0 from public.care_plan_history),'Patient B cannot see A versions');
select pg_temp.care_assert((select count(*)=0 from public.care_commitments),'Patient B cannot see A commitments');
select pg_temp.care_denied($$select public.care_planning_manage('plan_complete','{"id":"95000000-0000-4000-8000-000000000001","version":3}')$$,'Patient B cannot complete A plan');
select pg_temp.care_denied($$select public.care_planning_manage('commitment_complete','{"id":"94000000-0000-4000-8000-000000000001","version":2,"result":"Ajeno QA","reason":"Ajeno QA"}')$$,'Patient B cannot mutate A commitment');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.care_assert((select count(*)=4 from public.care_event_participants),'Staff roster excludes unassigned B');
select pg_temp.care_assert(jsonb_array_length(public.care_event_roster('93000000-0000-4000-8000-000000000001')->'patients')=1,'Psychology sees only assigned participant name');
select pg_temp.care_assert(not (public.care_event_roster('93000000-0000-4000-8000-000000000001')->>'can_edit')::boolean,'Partial group scope cannot alter whole group event');
select pg_temp.care_denied($$select public.care_planning_manage('attendance','{"id":"93000000-0000-4000-8000-000000000001","patient_id":"92000000-0000-4000-8000-000000000002","version":1,"attendance":"present"}')$$,'Psychology cannot record B attendance');
select pg_temp.care_denied($$select public.care_planning_manage('plan_complete','{"id":"95000000-0000-4000-8000-000000000001","version":3}')$$,'Professional cannot impersonate patient self completion');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
select public.care_planning_manage('commitment_verify','{"id":"94000000-0000-4000-8000-000000000001","version":2,"result":"Verificación profesional QA","reason":"Verificación QA"}');
select pg_temp.care_assert((select confirmation='professional' and completed_at<=now() from public.care_commitments where id='94000000-0000-4000-8000-000000000001'),'Professional verification separate from original completion');
select pg_temp.care_assert((select count(*)=3 from public.care_commitment_history where commitment_id='94000000-0000-4000-8000-000000000001'),'Commitment history preserves self then verified');
select public.care_planning_manage('commitment',jsonb_build_object('id','94000000-0000-4000-8000-000000000002','version',1,'title','Acuerdo equipo QA','due_at',now()+interval '1 day','status','pending','reason','Reprogramación compartida QA'));
select pg_temp.care_assert((select count(*)=2 from public.care_commitment_history where commitment_id='94000000-0000-4000-8000-000000000002'),'Commitment old due date preserved');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000006',true);
select pg_temp.care_assert((select count(*)=0 from public.care_events),'CMS editor no agenda clinical read');
select pg_temp.care_assert((select count(*)=0 from public.care_commitments),'CMS editor no commitment read');
select pg_temp.care_denied($$select public.care_planning_manage('goals','{"patient_id":"92000000-0000-4000-8000-000000000001","version":2,"objectives":"Forjado QA"}')$$,'CMS editor cannot change shared objectives');
select pg_temp.care_denied($$insert into public.care_events(title) values('Forjado QA')$$,'Direct agenda INSERT denied');
select pg_temp.care_denied($$delete from public.care_plan_history$$,'Plan history deletion denied');
reset role;
-- Read-query fixture: more than one agenda page of cancellations before a scheduled activity.
insert into public.care_events(title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)
select 'Consulta paginada QA '||n,'individual',now()+n*interval '1 minute',now()+interval '2 hours',
  '91000000-0000-4000-8000-000000000004','in_person',case when n=26 then 'scheduled' else 'cancelled' end,
  case when n=26 then null else now() end,'91000000-0000-4000-8000-000000000004' from generate_series(1,26)n;
insert into public.care_event_participants(event_id,patient_id) select id,'92000000-0000-4000-8000-000000000001' from public.care_events where title like 'Consulta paginada QA %';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert(public.care_next_activity('92000000-0000-4000-8000-000000000001',now(),now()+interval '1 day')->>'title'='Consulta paginada QA 26','Today finds scheduled activity beyond cancelled first page');
select pg_temp.care_denied($$select public.care_next_activity('92000000-0000-4000-8000-000000000002',now(),now()+interval '1 day')$$,'Today cannot resolve foreign patient identity');
reset role;
update public.care_assignments set ends_at=now() where professional_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.care_assert((select count(*)=0 from public.care_events),'Assignment revocation hides agenda with previous session');
select pg_temp.care_assert((select count(*)=0 from public.care_personal_plans),'Revocation hides patient self plans');
select pg_temp.care_assert((select count(*)=0 from public.care_goal_history),'Revocation hides goal versions');
reset role;
update public.patient_profiles set is_active=false where id='92000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert((select count(*)=0 from public.care_events),'Suspended patient agenda denied');
select pg_temp.care_assert((select count(*)=0 from public.care_personal_plans),'Suspended patient personal plan denied');
select pg_temp.care_denied($$select public.care_planning_manage('plan',jsonb_build_object('title','Forjado QA','planned_for',now(),'reason','Forjado QA'))$$,'Suspended patient cannot plan');
reset role;
rollback;
