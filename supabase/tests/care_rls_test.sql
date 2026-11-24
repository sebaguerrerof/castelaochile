-- Synthetic fixtures, transaction rollback, real authenticated/anon grants and RLS.
begin;
create function pg_temp.care_assert(ok boolean,label text) returns text language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; return label; end $$;
create function pg_temp.care_denied(stmt text,label text,expected text default '42501') returns text language plpgsql as $$
begin
  begin execute stmt; exception when others then
    if sqlstate<>expected then raise exception 'Wrong error for %: %',label,sqlstate; end if;
    return label;
  end;
  raise exception 'FAIL (unexpected success): %',label;
end $$;
insert into auth.users(id,email) select ('71000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'care-fixture-'||n||'@example.test' from generate_series(1,9)n;
insert into public.admin_users(user_id,role,is_active) select ('71000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  case when n=8 then 'superadmin'::public.admin_role when n=7 then 'editor'::public.admin_role else 'viewer'::public.admin_role end,n<>9 from generate_series(3,9)n;
insert into public.patient_profiles(id,auth_user_id,email,display_name) values
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','care-fixture-1@example.test','Persona A QA'),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','care-fixture-2@example.test','Persona B QA');
insert into public.care_staff_capabilities(user_id,capabilities) select ('71000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  array['care.directory.read','care.patient.read','care.records.create','care.records.read']||case when n=6 then array['care.assignments.manage'] when n=5 then array['care.medical.create'] when n=3 then array['care.family.read'] else array[]::text[] end from generate_series(3,6)n;
insert into public.care_staff_capabilities(user_id,capabilities) values('71000000-0000-4000-8000-000000000009',array['care.patient.read','care.records.read','care.records.create']);
insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by) values
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','psychology',now()-interval '10 days','71000000-0000-4000-8000-000000000006'),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000004','recovery',now()-interval '10 days','71000000-0000-4000-8000-000000000006'),
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000005','psychiatry',now()+interval '1 day','71000000-0000-4000-8000-000000000006'),
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000006','direction',now()-interval '10 days','71000000-0000-4000-8000-000000000006'),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000006','direction',now()-interval '10 days','71000000-0000-4000-8000-000000000006'),
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000009','psychology',now()-interval '10 days','71000000-0000-4000-8000-000000000006');
insert into public.care_phases(id,label) values('73000000-0000-4000-8000-000000000001','Fase neutra de QA');
insert into public.care_episodes(id,patient_id,started_at,created_by) values
('74000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',now()-interval '9 days','71000000-0000-4000-8000-000000000006'),
('74000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002',now()-interval '9 days','71000000-0000-4000-8000-000000000006');
insert into public.care_episode_history(episode_id,status,effective_at,actor_id,reason,version) select id,status,started_at,created_by,'Ingreso QA',version from public.care_episodes where id::text like '74000000%';
insert into private.care_reserved_notes(id,patient_id,author_id,body,occurred_at) values
('75000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','Reserva QA',now());
insert into private.care_family_notes(id,patient_id,author_id,body,occurred_at) values
('75000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','Terceros QA',now());
insert into public.care_shared_summaries(patient_id,author_id,visibility,body,occurred_at) values
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','coordination','Equipo QA',now()),
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','patient','Publicado QA',now()),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000004','patient','Paciente B QA',now());
set local role anon;
select pg_temp.care_denied($$select * from public.care_episodes$$,'Anon denied table');
select pg_temp.care_denied($$select public.care_directory()$$,'Anon denied RPC');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert((select count(*)=1 from public.care_episodes),'Patient only own episode');
select pg_temp.care_assert((select count(*)=0 from public.care_episode_history),'Patient cannot read internal episode reasons');
select pg_temp.care_assert((select count(*)=1 from public.care_shared_summaries),'Patient only explicitly published summary');
select pg_temp.care_assert((select count(*)=0 from public.care_assignments),'Patient cannot read internal assignments');
select pg_temp.care_assert((select count(*)=0 from public.care_staff_capabilities),'Patient cannot enumerate staff permissions');
select pg_temp.care_denied($$select public.care_directory()$$,'Patient cannot enumerate directory');
select pg_temp.care_denied($$select public.care_directory(management=>true)$$,'Patient cannot use management projection');
select pg_temp.care_denied($$select public.care_patient_identity('72000000-0000-4000-8000-000000000002')$$,'Patient cannot use staff identity resolver');
select pg_temp.care_denied($$select public.care_team()$$,'Patient cannot enumerate staff directory');
select pg_temp.care_denied($$select public.care_responsibles('72000000-0000-4000-8000-000000000001')$$,'Patient cannot use staff responsible directory');
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000001')$$,'Own patient reserved note unavailable');
select pg_temp.care_denied($$select * from private.care_reserved_notes$$,'Private table cannot bypass audited RPC');
select pg_temp.care_denied($$insert into public.care_shared_summaries(patient_id,author_id,body,occurred_at) values('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','forged',now())$$,'Direct write denied');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
select pg_temp.care_assert((select count(*)=0 from public.care_episodes where patient_id='72000000-0000-4000-8000-000000000001'),'Patient B cannot probe A');
select pg_temp.care_assert((select count(*)=1 from public.care_shared_summaries),'Patient B only own summary');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000007',true);
select pg_temp.care_assert((select count(*)=0 from public.care_episodes),'CMS editor no clinical reads');
select pg_temp.care_denied($$select public.care_directory()$$,'CMS no directory');
select pg_temp.care_denied($$select public.care_manage('episode','{}')$$,'CMS no mutations');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000008',true);
select pg_temp.care_assert((select count(*)=2 from public.care_episodes),'Direction sees all centre episodes without assignment');
select pg_temp.care_assert(public.care_read_note('75000000-0000-4000-8000-000000000001')->>'body'='Reserva QA','Direction audited access to reserved note');
select pg_temp.care_assert((public.care_directory(management=>true)->>'total')::int=2,'Direction manages complete directory');
select public.care_manage('capabilities','{"user_id":"71000000-0000-4000-8000-000000000005","capabilities":["care.patient.read","care.directory.read","care.records.read","care.medical.create"]}');
select pg_temp.care_assert((select count(*)=1 from public.care_staff_capabilities where user_id='71000000-0000-4000-8000-000000000005'),'Technical explicit capability configuration');
select pg_temp.care_denied($$select public.care_manage('capabilities','{"user_id":"71000000-0000-4000-8000-000000000005","capabilities":["unknown"]}')$$,'Unknown capability rejected','23514');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select pg_temp.care_assert((public.care_directory()->>'total')::int=1,'Psychology scoped directory count');
select pg_temp.care_assert((public.care_directory(q=>'Persona B')->>'total')::int=0,'Scoped search cannot leak unassigned name');
select pg_temp.care_assert(not ((public.care_directory()->'patients'->0) ? 'email'),'Directory does not expose email');
select pg_temp.care_assert((select count(*)=1 from public.care_episodes),'Assigned psychology one episode');
select pg_temp.care_assert(public.care_patient_identity('72000000-0000-4000-8000-000000000001')->>'display_name'='Persona A QA','Assigned staff identity projection');
select pg_temp.care_denied($$select public.care_patient_identity('72000000-0000-4000-8000-000000000002')$$,'Identity projection prevents unassigned IDOR');
select pg_temp.care_assert(jsonb_array_length(public.care_responsibles('72000000-0000-4000-8000-000000000001'))=2,'Responsible names exclude future and inactive staff');
select pg_temp.care_assert((select count(*)=2 from public.care_shared_summaries),'Psychology shared coordination and published');
select pg_temp.care_assert(public.care_read_note('75000000-0000-4000-8000-000000000001')->>'body'='Reserva QA','Author audited reserved read');
select pg_temp.care_assert(public.care_read_note('75000000-0000-4000-8000-000000000002','family')->>'body'='Terceros QA','Family author explicit capability');
select pg_temp.care_denied($$select public.care_manage('capabilities','{}')$$,'Professional cannot grant self permissions');
select pg_temp.care_denied($$select public.care_manage('assignment','{}')$$,'Professional cannot self assign');
select pg_temp.care_denied($$select public.care_manage('reserved_note','{"patient_id":"72000000-0000-4000-8000-000000000002"}')$$,'Professional cannot write unassigned');
select pg_temp.care_denied($$select public.care_manage('shared_summary',jsonb_build_object('patient_id','72000000-0000-4000-8000-000000000001','occurred_at',now(),'body','Texto','visibility','patient'))$$,'Patient publication requires explicit confirmation','P0001');
select set_config('care.test.created_note',public.care_manage('reserved_note',jsonb_build_object('patient_id','72000000-0000-4000-8000-000000000001','occurred_at',now(),'body','Nueva reserva QA','author_id','71000000-0000-4000-8000-000000000006'))::text,true);
select pg_temp.care_assert(public.care_read_note(current_setting('care.test.created_note')::uuid)->>'author_id'='71000000-0000-4000-8000-000000000003','Author derived from authenticated identity');
select public.care_manage('note_reader','{"id":"75000000-0000-4000-8000-000000000001","kind":"reserved","user_id":"71000000-0000-4000-8000-000000000005"}');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000006',true);
select pg_temp.care_assert((select count(*)=2 from public.care_episodes),'Direction assigned scope');
select pg_temp.care_assert(jsonb_array_length(public.care_team())=5,'Assignment manager sees only active eligible staff');
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000001')$$,'Direction not automatic reserve reader');
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000002','family')$$,'Direction not automatic third-party reader');
select pg_temp.care_denied($$select public.care_manage('note_reader','{"id":"75000000-0000-4000-8000-000000000001","kind":"reserved","user_id":"71000000-0000-4000-8000-000000000006"}')$$,'Direction cannot self grant reserve');
select pg_temp.care_denied($$select public.care_manage('episode',jsonb_build_object('patient_id','72000000-0000-4000-8000-000000000001','started_at',now(),'reason','Duplicado QA'))$$,'Overlapping episode denied','P0001');
select public.care_manage('episode_change',jsonb_build_object('id','74000000-0000-4000-8000-000000000001','version',1,'status','paused','phase_id','73000000-0000-4000-8000-000000000001','effective_at',now()-interval '2 days','reason','Pausa QA'));
select pg_temp.care_assert((select status='paused' and version=2 and ended_at is null from public.care_episodes where id='74000000-0000-4000-8000-000000000001'),'Pause separate from access account');
select pg_temp.care_assert((select count(*)=2 from public.care_episode_history where episode_id='74000000-0000-4000-8000-000000000001'),'Pause preserves history');
select pg_temp.care_denied($$select public.care_manage('episode_change',jsonb_build_object('id','74000000-0000-4000-8000-000000000001','version',1,'status','active','effective_at',now(),'reason','Concurrente'))$$,'Stale episode version rejected','40001');
select pg_temp.care_denied($$select public.care_manage('episode_change',jsonb_build_object('id','74000000-0000-4000-8000-000000000001','version',2,'status','active','effective_at',now()-interval '3 days','reason','Fuera de orden'))$$,'Effective dates remain ordered','P0001');
select public.care_manage('episode_change',jsonb_build_object('id','74000000-0000-4000-8000-000000000001','version',2,'status','discharged','effective_at',now()-interval '1 day','reason','Egreso QA'));
select pg_temp.care_assert((select status='discharged' and version=3 and ended_at is not null from public.care_episodes where id='74000000-0000-4000-8000-000000000001'),'Discharge recorded');
select pg_temp.care_denied($$select public.care_manage('episode_change',jsonb_build_object('id','74000000-0000-4000-8000-000000000001','version',3,'status','active','effective_at',now(),'reason','Reabrir'))$$,'Cannot overwrite closed episode','P0001');
select set_config('care.test.new_episode',public.care_manage('episode',jsonb_build_object('patient_id','72000000-0000-4000-8000-000000000001','started_at',now(),'reason','Reingreso QA'))::text,true);
select pg_temp.care_assert((select count(*)=2 from public.care_episodes where patient_id='72000000-0000-4000-8000-000000000001'),'Reentry is a new episode');
select pg_temp.care_assert((select started_at=now()-interval '9 days' from public.care_episodes where id='74000000-0000-4000-8000-000000000001'),'Original entry date preserved');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000004',true);
select pg_temp.care_assert((select count(*)=1 from public.care_episodes),'Recovery only assigned patient B');
select pg_temp.care_assert(not private.care_can('care.medical.create'),'Recovery does not inherit medical write');
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000001')$$,'Recovery no foreign reserve');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000005',true);
select pg_temp.care_assert((select count(*)=0 from public.care_episodes),'Future assignment not active');
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000001')$$,'Explicit note reader still needs current assignment');
reset role;
update public.care_assignments set starts_at=now()-interval '1 day' where professional_id='71000000-0000-4000-8000-000000000005';
set local role authenticated;
select pg_temp.care_assert(public.care_read_note('75000000-0000-4000-8000-000000000001')->>'body'='Reserva QA','Explicit reader with current scope succeeds');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select public.care_manage('note_reader_remove','{"id":"75000000-0000-4000-8000-000000000001","kind":"reserved","user_id":"71000000-0000-4000-8000-000000000005"}');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000005',true);
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000001')$$,'Reader grant revocation immediate');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000009',true);
select pg_temp.care_assert((select count(*)=0 from public.care_episodes),'Suspended staff scope denied');
select pg_temp.care_denied($$select public.care_manage('reserved_note','{"patient_id":"72000000-0000-4000-8000-000000000001"}')$$,'Suspended staff cannot write');
reset role;
update public.care_assignments set ends_at=now() where professional_id='71000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select pg_temp.care_assert((select count(*)=0 from public.care_episodes),'Assignment revoked with previous session');
select pg_temp.care_assert((public.care_directory()->>'total')::int=0,'Revocation removes directory count');
select pg_temp.care_assert((select count(*)=0 from public.care_shared_summaries),'Revocation removes coordination');
select pg_temp.care_denied($$select public.care_read_note('75000000-0000-4000-8000-000000000001')$$,'Author also loses reserved reads after assignment revoked');
reset role;
update public.patient_profiles set is_active=false where id='72000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select pg_temp.care_assert((select count(*)=0 from public.care_episodes),'Suspended patient previous session blocked');
select pg_temp.care_assert((select count(*)=0 from public.care_shared_summaries),'Suspended patient published summary blocked');
select pg_temp.care_assert((select count(*)=0 from public.care_episode_history),'Suspension hides history');
select pg_temp.care_denied($$update public.care_episodes set status='active'$$,'Direct update denied');
select pg_temp.care_denied($$delete from public.care_episode_history$$,'History deletion denied');
select pg_temp.care_denied($$select * from private.care_audit$$,'Audit unavailable to ordinary client');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000006',true);
select pg_temp.care_assert((select count(*)=2 from public.care_episodes where patient_id='72000000-0000-4000-8000-000000000001'),'Account suspension does not close treatment or remove authorised professional follow-up');
reset role;
select pg_temp.care_assert((select count(*)>0 from private.care_audit where action='care.note.read.reserved'),'Sensitive successful reads audited');
select pg_temp.care_assert((select count(*)>0 from private.care_audit where action='care.capabilities'),'Capability changes audited');
select pg_temp.care_assert(not exists(select 1 from information_schema.columns where table_schema='private' and table_name='care_audit' and column_name in ('body','metadata','token')),'Audit contains no clinical text or tokens');
select pg_temp.care_assert(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relname like 'care_%' and c.relkind='r' and not c.relrowsecurity),'Every care table has RLS');
rollback;
