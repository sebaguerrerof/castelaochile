-- Synthetic records only; test the new institutional model with real DB roles and rollback.
begin;
create function pg_temp.uid(n int)returns uuid language sql as $$select ('ed000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.week_context(pid uuid)returns jsonb language sql as $$select public.care_rc_week_context(pid,'c0000000-0000-4000-8000-000000000001',current_date-(extract(isodow from current_date)::int-1))$$;
create function pg_temp.care_assert(v boolean,label text)returns text language plpgsql as $$begin if v is distinct from true then raise exception 'FAIL: %',label;end if;return label;end$$;
create function pg_temp.care_denied(q text,label text)returns text language plpgsql as $$begin begin execute q;exception when insufficient_privilege then return label;end;raise exception 'FAIL: % permitted',label;end$$;
insert into auth.users(id,email)select pg_temp.uid(n),'roles-'||n||'@example.test'from generate_series(1,8)n;
insert into public.admin_users(user_id,role,is_active)values
(pg_temp.uid(1),'superadmin',true),(pg_temp.uid(2),'psychologist',true),(pg_temp.uid(3),'psychiatrist',true),
(pg_temp.uid(4),'recovery_coach',true),(pg_temp.uid(5),'editor',true),(pg_temp.uid(6),'superadmin',false);
insert into public.patient_profiles(id,auth_user_id,email,display_name)values
(pg_temp.uid(100),pg_temp.uid(7),'roles-7@example.test','Paciente roles A'),(pg_temp.uid(101),pg_temp.uid(8),'roles-8@example.test','Paciente roles B');
insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)select pg_temp.uid(100),pg_temp.uid(n),case n when 2 then 'psychology' when 3 then 'psychiatry' else 'recovery' end,now()-interval '1 day',pg_temp.uid(1)from generate_series(2,4)n;
insert into private.care_reserved_notes(id,patient_id,author_id,body,occurred_at)values(pg_temp.uid(200),pg_temp.uid(100),pg_temp.uid(2),'Reserva neutral roles QA',now());
insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)values
(pg_temp.uid(300),'Sesión roles QA','individual',now()-interval '2 hours',now()-interval '1 hour',pg_temp.uid(2),'in_person','completed',now(),pg_temp.uid(2)),
(pg_temp.uid(301),'Consulta roles QA','psychiatry',now()-interval '2 hours',now()-interval '1 hour',pg_temp.uid(3),'in_person','completed',now(),pg_temp.uid(3)),
(pg_temp.uid(302),'Recovery Dirección QA','recovery',now()-interval '2 hours',now()-interval '1 hour',pg_temp.uid(1),'in_person','completed',now(),pg_temp.uid(1)),
(pg_temp.uid(303),'Próxima sesión Dirección QA','individual',now()+interval '1 day',now()+interval '25 hours',pg_temp.uid(1),'in_person','scheduled',null,pg_temp.uid(1));
insert into public.care_event_participants(event_id,patient_id,attendance)values(pg_temp.uid(300),pg_temp.uid(100),'present'),(pg_temp.uid(301),pg_temp.uid(100),'present'),(pg_temp.uid(302),pg_temp.uid(101),'present'),(pg_temp.uid(303),pg_temp.uid(101),'pending');
insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at,status,revision,first_finalized_at)values
(pg_temp.uid(400),pg_temp.uid(100),pg_temp.uid(300),pg_temp.uid(2),'psychology',now(),'final',1,now());
insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at)values(pg_temp.uid(401),pg_temp.uid(100),pg_temp.uid(301),pg_temp.uid(3),'psychiatry',now());
insert into private.care_record_versions(id,record_id,revision,occurred_at,payload,reason,actor_id)values(pg_temp.uid(500),pg_temp.uid(400),1,now(),'{}','Final neutral QA',pg_temp.uid(2));
insert into private.care_record_reserves(version_id,body)values(pg_temp.uid(500),'Reserva sesión roles QA');
insert into private.care_record_drafts(record_id,payload,reserved_note,summary_visibility,request_intervention)values(pg_temp.uid(401),'{"facts":"Borrador neutral roles QA"}','Reserva borrador QA','none',false);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.uid(1)::text,true);
select pg_temp.care_assert(private.care_is_director(),'Active Direction recognized');
select pg_temp.care_denied($$select public.care_manage('capabilities',jsonb_build_object('user_id',pg_temp.uid(2),'capabilities','[]'::jsonb))$$,'Direction cannot remove role defaults through manual flags');
select pg_temp.care_denied($$select public.care_manage('capabilities',jsonb_build_object('user_id',pg_temp.uid(1),'capabilities','[]'::jsonb))$$,'Direction own role access cannot be manually removed');
select pg_temp.care_assert((public.care_supervision(mode=>'agenda',professional=>pg_temp.uid(1))->>'total')::int=2,'Direction personal agenda includes own events without assignment');
select pg_temp.care_assert((public.care_supervision(mode=>'records',professional=>pg_temp.uid(1))->'summary'->>'pending')::int=1,'Direction own completed session has a pending record without assignment');
select pg_temp.care_assert((public.care_supervision(mode=>'tasks',professional=>pg_temp.uid(1))->>'total')::int=0,'Direction empty tasks do not trigger permission denial');
select pg_temp.care_assert((public.care_supervision(mode=>'alerts',professional=>pg_temp.uid(1))->>'total')::int=0,'Direction empty alerts do not trigger permission denial');
select pg_temp.care_assert(private.care_scope(pg_temp.uid(101),'care.patient.read'),'Direction reads unassigned patient');
select pg_temp.care_assert((public.care_directory()->>'total')::int=2,'Direction directory includes all patients');
select pg_temp.care_assert((select count(*)=2 from private.care_dashboard_scope()),'Direction dashboard includes complete centre');
select pg_temp.care_assert(private.library_can('access')and private.library_can('content')and private.library_can('read'),'Direction manages all library functions without extra flags');
select pg_temp.care_assert((select count(*)=2 from public.patient_profiles),'Direction sees patient access records');
select pg_temp.care_assert(public.care_read_note(pg_temp.uid(200))->>'body'='Reserva neutral roles QA','Direction reads audited reserved note');
select pg_temp.care_assert(public.care_record_read(pg_temp.uid(400))->'versions'->0->>'reserved_note'='Reserva sesión roles QA','Direction reads reserved final session');
select pg_temp.care_assert(public.care_record_read(pg_temp.uid(401))->'draft'->'payload'->>'facts'='Borrador neutral roles QA','Direction reads other professional draft');
select pg_temp.care_assert(not(public.care_record_read(pg_temp.uid(401))->>'can_write')::boolean,'Direction cannot impersonate another author');
select pg_temp.care_assert(private.care_specialty_allowed(pg_temp.uid(101),'recovery')and(pg_temp.week_context(pg_temp.uid(101))->>'can_write')::boolean,'Direction can write own Recovery without artificial assignment');
select pg_temp.care_assert(jsonb_array_length(public.care_rc_catalog())=1,'Direction can configure actual Recovery proposal');
select pg_temp.care_denied('select * from private.care_record_drafts','Direction still uses audited RPC rather than direct private tables');
select set_config('request.jwt.claim.sub',pg_temp.uid(2)::text,true);
select pg_temp.care_assert(private.care_can('care.records.create'),'Psychologist receives working capabilities automatically');
select pg_temp.care_assert((public.care_supervision(mode=>'agenda',professional=>pg_temp.uid(2))->>'total')::int=1,'Psychologist own agenda excludes Direction and peers');
select pg_temp.care_denied('select public.care_supervision(professional=>pg_temp.uid(1))','Psychologist cannot query Direction workload');
select pg_temp.care_assert((public.care_directory()->>'total')::int=1,'Psychologist sees assigned patient');
select pg_temp.care_assert(not private.care_scope(pg_temp.uid(101),'care.patient.read'),'Psychologist cannot read unassigned patient');
select pg_temp.care_assert(private.care_specialty_allowed(pg_temp.uid(100),'psychology'),'Psychologist writes psychology');
select pg_temp.care_assert(not private.care_can('care.medical.create')and not private.care_can('care.decisions.manage'),'Psychologist does not inherit prescribing or Direction');
select pg_temp.care_denied($$select public.care_rc_govern('approve','{}')$$,'Non-Direction cannot govern proposal');
select pg_temp.care_denied('select public.care_record_read(pg_temp.uid(401))','Psychologist cannot read other author draft');
select set_config('request.jwt.claim.sub',pg_temp.uid(3)::text,true);
select pg_temp.care_assert(private.care_can('care.medical.create'),'Psychiatrist receives medical capability');
select pg_temp.care_assert((public.care_supervision(mode=>'agenda',professional=>pg_temp.uid(3))->>'total')::int=1,'Psychiatrist own agenda works by role');
select pg_temp.care_assert(private.care_specialty_allowed(pg_temp.uid(100),'psychiatry'),'Psychiatrist writes own specialty');
select pg_temp.care_assert(not private.care_specialty_allowed(pg_temp.uid(100),'psychology'),'Psychiatrist cannot write another specialty');
select pg_temp.care_assert(public.care_record_read(pg_temp.uid(400))->'versions'->0->>'reserved_note' is null,'Assigned colleague cannot read reserved final session');
select set_config('request.jwt.claim.sub',pg_temp.uid(4)::text,true);
select pg_temp.care_assert((pg_temp.week_context(pg_temp.uid(100))->>'can_write')::boolean,'Recovery Coach can write assigned weekly review');
select pg_temp.care_assert((public.care_supervision(mode=>'agenda',professional=>pg_temp.uid(4))->>'total')::int=0,'Coach empty personal agenda remains accessible');
select pg_temp.care_assert(not private.care_can('care.medical.create')and not private.care_can('care.decisions.manage'),'Coach cannot prescribe or approve for Direction');
select pg_temp.care_denied('select pg_temp.week_context(pg_temp.uid(101))','Coach cannot write unassigned week');
select set_config('request.jwt.claim.sub',pg_temp.uid(5)::text,true);
select pg_temp.care_assert(not private.care_can('care.patient.read'),'CMS editor has no clinical rights by role');
select pg_temp.care_denied('select public.care_directory()','CMS editor cannot enumerate patients');
select set_config('request.jwt.claim.sub',pg_temp.uid(6)::text,true);
select pg_temp.care_assert(not private.care_is_director()and not private.care_can('care.patient.read'),'Inactive Direction loses privileges immediately');
select pg_temp.care_denied('select public.care_read_note(pg_temp.uid(200))','Inactive Direction cannot read reserved notes');
select set_config('request.jwt.claim.sub',pg_temp.uid(7)::text,true);
select pg_temp.care_assert(not private.care_is_director(),'Patient cannot become Direction');
select pg_temp.care_denied('select public.care_record_read(pg_temp.uid(400))','Patient cannot use staff record resolver');
reset role;
update public.care_staff_capabilities set capabilities='{}'where user_id=pg_temp.uid(2);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.uid(2)::text,true);
select pg_temp.care_assert(private.care_can('care.records.create')and private.care_scope(pg_temp.uid(100),'care.patient.read'),'Role defaults remain effective if legacy flag row is empty');
reset role;
update public.admin_users set role='psychologist'where user_id=pg_temp.uid(3);
select pg_temp.care_assert(not exists(select 1 from public.care_staff_capabilities where user_id=pg_temp.uid(3)and'care.medical.create'=any(capabilities)),'Changing role revokes previous medical permission');
update public.care_assignments set ends_at=now()where professional_id=pg_temp.uid(2);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.uid(2)::text,true);
select pg_temp.care_assert(not private.care_scope(pg_temp.uid(100),'care.patient.read'),'Assignment revocation removes professional scope immediately');
set local role anon;
select pg_temp.care_denied('select public.care_directory()','Anon cannot access centre');
rollback;
