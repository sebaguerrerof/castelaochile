begin;
select plan(33);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'viewer@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'editor@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'superadmin@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outsider@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'inactive@example.test', 'not-used', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'backup-admin@example.test', 'not-used', now(), now(), now());

insert into public.admin_users (user_id, role, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'viewer', true),
  ('00000000-0000-0000-0000-000000000002', 'editor', true),
  ('00000000-0000-0000-0000-000000000003', 'superadmin', true),
  ('00000000-0000-0000-0000-000000000005', 'editor', false);

insert into public.content_posts (kind, slug, title, summary, body, status, published_at, author_id)
values
  ('blog', 'publicado', 'Contenido público', 'Resumen de contenido publicado para comprobar la política RLS.', 'Texto seguro para comprobar lectura pública.', 'published', now(), '00000000-0000-0000-0000-000000000003'),
  ('blog', 'borrador', 'Contenido borrador', 'Resumen de contenido no publicado para comprobar la política RLS.', 'Texto seguro para comprobar que el borrador no es público.', 'draft', null, '00000000-0000-0000-0000-000000000003');
insert into public.contact_submissions (name, email, source_path, idempotency_key)
values ('Persona de prueba', 'prueba@example.test', '/contacto', '10000000-0000-0000-0000-000000000001');

select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
select is((select count(*) from public.content_posts), 1::bigint, 'anon only sees published content');
select throws_ok(
  $$select count(*) from public.contact_submissions$$,
  '42501', 'permission denied for table contact_submissions', 'anon has no read grant for consultations'
);
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
select results_eq(
  $$update public.contact_submissions set status = 'closed' returning 1$$,
  $$select 1 where false$$,
  'viewer cannot update consultations'
);
select throws_ok(
  $$insert into public.admin_audit_log (actor_id, action, resource_type) values ('00000000-0000-0000-0000-000000000003', 'staff.forged', 'admin_user')$$,
  '42501', 'new row violates row-level security policy for table "admin_audit_log"', 'staff cannot forge another actor in audit events'
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
select is((select count(*) from public.admin_users), 1::bigint, 'editor only sees their own staff profile');
select results_eq(
  $$update public.admin_users set role = 'superadmin' where user_id = '00000000-0000-0000-0000-000000000002' returning 1$$,
  $$select 1 where false$$,
  'editor cannot elevate their own role'
);
select throws_ok(
  $$insert into public.contact_notes (submission_id, author_id, body) select id, '00000000-0000-0000-0000-000000000001', 'Nota con autor falsificado.' from public.contact_submissions limit 1$$,
  '42501', 'new row violates row-level security policy for table "contact_notes"', 'editor cannot forge a note author'
);
select results_eq(
  $$delete from public.content_posts where slug = 'borrador' returning 1$$,
  $$select 1 where false$$,
  'editor cannot delete content'
);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select is(
  (select count(*) from public.admin_users where user_id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000005'
  )),
  4::bigint,
  'superadmin can list the test staff profiles'
);
select lives_ok(
  $$update public.admin_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000001'$$,
  'superadmin can revoke a staff account'
);
select lives_ok(
  $$insert into public.admin_audit_log (actor_id, action, resource_type) values ('00000000-0000-0000-0000-000000000003', 'staff.revoked', 'admin_user')$$,
  'superadmin can append minimal audit logs'
);
select is((select count(*) from public.admin_audit_log), 1::bigint, 'superadmin can read audit log');
select throws_ok(
  $$update public.admin_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', 'cannot remove the last active superadmin', 'last active superadmin cannot deactivate themselves'
);
select throws_ok(
  $$update public.admin_users set role = 'viewer' where user_id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', 'cannot remove the last active superadmin', 'last active superadmin cannot demote themselves'
);
select throws_ok(
  $$delete from public.admin_users where user_id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', 'cannot remove the last active superadmin', 'last active superadmin cannot be deleted'
);
select lives_ok(
  $$insert into public.admin_users (user_id, role, is_active) values ('00000000-0000-0000-0000-000000000006', 'superadmin', true)$$,
  'superadmin can add a second active superadmin'
);
select lives_ok(
  $$update public.admin_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000003'$$,
  'a superadmin can be deactivated when another active superadmin remains'
);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
set local role authenticated;
select is((select count(*) from public.content_posts), 1::bigint, 'inactive staff only sees published posts');
select is((select count(*) from public.contact_submissions), 0::bigint, 'inactive staff cannot read consultations');
select throws_ok(
  $$insert into public.content_posts (kind, slug, title, summary, body, author_id) values ('blog', 'inactive-borrador', 'Borrador inactivo', 'Resumen suficiente para comprobar que una cuenta inactiva no puede crear.', 'Cuerpo de comprobación para una cuenta administrativa inactiva.', '00000000-0000-0000-0000-000000000005')$$,
  '42501', 'new row violates row-level security policy for table "content_posts"', 'inactive staff cannot create content'
);
select throws_ok(
  $$select private.current_admin_role()$$,
  '42501', 'permission denied for function current_admin_role', 'authenticated clients cannot execute the lower-level role helper directly'
);
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
