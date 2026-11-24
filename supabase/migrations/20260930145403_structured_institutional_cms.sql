-- Additive migration. Existing blog/auth/contact data is untouched.
create table public.cms_pages (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  path text unique not null check (path ~ '^/([a-z0-9]+(-[a-z0-9]+)*)?$'),
  title text not null, nav_label text not null, status public.content_status not null default 'draft',
  seo_title text not null default '', seo_description text not null default '', og_image_url text not null default '',
  show_in_navigation boolean not null default false, navigation_order integer not null default 0,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table public.cms_page_sections (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.cms_pages(id) on delete cascade,
  section_type text not null check (section_type in ('hero','rich_text','text_image','feature_cards','stats','principles','steps','cta','faq','pricing','warning','team_preview','gallery','contact')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and jsonb_typeof(data->'title') = 'string'),
  sort_order integer not null default 0 check (sort_order >= 0), is_enabled boolean not null default true
);
create table public.professionals (
  id uuid primary key default gen_random_uuid(), slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name text not null, role text not null, credentials text[] not null default '{}', short_bio text not null default '',
  bio text not null default '', professional_experience text not null default '', recovery_experience text not null default '',
  featured_quote text not null default '', media text not null default '', conferences text not null default '',
  profile_image_url text not null default '', profile_image_alt text not null default '',
  email text not null default '', phone text not null default '', linkedin_url text not null default '', instagram_url text not null default '',
  cta_label text not null default '', cta_url text not null default '', is_featured boolean not null default false,
  status public.content_status not null default 'draft', sort_order integer not null default 0,
  seo_title text not null default '', seo_description text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null,
  check (profile_image_url = '' or profile_image_alt <> '')
);
create table public.site_settings (
  id text primary key check (id = 'global'), data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
create index cms_pages_public_idx on public.cms_pages (status, navigation_order);
create index cms_sections_page_order_idx on public.cms_page_sections (page_id, sort_order);
create index professionals_public_order_idx on public.professionals (status, sort_order, full_name);
create index cms_pages_updated_by_idx on public.cms_pages (updated_by);
create index professionals_updated_by_idx on public.professionals (updated_by);
create index site_settings_updated_by_idx on public.site_settings (updated_by);

alter table public.cms_pages enable row level security;
alter table public.cms_page_sections enable row level security;
alter table public.professionals enable row level security;
alter table public.site_settings enable row level security;
grant select on public.cms_pages, public.cms_page_sections, public.professionals, public.site_settings to anon;
grant select, insert, update, delete on public.cms_pages, public.cms_page_sections, public.professionals, public.site_settings to authenticated, service_role;

create policy cms_pages_anon on public.cms_pages for select to anon using (status = 'published');
create policy cms_pages_staff on public.cms_pages for select to authenticated using (status = 'published' or (select private.is_active_staff()));
create policy cms_pages_insert on public.cms_pages for insert to authenticated with check ((select private.is_editor_or_superadmin()));
create policy cms_pages_update on public.cms_pages for update to authenticated using ((select private.is_editor_or_superadmin())) with check ((select private.is_editor_or_superadmin()));
-- Core pages are archived, never deleted through the API.
create policy cms_sections_anon on public.cms_page_sections for select to anon using (is_enabled and exists (select 1 from public.cms_pages p where p.id = page_id and p.status = 'published'));
create policy cms_sections_staff on public.cms_page_sections for select to authenticated using ((select private.is_active_staff()) or (is_enabled and exists (select 1 from public.cms_pages p where p.id = page_id and p.status = 'published')));
create policy cms_sections_insert on public.cms_page_sections for insert to authenticated with check ((select private.is_editor_or_superadmin()));
create policy cms_sections_update on public.cms_page_sections for update to authenticated using ((select private.is_editor_or_superadmin())) with check ((select private.is_editor_or_superadmin()));
create policy cms_sections_delete on public.cms_page_sections for delete to authenticated using ((select private.is_editor_or_superadmin()));
create policy professionals_anon on public.professionals for select to anon using (status = 'published');
create policy professionals_staff on public.professionals for select to authenticated using (status = 'published' or (select private.is_active_staff()));
create policy professionals_insert on public.professionals for insert to authenticated with check ((select private.is_editor_or_superadmin()));
create policy professionals_update on public.professionals for update to authenticated using ((select private.is_editor_or_superadmin())) with check ((select private.is_editor_or_superadmin()));
create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_update on public.site_settings for update to authenticated using ((select private.is_editor_or_superadmin())) with check ((select private.is_editor_or_superadmin()));

create function private.cms_audit_change() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    insert into public.admin_audit_log(actor_id, action, resource_type, resource_id, metadata)
    values (auth.uid(), lower(tg_op), tg_table_name, new.id::text, jsonb_build_object('module', 'cms'));
  end if;
  if tg_op = 'UPDATE' then new.updated_at := clock_timestamp(); end if;
  return new;
end; $$;
revoke all on function private.cms_audit_change() from public, anon, authenticated;
create trigger cms_pages_audit before insert or update on public.cms_pages for each row execute function private.cms_audit_change();
create trigger professionals_audit before insert or update on public.professionals for each row execute function private.cms_audit_change();
create trigger settings_audit before insert or update on public.site_settings for each row execute function private.cms_audit_change();

-- Atomic page + sections update with optimistic concurrency and existing RLS.
create function public.save_cms_page(p_page jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_page public.cms_pages; section jsonb;
begin
  if auth.uid() is null or not private.is_editor_or_superadmin() then raise exception 'Forbidden' using errcode = '42501'; end if;
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

-- Idempotent initial content. Existing editorial records are never overwritten.
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('inicio','/','Inicio','Inicio','published',true,0,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Dejar de consumir es sólo el comienzo.","description":"Tratamiento ambulatorio especializado en adicciones para pacientes y familias.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/hero-sala-luminosa.webp","alt":"Sala luminosa del Instituto Castelao"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'rich_text','{"title":"Una recuperación en la vida real","description":"Modelo Minnesota · Terapia grupal · Psicología · Familia · Seguimiento terapéutico","html":"<p>El tratamiento va más allá del consumo y contempla el acompañamiento de pacientes y familias.</p>"}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'feature_cards','{"title":"Conoce Castelao Chile","description":"","items":[{"title":"Tratamiento ambulatorio","description":""},{"title":"Recovery 40","description":""},{"title":"Trabajo con familias","description":""}]}'::jsonb,2,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'pricing','{"title":"Valores","description":"","items":[{"title":"Evaluación inicial","price":35000,"unit":"Evaluación","note":"La evaluación inicial orienta los siguientes pasos."}]}'::jsonb,3,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'team_preview','{"title":"Nuestro equipo","description":"Profesionales y personas con experiencia especializada en acompañar procesos de recuperación.","featuredOnly":true}'::jsonb,4,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Da el primer paso","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,5,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('el-instituto','/instituto','El Instituto','El Instituto','published',true,1,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Instituto Castelao Chile","description":"Tratamiento ambulatorio especializado en adicciones para pacientes y familias.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/instituto-sala-azul.webp","alt":"Interior de una sala del Instituto Castelao"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'rich_text','{"title":"Más allá del consumo","description":"Comprender la adicción y acompañar la recuperación.","html":"<p>Dejar de consumir es sólo el comienzo. La recuperación contempla la vida cotidiana, la responsabilidad personal y el trabajo con la familia.</p><p>La relación metodológica con Instituto Castelao España se expresa en el Modelo Minnesota y el seguimiento terapéutico. La información de Chile se presenta según su contexto local.</p>"}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'principles','{"title":"Nuestros principios","description":"","items":[{"title":"Abstinencia","description":""},{"title":"Reconocimiento","description":""},{"title":"Responsabilidad","description":""},{"title":"Honestidad","description":""},{"title":"Estructura","description":""},{"title":"Familia","description":""},{"title":"Continuidad","description":""}]}'::jsonb,2,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'team_preview','{"title":"Dirección y equipo","description":"Conoce a los profesionales de Castelao Chile.","featuredOnly":false}'::jsonb,3,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Conversa con nosotros","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,4,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('tratamiento','/acompanamiento','Tratamiento','Tratamiento','published',true,2,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Tratamiento ambulatorio especializado en adicciones","description":"Acompañamiento para pacientes y familias.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/acompanamiento-sala-grupal.webp","alt":"Sala preparada para un espacio de conversación"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'feature_cards','{"title":"Qué contempla el tratamiento","description":"","items":[{"title":"Terapia grupal","description":""},{"title":"Intervención individual de adicciones","description":""},{"title":"Psicoterapia individual","description":""},{"title":"Trabajo semanal con familias","description":""},{"title":"Seguimiento cotidiano","description":""},{"title":"Actividad física terapéutica","description":""},{"title":"Prevención de recaídas","description":""},{"title":"Controles toxicológicos cuando sean indicados","description":""},{"title":"Coordinación psiquiátrica cuando corresponda","description":""}]}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'pricing','{"title":"Valores","description":"","items":[{"title":"Programa Ambulatorio","price":550000,"unit":"Mensuales","note":"La atención psiquiátrica no está incluida en la mensualidad."}]}'::jsonb,2,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Agenda una evaluación inicial","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,3,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('recovery-40','/recovery-40','Recovery 40','Recovery 40','published',true,3,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Recovery 40","description":"Programa de 40 días, sujeto a evaluación y condiciones de ingreso.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/acompanamiento-sala-grupal.webp","alt":"Sala preparada para un espacio de conversación"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'rich_text','{"title":"Para quién está indicado","description":"El ingreso se define mediante evaluación individual.","html":"<p>La evaluación permite revisar la situación de la persona y las condiciones de ingreso al programa.</p>"}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'feature_cards','{"title":"Objetivos del proceso","description":"","items":[{"title":"Recuperación en la vida real","description":""},{"title":"Prevención de recaídas","description":""},{"title":"Seguimiento terapéutico","description":""}]}'::jsonb,2,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'rich_text','{"title":"Continuidad posterior","description":"El proceso de recuperación continúa después de los 40 días.","html":"<p>Los siguientes pasos y el acompañamiento posterior se revisan mediante evaluación profesional.</p>"}'::jsonb,3,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'pricing','{"title":"Valores","description":"","items":[{"title":"Recovery 40","price":4500000,"unit":"Por 40 días","note":"Valor referencial, sujeto a evaluación y condiciones de ingreso."}]}'::jsonb,4,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'warning','{"title":"Advertencia clínica","description":"Recovery 40 no es una hospitalización ni reemplaza una desintoxicación médica cuando esta es necesaria."}'::jsonb,5,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Consulta sobre Recovery 40","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,6,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('nuestro-metodo','/nuestro-enfoque','Nuestro método','Nuestro método','published',true,4,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Nuestro método","description":"Modelo Minnesota y enfoque cognitivo-conductual-contextual.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/hero-sala-luminosa.webp","alt":"Sala luminosa del Instituto Castelao"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'feature_cards','{"title":"Recuperación en la vida real","description":"","items":[{"title":"Modelo Minnesota","description":""},{"title":"Enfoque cognitivo-conductual-contextual","description":""},{"title":"Prevención de recaídas","description":""}]}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'steps','{"title":"Continuidad del proceso","description":"","items":[{"title":"Base del Camino","description":""},{"title":"Medio Camino","description":""}]}'::jsonb,2,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'rich_text','{"title":"Señales previas a una recaída","description":"Reconocer cambios y pedir acompañamiento forma parte de la prevención.","html":"<p>Las señales y circunstancias personales se abordan con el equipo durante el seguimiento terapéutico. Esta información general no reemplaza una evaluación individual.</p>"}'::jsonb,3,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Conoce el proceso de evaluación","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,4,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('familias','/familias','Familias','Familias','published',true,5,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"La familia también necesita recuperación.","description":"Acompañamiento para quienes están cerca de una persona en proceso de recuperación.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/contacto-sala-de-espera.webp","alt":"Sala de espera con luz natural"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'rich_text','{"title":"Trabajo con familias","description":"El tratamiento contempla trabajo semanal con familias.","html":"<p>La recuperación considera a las personas y su entorno. El acompañamiento ofrece un espacio para trabajar con las familias durante el proceso.</p>"}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Quiero orientación para un familiar","description":"Conversa con nosotros sobre los siguientes pasos.","primaryCta":{"label":"Quiero orientación para un familiar","target":"custom","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,2,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('equipo','/equipo','Equipo','Equipo','published',true,6,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Nuestro equipo","description":"Profesionales y personas con experiencia especializada en acompañar procesos de recuperación.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/instituto-sala-azul.webp","alt":"Interior de una sala del Instituto Castelao"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'team_preview','{"title":"Profesionales de Castelao Chile","description":"Conoce su experiencia y mirada sobre la recuperación.","featuredOnly":false}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"Conversa con nuestro equipo","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,2,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('preguntas-frecuentes','/preguntas-frecuentes','Preguntas frecuentes','Preguntas frecuentes','published',true,7,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Preguntas frecuentes","description":"Respuestas para comenzar a conocer nuestro tratamiento.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/instituto-sala-azul.webp","alt":"Interior de una sala del Instituto Castelao"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'faq','{"title":"Preguntas frecuentes","description":"Información para pacientes y familias.","items":[{"question":"¿Cuánto cuesta la evaluación inicial?","answer":"La evaluación inicial tiene un valor de $35.000 CLP.","category":"Evaluación","is_enabled":true},{"question":"¿Cuál es el valor del programa ambulatorio?","answer":"El Programa Ambulatorio tiene un valor de $550.000 CLP mensuales. La coordinación psiquiátrica se considera cuando corresponde; la atención psiquiátrica no está incluida en la mensualidad.","category":"Tratamiento","is_enabled":true},{"question":"¿Recovery 40 reemplaza una desintoxicación médica?","answer":"No. Recovery 40 no es una hospitalización ni reemplaza una desintoxicación médica cuando esta es necesaria.","category":"Recovery 40","is_enabled":true},{"question":"¿La familia participa en el proceso?","answer":"El tratamiento contempla trabajo semanal con familias. La familia también necesita recuperación.","category":"Familias","is_enabled":true},{"question":"¿Este sitio atiende situaciones de urgencia?","answer":"No. Este sitio no es un canal de urgencias. Ante una situación inmediata, busca apoyo a través de los servicios de emergencia o de salud de tu localidad.","category":"Contacto","is_enabled":true}]}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'cta','{"title":"¿Necesitas orientación?","description":"","primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"}}'::jsonb,2,true);
end if; end; $seed$;
do $seed$ declare page_id uuid; begin
insert into public.cms_pages(slug,path,title,nav_label,status,show_in_navigation,navigation_order,published_at) values ('contacto','/contacto','Contacto','Contacto','published',true,8,now()) on conflict(slug) do nothing returning id into page_id;
if page_id is not null then
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'hero','{"title":"Conversa con Instituto Castelao Chile","description":"Da el primer paso para una evaluación inicial.","eyebrow":"Instituto Castelao Chile","image":{"src":"/images/contacto-sala-de-espera.webp","alt":"Sala de espera con luz natural"},"primaryCta":{"label":"Agendar evaluación","target":"evaluation","href":"/contacto"},"secondaryCta":{"label":"WhatsApp","target":"whatsapp","href":"/contacto"},"variant":"blue"}'::jsonb,0,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'pricing','{"title":"Valores","description":"","items":[{"title":"Evaluación inicial","price":35000,"unit":"Evaluación","note":"El sistema definitivo de agenda se confirmará institucionalmente."}]}'::jsonb,1,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'contact','{"title":"Contacto","description":"Utiliza nuestros canales confirmados para solicitar información. No compartas antecedentes sensibles de salud en este formulario."}'::jsonb,2,true);
insert into public.cms_page_sections(page_id,section_type,data,sort_order,is_enabled) values (page_id,'warning','{"title":"Este sitio no es un canal de urgencias","description":"Ante una situación inmediata, busca apoyo a través de los servicios de emergencia o de salud disponibles en tu localidad."}'::jsonb,3,true);
end if; end; $seed$;
insert into public.professionals(full_name,slug,role,credentials,short_bio,bio,professional_experience,recovery_experience,featured_quote,media,conferences,profile_image_url,profile_image_alt,email,phone,linkedin_url,instagram_url,cta_label,cta_url,status,is_featured,sort_order,seo_title,seo_description) values ('Marcelo Montiel Arzola','marcelo-montiel','Director Instituto Castelao Chile',array['Terapeuta en Adicciones','Intervencionista Familiar','Coach ICC']::text[],'Experiencia en acompañar a pacientes y familias en procesos de recuperación.','<p>Marcelo Montiel Arzola es Director de Instituto Castelao Chile, Terapeuta en Adicciones, Intervencionista Familiar y Coach ICC.</p>','<p>Experiencia con pacientes y familias e intervención en crisis.</p>','<p>Más de veinte años de recuperación personal.</p>','No me interesa solamente que una persona deje de consumir. Me interesa saber cómo va a vivir después.','Participación en televisión y radio.','Charlas y conferencias sobre recuperación.','','','','','','','Solicitar información sobre charlas','/contacto','published',true,0,'Marcelo Montiel | Instituto Castelao Chile','Conoce a Marcelo Montiel Arzola, Director de Instituto Castelao Chile, y su experiencia en acompañar a pacientes y familias.') on conflict(slug) do nothing;
insert into public.site_settings(id,data) values ('global','{"whatsapp":"+56938650977","phone":"","email":"","streetAddress":"","city":"","region":"","country":"","mapsUrl":"","instagram":"","facebook":"","linkedin":"","evaluationUrl":"/contacto","evaluationLabel":"Agendar evaluación","footerNotice":"La información de este sitio es de carácter general y no sustituye una evaluación profesional individual."}'::jsonb) on conflict(id) do nothing;
