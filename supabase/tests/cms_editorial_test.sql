begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('00000000-0000-0000-0000-00000000e101','authenticated','authenticated','editorial-editor@example.test','not-used',now(),now(),now()),
('00000000-0000-0000-0000-00000000e102','authenticated','authenticated','editorial-viewer@example.test','not-used',now(),now(),now()),
('00000000-0000-0000-0000-00000000e103','authenticated','authenticated','editorial-external@example.test','not-used',now(),now(),now());
insert into public.admin_users(user_id,role,is_active) values('00000000-0000-0000-0000-00000000e101','editor',true),('00000000-0000-0000-0000-00000000e102','viewer',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e101',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare pid uuid; wid uuid; version timestamptz; dv timestamptz; wdv timestamptz; wpayload jsonb; payload jsonb; pv timestamptz; target text;
begin
 pid:=public.create_editorial_page('Original','/editorial-test/original');
 select updated_at into version from public.cms_pages where id=pid;
 payload:=jsonb_build_object('id',pid,'updated_at',version,'path','/editorial-test/original','navigation_group','recursos','title','Original','nav_label','Original','status','published','seo_title','','seo_description','','og_image_url','','show_in_navigation',true,'navigation_order',1,'sections',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'section_type','hero','sort_order',0,'is_enabled',true,'data',jsonb_build_object('title','Original'))));
 perform public.save_editorial_content('page',pid::text,payload,version,null,true);
 select updated_at into version from public.cms_pages where id=pid;
 payload:=payload||jsonb_build_object('updated_at',version,'path','/editorial-test/new','title','Pending','status','draft');
 perform public.save_editorial_content('page',pid::text,payload,version,null,false);
 if not exists(select 1 from public.cms_pages where id=pid and title='Original' and path='/editorial-test/original' and status='published' and updated_at=version) then raise exception 'Draft changed public page'; end if;
 if not exists(select 1 from public.cms_editorial_drafts where kind='page' and resource_id=pid::text) then raise exception 'Missing draft'; end if;
 begin perform public.save_editorial_content('page',pid::text,payload,version,null,false); raise exception 'Stale draft accepted'; exception when serialization_failure then null; end;
 select updated_at into dv from public.cms_editorial_drafts where kind='page' and resource_id=pid::text;
 perform public.save_editorial_content('page',pid::text,payload||'{"status":"published"}',version,dv,true);
 if not exists(select 1 from public.cms_pages where id=pid and path='/editorial-test/new' and title='Pending') then raise exception 'Publication missing'; end if;
 if not exists(select 1 from public.cms_redirects where source_path='/editorial-test/original' and page_id=pid) then raise exception 'Redirect missing'; end if;
 if exists(select 1 from public.cms_editorial_drafts where kind='page' and resource_id=pid::text) then raise exception 'Published draft remains'; end if;
 select updated_at into pv from public.cms_pages where id=pid;
 begin perform public.save_editorial_content('page',pid::text,payload,version,null,true); raise exception 'Stale publication accepted'; exception when serialization_failure then null; end;
 foreach target in array array['/admin/hijack','/api/data','/pacientes/test','/auth/callback','/blog/article','/equipo/other','/one/../two','//other','/invalid%2fpath'] loop
   if private.cms_path_allowed(target) then raise exception 'Reserved or invalid path allowed: %',target; end if;
 end loop;
 begin perform public.create_editorial_page('Duplicate','/editorial-test/new'); raise exception 'Duplicate route accepted'; exception when unique_violation then null; end;
 begin perform public.create_editorial_page('Redirect','/editorial-test/original'); raise exception 'Redirect occupied'; exception when unique_violation then null; end;
 -- Withdrawal to real draft keeps blocks, redirects and a pending editorial draft.
 wid:=public.create_editorial_page('Withdraw','/editorial-test/withdraw');
 select updated_at into version from public.cms_pages where id=wid;
 wpayload:=jsonb_build_object('id',wid,'updated_at',version,'path','/editorial-test/withdraw','navigation_group','recursos','title','Withdraw','nav_label','Withdraw','status','published','seo_title','','seo_description','','og_image_url','','show_in_navigation',true,'navigation_order',2,'sections',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'section_type','hero','sort_order',0,'is_enabled',true,'data',jsonb_build_object('title','Withdraw'))));
 perform public.save_editorial_content('page',wid::text,wpayload,version,null,true);
 select updated_at into version from public.cms_pages where id=wid;
 insert into public.cms_redirects(source_path,page_id) values('/editorial-test/withdraw-old',wid);
 perform public.save_editorial_content('page',wid::text,wpayload||jsonb_build_object('updated_at',version,'title','Pending withdraw','status','draft'),version,null,false);
 select updated_at into wdv from public.cms_editorial_drafts where kind='page' and resource_id=wid::text;
 begin perform public.withdraw_editorial_page(wid,version-interval '1 second',wdv); raise exception 'Stale withdrawal accepted'; exception when serialization_failure then null; end;
 begin perform public.withdraw_editorial_page(wid,version,null); raise exception 'Withdrawal ignored a pending draft version'; exception when serialization_failure then null; end;
 perform public.withdraw_editorial_page(wid,version,wdv);
 select updated_at into pv from public.cms_pages where id=wid;
 if not exists(select 1 from public.cms_pages where id=wid and status='draft' and title='Withdraw' and path='/editorial-test/withdraw') then raise exception 'Withdrawal changed more than the state'; end if;
 if not exists(select 1 from public.cms_page_sections where page_id=wid) then raise exception 'Withdrawal removed blocks'; end if;
 if not exists(select 1 from public.cms_editorial_drafts where kind='page' and resource_id=wid::text and updated_at=wdv and base_updated_at=pv and data->>'title'='Pending withdraw') then raise exception 'Pending draft not preserved with updated base'; end if;
 begin perform public.withdraw_editorial_page(wid,pv,wdv); raise exception 'Withdrew a non-published page'; exception when raise_exception then if sqlerrm='Withdrew a non-published page' then raise; end if; end;
 perform public.save_editorial_content('page',wid::text,wpayload||jsonb_build_object('updated_at',pv,'title','Republished','status','published'),pv,wdv,true);
 if not exists(select 1 from public.cms_pages where id=wid and status='published' and title='Republished') then raise exception 'Republication failed'; end if;
 select updated_at into version from public.cms_pages where id=wid;
 perform public.withdraw_editorial_page(wid,version,null);
 select updated_at into version from public.site_settings where id='global';
 select data into payload from public.site_settings where id='global';
 perform public.save_editorial_content('settings','global',payload||'{"email":"review@example.test"}',version,null,false);
 if exists(select 1 from public.site_settings where id='global' and data->>'email'='review@example.test') then raise exception 'Settings draft leaked'; end if;
 select updated_at into dv from public.cms_editorial_drafts where kind='settings' and resource_id='global';
 update public.site_settings set data=data||'{"email":"new-public@example.test"}' where id='global';
 begin perform public.save_editorial_content('settings','global',payload,version,dv,true); raise exception 'An old draft overwrote a newer public edit'; exception when serialization_failure then null; end;
 perform set_config('test.editorial_page',pid::text,true);
end $$;
reset role;
-- RLS hides redirects of unpublished pages and audit rows from editors, so verify as the table owner.
do $$ begin
 if not exists(select 1 from public.cms_redirects where source_path='/editorial-test/withdraw-old') then raise exception 'Withdrawal removed redirect'; end if;
 if not exists(select 1 from public.admin_audit_log where action='cms.withdrawn' and resource_id=(select page_id from public.cms_redirects where source_path='/editorial-test/withdraw-old')) then raise exception 'Withdrawal not audited'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e102',true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.cms_editorial_drafts where kind='settings') then raise exception 'Viewer cannot preview draft'; end if;
 begin perform public.create_editorial_page('Forbidden','/editorial-forbidden'); raise exception 'Viewer created page'; exception when insufficient_privilege then null; end;
 begin perform public.save_editorial_content('settings','global','{}',now(),null,false); raise exception 'Viewer staged content'; exception when insufficient_privilege then null; end;
 begin perform public.withdraw_editorial_page(gen_random_uuid(),now(),null); raise exception 'Viewer withdrew page'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e103',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.cms_editorial_drafts) then raise exception 'External user read drafts'; end if;
 begin perform public.create_editorial_page('Forbidden','/editorial-forbidden'); raise exception 'External user created page'; exception when insufficient_privilege then null; end;
 begin perform public.withdraw_editorial_page(gen_random_uuid(),now(),null); raise exception 'External user withdrew page'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
set local role anon;
do $$ begin
 begin perform count(*) from public.cms_editorial_drafts; raise exception 'Anonymous user read drafts'; exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.cms_pages where path='/editorial-test/new' and title='Pending') then raise exception 'Published page missing anonymously'; end if;
 if not exists(select 1 from public.cms_redirects where source_path='/editorial-test/original') then raise exception 'Published redirect hidden'; end if;
 begin perform public.create_editorial_page('Forbidden','/editorial-forbidden'); raise exception 'Anonymous user created page'; exception when insufficient_privilege then null; end;
 begin perform public.withdraw_editorial_page(gen_random_uuid(),now(),null); raise exception 'Anonymous user withdrew page'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.cms_pages where path='/editorial-test/withdraw') then raise exception 'Withdrawn page still public'; end if;
 if exists(select 1 from public.cms_redirects where source_path='/editorial-test/withdraw-old') then raise exception 'Withdrawn page redirect still public'; end if;
end $$;
reset role;
select 'PASS: drafts isolated, atomic publication, withdrawal to draft, redirects, conflicts, reserved routes and anon/viewer/external RLS' as result;
rollback;
