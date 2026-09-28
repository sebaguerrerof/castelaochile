begin;
select plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'viewer@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'editor@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'superadmin@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outsider@example.test', 'not-used', now(), now(), now());

insert into public.admin_users (user_id, role, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'viewer', true),
  ('00000000-0000-0000-0000-000000000002', 'editor', true),
  ('00000000-0000-0000-0000-000000000003', 'superadmin', true);

insert into public.content_posts (kind, slug, title, summary, body, status, published_at, author_id)
values
  ('blog', 'publicado', 'Contenido público', 'Resumen de contenido publicado para comprobar la política RLS.', 'Texto seguro para comprobar lectura pública.', 'published', now(), '00000000-0000-0000-0000-000000000003'),
  ('blog', 'borrador', 'Contenido borrador', 'Resumen de contenido no publicado para comprobar la política RLS.', 'Texto seguro para comprobar que el borrador no es público.', 'draft', null, '00000000-0000-0000-0000-000000000003');
insert into public.contact_submissions (name, email, source_path, idempotency_key)
values ('Persona de prueba', 'prueba@example.test', '/contacto', '10000000-0000-0000-0000-000000000001');

select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
select is((select count(*) from public.content_posts), 1::bigint, 'anon only sees published content');
select is((select count(*) from public.contact_submissions), 0::bigint, 'anon cannot read consultations');
reset role;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.admin_users), 1::bigint, 'viewer only sees their own staff profile');
select is((select count(*) from public.content_posts), 2::bigint, 'viewer can read content but not consultations');
select is((select count(*) from public.contact_submissions), 0::bigint, 'viewer cannot read consultations');
select throws_ok(
  $$insert into public.content_posts (kind, slug, title, summary, body, author_id) values ('blog', 'viewer-borrador', 'Borrador de viewer', 'Resumen suficiente para comprobar que viewer no puede crear artículos.', 'Cuerpo de comprobación para política de inserción.', '00000000-0000-0000-0000-000000000001')$$,
  '42501', 'new row violates row-level security policy for table "content_posts"', 'viewer cannot create content'
);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select lives_ok(
  $$insert into public.content_posts (kind, slug, title, summary, body, author_id) values ('news', 'editor-borrador', 'Borrador de editor', 'Resumen suficiente para comprobar que editor puede crear artículos.', 'Cuerpo de comprobación para política de inserción de editor.', '00000000-0000-0000-0000-000000000002')$$,
  'editor can create content'
);
select throws_ok(
  $$insert into public.contact_submissions (name, email, source_path, idempotency_key) values ('Persona de prueba', 'segundo@example.test', '/contacto', '10000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'staff cannot use a generic browser insert path for contacts'
);
select is((select count(*) from public.contact_submissions), 1::bigint, 'editor can read consultations');
select lives_ok(
  $$insert into public.contact_notes (submission_id, author_id, body) select id, '00000000-0000-0000-0000-000000000002', 'Nota interna de prueba.' from public.contact_submissions limit 1$$,
  'editor can add notes authored by themselves'
);
select lives_ok(
  $$update public.contact_submissions set status = 'in_progress' where email = 'prueba@example.test'$$,
  'editor can update consultation status'
);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select is((select count(*) from public.admin_users), 3::bigint, 'superadmin can list staff');
select lives_ok(
  $$update public.admin_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000001'$$,
  'superadmin can revoke a staff account'
);
select lives_ok(
  $$insert into public.admin_audit_log (actor_id, action, resource_type) values ('00000000-0000-0000-0000-000000000003', 'staff.revoked', 'admin_user')$$,
  'superadmin can append minimal audit logs'
);
select is((select count(*) from public.admin_audit_log), 1::bigint, 'superadmin can read audit log');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
set local role authenticated;
select is((select count(*) from public.content_posts), 1::bigint, 'authenticated outsider only sees published posts');
select is((select count(*) from public.analytics_daily), 0::bigint, 'authenticated outsider cannot read analytics');
select throws_ok(
  $$select public.record_page_view('/contacto', current_date)$$,
  '42501', 'permission denied for function record_page_view', 'analytics counter is not callable by browser roles'
);

select * from finish();
rollback;
