-- PostgREST 14 treats a custom SQLSTATE 40001 as a transient serialization failure and retries the
-- transaction forever (Supabase KB "SQLSTATE 40001 in an RPC function causes infinite retries").
-- A stale CMS version is an application conflict, not a serialization failure: report it as HTTP 409
-- (SQLSTATE PT409), which is returned to the caller once and never retried.
begin;

create or replace function public.save_cms_page(p_page jsonb)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare current_page public.cms_pages; section jsonb;
begin
  if auth.uid() is null or not coalesce(private.is_editor_or_superadmin(), false) then raise exception 'Forbidden' using errcode = '42501'; end if;
  select * into current_page from public.cms_pages where id = (p_page->>'id')::uuid for update;
  if current_page.id is null then raise exception 'Page not found'; end if;
  if current_page.updated_at <> (p_page->>'updated_at')::timestamptz then raise exception 'CMS_CONFLICT' using errcode = 'PT409'; end if;
  if jsonb_typeof(p_page->'sections') <> 'array' or jsonb_array_length(p_page->'sections') not between 1 and 40 then raise exception 'Invalid sections'; end if;
  update public.cms_pages set title=p_page->>'title', nav_label=p_page->>'nav_label', status=(p_page->>'status')::public.content_status,
    seo_title=p_page->>'seo_title', seo_description=p_page->>'seo_description', og_image_url=p_page->>'og_image_url',
    show_in_navigation=(p_page->>'show_in_navigation')::boolean, navigation_order=(p_page->>'navigation_order')::integer,
    published_at=case when p_page->>'status' = 'published' then coalesce(current_page.published_at, now()) else current_page.published_at end
    where id=current_page.id;
  delete from public.cms_page_sections where page_id=current_page.id;
  for section in select value from jsonb_array_elements(p_page->'sections') loop
    insert into public.cms_page_sections(id,page_id,section_type,data,sort_order,is_enabled)
      values ((section->>'id')::uuid,current_page.id,section->>'section_type',section->'data',(section->>'sort_order')::integer,(section->>'is_enabled')::boolean);
  end loop;
  return current_page.id;
end; $function$;

create or replace function public.withdraw_editorial_page(p_id uuid, p_base_updated_at timestamp with time zone, p_draft_updated_at timestamp with time zone)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare current_version timestamptz; current_status public.content_status; draft_version timestamptz; new_version timestamptz;
begin
 if auth.uid() is null or not coalesce(private.is_editor_or_superadmin(),false) then raise insufficient_privilege; end if;
 select updated_at,status into current_version,current_status from public.cms_pages where id=p_id for update;
 if current_version is null then raise exception 'Resource not found'; end if;
 if current_version is distinct from p_base_updated_at then raise exception 'CMS_CONFLICT' using errcode='PT409'; end if;
 select updated_at into draft_version from public.cms_editorial_drafts where kind='page' and resource_id=p_id::text for update;
 if draft_version is distinct from p_draft_updated_at then raise exception 'CMS_DRAFT_CONFLICT' using errcode='PT409'; end if;
 if current_status<>'published' then raise exception 'Page is not published'; end if;
 update public.cms_pages set status='draft' where id=p_id returning updated_at into new_version;
 -- Keep a pending draft attached to the new page version; its own version token is unchanged.
 update public.cms_editorial_drafts set base_updated_at=new_version where kind='page' and resource_id=p_id::text;
 insert into public.admin_audit_log(actor_id,action,resource_type,resource_id,metadata)
 values(auth.uid(),'cms.withdrawn','page',p_id,jsonb_build_object('module','cms-editorial'));
 return p_id;
end; $function$;

create or replace function public.save_editorial_content(p_kind text, p_id text, p_data jsonb, p_base_updated_at timestamp with time zone, p_draft_updated_at timestamp with time zone, p_publish boolean default false)
returns text
language plpgsql
set search_path to ''
as $function$
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
 if current_version is distinct from p_base_updated_at then raise exception 'CMS_CONFLICT' using errcode='PT409'; end if;
 select updated_at into draft_version from public.cms_editorial_drafts where kind=p_kind and resource_id=p_id for update;
 if draft_version is distinct from p_draft_updated_at then raise exception 'CMS_DRAFT_CONFLICT' using errcode='PT409'; end if;
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
end; $function$;

commit;
