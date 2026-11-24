-- Isolated fixtures only. Works with Supabase local (psql) or scripts/test-patient-library-db.mjs.
begin;
create function pg_temp.library_assert(ok boolean,label text) returns text language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if;return label;end $$;
create function pg_temp.library_denied(stmt text,label text) returns text language plpgsql as $$
begin
  begin execute stmt; exception when others then return label; end;
  raise exception 'FAIL (unexpected success): %',label;
end $$;
insert into auth.users(id,email) values
('10000000-0000-4000-8000-000000000001','a@example.test'),('10000000-0000-4000-8000-000000000002','b@example.test'),
('10000000-0000-4000-8000-000000000003','suspended@example.test'),('10000000-0000-4000-8000-000000000004','staff@example.test'),
('10000000-0000-4000-8000-000000000005','editor@example.test'),('10000000-0000-4000-8000-000000000006','super@example.test');
insert into public.admin_users(user_id,role,is_active) values
('10000000-0000-4000-8000-000000000004','viewer',true),('10000000-0000-4000-8000-000000000005','editor',true),('10000000-0000-4000-8000-000000000006','superadmin',true);
insert into public.therapeutic_staff_permissions(user_id,manage_access,manage_content) values('10000000-0000-4000-8000-000000000004',true,true);
insert into public.patient_profiles(id,auth_user_id,email,display_name,is_active) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','a@example.test','Paciente A',true),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','b@example.test','Paciente B',true),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','suspended@example.test','Suspendido',false);
insert into public.therapy_groups(id,name) values ('30000000-0000-4000-8000-000000000001','Grupo 1'),('30000000-0000-4000-8000-000000000002','Grupo 2');
insert into public.therapy_group_memberships(group_id,patient_id) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
insert into public.patient_library_folders(id,area_id,name) select '40000000-0000-4000-8000-000000000001',id,'Carpeta de A' from public.therapy_areas where sort_order=1;
insert into public.patient_library_folders(id,area_id,parent_id,name) select '40000000-0000-4000-8000-000000000002',id,'40000000-0000-4000-8000-000000000001','Informe reservado' from public.therapy_areas where sort_order=1;
insert into public.patient_library_materials(id,area_id,folder_id,title,kind,body,audience,status,author_id) select
  x.id::uuid,a.id,x.folder::uuid,x.title,x.kind,'<p>Texto neutro de prueba local.</p>',x.audience,x.status,'10000000-0000-4000-8000-000000000004'
from public.therapy_areas a cross join (values
('50000000-0000-4000-8000-000000000001',null,'General','guide','all','published'),
('50000000-0000-4000-8000-000000000002',null,'Grupo uno','activity','groups','published'),
('50000000-0000-4000-8000-000000000003',null,'Grupo dos','exercise','groups','published'),
('50000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000002','Informe A secreto','report','patients','published'),
('50000000-0000-4000-8000-000000000005',null,'Borrador','guide','all','draft'),
('50000000-0000-4000-8000-000000000006',null,'Archivado','guide','all','archived')) x(id,folder,title,kind,audience,status) where a.sort_order=1;
insert into public.patient_library_group_grants values ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001'),('50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002');
insert into public.patient_library_patient_grants values('50000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001');
insert into public.patient_library_attachments(id,material_id,original_name,mime,bytes,state) values
('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','archivo.pdf','application/pdf',100,'ready'),
('60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','pendiente.pdf','application/pdf',100,'pending');
insert into storage.objects(bucket_id,name) select 'patient-library',object_key from public.patient_library_attachments;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.library_assert((select count(*)=3 from public.patient_library_materials),'A sees general, own group and individual') as assertion;
select pg_temp.library_assert((select count(*)=2 from public.patient_library_folders),'A sees authorized folder and ancestors') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_profiles where id<>'20000000-0000-4000-8000-000000000001'),'A cannot discover other profiles') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.therapy_group_memberships),'No patient roster') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_patient_grants),'Recipients hidden from patients') as assertion;
select pg_temp.library_assert((select count(*)=1 from public.patient_library_attachments),'Pending upload invisible') as assertion;
select pg_temp.library_assert((select count(*)=0 from storage.objects where bucket_id='patient-library'),'Direct Storage listing denied even with broad existing policy') as assertion;
select pg_temp.library_denied($$insert into storage.objects(bucket_id,name) values('patient-library','forged')$$,'Direct Storage upload denied') as assertion;
select pg_temp.library_denied($$insert into public.therapy_group_memberships values('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',true)$$,'Patient cannot grant group membership') as assertion;
select pg_temp.library_denied($$select public.library_manage('permission','{"user_id":"10000000-0000-4000-8000-000000000001","manage_access":true,"manage_content":true,"read_content":true}')$$,'Patient cannot grant staff capabilities') as assertion;
select public.library_state('50000000-0000-4000-8000-000000000004',true,true);
select pg_temp.library_assert((select count(*)=1 from public.library_search(favorites=>true)),'Favorite is personal and authorized') as assertion;
select pg_temp.library_assert((select not is_new from public.library_search(q=>'Informe')),'First opening changes new flag') as assertion;
select pg_temp.library_assert((select total_count=3 from public.library_search() limit 1),'Count is authorized') as assertion;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.library_assert((select count(*)=2 from public.patient_library_materials),'B sees general and own group only') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_materials where id='50000000-0000-4000-8000-000000000004'),'Changing UUID cannot read A report') as assertion;
select pg_temp.library_assert(public.library_patient_material('50000000-0000-4000-8000-000000000004') is null,'Detail RPC neutral for unauthorized UUID') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.library_search(q=>'secreto')),'Search does not leak A title') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_folders),'B cannot discover A folders or breadcrumbs') as assertion;
select pg_temp.library_assert(jsonb_array_length(public.library_navigation()->'folders')=0,'Navigation does not leak folders') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_attachments),'Attachment metadata private') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_user_state),'Cannot read A favorites') as assertion;
select pg_temp.library_denied($$select public.library_state('50000000-0000-4000-8000-000000000004',true,true)$$,'Cannot favorite or open unauthorized report') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.library_search(page=>2)),'Pagination remains authorized') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.library_search(q=>'Texto neutro')),'Search excludes body') as assertion;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select pg_temp.library_assert((select count(*)=0 from public.patient_library_materials),'Suspended profile has no materials') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.therapy_areas),'Suspended profile has no facets') as assertion;
select pg_temp.library_assert(public.library_patient_material('50000000-0000-4000-8000-000000000001') is null,'Suspended detail denied') as assertion;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select pg_temp.library_assert((select count(*)=0 from public.patient_library_materials),'CMS editor has no therapeutic read') as assertion;
select pg_temp.library_denied($$select public.library_manage('area','{"name":"Forbidden"}')$$,'CMS editor cannot manage therapeutic content') as assertion;
select pg_temp.library_denied($$select public.library_recipients()$$,'CMS editor cannot list therapeutic recipients') as assertion;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
select pg_temp.library_assert((select count(*)=6 from public.patient_library_materials),'Direction reads all therapeutic materials including drafts and archived') as assertion;
select public.library_manage('permission','{"user_id":"10000000-0000-4000-8000-000000000005","manage_access":false,"manage_content":false,"read_content":true}');
select pg_temp.library_assert((select count(*)=6 from public.patient_library_materials),'Granting another user preserves Direction centre access') as assertion;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select pg_temp.library_assert((select count(*)=6 from public.patient_library_materials),'Explicit staff can read drafts and archived') as assertion;
select pg_temp.library_assert((select count(*)=6 from public.library_search(staff=>true)),'Staff search requires explicit mode and capability') as assertion;
select pg_temp.library_assert((select count(*)=1 from public.library_search(staff=>true,status_filter=>'draft')),'Staff can filter drafts without changing patient visibility') as assertion;
select pg_temp.library_denied($$select public.library_manage('membership','{"group_id":"30000000-0000-4000-8000-000000000001","patient_id":"20000000-0000-4000-8000-000000000003","is_active":true}')$$,'Cannot activate membership for suspended patient') as assertion;
select pg_temp.library_assert(public.library_preview('50000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001') is not null,'Patient preview uses effective resolver') as assertion;
select pg_temp.library_assert(public.library_preview('50000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002') is null,'Staff preview does not bypass patient audience') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('id','50000000-0000-4000-8000-000000000001','version',99))$$,'Concurrent version conflict rejected') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('title','Invalid report','area_id',(select id from public.therapy_areas limit 1),'kind','report','audience','all','status','draft','patients','[]'::jsonb,'groups','[]'::jsonb))$$,'Report cannot target all') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('title','Invalid report','area_id',(select id from public.therapy_areas limit 1),'kind','report','audience','patients','status','draft','patients',jsonb_build_array('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'),'groups','[]'::jsonb))$$,'Report cannot have multiple patients') as assertion;
select pg_temp.library_denied($$select public.library_manage('folder',jsonb_build_object('id','40000000-0000-4000-8000-000000000001','area_id',(select id from public.therapy_areas where sort_order=1),'name','Cycle','parent_id','40000000-0000-4000-8000-000000000002','is_active',true))$$,'Folder cycle rejected') as assertion;
select pg_temp.library_denied($$select public.library_manage('folder',jsonb_build_object('id','40000000-0000-4000-8000-000000000001','area_id',(select id from public.therapy_areas where sort_order=1),'name','Archive','is_active',false))$$,'Cannot archive nonempty folder tree') as assertion;
select pg_temp.library_denied($$select public.library_finish_attachment('60000000-0000-4000-8000-000000000002',true,'10000000-0000-4000-8000-000000000004')$$,'Normal session cannot finalize unchecked uploads') as assertion;
select public.library_manage('membership','{"group_id":"30000000-0000-4000-8000-000000000001","patient_id":"20000000-0000-4000-8000-000000000001","is_active":false}');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.library_assert((select count(*)=2 from public.patient_library_materials),'Group removal takes effect with previous session') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_materials where id='50000000-0000-4000-8000-000000000002'),'Previous group history revoked') as assertion;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.library_manage('patient_status','{"id":"20000000-0000-4000-8000-000000000001","is_active":false}');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.library_assert((select count(*)=0 from public.patient_library_materials),'Suspension takes effect without JWT refresh') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_user_state),'Suspension hides old favorites') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_attachments),'Suspension hides ready attachments') as assertion;
reset role;
-- Exercise successful transactional publication, edits and upload replacement, not just denials.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.library_manage('material',jsonb_build_object('id','50000000-0000-4000-8000-000000000007','version',0,
  'area_id',(select id from public.therapy_areas where sort_order=1),'title','Publicación local','description','prueba','kind','guide','body','<p>Contenido.</p>',
  'audience','groups','groups',jsonb_build_array('30000000-0000-4000-8000-000000000002'),'patients','[]'::jsonb,'status','published','confirm_publish',true));
select pg_temp.library_assert((select status='published' and version=1 from public.patient_library_materials where id='50000000-0000-4000-8000-000000000007'),'Successful publication commits material and audience') as assertion;
select pg_temp.library_assert((select count(*)=1 from public.patient_library_group_grants where material_id='50000000-0000-4000-8000-000000000007'),'Publication commits group grants') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('id','50000000-0000-4000-8000-000000000007','version',1,'area_id',(select id from public.therapy_areas where sort_order=1),'title','Changed audience','kind','guide','body','<p>Content.</p>','audience','all','groups','[]'::jsonb,'patients','[]'::jsonb,'status','published','confirm_publish',true))$$,'Audience change requires explicit confirmation') as assertion;
select pg_temp.library_assert((select count(*)=1 from public.patient_library_group_grants where material_id='50000000-0000-4000-8000-000000000007'),'Rejected audience edit rolls back grants') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('id','50000000-0000-4000-8000-000000000007','area_id',(select id from public.therapy_areas where sort_order=1),'title','Missing version','kind','guide','body','Text','audience','groups','groups',jsonb_build_array('30000000-0000-4000-8000-000000000002'),'patients','[]'::jsonb,'status','draft'))$$,'Missing version cannot bypass concurrency') as assertion;
select public.library_manage('material',jsonb_build_object('id','50000000-0000-4000-8000-000000000007','version',1,'area_id',(select id from public.therapy_areas where sort_order=1),'title','Changed audience','kind','guide','body','<p>Content.</p>','audience','all','groups','[]'::jsonb,'patients','[]'::jsonb,'status','published','confirm_publish',true,'confirm_audience',true));
select pg_temp.library_assert((select version=2 and audience='all' from public.patient_library_materials where id='50000000-0000-4000-8000-000000000007'),'Explicit audience edit increments version') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.patient_library_group_grants where material_id='50000000-0000-4000-8000-000000000007'),'Old group grants removed transactionally') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('title','Empty published','area_id',(select id from public.therapy_areas where sort_order=1),'kind','guide','body','<p></p>','audience','all','groups','[]'::jsonb,'patients','[]'::jsonb,'status','published','confirm_publish',true))$$,'Publication requires body or ready file') as assertion;
select pg_temp.library_denied($$select public.library_manage('material',jsonb_build_object('id','50000000-0000-4000-8000-000000000001','version',1,'title','Pending published','area_id',(select id from public.therapy_areas where sort_order=1),'kind','guide','body','Text','audience','all','groups','[]'::jsonb,'patients','[]'::jsonb,'status','published','confirm_publish',true))$$,'Pending upload blocks publication') as assertion;
select public.library_manage('patient','{"email":" NEW@EXAMPLE.TEST ","display_name":"Nuevo local"}');
select public.library_manage('patient','{"email":"new@example.test","display_name":"Nuevo local actualizado"}');
select pg_temp.library_assert((select count(*)=1 from public.patient_profiles where email='new@example.test'),'Provisioning is normalized and idempotent') as assertion;
select public.library_manage('invitation_claim',jsonb_build_object('id',(select id from public.patient_profiles where email='new@example.test')));
select pg_temp.library_assert((select invitation_state='sending' from public.patient_profiles where email='new@example.test'),'Invitation records pending sending state') as assertion;
select pg_temp.library_denied($$select public.library_manage('invitation_claim',jsonb_build_object('id',(select id from public.patient_profiles where email='new@example.test')))$$,'Duplicate in-flight invitation denied') as assertion;
select public.library_manage('invitation_result',jsonb_build_object('id',(select id from public.patient_profiles where email='new@example.test'),'success',false));
select pg_temp.library_assert((select invitation_state='failed' from public.patient_profiles where email='new@example.test'),'Failed invitation remains recoverable') as assertion;
select public.library_manage('invitation_claim',jsonb_build_object('id',(select id from public.patient_profiles where email='new@example.test')));
select pg_temp.library_assert((select invitation_state='sending' from public.patient_profiles where email='new@example.test'),'Failed invitation can retry idempotently') as assertion;
select public.library_manage('patient','{"email":"editor@example.test","display_name":"Coexisting local"}');
reset role;
select pg_temp.library_assert((select role='editor' from public.admin_users where user_id='10000000-0000-4000-8000-000000000005'),'Linking existing Auth does not alter CMS role') as assertion;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select pg_temp.library_assert((select count(*)>0 from public.library_search(staff=>true)),'Coexisting staff has explicit therapeutic capability') as assertion;
select pg_temp.library_assert(public.library_patient_material('50000000-0000-4000-8000-000000000004') is null,'Coexisting patient portal cannot inherit staff access to another report') as assertion;
select pg_temp.library_assert((select count(*)=0 from public.library_search(q=>'Informe')),'Coexisting patient search cannot inherit staff scope') as assertion;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.library_manage('folder',jsonb_build_object('id','40000000-0000-4000-8000-000000000003','area_id',(select id from public.therapy_areas where sort_order=1),'parent_id','40000000-0000-4000-8000-000000000002','name','Nivel 3','is_active',true));
select public.library_manage('folder',jsonb_build_object('id','40000000-0000-4000-8000-000000000004','area_id',(select id from public.therapy_areas where sort_order=1),'parent_id','40000000-0000-4000-8000-000000000003','name','Nivel 4','is_active',true));
select pg_temp.library_denied($$select public.library_manage('folder',jsonb_build_object('area_id',(select id from public.therapy_areas where sort_order=1),'parent_id','40000000-0000-4000-8000-000000000004','name','Nivel 5','is_active',true))$$,'Fifth folder depth rejected') as assertion;
-- Store a pending replacement and verify the previous file stays available until verified.
select public.library_manage('attachment_begin','{"material_id":"50000000-0000-4000-8000-000000000004","version":1,"original_name":"replacement.pdf","mime":"application/pdf","bytes":150,"replaces_id":"60000000-0000-4000-8000-000000000001"}');
select pg_temp.library_assert((select state='ready' from public.patient_library_attachments where id='60000000-0000-4000-8000-000000000001'),'Interrupted replacement preserves original ready file') as assertion;
select pg_temp.library_denied($$select public.library_manage('attachment_begin','{"material_id":"50000000-0000-4000-8000-000000000004","version":1,"original_name":"duplicate.pdf","mime":"application/pdf","bytes":150,"replaces_id":"60000000-0000-4000-8000-000000000001"}')$$,'Concurrent replacement of same file denied') as assertion;
reset role;
select pg_temp.library_denied($$select public.library_finish_attachment((select id from public.patient_library_attachments where replaces_id='60000000-0000-4000-8000-000000000001'),true,'10000000-0000-4000-8000-000000000004')$$,'Finalize requires uploaded object') as assertion;
insert into storage.objects(bucket_id,name) select 'patient-library',object_key from public.patient_library_attachments where replaces_id='60000000-0000-4000-8000-000000000001';
select public.library_finish_attachment((select id from public.patient_library_attachments where replaces_id='60000000-0000-4000-8000-000000000001'),true,'10000000-0000-4000-8000-000000000004');
select pg_temp.library_assert((select state='retired' from public.patient_library_attachments where id='60000000-0000-4000-8000-000000000001'),'Verified replacement atomically retires original') as assertion;
select pg_temp.library_assert((select state='ready' from public.patient_library_attachments where replaces_id='60000000-0000-4000-8000-000000000001'),'Verified replacement becomes ready') as assertion;
select pg_temp.library_assert((select version=2 from public.patient_library_materials where id='50000000-0000-4000-8000-000000000004'),'Upload completion increments material version') as assertion;
set local role anon;
select pg_temp.library_denied($$select * from public.patient_library_materials$$,'Anonymous cannot query library tables') as assertion;
select pg_temp.library_denied($$select public.library_search()$$,'Anonymous cannot call search RPC') as assertion;
reset role;
rollback;
