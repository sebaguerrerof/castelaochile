-- Instituto Castelao Chile: administration, CMS, protected contact intake and
-- first-party aggregate analytics. This migration is intentionally data-free.
-- Apply only after linking an explicitly authorised Castelao Supabase project.

create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  create type public.admin_role as enum ('superadmin', 'editor', 'viewer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.contact_submission_status as enum ('new', 'in_progress', 'closed', 'spam');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_kind as enum ('blog', 'news');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null default 'viewer',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 24),
  message text check (message is null or char_length(message) <= 500),
  status public.contact_submission_status not null default 'new',
  source_path text not null check (source_path ~ '^/[A-Za-z0-9/_-]*$'),
  idempotency_key uuid not null unique,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_to uuid references auth.users(id) on delete set null
);

create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.contact_submissions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2_000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 10 and 320),
  body text not null check (char_length(body) between 1 and 50_000),
  cover_image_path text check (cover_image_path is null or char_length(cover_image_path) <= 500),
  cover_alt text check (cover_alt is null or char_length(cover_alt) between 3 and 160),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_posts_have_timestamp check (
    (status = 'published' and published_at is not null) or status <> 'published'
  ),
  constraint approved_posts_have_timestamp check (
    (approved_by is null and approved_at is null) or (approved_by is not null and approved_at is not null)
  )
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_.-]{2,80}$'),
  resource_type text not null check (resource_type ~ '^[a-z][a-z0-9_.-]{2,80}$'),
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  event_date date not null,
  path text not null check (path ~ '^/[A-Za-z0-9/_-]*$'),
  page_views integer not null default 0 check (page_views >= 0),
  updated_at timestamptz not null default now(),
  primary key (event_date, path)
);

create index if not exists contact_submissions_status_submitted_at_idx
  on public.contact_submissions (status, submitted_at desc, id desc);
create index if not exists contact_submissions_assigned_to_idx
  on public.contact_submissions (assigned_to) where assigned_to is not null;
create index if not exists contact_notes_submission_created_at_idx
  on public.contact_notes (submission_id, created_at asc);
create index if not exists contact_notes_author_id_idx on public.contact_notes (author_id);
create index if not exists content_posts_public_listing_idx
  on public.content_posts (kind, published_at desc, id desc) where status = 'published';
create index if not exists content_posts_author_id_idx on public.content_posts (author_id);
create index if not exists content_posts_approved_by_idx
  on public.content_posts (approved_by) where approved_by is not null;
create index if not exists admin_audit_log_actor_created_at_idx
  on public.admin_audit_log (actor_id, created_at desc) where actor_id is not null;
create index if not exists admin_audit_log_resource_idx
  on public.admin_audit_log (resource_type, resource_id, created_at desc);
create index if not exists analytics_daily_path_date_idx
  on public.analytics_daily (path, event_date desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_users_touch_updated_at on public.admin_users;
create trigger admin_users_touch_updated_at before update on public.admin_users
  for each row execute function private.touch_updated_at();
drop trigger if exists contact_submissions_touch_updated_at on public.contact_submissions;
create trigger contact_submissions_touch_updated_at before update on public.contact_submissions
  for each row execute function private.touch_updated_at();
drop trigger if exists contact_notes_touch_updated_at on public.contact_notes;
create trigger contact_notes_touch_updated_at before update on public.contact_notes
  for each row execute function private.touch_updated_at();
drop trigger if exists content_posts_touch_updated_at on public.content_posts;
create trigger content_posts_touch_updated_at before update on public.content_posts
  for each row execute function private.touch_updated_at();

-- Role lookup is kept outside the exposed schema to avoid recursive RLS
-- policies. It accepts no caller-controlled parameters and is not callable via
-- the Data API; it is only referenced by policies below.
create or replace function private.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select au.role
  from public.admin_users au
  where au.user_id = (select auth.uid())
    and au.is_active
  limit 1;
$$;

create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_admin_role() is not null;
$$;

create or replace function private.is_editor_or_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_admin_role() in ('editor'::public.admin_role, 'superadmin'::public.admin_role);
$$;

create or replace function private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_admin_role() = 'superadmin'::public.admin_role;
$$;

revoke all on function private.touch_updated_at() from public;
revoke all on function private.current_admin_role() from public;
revoke all on function private.is_active_staff() from public;
revoke all on function private.is_editor_or_superadmin() from public;
revoke all on function private.is_superadmin() from public;

alter table public.admin_users enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.contact_notes enable row level security;
alter table public.content_posts enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.analytics_daily enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.contact_submissions from anon, authenticated;
revoke all on table public.contact_notes from anon, authenticated;
revoke all on table public.content_posts from anon, authenticated;
revoke all on table public.admin_audit_log from anon, authenticated;
revoke all on table public.analytics_daily from anon, authenticated;

grant select, insert, update, delete on public.admin_users to authenticated;
grant select, update on public.contact_submissions to authenticated;
grant select, insert, update on public.contact_notes to authenticated;
grant select on public.content_posts to anon, authenticated;
grant insert, update, delete on public.content_posts to authenticated;
grant select, insert on public.admin_audit_log to authenticated;
grant select on public.analytics_daily to authenticated;
grant usage, select on sequence public.admin_audit_log_id_seq to authenticated;

create policy "Staff can read their own profile" on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_superadmin()));
create policy "Superadmins manage staff" on public.admin_users
  for insert to authenticated
  with check ((select private.is_superadmin()));
create policy "Superadmins update staff" on public.admin_users
  for update to authenticated
  using ((select private.is_superadmin()))
  with check ((select private.is_superadmin()));
create policy "Superadmins remove staff" on public.admin_users
  for delete to authenticated
  using ((select private.is_superadmin()));

create policy "Editors and superadmins read consultations" on public.contact_submissions
  for select to authenticated
  using ((select private.is_editor_or_superadmin()));
create policy "Editors and superadmins update consultations" on public.contact_submissions
  for update to authenticated
  using ((select private.is_editor_or_superadmin()))
  with check ((select private.is_editor_or_superadmin()));

create policy "Editors and superadmins read consultation notes" on public.contact_notes
  for select to authenticated
  using ((select private.is_editor_or_superadmin()));
create policy "Editors and superadmins add consultation notes" on public.contact_notes
  for insert to authenticated
  with check (
    (select private.is_editor_or_superadmin())
    and author_id = (select auth.uid())
  );
create policy "Note authors can update their own notes" on public.contact_notes
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and (select private.is_editor_or_superadmin())
  )
  with check (
    author_id = (select auth.uid())
    and (select private.is_editor_or_superadmin())
  );

create policy "Anyone can read published content" on public.content_posts
  for select to anon, authenticated
  using (status = 'published');
create policy "Staff can read all content" on public.content_posts
  for select to authenticated
  using ((select private.is_active_staff()));
create policy "Editors and superadmins create content" on public.content_posts
  for insert to authenticated
  with check (
    (select private.is_editor_or_superadmin())
    and author_id = (select auth.uid())
  );
create policy "Editors and superadmins update content" on public.content_posts
  for update to authenticated
  using ((select private.is_editor_or_superadmin()))
  with check ((select private.is_editor_or_superadmin()));
create policy "Superadmins delete content" on public.content_posts
  for delete to authenticated
  using ((select private.is_superadmin()));

create policy "Superadmins read audit events" on public.admin_audit_log
  for select to authenticated
  using ((select private.is_superadmin()));
create policy "Staff append their own minimal audit event" on public.admin_audit_log
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (select private.is_active_staff())
  );

create policy "Staff read aggregate analytics" on public.analytics_daily
  for select to authenticated
  using ((select private.is_active_staff()));

-- The endpoint validates both path and date before using this function; the
-- function repeats the path check, atomically increments the counter and is
-- executable only by the server's secret-key client.
create or replace function public.record_page_view(p_path text, p_event_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_path !~ '^/[A-Za-z0-9/_-]*$' or p_path like '/admin%' or p_path like '/api%' then
    raise exception 'invalid analytics path';
  end if;

  insert into public.analytics_daily as daily (event_date, path, page_views)
  values (p_event_date, p_path, 1)
  on conflict (event_date, path) do update
  set page_views = daily.page_views + 1,
      updated_at = now();
end;
$$;
revoke all on function public.record_page_view(text, date) from public, anon, authenticated;
grant execute on function public.record_page_view(text, date) to service_role;

-- Draft and original images live in a private bucket. The public site receives
-- only short-lived URLs issued server-side after a published-post lookup.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-images',
  'content-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff can read private content images" on storage.objects
  for select to authenticated
  using (bucket_id = 'content-images' and (select private.is_active_staff()));
create policy "Editors upload their own content images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content-images'
    and (select private.is_editor_or_superadmin())
    and (storage.foldername(name))[1] = ((select auth.uid())::text)
  );
create policy "Editors update own images and superadmins any image" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'content-images'
    and (
      (select private.is_superadmin())
      or ((select private.is_editor_or_superadmin()) and (storage.foldername(name))[1] = ((select auth.uid())::text))
    )
  )
  with check (
    bucket_id = 'content-images'
    and (
      (select private.is_superadmin())
      or ((select private.is_editor_or_superadmin()) and (storage.foldername(name))[1] = ((select auth.uid())::text))
    )
  );
create policy "Editors delete own images and superadmins any image" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content-images'
    and (
      (select private.is_superadmin())
      or ((select private.is_editor_or_superadmin()) and (storage.foldername(name))[1] = ((select auth.uid())::text))
    )
  );
