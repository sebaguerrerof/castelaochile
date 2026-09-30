-- Real linked-database assertions; all fixtures and mutations roll back.
begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values ('00000000-0000-0000-0000-00000000c001','authenticated','authenticated','cms-editor@example.test','not-used',now(),now(),now()),
('00000000-0000-0000-0000-00000000c002','authenticated','authenticated','cms-viewer@example.test','not-used',now(),now(),now()),
('00000000-0000-0000-0000-00000000c003','authenticated','authenticated','cms-inactive@example.test','not-used',now(),now(),now());
insert into public.admin_users(user_id,role,is_active) values ('00000000-0000-0000-0000-00000000c001','editor',true),('00000000-0000-0000-0000-00000000c002','viewer',true),('00000000-0000-0000-0000-00000000c003','editor',false);
insert into public.cms_pages(slug,path,title,nav_label,status) values ('cms-test-draft','/cms-test-draft','Test draft','Test','draft'),('cms-test-public','/cms-test-public','Test public','Test','published');
insert into public.cms_page_sections(page_id,section_type,data,is_enabled) select id,'warning','{"title":"Test","description":"Test"}',slug='cms-test-draft' from public.cms_pages where slug in ('cms-test-draft','cms-test-public');
insert into public.professionals(slug,full_name,role,status) values ('cms-test-draft','Test draft','Test','draft');
select set_config('request.jwt.claim.role','anon',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.cms_pages where slug='cms-test-draft') then raise exception 'Draft page leaked'; end if;
 if exists(select 1 from public.professionals where slug='cms-test-draft') then raise exception 'Draft professional leaked'; end if;
 if exists(select 1 from public.cms_page_sections where data->>'title'='Test') then raise exception 'Draft or disabled sections leaked'; end if;
 if not exists(select 1 from public.cms_pages where slug='cms-test-public') then raise exception 'Published page hidden'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c002',true);
set local role authenticated;
do $$ declare changed integer; begin
 if not exists(select 1 from public.cms_pages where slug='cms-test-draft') then raise exception 'Viewer cannot preview'; end if;
 update public.cms_pages set title='Forbidden' where slug='cms-test-draft'; get diagnostics changed=row_count;
 if changed <> 0 then raise exception 'Viewer wrote a page'; end if;
 begin perform public.save_cms_page('{}'); raise exception 'Viewer RPC allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c003',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.cms_pages where slug='cms-test-draft') then raise exception 'Inactive staff sees draft'; end if;
 begin insert into public.professionals(slug,full_name,role) values('forbidden','Forbidden','Test'); raise exception 'Inactive staff wrote'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c001',true);
set local role authenticated;
do $$ declare page public.cms_pages; payload jsonb; before_count integer; begin
 select * into page from public.cms_pages where slug='cms-test-draft';
 payload := jsonb_build_object('id',page.id,'updated_at',page.updated_at,'title','Updated','nav_label','Test','status','published','seo_title','','seo_description','','og_image_url','','show_in_navigation',false,'navigation_order',0,'sections',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'section_type','hero','data',jsonb_build_object('title','Test','description','Test'),'sort_order',0,'is_enabled',true)));
 perform public.save_cms_page(payload);
 if not exists(select 1 from public.cms_pages where id=page.id and title='Updated' and status='published' and updated_by=auth.uid()) then raise exception 'Atomic page save failed'; end if;
 begin perform public.save_cms_page(payload); raise exception 'Stale page overwrite allowed'; exception when serialization_failure then null; end;
 select * into page from public.cms_pages where id=page.id;
 payload := jsonb_set(payload,'{updated_at}',to_jsonb(page.updated_at));
 payload := jsonb_set(payload,'{sections}',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'section_type','unknown','data',jsonb_build_object('title','Test'),'sort_order',0,'is_enabled',true)));
 begin perform public.save_cms_page(payload); raise exception 'Invalid block allowed'; exception when check_violation then null; end;
 select count(*) into before_count from public.cms_page_sections where page_id=page.id;
 if before_count <> 1 then raise exception 'Failed save lost sections'; end if;
 update public.professionals set status='published',sort_order=7 where slug='cms-test-draft';
 if not exists(select 1 from public.professionals where slug='cms-test-draft' and status='published' and sort_order=7) then raise exception 'Professional publishing failed'; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.admin_audit_log where actor_id='00000000-0000-0000-0000-00000000c001' and resource_type='cms_pages') then raise exception 'Missing audit'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c099',true);
set local role authenticated;
do $$ begin
 begin perform public.save_cms_page('{}'); raise exception 'Outsider RPC allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: anonymous, viewer, inactive staff, editor, outsider, atomic save, conflict, rollback and audit' as cms_rls;
