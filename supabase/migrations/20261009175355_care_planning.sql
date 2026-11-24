-- Agenda and patient-owned planning; only isolated local QA is authorised initially.
begin;
create table private.care_event_series (
  id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id) on delete restrict,
  local_start timestamp not null, timezone text not null default 'America/Santiago' check(timezone='America/Santiago'),
  weeks integer not null check(weeks between 2 and 12), created_at timestamptz not null default now()
);
create index care_series_author on private.care_event_series(created_by);
create table public.care_events (
  id uuid primary key default gen_random_uuid(), series_id uuid references private.care_event_series(id) on delete restrict,
  title text not null check(length(btrim(title)) between 3 and 120),
  kind text not null check(kind in ('group','individual','recovery','sport','family','psychiatry')),
  starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null default 'America/Santiago' check(timezone='America/Santiago'),
  professional_id uuid not null references public.admin_users(user_id) on delete restrict,
  modality text not null check(modality in ('in_person','remote')), location text not null default '' check(length(location)<=160),
  status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled')),
  closed_at timestamptz, version integer not null default 1,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(),
  check(ends_at>starts_at and ends_at-starts_at<=interval '24 hours'),
  check((status='scheduled' and closed_at is null) or (status in ('completed','cancelled') and closed_at is not null))
);
create index care_event_date on public.care_events(starts_at,id);
create index care_event_series on public.care_events(series_id);
create index care_event_professional on public.care_events(professional_id,starts_at);
create index care_event_author on public.care_events(created_by);
create table public.care_event_participants (
  event_id uuid not null references public.care_events(id) on delete restrict,
  patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  attendance text not null default 'pending' check(attendance in ('pending','present','absent','justified')),
  punctuality text check(punctuality in ('on_time','late')),
  participation text not null default '' check(length(participation)<=150),
  observed_by uuid references auth.users(id) on delete restrict, recorded_at timestamptz,
  version integer not null default 1, primary key(event_id,patient_id)
);
create index care_participant_patient on public.care_event_participants(patient_id,event_id);
create index care_participant_observer on public.care_event_participants(observed_by);
create table public.care_event_history (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.care_events(id) on delete restrict,
  title text not null, starts_at timestamptz not null, ends_at timestamptz not null, status text not null,
  actor_id uuid not null references auth.users(id) on delete restrict, recorded_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason)) between 3 and 300),version integer not null,unique(event_id,version)
);
create index care_event_history_event on public.care_event_history(event_id,recorded_at);
create index care_event_history_actor on public.care_event_history(actor_id);
create table public.care_attendance_history (
  id uuid primary key default gen_random_uuid(), event_id uuid not null,patient_id uuid not null,
  attendance text not null,punctuality text,participation text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,recorded_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason)) between 3 and 300),version integer not null,
  foreign key(event_id,patient_id) references public.care_event_participants(event_id,patient_id) on delete restrict,
  unique(event_id,patient_id,version)
);
create index care_attendance_history_patient on public.care_attendance_history(patient_id,event_id);
create index care_attendance_history_actor on public.care_attendance_history(actor_id);
create table public.care_personal_plans (
  id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  title text not null check(length(btrim(title)) between 3 and 160),planned_for timestamptz not null,
  status text not null default 'planned' check(status in ('planned','completed','cancelled')),
  completed_at timestamptz,version integer not null default 1,created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),check(status<>'completed' or completed_at is not null)
);
create index care_plan_patient on public.care_personal_plans(patient_id,planned_for);
create index care_plan_author on public.care_personal_plans(created_by);
create table public.care_plan_history (
  id uuid primary key default gen_random_uuid(),plan_id uuid not null references public.care_personal_plans(id) on delete restrict,
  title text not null,planned_for timestamptz not null,status text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,recorded_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason)) between 3 and 300),version integer not null,unique(plan_id,version)
);
create index care_plan_history_plan on public.care_plan_history(plan_id,recorded_at);
create index care_plan_history_actor on public.care_plan_history(actor_id);
create table public.care_commitments (
  id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  title text not null check(length(btrim(title)) between 3 and 160),due_at timestamptz not null,
  source_event_id uuid references public.care_events(id) on delete restrict,
  responsible_kind text not null default 'patient' check(responsible_kind in ('patient','professional')),
  responsible_id uuid references public.admin_users(user_id) on delete restrict,
  visibility text not null default 'coordination' check(visibility in ('coordination','patient')),
  origin text not null check(origin in ('self','professional')),
  status text not null default 'pending' check(status in ('pending','completed','cancelled')),
  completed_at timestamptz,confirmed_by uuid references auth.users(id) on delete restrict,
  confirmation text check(confirmation in ('self','professional')),result text not null default '' check(length(result)<=300),
  version integer not null default 1,created_by uuid not null references auth.users(id) on delete restrict,created_at timestamptz not null default now(),
  check((responsible_kind='patient' and responsible_id is null) or (responsible_kind='professional' and responsible_id is not null)),
  check(status<>'completed' or (completed_at is not null and confirmed_by is not null and confirmation is not null))
);
create index care_commitment_patient on public.care_commitments(patient_id,due_at);
create index care_commitment_event on public.care_commitments(source_event_id);
create index care_commitment_responsible on public.care_commitments(responsible_id,due_at);
create index care_commitment_author on public.care_commitments(created_by);
create index care_commitment_confirmed on public.care_commitments(confirmed_by);
create table public.care_commitment_history (
  id uuid primary key default gen_random_uuid(),commitment_id uuid not null references public.care_commitments(id) on delete restrict,
  title text not null,due_at timestamptz not null,status text not null,visibility text not null,
  confirmation text,result text not null,actor_id uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),reason text not null check(length(btrim(reason)) between 3 and 300),
  version integer not null,unique(commitment_id,version)
);
create index care_commitment_versions_idx on public.care_commitment_history(commitment_id,recorded_at);
create index care_commitment_history_actor on public.care_commitment_history(actor_id);
create table public.care_patient_goals (
  patient_id uuid primary key references public.patient_profiles(id) on delete restrict,
  objectives text not null check(length(objectives)<=600),version integer not null default 1,
  updated_by uuid not null references auth.users(id) on delete restrict,updated_at timestamptz not null default now()
);
create index care_goal_author on public.care_patient_goals(updated_by);
create table public.care_goal_history (
  id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  objectives text not null,actor_id uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),version integer not null,unique(patient_id,version)
);
create index care_goal_history_actor on public.care_goal_history(actor_id);

create function private.care_event_read(eid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.care_event_participants p where p.event_id=eid
    and (private.care_scope(p.patient_id,'care.patient.read') or private.care_self(p.patient_id)))
$$;
create function private.care_event_write(eid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.care_event_participants where event_id=eid)
    and not exists(select 1 from public.care_event_participants p where p.event_id=eid
      and (not private.care_scope(p.patient_id,'care.records.create') or not private.care_scope(p.patient_id,'care.patient.read')))
$$;
create function private.care_civil_instant(local_time timestamp) returns timestamptz language plpgsql stable security invoker set search_path='' as $$
declare utc timestamptz;
begin
  utc:=local_time at time zone 'America/Santiago';
  if not isfinite(utc) or utc at time zone 'America/Santiago'<>local_time
    or (utc+interval '1 hour') at time zone 'America/Santiago'=local_time
    or (utc-interval '1 hour') at time zone 'America/Santiago'=local_time then raise exception 'Hora local inexistente o repetida'; end if;
  return utc;
end $$;

alter table private.care_event_series enable row level security;
alter table public.care_events enable row level security;
alter table public.care_event_participants enable row level security;
alter table public.care_event_history enable row level security;
alter table public.care_attendance_history enable row level security;
alter table public.care_personal_plans enable row level security;
alter table public.care_plan_history enable row level security;
alter table public.care_commitments enable row level security;
alter table public.care_commitment_history enable row level security;
alter table public.care_patient_goals enable row level security;
alter table public.care_goal_history enable row level security;
revoke all on private.care_event_series from public,anon,authenticated,service_role;
revoke all on public.care_events,public.care_event_participants,public.care_event_history,public.care_attendance_history,
  public.care_personal_plans,public.care_plan_history,public.care_commitments,public.care_commitment_history,
  public.care_patient_goals,public.care_goal_history from public,anon,authenticated,service_role;
grant select on public.care_events,public.care_event_participants,public.care_event_history,public.care_attendance_history,
  public.care_personal_plans,public.care_plan_history,public.care_commitments,public.care_commitment_history,
  public.care_patient_goals,public.care_goal_history to authenticated;
create policy care_event_read on public.care_events for select to authenticated using(private.care_event_read(id));
create policy care_participant_read on public.care_event_participants for select to authenticated using(private.care_scope(patient_id,'care.patient.read') or private.care_self(patient_id));
create policy care_event_history_read on public.care_event_history for select to authenticated using(private.care_event_read(event_id));
create policy care_attendance_history_read on public.care_attendance_history for select to authenticated using(private.care_scope(patient_id,'care.patient.read') or private.care_self(patient_id));
create policy care_plan_read on public.care_personal_plans for select to authenticated using(private.care_scope(patient_id,'care.patient.read') or private.care_self(patient_id));
create policy care_plan_history_read on public.care_plan_history for select to authenticated using(exists(select 1 from public.care_personal_plans p where p.id=plan_id));
create policy care_commitment_read on public.care_commitments for select to authenticated using(private.care_scope(patient_id,'care.patient.read') or visibility='patient' and private.care_self(patient_id));
create policy care_commitment_history_read on public.care_commitment_history for select to authenticated using
  (exists(select 1 from public.care_commitments c where c.id=commitment_id and (private.care_scope(c.patient_id,'care.patient.read') or care_commitment_history.visibility='patient' and private.care_self(c.patient_id))));
create policy care_goal_read on public.care_patient_goals for select to authenticated using(private.care_scope(patient_id,'care.patient.read') or private.care_self(patient_id));
create policy care_goal_history_read on public.care_goal_history for select to authenticated using(private.care_scope(patient_id,'care.patient.read') or private.care_self(patient_id));

create function private.care_planning_manage(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;pid uuid;first_id uuid;sid uuid;starts timestamptz;ends timestamptz;effective timestamptz;local_start timestamp;
  duration interval;weeks integer;idx integer;patients uuid[];old_event public.care_events;old_plan public.care_personal_plans;
  old_commitment public.care_commitments;old_attendance public.care_event_participants;state text;is_patient boolean;
  old_version integer;vis text;responsible uuid;
begin
  if auth.uid() is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());pid:=nullif(p->>'patient_id','')::uuid;
  if op in ('plan','commitment') then
    effective:=case when op='plan' then (p->>'planned_for')::timestamptz else (p->>'due_at')::timestamptz end;
    if effective is null or not isfinite(effective) then raise exception 'Fecha inválida'; end if;
  end if;
  if op='event' then
    patients:=array(select distinct value::uuid from jsonb_array_elements_text(p->'patients'));
    if cardinality(patients) not between 1 and 100 or patients is null
      or exists(select 1 from unnest(patients) x where not private.care_scope(x,'care.records.create') or not private.care_scope(x,'care.patient.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    starts:=(p->>'starts_at')::timestamptz;ends:=(p->>'ends_at')::timestamptz;
    if starts is null or ends is null or not isfinite(starts) or not isfinite(ends) or ends<=starts or ends-starts>interval '24 hours' then raise exception 'Fechas no válidas'; end if;
    perform private.care_civil_instant(starts at time zone 'America/Santiago');
    weeks:=coalesce((p->>'weeks')::integer,1);
    if weeks not between 1 and 12 then raise exception 'Recurrencia no válida'; end if;
    select * into old_event from public.care_events where id=rid for update;
    if found then
      if not private.care_event_write(rid) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if old_event.version is distinct from (p->>'version')::integer then raise exception 'El registro cambió' using errcode='40001'; end if;
      if old_event.status<>'scheduled' or weeks<>1 then raise exception 'Solo se edita una instancia programada'; end if;
      -- Participant list is immutable for existing instances; changes require a new event, with cancellation/history of the old one.
      if patients is distinct from array(select patient_id from public.care_event_participants where event_id=rid order by patient_id)
        and (select array_agg(x order by x) from unnest(patients)x) is distinct from array(select patient_id from public.care_event_participants where event_id=rid order by patient_id)
        then raise exception 'No se alteran participantes de una instancia existente'; end if;
      update public.care_events set title=btrim(p->>'title'),kind=p->>'kind',starts_at=starts,ends_at=ends,modality=p->>'modality',location=coalesce(p->>'location',''),version=version+1 where id=rid;
      insert into public.care_event_history(event_id,title,starts_at,ends_at,status,actor_id,reason,version)
        select id,title,starts_at,ends_at,status,auth.uid(),btrim(p->>'reason'),version from public.care_events where id=rid;
    else
      if coalesce((p->>'version')::int,0)<>0 then raise exception 'El registro cambió' using errcode='40001'; end if;
      first_id:=rid;duration:=ends-starts;local_start:=starts at time zone 'America/Santiago';
      if weeks>1 then insert into private.care_event_series(created_by,local_start,weeks) values(auth.uid(),local_start,weeks) returning id into sid; end if;
      for idx in 0..weeks-1 loop
        if idx>0 then rid:=gen_random_uuid(); end if;
        effective:=private.care_civil_instant(local_start+idx*interval '7 days');
        insert into public.care_events(id,series_id,title,kind,starts_at,ends_at,professional_id,modality,location,created_by)
          values(rid,sid,btrim(p->>'title'),p->>'kind',effective,effective+duration,auth.uid(),p->>'modality',coalesce(p->>'location',''),auth.uid());
        insert into public.care_event_participants(event_id,patient_id) select rid,x from unnest(patients)x;
        insert into public.care_event_history(event_id,title,starts_at,ends_at,status,actor_id,reason,version)
          select id,title,starts_at,ends_at,status,auth.uid(),'Programación',version from public.care_events where id=rid;
      end loop;
      rid:=first_id;
    end if;
  elsif op='event_close' then
    if not private.care_event_write(rid) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    select * into old_event from public.care_events where id=rid for update;
    if old_event.version is distinct from (p->>'version')::int then raise exception 'El registro cambió' using errcode='40001'; end if;
    state:=p->>'status';
    if old_event.status<>'scheduled' or state not in ('completed','cancelled') or (state='completed' and old_event.ends_at>now()) then raise exception 'Evento no cerrable'; end if;
    update public.care_events set status=state,closed_at=now(),version=version+1 where id=rid;
    insert into public.care_event_history(event_id,title,starts_at,ends_at,status,actor_id,reason,version)
      select id,title,starts_at,ends_at,status,auth.uid(),btrim(p->>'reason'),version from public.care_events where id=rid;
  elsif op='attendance' then
    if not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    -- Lock event as well as participant: closing and attendance corrections cannot race.
    select * into old_event from public.care_events where id=rid for update;
    if not found or old_event.status<>'completed' or old_event.closed_at is null then raise exception 'Cierra primero una actividad realizada'; end if;
    select * into old_attendance from public.care_event_participants where event_id=rid and patient_id=pid for update;
    if not found then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if old_attendance.version is distinct from (p->>'version')::int then raise exception 'El registro cambió' using errcode='40001'; end if;
    if p->>'attendance'<>'present' and (nullif(p->>'punctuality','') is not null or length(btrim(coalesce(p->>'participation','')))>0) then raise exception 'Registra participación y puntualidad solo cuando fueron observadas en asistencia presente'; end if;
    update public.care_event_participants set attendance=p->>'attendance',punctuality=nullif(p->>'punctuality',''),participation=btrim(coalesce(p->>'participation','')),
      observed_by=auth.uid(),recorded_at=now(),version=version+1 where event_id=rid and patient_id=pid;
    insert into public.care_attendance_history(event_id,patient_id,attendance,punctuality,participation,actor_id,reason,version)
      select event_id,patient_id,attendance,punctuality,participation,auth.uid(),btrim(p->>'reason'),version from public.care_event_participants where event_id=rid and patient_id=pid;
  elsif op in ('plan','plan_complete') then
    pid:=private.library_patient();
    if pid is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    select * into old_plan from public.care_personal_plans where id=rid for update;
    if found then
      if old_plan.patient_id<>pid then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if old_plan.version is distinct from (p->>'version')::int then raise exception 'El registro cambió' using errcode='40001'; end if;
      if old_plan.status<>'planned' then raise exception 'Plan cerrado; crea otro si corresponde'; end if;
      if op='plan_complete' then update public.care_personal_plans set status='completed',completed_at=now(),version=version+1 where id=rid;
      else update public.care_personal_plans set title=btrim(p->>'title'),planned_for=(p->>'planned_for')::timestamptz,status=p->>'status',version=version+1 where id=rid; end if;
    else
      if op='plan_complete' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if coalesce((p->>'version')::int,0)<>0 then raise exception 'El registro cambió' using errcode='40001'; end if;
      insert into public.care_personal_plans(id,patient_id,title,planned_for,created_by) values(rid,pid,btrim(p->>'title'),(p->>'planned_for')::timestamptz,auth.uid());
    end if;
    insert into public.care_plan_history(plan_id,title,planned_for,status,actor_id,reason,version)
      select id,title,planned_for,status,auth.uid(),case when op='plan_complete' then 'Completado por el paciente' else btrim(p->>'reason') end,version from public.care_personal_plans where id=rid;
  elsif op in ('commitment','commitment_complete','commitment_verify') then
    select * into old_commitment from public.care_commitments where id=rid for update;
    if found then pid:=old_commitment.patient_id; end if;
    is_patient:=private.care_self(pid);
    if not is_patient and (not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if op in ('commitment_complete','commitment_verify') and coalesce(length(btrim(p->>'result')),0)<3 then raise exception 'Registra un resultado breve'; end if;
    if old_commitment.id is not null then
      if is_patient and old_commitment.visibility<>'patient' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if old_commitment.version is distinct from (p->>'version')::int then raise exception 'El registro cambió' using errcode='40001'; end if;
      if op='commitment_verify' then
        if is_patient or old_commitment.status<>'completed' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
        update public.care_commitments set confirmation='professional',confirmed_by=auth.uid(),result=btrim(p->>'result'),version=version+1 where id=rid;
      elsif op='commitment_complete' then
        if old_commitment.status<>'pending' or (is_patient and old_commitment.responsible_kind<>'patient') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
        update public.care_commitments set status='completed',completed_at=now(),confirmed_by=auth.uid(),confirmation=case when is_patient then 'self' else 'professional' end,result=btrim(p->>'result'),version=version+1 where id=rid;
      else
        if old_commitment.status<>'pending' or (is_patient and (old_commitment.origin<>'self' or old_commitment.created_by<>auth.uid())) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
        vis:=case when is_patient then 'patient' else coalesce(p->>'visibility','coordination') end;
        if not is_patient and vis='patient' and old_commitment.visibility<>'patient' and not coalesce((p->>'confirm_publish')::bool,false) then raise exception 'Confirma la publicación al paciente'; end if;
        update public.care_commitments set title=btrim(p->>'title'),due_at=(p->>'due_at')::timestamptz,status=p->>'status',visibility=vis,version=version+1 where id=rid;
      end if;
    else
      if op<>'commitment' then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      if coalesce((p->>'version')::int,0)<>0 then raise exception 'El registro cambió' using errcode='40001'; end if;
      vis:=case when is_patient then 'patient' else coalesce(p->>'visibility','coordination') end;
      if not is_patient and vis='patient' and not coalesce((p->>'confirm_publish')::bool,false) then raise exception 'Confirma la publicación al paciente'; end if;
      responsible:=case when is_patient then null else nullif(p->>'responsible_id','')::uuid end;
      if responsible is not null and not exists(select 1 from public.admin_users a join public.care_assignments b on b.professional_id=a.user_id where a.user_id=responsible and a.is_active and b.patient_id=pid and b.starts_at<=now() and (b.ends_at is null or b.ends_at>now())) then raise exception 'Responsable sin asignación vigente'; end if;
      if nullif(p->>'source_event_id','') is not null and not exists(select 1 from public.care_event_participants where event_id=(p->>'source_event_id')::uuid and patient_id=pid) then raise exception 'Actividad no vinculada a este paciente'; end if;
      insert into public.care_commitments(id,patient_id,title,due_at,source_event_id,responsible_kind,responsible_id,visibility,origin,created_by)
        values(rid,pid,btrim(p->>'title'),(p->>'due_at')::timestamptz,nullif(p->>'source_event_id','')::uuid,case when responsible is null then 'patient' else 'professional' end,responsible,vis,case when is_patient then 'self' else 'professional' end,auth.uid());
    end if;
    insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,reason,version)
      select id,title,due_at,status,visibility,confirmation,result,auth.uid(),btrim(p->>'reason'),version from public.care_commitments where id=rid;
  elsif op='goals' then
    if not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    perform 1 from public.patient_profiles where id=pid for update;
    select version into old_version from public.care_patient_goals where patient_id=pid;
    if coalesce(old_version,0) is distinct from (p->>'version')::int then raise exception 'El registro cambió' using errcode='40001'; end if;
    insert into public.care_patient_goals(patient_id,objectives,updated_by,version) values(pid,btrim(p->>'objectives'),auth.uid(),1)
      on conflict(patient_id) do update set objectives=excluded.objectives,updated_by=auth.uid(),updated_at=now(),version=care_patient_goals.version+1;
    insert into public.care_goal_history(patient_id,objectives,actor_id,version) select patient_id,objectives,auth.uid(),version from public.care_patient_goals where patient_id=pid;
    rid:=pid;
  else raise exception 'Operación no disponible';
  end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.planning.'||op,rid);
  return rid;
end $$;
create function public.care_planning_manage(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_planning_manage(op,p) $$;
create function private.care_event_roster(eid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.care_can('care.patient.read') or not exists(select 1 from public.care_event_participants where event_id=eid and private.care_scope(patient_id,'care.patient.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  return jsonb_build_object('can_edit',private.care_event_write(eid),'patients',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'is_active',p.is_active) order by p.display_name)
    from public.care_event_participants a join public.patient_profiles p on p.id=a.patient_id where a.event_id=eid and private.care_scope(p.id,'care.patient.read')),'[]'::jsonb));
end $$;
create function public.care_event_roster(eid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_event_roster(eid) $$;
create function public.care_agenda(pid uuid,start_at timestamptz,end_at timestamptz,patient_mode boolean default false,page integer default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare events jsonb;participants jsonb;total integer;ids uuid[];
begin
  if (patient_mode and not private.care_self(pid)) or (not patient_mode and not private.care_scope(pid,'care.patient.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if start_at is null or end_at is null or not isfinite(start_at) or not isfinite(end_at) or end_at<=start_at or end_at-start_at>interval '32 days' or page not between 1 and 10000 then raise exception 'Periodo inválido'; end if;
  select count(*) into total from public.care_events e join public.care_event_participants p on p.event_id=e.id where p.patient_id=pid and e.ends_at>start_at and e.starts_at<end_at;
  select array_agg(id),coalesce(jsonb_agg(r),'[]'::jsonb) into ids,events from (select e.* from public.care_events e join public.care_event_participants p on p.event_id=e.id
    where p.patient_id=pid and e.ends_at>start_at and e.starts_at<end_at order by e.starts_at,e.id limit 25 offset (page-1)*25) r;
  select coalesce(jsonb_agg(p),'[]'::jsonb) into participants from public.care_event_participants p where p.event_id=any(ids) and p.patient_id=pid;
  return jsonb_build_object('events',events,'participants',participants,'total',total);
end $$;
create function public.care_next_activity(pid uuid,start_at timestamptz,end_at timestamptz) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not private.care_self(pid) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if start_at is null or end_at is null or not isfinite(start_at) or not isfinite(end_at) or end_at<=start_at or end_at-start_at>interval '32 days' then raise exception 'Periodo inválido'; end if;
  return (select to_jsonb(e) from public.care_events e join public.care_event_participants p on p.event_id=e.id
    where p.patient_id=pid and e.status='scheduled' and e.ends_at>start_at and e.starts_at<end_at order by e.starts_at,e.id limit 1);
end $$;
revoke all on function public.care_next_activity(uuid,timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.care_next_activity(uuid,timestamptz,timestamptz) to authenticated;
revoke all on function private.care_event_read(uuid),private.care_event_write(uuid),private.care_civil_instant(timestamp),private.care_planning_manage(text,jsonb),public.care_planning_manage(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.care_event_read(uuid),private.care_event_write(uuid),private.care_civil_instant(timestamp),private.care_planning_manage(text,jsonb),public.care_planning_manage(text,jsonb) to authenticated;
revoke all on function public.care_agenda(uuid,timestamptz,timestamptz,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function public.care_agenda(uuid,timestamptz,timestamptz,boolean,integer) to authenticated;
revoke all on function private.care_event_roster(uuid),public.care_event_roster(uuid) from public,anon,authenticated,service_role;
grant execute on function private.care_event_roster(uuid),public.care_event_roster(uuid) to authenticated;
commit;
