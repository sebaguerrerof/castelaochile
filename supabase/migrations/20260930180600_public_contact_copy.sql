-- Replace only original seed wording about implementation with visitor-facing
-- guidance. Preserve any copy already changed by editors, prices and conditions.
with contact_copy as (
  update public.cms_page_sections as section
  set data = jsonb_set(section.data, '{description}', to_jsonb('Solicita información a través de nuestros canales de contacto. Comparte solo información general, sin antecedentes sensibles de salud.'::text))
  where section.page_id in (select id from public.cms_pages where slug = 'contacto')
    and section.section_type = 'contact'
    and section.data ->> 'description' = 'Utiliza nuestros canales confirmados para solicitar información. No compartas antecedentes sensibles de salud en este formulario.'
  returning page_id
), evaluation_copy as (
  update public.cms_page_sections as section
  set data = jsonb_set(section.data, '{items,0,note}', to_jsonb('Solicita una evaluación inicial a través de nuestros canales de contacto.'::text))
  where section.page_id in (select id from public.cms_pages where slug = 'contacto')
    and section.section_type = 'pricing'
    and section.data #>> '{items,0,note}' = 'El sistema definitivo de agenda se confirmará institucionalmente.'
  returning page_id
)
update public.cms_pages
set updated_at = clock_timestamp()
where id in (select page_id from contact_copy union select page_id from evaluation_copy)
   or slug = 'inicio'; -- Invalidate editor versions predating the home card links.
