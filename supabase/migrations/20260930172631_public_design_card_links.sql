-- Enrich existing home cards with destinations. Preserve editorial text, order,
-- existing destinations, disabled state, and every other CMS/blog record.
update public.cms_page_sections as section
set data = jsonb_set(section.data, '{items}', (
  select jsonb_agg(
    case
      when coalesce(item.value ->> 'href', '') <> '' then item.value
      when item.value ->> 'title' = 'Tratamiento ambulatorio' then item.value || '{"href":"/acompanamiento"}'::jsonb
      when item.value ->> 'title' = 'Recovery 40' then item.value || '{"href":"/recovery-40"}'::jsonb
      when item.value ->> 'title' = 'Trabajo con familias' then item.value || '{"href":"/familias"}'::jsonb
      else item.value
    end order by item.ordinality
  ) from jsonb_array_elements(section.data -> 'items') with ordinality as item(value, ordinality)
))
where section.page_id in (select id from public.cms_pages where slug = 'inicio')
  and section.section_type = 'feature_cards'
  and jsonb_typeof(section.data -> 'items') = 'array'
  and jsonb_array_length(section.data -> 'items') > 0;
