-- Consolidate content visibility by database role. Authenticated outsiders keep
-- access to published posts, while active staff retain access to drafts and
-- archived content. This removes the duplicate permissive SELECT policies
-- reported by Supabase advisors without broadening either audience.
drop policy if exists "Anyone can read published content" on public.content_posts;
drop policy if exists "Staff can read all content" on public.content_posts;

create policy "Anonymous users read published content" on public.content_posts
  for select to anon
  using (status = 'published'::public.content_status);

create policy "Authenticated users read allowed content" on public.content_posts
  for select to authenticated
  using (
    status = 'published'::public.content_status
    or (select private.is_active_staff())
  );

-- The application prevents self-revocation, but this trigger protects the
-- invariant across every write path, including privileged server operations.
-- A transaction-scoped advisory lock serializes concurrent removals of active
-- superadministrators so two requests cannot both observe the other account.
create or replace function private.protect_last_active_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_active_superadmin boolean := false;
begin
  if old.role = 'superadmin'::public.admin_role and old.is_active then
    if tg_op = 'DELETE' then
      removes_active_superadmin := true;
    else
      removes_active_superadmin := new.role <> 'superadmin'::public.admin_role or not new.is_active;
    end if;
  end if;

  if removes_active_superadmin then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('castelaochile.admin_users'),
      pg_catalog.hashtext('last_active_superadmin')
    );

    if not exists (
      select 1
      from public.admin_users
      where user_id <> old.user_id
        and role = 'superadmin'::public.admin_role
        and is_active
    ) then
      raise exception 'cannot remove the last active superadmin'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_last_active_superadmin() from public, anon, authenticated, service_role;

drop trigger if exists protect_last_active_superadmin on public.admin_users;
create trigger protect_last_active_superadmin
  before update of role, is_active or delete on public.admin_users
  for each row execute function private.protect_last_active_superadmin();
