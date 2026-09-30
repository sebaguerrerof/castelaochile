-- Extend the existing CMS for the Castelao Chile blog import. This migration
-- intentionally keeps content_posts as the single source of editorial truth.

create extension if not exists unaccent with schema extensions;

do $$
begin
  create type public.content_origin as enum ('castelao_es', 'castelao_cl');
exception when duplicate_object then null;
end $$;

alter table public.content_posts
  alter column author_id drop not null,
  add column if not exists content_html text,
  add column if not exists content_text text,
  add column if not exists featured_image_source_url text,
  add column if not exists author_name text,
  add column if not exists source_updated_at timestamptz,
  add column if not exists synced_at timestamptz,
  add column if not exists reading_time_minutes integer,
  add column if not exists origin public.content_origin not null default 'castelao_cl',
  add column if not exists source_post_id text,
  add column if not exists source_url text,
  add column if not exists source_hash text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists search_vector tsvector;

alter table public.content_posts
  drop constraint if exists content_posts_content_html_length,
  add constraint content_posts_content_html_length
    check (content_html is null or char_length(content_html) <= 100000),
  drop constraint if exists content_posts_content_text_length,
  add constraint content_posts_content_text_length
    check (content_text is null or char_length(content_text) <= 100000),
  drop constraint if exists content_posts_featured_image_source_url_length,
  add constraint content_posts_featured_image_source_url_length
    check (featured_image_source_url is null or char_length(featured_image_source_url) <= 2048),
  drop constraint if exists content_posts_author_name_length,
  add constraint content_posts_author_name_length
    check (author_name is null or char_length(author_name) between 2 and 160),
  drop constraint if exists content_posts_reading_time_range,
  add constraint content_posts_reading_time_range
    check (reading_time_minutes is null or reading_time_minutes between 1 and 240),
  drop constraint if exists content_posts_source_post_id_length,
  add constraint content_posts_source_post_id_length
    check (source_post_id is null or char_length(source_post_id) between 1 and 160),
  drop constraint if exists content_posts_source_url_length,
  add constraint content_posts_source_url_length
    check (source_url is null or char_length(source_url) <= 2048),
  drop constraint if exists content_posts_source_hash_format,
  add constraint content_posts_source_hash_format
    check (source_hash is null or source_hash ~ '^[a-f0-9]{64}$'),
  drop constraint if exists content_posts_seo_title_length,
  add constraint content_posts_seo_title_length
    check (seo_title is null or char_length(seo_title) between 3 and 70),
  drop constraint if exists content_posts_seo_description_length,
  add constraint content_posts_seo_description_length
    check (seo_description is null or char_length(seo_description) between 10 and 170),
  drop constraint if exists content_posts_spanish_source_fields,
  add constraint content_posts_spanish_source_fields check (
    origin <> 'castelao_es'
    or (
      source_post_id is not null
      and source_url is not null
      and source_hash is not null
      and source_updated_at is not null
      and synced_at is not null
      and content_html is not null
      and content_text is not null
    )
  );

create unique index if not exists content_posts_origin_source_post_id_uidx
  on public.content_posts (origin, source_post_id)
  where source_post_id is not null;
create index if not exists content_posts_origin_status_published_idx
  on public.content_posts (origin, status, published_at desc, id desc);
create index if not exists content_posts_search_vector_idx
  on public.content_posts using gin (search_vector);

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  source_category_id text unique check (
    source_category_id is null or char_length(source_category_id) between 1 and 160
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_post_categories (
  post_id uuid not null references public.content_posts(id) on delete cascade,
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, category_id)
);

create index if not exists blog_post_categories_category_post_idx
  on public.blog_post_categories (category_id, post_id);

drop trigger if exists blog_categories_touch_updated_at on public.blog_categories;
create trigger blog_categories_touch_updated_at before update on public.blog_categories
  for each row execute function private.touch_updated_at();

create or replace function private.update_content_post_search_vector()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_vector =
    setweight(to_tsvector('spanish', extensions.unaccent(coalesce(new.title, ''))), 'A')
    || setweight(to_tsvector('spanish', extensions.unaccent(coalesce(new.summary, ''))), 'B')
    || setweight(to_tsvector('spanish', extensions.unaccent(coalesce(new.author_name, ''))), 'C')
    || setweight(to_tsvector('spanish', extensions.unaccent(coalesce(new.content_text, new.body, ''))), 'D');
  return new;
end;
$$;

drop trigger if exists content_posts_update_search_vector on public.content_posts;
create trigger content_posts_update_search_vector
  before insert or update of title, summary, author_name, content_text, body
  on public.content_posts
  for each row execute function private.update_content_post_search_vector();

update public.content_posts
set search_vector =
  setweight(to_tsvector('spanish', extensions.unaccent(coalesce(title, ''))), 'A')
  || setweight(to_tsvector('spanish', extensions.unaccent(coalesce(summary, ''))), 'B')
  || setweight(to_tsvector('spanish', extensions.unaccent(coalesce(author_name, ''))), 'C')
  || setweight(to_tsvector('spanish', extensions.unaccent(coalesce(content_text, body, ''))), 'D');

create or replace function private.protect_synced_content_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' and new.origin <> 'castelao_cl' then
      raise exception 'administrators can only create Castelao Chile content';
    end if;

    if tg_op = 'UPDATE' then
      if old.origin = 'castelao_es' and (
        new.origin is distinct from old.origin
        or new.kind is distinct from old.kind
        or new.slug is distinct from old.slug
        or new.title is distinct from old.title
        or new.summary is distinct from old.summary
        or new.body is distinct from old.body
        or new.content_html is distinct from old.content_html
        or new.content_text is distinct from old.content_text
        or new.cover_image_path is distinct from old.cover_image_path
        or new.cover_alt is distinct from old.cover_alt
        or new.featured_image_source_url is distinct from old.featured_image_source_url
        or new.author_id is distinct from old.author_id
        or new.author_name is distinct from old.author_name
        or new.published_at is distinct from old.published_at
        or new.source_updated_at is distinct from old.source_updated_at
        or new.synced_at is distinct from old.synced_at
        or new.reading_time_minutes is distinct from old.reading_time_minutes
        or new.source_post_id is distinct from old.source_post_id
        or new.source_url is distinct from old.source_url
        or new.source_hash is distinct from old.source_hash
      ) then
        raise exception 'source-managed fields of synchronized content are read-only';
      end if;

      if old.origin = 'castelao_cl' and new.origin <> old.origin then
        raise exception 'local content origin cannot be changed by an administrator';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists content_posts_protect_synced_fields on public.content_posts;
create trigger content_posts_protect_synced_fields
  before insert or update on public.content_posts
  for each row execute function private.protect_synced_content_fields();

revoke all on function private.update_content_post_search_vector() from public;
revoke all on function private.protect_synced_content_fields() from public;

alter table public.blog_categories enable row level security;
alter table public.blog_post_categories enable row level security;

revoke all on table public.blog_categories from anon, authenticated;
revoke all on table public.blog_post_categories from anon, authenticated;
grant select on table public.blog_categories, public.blog_post_categories to anon, authenticated;
grant insert, update, delete on table public.blog_categories, public.blog_post_categories to authenticated;

create policy "Anyone can read blog categories" on public.blog_categories
  for select to anon, authenticated
  using (true);
create policy "Editors create local blog categories" on public.blog_categories
  for insert to authenticated
  with check ((select private.is_editor_or_superadmin()) and source_category_id is null);
create policy "Editors update local blog categories" on public.blog_categories
  for update to authenticated
  using ((select private.is_editor_or_superadmin()) and source_category_id is null)
  with check ((select private.is_editor_or_superadmin()) and source_category_id is null);
create policy "Superadmins delete local blog categories" on public.blog_categories
  for delete to authenticated
  using ((select private.is_superadmin()) and source_category_id is null);

create policy "Public reads categories of published posts" on public.blog_post_categories
  for select to anon
  using (
    exists (
      select 1
      from public.content_posts post
      where post.id = post_id
        and post.status = 'published'
        and post.published_at <= now()
    )
  );
create policy "Authenticated read visible or managed post categories" on public.blog_post_categories
  for select to authenticated
  using (
    exists (
      select 1
      from public.content_posts post
      where post.id = post_id
        and (
          (post.status = 'published' and post.published_at <= now())
          or (select private.is_active_staff())
        )
    )
  );
create policy "Editors categorize local posts" on public.blog_post_categories
  for insert to authenticated
  with check (
    (select private.is_editor_or_superadmin())
    and exists (
      select 1 from public.content_posts post
      where post.id = post_id and post.origin = 'castelao_cl'
    )
  );
create policy "Editors recategorize local posts" on public.blog_post_categories
  for delete to authenticated
  using (
    (select private.is_editor_or_superadmin())
    and exists (
      select 1 from public.content_posts post
      where post.id = post_id and post.origin = 'castelao_cl'
    )
  );

drop policy if exists "Anyone can read published content" on public.content_posts;
drop policy if exists "Public can read published content" on public.content_posts;
create policy "Public can read published content" on public.content_posts
  for select to anon
  using (status = 'published' and published_at <= now());

drop policy if exists "Authenticated can read published content or staff all content" on public.content_posts;
drop policy if exists "Staff can read all content" on public.content_posts;
create policy "Authenticated can read published content or staff all content" on public.content_posts
  for select to authenticated
  using (
    (status = 'published' and published_at <= now())
    or (select private.is_active_staff())
  );

drop policy if exists "Editors and superadmins create content" on public.content_posts;
create policy "Editors and superadmins create local content" on public.content_posts
  for insert to authenticated
  with check (
    (select private.is_editor_or_superadmin())
    and author_id = (select auth.uid())
    and origin = 'castelao_cl'
    and source_post_id is null
  );

-- Search stays security-invoker so content_posts RLS remains authoritative.
create or replace function public.search_blog_posts(
  p_query text default '',
  p_category text default null,
  p_offset integer default 0,
  p_limit integer default 12
)
returns table (
  id uuid,
  kind public.content_kind,
  slug text,
  title text,
  summary text,
  cover_image_path text,
  cover_alt text,
  author_name text,
  published_at timestamptz,
  updated_at timestamptz,
  reading_time_minutes integer,
  origin public.content_origin,
  category_names text[],
  category_slugs text[],
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      post.id,
      post.kind,
      post.slug,
      post.title,
      post.summary,
      post.cover_image_path,
      post.cover_alt,
      post.author_name,
      post.published_at,
      post.updated_at,
      post.reading_time_minutes,
      post.origin,
      case
        when nullif(trim(p_query), '') is null then 0::real
        else ts_rank(
          post.search_vector,
          websearch_to_tsquery('spanish', extensions.unaccent(trim(p_query)))
        )
      end as search_rank
    from public.content_posts post
    where post.kind = 'blog'
      and post.status = 'published'
      and post.published_at <= now()
      and (
        nullif(trim(p_query), '') is null
        or post.search_vector @@ websearch_to_tsquery(
          'spanish',
          extensions.unaccent(trim(p_query))
        )
      )
      and (
        p_category is null
        or exists (
          select 1
          from public.blog_post_categories post_category
          join public.blog_categories category on category.id = post_category.category_id
          where post_category.post_id = post.id
            and category.slug = p_category
        )
      )
  )
  select
    filtered.id,
    filtered.kind,
    filtered.slug,
    filtered.title,
    filtered.summary,
    filtered.cover_image_path,
    filtered.cover_alt,
    filtered.author_name,
    filtered.published_at,
    filtered.updated_at,
    filtered.reading_time_minutes,
    filtered.origin,
    coalesce(categories.names, '{}'::text[]) as category_names,
    coalesce(categories.slugs, '{}'::text[]) as category_slugs,
    count(*) over () as total_count
  from filtered
  left join lateral (
    select
      array_agg(category.name order by category.name) as names,
      array_agg(category.slug order by category.name) as slugs
    from public.blog_post_categories post_category
    join public.blog_categories category on category.id = post_category.category_id
    where post_category.post_id = filtered.id
  ) categories on true
  order by filtered.search_rank desc, filtered.published_at desc, filtered.id desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 50);
$$;

revoke all on function public.search_blog_posts(text, text, integer, integer) from public;
grant execute on function public.search_blog_posts(text, text, integer, integer) to anon, authenticated;
