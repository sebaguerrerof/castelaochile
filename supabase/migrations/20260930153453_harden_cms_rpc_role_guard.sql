create or replace function public.save_cms_page(p_page jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_page public.cms_pages; section jsonb;
begin
  if auth.uid() is null or not coalesce(private.is_editor_or_superadmin(), false) then raise exception 'Forbidden' using errcode = '42501'; end if;
  select * into current_page from public.cms_pages where id = (p_page->>'id')::uuid for update;
  if current_page.id is null then raise exception 'Page not found'; end if;
  if current_page.updated_at <> (p_page->>'updated_at')::timestamptz then raise exception 'CMS_CONFLICT' using errcode = '40001'; end if;
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
end; $$;
revoke all on function public.save_cms_page(jsonb) from public, anon;
grant execute on function public.save_cms_page(jsonb) to authenticated;
