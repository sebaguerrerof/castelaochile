-- Editorial drafts are separate from publicly readable CMS rows.
create function private.cms_path_allowed(p text) returns boolean language sql immutable set search_path='' as $$
 select p is not null and length(p)<=180 and p ~ '^(/|(/[a-z0-9]+(-[a-z0-9]+)*){1,5})$'
 and p !~ '^/(admin|api|auth|pacientes|blog|noticias|privacidad-analitica|robots|sitemap|favicon|manifest|icon|apple-icon)(/|$)'
 and p !~ '^/equipo/';
$$;
revoke all on function private.cms_path_allowed(text) from public,anon;
grant execute on function private.cms_path_allowed(text) to authenticated,service_role;
alter table public.cms_pages drop constraint cms_pages_path_check;
alter table public.cms_pages add constraint cms_pages_path_check check(private.cms_path_allowed(path));
alter table public.cms_pages add column navigation_group text not null default 'recursos' check(navigation_group ~ '^[a-z][a-z0-9-]*$');
update public.cms_pages set navigation_group=case
 when path in('/instituto','/nuestro-enfoque','/equipo') then 'instituto'
 when path in('/acompanamiento','/tratamiento','/recovery-40') then 'tratamiento'
 when path='/familias' then 'familias' when path='/contacto' then 'contacto' else 'recursos' end;

create table public.cms_editorial_drafts(
 kind text not null check(kind in('page','professional','settings')),
 resource_id text not null,
 data jsonb not null check(jsonb_typeof(data)='object'),
 base_updated_at timestamptz not null,
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid references auth.users(id) on delete set null,
 primary key(kind,resource_id)
);
create index cms_editorial_drafts_updated_by_idx on public.cms_editorial_drafts(updated_by);
alter table public.cms_editorial_drafts enable row level security;
revoke all on public.cms_editorial_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.cms_editorial_drafts to authenticated;
grant all on public.cms_editorial_drafts to service_role;
create policy editorial_read on public.cms_editorial_drafts for select to authenticated using((select private.is_active_staff()));
create policy editorial_insert on public.cms_editorial_drafts for insert to authenticated with check((select private.is_editor_or_superadmin()));
create policy editorial_update on public.cms_editorial_drafts for update to authenticated using((select private.is_editor_or_superadmin())) with check((select private.is_editor_or_superadmin()));
create policy editorial_delete on public.cms_editorial_drafts for delete to authenticated using((select private.is_editor_or_superadmin()));

create table public.cms_redirects(
 source_path text primary key check(private.cms_path_allowed(source_path)),
 page_id uuid not null references public.cms_pages(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index cms_redirects_page_idx on public.cms_redirects(page_id);
alter table public.cms_redirects enable row level security;
revoke all on public.cms_redirects from public,anon,authenticated;
grant select on public.cms_redirects to anon,authenticated;
grant insert,update,delete on public.cms_redirects to authenticated;
grant all on public.cms_redirects to service_role;
create policy cms_redirect_read on public.cms_redirects for select to anon,authenticated using(exists(select 1 from public.cms_pages p where p.id=page_id and p.status='published'));
create policy cms_redirect_insert on public.cms_redirects for insert to authenticated with check((select private.is_editor_or_superadmin()));
create policy cms_redirect_update on public.cms_redirects for update to authenticated using((select private.is_editor_or_superadmin())) with check((select private.is_editor_or_superadmin()));
create policy cms_redirect_delete on public.cms_redirects for delete to authenticated using((select private.is_editor_or_superadmin()));

create function public.create_editorial_page(p_title text,p_path text) returns uuid language plpgsql security invoker set search_path='' as $$
declare pid uuid:=gen_random_uuid();
begin
 if auth.uid() is null or not coalesce(private.is_editor_or_superadmin(),false) then raise insufficient_privilege; end if;
 if length(trim(p_title)) not between 1 and 200 or not private.cms_path_allowed(p_path) then raise exception 'Invalid page'; end if;
 if exists(select 1 from public.cms_redirects where source_path=p_path) then raise exception 'Route already redirected' using errcode='23505'; end if;
 insert into public.cms_pages(id,slug,path,title,nav_label,status,show_in_navigation) values(pid,'page-'||pid::text,p_path,trim(p_title),trim(p_title),'draft',false);
 insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled)
 values(pid,'hero',jsonb_build_object('title',trim(p_title),'description','','eyebrow','','variant','blue'),0,true);
 return pid;
end; $$;
revoke all on function public.create_editorial_page(text,text) from public,anon;
grant execute on function public.create_editorial_page(text,text) to authenticated;

create function public.save_editorial_content(p_kind text,p_id text,p_data jsonb,p_base_updated_at timestamptz,p_draft_updated_at timestamptz,p_publish boolean default false)
returns text language plpgsql security invoker set search_path='' as $$
declare
 current_version timestamptz; draft_version timestamptz; old_path text; new_path text; section jsonb;
 page_data jsonb; pro public.professionals; source_state text; redirect_owner uuid;
begin
 if auth.uid() is null or not coalesce(private.is_editor_or_superadmin(),false) then raise insufficient_privilege; end if;
 if p_publish is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>900000 then raise exception 'Invalid payload'; end if;
 if p_kind='page' then
   select updated_at,path into current_version,old_path from public.cms_pages where id=p_id::uuid for update;
 elsif p_kind='professional' then
   select updated_at into current_version from public.professionals where id=p_id::uuid for update;
 elsif p_kind='settings' and p_id='global' then
   select updated_at into current_version from public.site_settings where id='global' for update;
 else raise exception 'Invalid resource'; end if;
 if current_version is null then raise exception 'Resource not found'; end if;
 if current_version is distinct from p_base_updated_at then raise exception 'CMS_CONFLICT' using errcode='40001'; end if;
 select updated_at into draft_version from public.cms_editorial_drafts where kind=p_kind and resource_id=p_id for update;
 if draft_version is distinct from p_draft_updated_at then raise exception 'CMS_DRAFT_CONFLICT' using errcode='40001'; end if;
 if p_kind='page' then
   new_path:=coalesce(p_data->>'path',old_path);
   if not private.cms_path_allowed(new_path) or (old_path in('/','/equipo') and new_path<>old_path) then raise exception 'Reserved route'; end if;
   if exists(select 1 from public.cms_pages where path=new_path and id<>p_id::uuid) then raise exception 'Route exists' using errcode='23505'; end if;
   select page_id into redirect_owner from public.cms_redirects where source_path=new_path;
   if redirect_owner is not null and redirect_owner<>p_id::uuid then raise exception 'Redirect exists' using errcode='23505'; end if;
   if jsonb_typeof(p_data->'sections') is distinct from 'array' or jsonb_array_length(p_data->'sections') not between 1 and 40 then raise exception 'Invalid sections'; end if;
   if (select count(*) from jsonb_array_elements(p_data->'sections') s where s->>'section_type'='hero' and (s->>'is_enabled')::boolean)<>1
     or (select s->>'section_type' from jsonb_array_elements(p_data->'sections') s where (s->>'is_enabled')::boolean order by (s->>'sort_order')::integer limit 1)<>'hero' then raise exception 'Hero required first'; end if;
   if (select count(distinct s->>'id') from jsonb_array_elements(p_data->'sections') s)<>jsonb_array_length(p_data->'sections') then raise exception 'Duplicate block'; end if;
 end if;
 if not p_publish then
   insert into public.cms_editorial_drafts(kind,resource_id,data,base_updated_at,updated_by)
   values(p_kind,p_id,p_data,current_version,auth.uid())
   on conflict(kind,resource_id) do update set data=excluded.data,base_updated_at=excluded.base_updated_at,updated_at=clock_timestamp(),updated_by=auth.uid();
 else
   if p_kind='page' then
     source_state:=p_data->>'status';
     if source_state not in('published','archived') or source_state is null then raise exception 'Invalid publication state'; end if;
     -- Existing serializer and RLS preserve the atomic page/blocks write.
     page_data:=p_data || jsonb_build_object('id',p_id,'updated_at',current_version);
     perform public.save_cms_page(page_data);
     if new_path<>old_path then
       delete from public.cms_redirects where source_path=new_path and page_id=p_id::uuid;
       if exists(select 1 from public.cms_redirects where source_path=old_path and page_id<>p_id::uuid) then raise exception 'Redirect conflict'; end if;
       insert into public.cms_redirects(source_path,page_id) values(old_path,p_id::uuid) on conflict(source_path) do nothing;
     end if;
     update public.cms_pages set path=new_path,navigation_group=coalesce(p_data->>'navigation_group',navigation_group) where id=p_id::uuid;
   elsif p_kind='professional' then
     pro:=jsonb_populate_record(null::public.professionals,p_data);
     if pro.status not in('published','archived') or pro.status is null then raise exception 'Invalid publication state'; end if;
     update public.professionals set full_name=pro.full_name,slug=pro.slug,role=pro.role,credentials=pro.credentials,short_bio=pro.short_bio,
       bio=pro.bio,professional_experience=pro.professional_experience,recovery_experience=pro.recovery_experience,featured_quote=pro.featured_quote,
       media=pro.media,conferences=pro.conferences,profile_image_url=pro.profile_image_url,profile_image_alt=pro.profile_image_alt,
       email=pro.email,phone=pro.phone,linkedin_url=pro.linkedin_url,instagram_url=pro.instagram_url,cta_label=pro.cta_label,cta_url=pro.cta_url,
       is_featured=pro.is_featured,status=pro.status,sort_order=pro.sort_order,seo_title=pro.seo_title,seo_description=pro.seo_description where id=p_id::uuid;
   else
     update public.site_settings set data=p_data where id='global';
   end if;
   delete from public.cms_editorial_drafts where kind=p_kind and resource_id=p_id;
 end if;
 insert into public.admin_audit_log(actor_id,action,resource_type,resource_id,metadata)
 values(auth.uid(),case when p_publish then 'cms.published' else 'cms.draft_saved' end,p_kind,case when p_kind='settings' then null else p_id::uuid end,jsonb_build_object('module','cms-editorial'));
 return p_id;
end; $$;
revoke all on function public.save_editorial_content(text,text,jsonb,timestamptz,timestamptz,boolean) from public,anon;
grant execute on function public.save_editorial_content(text,text,jsonb,timestamptz,timestamptz,boolean) to authenticated;
