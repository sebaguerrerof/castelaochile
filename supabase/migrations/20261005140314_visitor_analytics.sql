-- Consented first-party analytics. Event identities are not exposed through the Data API.
create table private.analytics_events (
  event_id uuid primary key,
  event_date date not null,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  path text not null check (length(path) <= 180 and path ~ '^/[A-Za-z0-9/_-]*$' and path !~ '^/(admin|api)(/|$)'),
  created_at timestamptz not null default now()
);
create index analytics_events_date_visitor_idx on private.analytics_events (event_date, visitor_hash);
create table private.analytics_configuration (
  id boolean primary key default true check (id),
  started_at timestamptz
);
insert into private.analytics_configuration (id) values (true);
alter table private.analytics_events enable row level security;
alter table private.analytics_configuration enable row level security;
revoke all on private.analytics_events, private.analytics_configuration from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant select on private.analytics_events, private.analytics_configuration to authenticated;
grant all on private.analytics_events, private.analytics_configuration to service_role;
grant select, insert, update on public.analytics_daily to service_role;
create policy "Staff aggregate consented events" on private.analytics_events for select to authenticated using ((select private.is_active_staff()));
create policy "Staff read analytics start" on private.analytics_configuration for select to authenticated using ((select private.is_active_staff()));

create or replace function public.record_consented_page_view(p_event_id uuid, p_path text, p_visitor_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_date date := (now() at time zone 'America/Santiago')::date;
  v_inserted uuid;
begin
  -- Validate again at the boundary; date comes from the server, never the browser.
  if p_path is null or length(p_path) > 180 or p_path !~ '^/[A-Za-z0-9/_-]*$' or p_path ~ '^/(admin|api)(/|$)'
    or p_visitor_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' or p_event_id is null then
    raise exception 'invalid analytics event';
  end if;
  insert into private.analytics_events (event_id, event_date, visitor_hash, path)
  values (p_event_id, v_date, p_visitor_hash, p_path)
  on conflict (event_id) do nothing returning event_id into v_inserted;
  if v_inserted is null then return; end if;
  -- Both writes are in the same transaction: retries and concurrent requests cannot double count.
  insert into public.analytics_daily as daily (event_date, path, page_views)
  values (v_date, p_path, 1)
  on conflict (event_date, path) do update set page_views = daily.page_views + 1, updated_at = now();
  update private.analytics_configuration set started_at = now() where id and started_at is null;
end;
$$;
revoke all on function public.record_consented_page_view(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_consented_page_view(uuid, text, text) to service_role;
-- Retire the earlier endpoint that could increment counts without event deduplication.
revoke execute on function public.record_page_view(text, date) from service_role;

create or replace function public.get_web_analytics(p_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_start date;
  v_previous date;
  v_result jsonb;
begin
  if current_user not in ('service_role', 'postgres') and not coalesce(private.is_active_staff(), false) then
    raise insufficient_privilege using message = 'staff access required';
  end if;
  if p_days is null or p_days not in (7, 30, 90) then raise exception 'invalid analytics period'; end if;
  v_start := v_today - p_days + 1;
  v_previous := v_today - 2 * p_days + 1;
  with events as materialized (
    select event_date, visitor_hash from private.analytics_events where event_date between v_previous and v_today
  ), daily as materialized (
    select event_date, path, page_views, updated_at from public.analytics_daily where event_date between v_previous and v_today
  ), dates as (
    select v_start + ordinal as event_date from generate_series(0, p_days - 1) as ordinal
  ), daily_visitors as (
    select event_date, count(distinct visitor_hash) as visitors from events where event_date >= v_start group by event_date
  ), daily_views as (
    select event_date, sum(page_views) as views from daily where event_date >= v_start group by event_date
  ), top_pages as (
    select path, sum(page_views) as views from daily where event_date >= v_start group by path order by views desc, path limit 10
  )
  select jsonb_build_object(
    'visitors', (select count(distinct visitor_hash) from events where event_date >= v_start),
    'previousVisitors', (select count(distinct visitor_hash) from events where event_date < v_start),
    'todayVisitors', (select count(distinct visitor_hash) from events where event_date = v_today),
    'totalViews', coalesce((select sum(page_views) from daily where event_date >= v_start), 0),
    'previousViews', coalesce((select sum(page_views) from daily where event_date < v_start), 0),
    'latest', (select max(updated_at) from daily where event_date >= v_start),
    'startedAt', (select started_at from private.analytics_configuration where id),
    'startDate', v_start,
    'today', v_today,
    'dailyPoints', (select jsonb_agg(jsonb_build_object('date', d.event_date, 'value', coalesce(w.views, 0), 'visitors', coalesce(u.visitors, 0)) order by d.event_date) from dates d left join daily_views w using (event_date) left join daily_visitors u using (event_date)),
    'topPages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'pageViews', views) order by views desc, path) from top_pages), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_web_analytics(integer) from public, anon;
grant execute on function public.get_web_analytics(integer) to authenticated, service_role;

-- Keep the current and previous 90-day periods; aggregates contain no identifiers and remain.
create extension if not exists pg_cron;
select cron.schedule('castelao-analytics-retention', '15 8 * * *',
  $job$delete from private.analytics_events where event_date < (now() at time zone 'America/Santiago')::date - 179;
  delete from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'castelao-analytics-retention') and end_time < now() - interval '7 days';$job$);
