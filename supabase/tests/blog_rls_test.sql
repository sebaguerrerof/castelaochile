begin;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'blog-editor@example.test', 'not-used', now(), now(), now());
insert into public.admin_users (user_id, role, is_active)
values ('00000000-0000-0000-0000-000000000102', 'editor', true);

insert into public.blog_categories (id, slug, name, source_category_id)
values
  ('20000000-0000-0000-0000-000000000001', 'categoria-fuente-test', 'Categoría fuente test', 'source-category-test'),
  ('20000000-0000-0000-0000-000000000002', 'categoria-local-test', 'Categoría local test', null);

insert into public.content_posts (
  id, kind, slug, title, summary, body, content_html, content_text, status,
  published_at, author_id, author_name, origin, source_post_id, source_url,
  source_updated_at, synced_at, source_hash
)
values (
  '30000000-0000-0000-0000-000000000001', 'blog', 'sincronizado-rls-test',
  'Sincronizado RLS test', 'Resumen suficientemente largo para la prueba de publicación sincronizada.',
  'Contenido sincronizado de prueba.', '<p>Contenido sincronizado de prueba.</p>',
  'Contenido sincronizado de prueba.', 'published', now(), null, 'Equipo Castelao',
  'castelao_es', 'source-post-rls-test', 'https://www.institutocastelao.com/source-post-rls-test/',
  now(), now(), repeat('a', 64)
), (
  '30000000-0000-0000-0000-000000000002', 'blog', 'borrador-blog-rls-test',
  'Borrador blog RLS test', 'Resumen suficientemente largo para la prueba del borrador editorial.',
  'Contenido borrador de prueba.', '<p>Contenido borrador de prueba.</p>', 'Contenido borrador de prueba.',
  'draft', null, '00000000-0000-0000-0000-000000000102', 'Editor Chile', 'castelao_cl', null, null, null, null, null
), (
  '30000000-0000-0000-0000-000000000003', 'blog', 'futuro-blog-rls-test',
  'Futuro blog RLS test', 'Resumen suficientemente largo para la prueba de publicación futura.',
  'Contenido futuro de prueba.', '<p>Contenido futuro de prueba.</p>', 'Contenido futuro de prueba.',
  'published', now() + interval '1 day', '00000000-0000-0000-0000-000000000102', 'Editor Chile', 'castelao_cl', null, null, null, null, null
);

insert into public.blog_post_categories (post_id, category_id)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');

select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
select is((select count(*) from public.content_posts where id = '30000000-0000-0000-0000-000000000001'), 1::bigint, 'anon can read a current published synchronized post');
select is((select count(*) from public.content_posts where id = '30000000-0000-0000-0000-000000000002'), 0::bigint, 'anon cannot read a draft');
select is((select count(*) from public.content_posts where id = '30000000-0000-0000-0000-000000000003'), 0::bigint, 'anon cannot read a future publication');
reset role;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
set local role authenticated;
select lives_ok(
  $$insert into public.content_posts (id, kind, slug, title, summary, body, content_html, content_text, author_id, author_name) values ('30000000-0000-0000-0000-000000000004', 'blog', 'local-editor-rls-test', 'Local editor RLS test', 'Resumen suficientemente largo para la publicación local del editor.', 'Contenido local.', '<p>Contenido local.</p>', 'Contenido local.', '00000000-0000-0000-0000-000000000102', 'Editor Chile')$$,
  'editor can create local Chile content'
);
select throws_ok(
  $$insert into public.content_posts (kind, slug, title, summary, body, content_html, content_text, author_id, author_name, origin) values ('blog', 'fuente-falsa-rls-test', 'Fuente falsa RLS test', 'Resumen suficientemente largo para un origen falso.', 'Contenido falso.', '<p>Contenido falso.</p>', 'Contenido falso.', '00000000-0000-0000-0000-000000000102', 'Editor Chile', 'castelao_es')$$,
  'P0001', 'administrators can only create Castelao Chile content', 'editor cannot impersonate synchronized origin'
);
select throws_ok(
  $$update public.content_posts set title = 'Título manipulado' where id = '30000000-0000-0000-0000-000000000001'$$,
  'P0001', 'source-managed fields of synchronized content are read-only', 'editor cannot change synchronized source-managed fields'
);
select lives_ok(
  $$update public.content_posts set status = 'archived', seo_title = 'SEO local permitido' where id = '30000000-0000-0000-0000-000000000001'$$,
  'editor can apply local status and SEO overrides to synchronized content'
);
select throws_ok(
  $$insert into public.blog_post_categories (post_id, category_id) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')$$,
  '42501', 'new row violates row-level security policy for table "blog_post_categories"', 'editor cannot recategorize synchronized content'
);
select lives_ok(
  $$insert into public.blog_post_categories (post_id, category_id) values ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002')$$,
  'editor can assign categories to local content'
);
select is(
  (select count(*) from public.search_blog_posts('borrador', null, 0, 12)),
  0::bigint,
  'public search excludes drafts even for staff callers'
);

select * from finish();
rollback;
