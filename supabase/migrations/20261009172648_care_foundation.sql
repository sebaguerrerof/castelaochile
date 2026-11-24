-- Local additive foundation. Remote application requires separate authorization.
begin;
create table public.care_staff_capabilities (
  user_id uuid primary key references public.admin_users(user_id) on delete restrict,
  capabilities text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (capabilities <@ array['care.directory.read','care.patient.read','care.assignments.manage',
    'care.records.create','care.records.read','care.medical.create','care.family.read',
    'care.alerts.review','care.decisions.manage','care.reports.export']::text[])
);
create table public.care_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  professional_id uuid not null references public.admin_users(user_id) on delete restrict,
  specialty text not null check (specialty in ('direction','psychology','recovery','psychiatry')),
  starts_at timestamptz not null, ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create unique index care_assignment_open on public.care_assignments(patient_id,professional_id,specialty) where ends_at is null;
create index care_assignment_scope on public.care_assignments(professional_id,patient_id,starts_at,ends_at);
create index care_assignment_patient on public.care_assignments(patient_id);
create index care_assignment_author on public.care_assignments(created_by);
create table public.care_phases (
  id uuid primary key default gen_random_uuid(), label text not null unique check(length(btrim(label)) between 2 and 80),
  is_active boolean not null default true
);
-- No phases or clinical catalog values are seeded.
create table public.care_episodes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  started_at timestamptz not null, ended_at timestamptz,
  status text not null default 'active' check(status in ('active','paused','discharged','withdrawn')),
  phase_id uuid references public.care_phases(id) on delete restrict,
  version integer not null default 1 check(version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((status in ('active','paused') and ended_at is null) or (status in ('discharged','withdrawn') and ended_at >= started_at))
);
create unique index care_episode_open on public.care_episodes(patient_id) where ended_at is null;
create index care_episode_patient_date on public.care_episodes(patient_id,started_at desc);
create index care_episode_phase on public.care_episodes(phase_id);
create index care_episode_author on public.care_episodes(created_by);
create table public.care_episode_history (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.care_episodes(id) on delete restrict,
  status text not null check(status in ('active','paused','discharged','withdrawn')),
  phase_id uuid references public.care_phases(id) on delete restrict,
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check(length(btrim(reason)) between 3 and 300),
  version integer not null, unique(episode_id,version)
);
create index care_history_date on public.care_episode_history(episode_id,effective_at);
create index care_history_phase on public.care_episode_history(phase_id);
create index care_history_actor on public.care_episode_history(actor_id);
create table public.care_shared_summaries (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  visibility text not null default 'coordination' check(visibility in ('coordination','patient')),
  body text not null check(length(btrim(body)) between 1 and 2000),
  occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create index care_shared_patient_date on public.care_shared_summaries(patient_id,occurred_at desc);
create index care_shared_author on public.care_shared_summaries(author_id);
-- Reserved and third-party text never appears in exposed tables or directory projections.
create table private.care_reserved_notes (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check(length(btrim(body)) between 1 and 6000),
  occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create table private.care_family_notes (like private.care_reserved_notes including defaults including constraints including indexes);
alter table private.care_family_notes add foreign key(patient_id) references public.patient_profiles(id) on delete restrict;
alter table private.care_family_notes add foreign key(author_id) references auth.users(id) on delete restrict;
create index care_reserved_scope on private.care_reserved_notes(patient_id,author_id);
create index care_reserved_author on private.care_reserved_notes(author_id);
create index care_family_scope on private.care_family_notes(patient_id,author_id);
create index care_family_author on private.care_family_notes(author_id);
create table private.care_note_readers (
  note_id uuid not null, kind text not null check(kind in ('reserved','family')),
  user_id uuid not null references public.admin_users(user_id) on delete restrict,
  granted_by uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(), primary key(note_id,kind,user_id)
);
create index care_reader_user on private.care_note_readers(user_id,note_id);
create index care_reader_grantor on private.care_note_readers(granted_by);
create table private.care_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete restrict,
  action text not null, resource_id uuid,
  created_at timestamptz not null default now()
);
create index care_audit_actor on private.care_audit(actor_id,created_at desc);

create function private.care_can(cap text) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.care_staff_capabilities c join public.admin_users a on a.user_id=c.user_id
    where c.user_id=auth.uid() and a.is_active and cap=any(c.capabilities))
$$;
create function private.care_scope(pid uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
  select private.care_can(cap) and exists(select 1 from public.patient_profiles p where p.id=pid)
    and exists(select 1 from public.care_assignments a where a.patient_id=pid and a.professional_id=auth.uid()
      and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
$$;
create function private.care_self(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.patient_profiles where id=pid and auth_user_id=auth.uid() and is_active)
$$;
create function private.care_is_technical_admin() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.admin_users where user_id=auth.uid() and is_active and role='superadmin')
$$;

alter table public.care_staff_capabilities enable row level security;
alter table public.care_assignments enable row level security;
alter table public.care_phases enable row level security;
alter table public.care_episodes enable row level security;
alter table public.care_episode_history enable row level security;
alter table public.care_shared_summaries enable row level security;
alter table private.care_reserved_notes enable row level security;
alter table private.care_family_notes enable row level security;
alter table private.care_note_readers enable row level security;
alter table private.care_audit enable row level security;
revoke all on public.care_staff_capabilities,public.care_assignments,public.care_phases,public.care_episodes,
  public.care_episode_history,public.care_shared_summaries from public,anon,authenticated,service_role;
grant select on public.care_staff_capabilities,public.care_assignments,public.care_phases,public.care_episodes,
  public.care_episode_history,public.care_shared_summaries to authenticated;
revoke all on private.care_reserved_notes,private.care_family_notes,private.care_note_readers,private.care_audit from public,anon,authenticated,service_role;
create policy care_capability_read on public.care_staff_capabilities for select to authenticated using
  ((user_id=(select auth.uid()) and exists(select 1 from public.admin_users where user_id=(select auth.uid()) and is_active)) or (select private.care_is_technical_admin()));
create policy care_assignment_read on public.care_assignments for select to authenticated using
  ((select private.care_can('care.assignments.manage')) or private.care_scope(patient_id,'care.patient.read'));
create policy care_phase_read on public.care_phases for select to authenticated using
  ((select private.care_can('care.patient.read')) or (select private.care_can('care.assignments.manage')) or (select private.library_patient()) is not null);
create policy care_episode_read on public.care_episodes for select to authenticated using
  (private.care_scope(patient_id,'care.patient.read') or private.care_self(patient_id));
create policy care_history_read on public.care_episode_history for select to authenticated using
  (exists(select 1 from public.care_episodes e where e.id=episode_id and private.care_scope(e.patient_id,'care.patient.read')));
create policy care_summary_read on public.care_shared_summaries for select to authenticated using
  ((private.care_scope(patient_id,'care.patient.read') and private.care_scope(patient_id,'care.records.read'))
    or (visibility='patient' and private.care_self(patient_id)));

-- Minimal identity projection; does not broaden patient_profiles RLS or expose email.
create function private.care_directory(q text, page integer, management boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or (management and not private.care_can('care.assignments.manage'))
    or (not management and not private.care_can('care.directory.read')) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if length(coalesce(q,''))>100 or page<1 or page>10000 then raise exception 'Parámetros inválidos'; end if;
  select jsonb_build_object('total',count(*),'patients',coalesce((select jsonb_agg(r) from (
    select p.id,p.display_name,p.is_active from public.patient_profiles p
    where (management or private.care_scope(p.id,'care.directory.read')) and position(lower(coalesce(q,'')) in lower(p.display_name))>0
    order by lower(p.display_name),p.id limit 25 offset (page-1)*25) r),'[]'::jsonb)) into result
  from public.patient_profiles p where (management or private.care_scope(p.id,'care.directory.read'))
    and position(lower(coalesce(q,'')) in lower(p.display_name))>0;
  insert into private.care_audit(actor_id,action) values(auth.uid(),case when management then 'care.directory.configure' else 'care.directory.read' end);
  return result;
end $$;
create function public.care_directory(q text default '',page integer default 1,management boolean default false) returns jsonb language sql security invoker set search_path='' as $$
  select private.care_directory(q,page,management)
$$;

create function private.care_patient_identity(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  select jsonb_build_object('id',id,'display_name',display_name,'is_active',is_active) into result from public.patient_profiles where id=pid;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.patient.read',pid);
  return result;
end $$;
create function public.care_patient_identity(pid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_patient_identity(pid) $$;
create function private.care_team() returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.care_can('care.assignments.manage') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'label',coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),split_part(u.email,'@',1),'Profesional')) order by u.email)
    from public.admin_users a join public.care_staff_capabilities c on c.user_id=a.user_id join auth.users u on u.id=a.user_id
    where a.is_active and 'care.patient.read'=any(c.capabilities)),'[]'::jsonb);
end $$;
create function public.care_team() returns jsonb language sql security invoker set search_path='' as $$ select private.care_team() $$;
create function private.care_responsibles(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.professional_id,'specialty',a.specialty,
    'label',coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),split_part(u.email,'@',1),'Profesional')) order by a.specialty)
    from public.care_assignments a join public.admin_users s on s.user_id=a.professional_id join auth.users u on u.id=a.professional_id
    where a.patient_id=pid and s.is_active and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())),'[]'::jsonb);
end $$;
create function public.care_responsibles(pid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_responsibles(pid) $$;

create function private.care_manage(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; pid uuid; uid uuid; effective timestamptz; old public.care_episodes; aid public.care_assignments;
  phase uuid; state text; note_author uuid; note_patient uuid; note_kind text;
begin
  if auth.uid() is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if op='capabilities' then
    if not private.care_is_technical_admin() then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    uid:=(p->>'user_id')::uuid;
    if not exists(select 1 from public.admin_users where user_id=uid and is_active) then raise exception 'Selecciona una cuenta profesional activa'; end if;
    insert into public.care_staff_capabilities(user_id,capabilities) values(uid,array(select distinct jsonb_array_elements_text(p->'capabilities')))
      on conflict(user_id) do update set capabilities=excluded.capabilities,updated_at=now(); rid:=uid;
  elsif op in ('assignment','assignment_end','phase','episode','episode_change') then
    if not private.care_can('care.assignments.manage') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if op='phase' then
      rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
      insert into public.care_phases(id,label,is_active) values(rid,btrim(p->>'label'),coalesce((p->>'is_active')::boolean,true))
        on conflict(id) do update set label=excluded.label,is_active=excluded.is_active;
    elsif op='assignment' then
      pid:=(p->>'patient_id')::uuid; uid:=(p->>'professional_id')::uuid; effective:=(p->>'starts_at')::timestamptz;
      -- Serialize per patient, including simultaneous episode or assignment creation.
      perform 1 from public.patient_profiles where id=pid for update;
      if not found or effective is null or not isfinite(effective) then raise exception 'Datos no válidos'; end if;
      if not exists(select 1 from public.admin_users a join public.care_staff_capabilities c on c.user_id=a.user_id
        where a.user_id=uid and a.is_active and 'care.patient.read'=any(c.capabilities)) then raise exception 'Selecciona una cuenta profesional habilitada'; end if;
      if exists(select 1 from public.care_assignments where patient_id=pid and professional_id=uid and specialty=p->>'specialty'
        and (ends_at is null or ends_at>effective)) then raise exception 'Ya existe una asignación vigente o posterior'; end if;
      insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)
        values(pid,uid,p->>'specialty',effective,auth.uid()) returning id into rid;
    elsif op='assignment_end' then
      rid:=(p->>'id')::uuid;
      select * into aid from public.care_assignments where id=rid for update;
      if not found or aid.ends_at is not null then raise exception 'Recurso no disponible'; end if;
      update public.care_assignments set ends_at=greatest(starts_at,now()) where id=rid;
    elsif op='episode' then
      pid:=(p->>'patient_id')::uuid; effective:=(p->>'started_at')::timestamptz; phase:=nullif(p->>'phase_id','')::uuid;
      perform 1 from public.patient_profiles where id=pid for update;
      if not found or effective is null or not isfinite(effective) or effective>now() then raise exception 'Fecha de ingreso inválida'; end if;
      if phase is not null and not exists(select 1 from public.care_phases where id=phase and is_active) then raise exception 'Fase no disponible'; end if;
      if exists(select 1 from public.care_episodes where patient_id=pid and (ended_at is null or ended_at>effective)) then raise exception 'El episodio se superpone con un ingreso anterior'; end if;
      insert into public.care_episodes(patient_id,started_at,phase_id,created_by) values(pid,effective,phase,auth.uid()) returning id into rid;
      insert into public.care_episode_history(episode_id,status,phase_id,effective_at,actor_id,reason,version)
        values(rid,'active',phase,effective,auth.uid(),btrim(p->>'reason'),1);
    else
      rid:=(p->>'id')::uuid; effective:=(p->>'effective_at')::timestamptz; phase:=nullif(p->>'phase_id','')::uuid; state:=p->>'status';
      select * into old from public.care_episodes where id=rid for update;
      if not found or old.ended_at is not null then raise exception 'Episodio cerrado o no disponible'; end if;
      if old.version is distinct from (p->>'version')::integer then raise exception 'El registro cambió. Recarga antes de guardar.' using errcode='40001'; end if;
      if effective is null or not isfinite(effective) or effective>now() or effective<old.started_at
        or effective<(select max(effective_at) from public.care_episode_history where episode_id=rid) then raise exception 'Fecha efectiva inválida'; end if;
      if phase is not null and not exists(select 1 from public.care_phases where id=phase and is_active) then raise exception 'Fase no disponible'; end if;
      update public.care_episodes set status=state,phase_id=phase,ended_at=case when state in ('discharged','withdrawn') then effective else null end,version=version+1 where id=rid;
      insert into public.care_episode_history(episode_id,status,phase_id,effective_at,actor_id,reason,version)
        values(rid,state,phase,effective,auth.uid(),btrim(p->>'reason'),old.version+1);
    end if;
  elsif op in ('reserved_note','family_note','shared_summary') then
    pid:=(p->>'patient_id')::uuid; effective:=(p->>'occurred_at')::timestamptz;
    if not private.care_scope(pid,'care.records.create') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if effective is null or not isfinite(effective) or effective>now() then raise exception 'Fecha del hecho inválida'; end if;
    if op='reserved_note' then
      insert into private.care_reserved_notes(patient_id,author_id,body,occurred_at) values(pid,auth.uid(),btrim(p->>'body'),effective) returning id into rid;
    elsif op='family_note' then
      if not private.care_scope(pid,'care.family.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
      insert into private.care_family_notes(patient_id,author_id,body,occurred_at) values(pid,auth.uid(),btrim(p->>'body'),effective) returning id into rid;
    else
      if p->>'visibility'='patient' and not coalesce((p->>'confirm_publish')::boolean,false) then raise exception 'Confirma la publicación al paciente'; end if;
      insert into public.care_shared_summaries(patient_id,author_id,body,occurred_at,visibility)
        values(pid,auth.uid(),btrim(p->>'body'),effective,coalesce(p->>'visibility','coordination')) returning id into rid;
    end if;
  elsif op in ('note_reader','note_reader_remove') then
    rid:=(p->>'id')::uuid; uid:=(p->>'user_id')::uuid; note_kind:=p->>'kind';
    if note_kind='reserved' then select author_id,patient_id into note_author,note_patient from private.care_reserved_notes where id=rid for update;
    elsif note_kind='family' then select author_id,patient_id into note_author,note_patient from private.care_family_notes where id=rid for update;
    else raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if note_author is distinct from auth.uid() or not private.care_scope(note_patient,'care.records.create')
      or not private.care_scope(note_patient,'care.patient.read') or (note_kind='family' and not private.care_scope(note_patient,'care.family.read'))
      then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if op='note_reader' then
      if not exists(select 1 from public.admin_users where user_id=uid and is_active) then raise exception 'Cuenta no disponible'; end if;
      insert into private.care_note_readers(note_id,kind,user_id,granted_by) values(rid,note_kind,uid,auth.uid()) on conflict do nothing;
    else delete from private.care_note_readers where note_id=rid and kind=note_kind and user_id=uid;
    end if;
  else raise exception 'Operación no disponible';
  end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.'||op,rid);
  return rid;
end $$;
create function public.care_manage(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_manage(op,p) $$;

create function private.care_read_note(id uuid,kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n jsonb; pid uuid; author uuid;
begin
  if kind='reserved' then select to_jsonb(r),patient_id,author_id into n,pid,author from private.care_reserved_notes r where r.id=care_read_note.id;
  elsif kind='family' then select to_jsonb(r),patient_id,author_id into n,pid,author from private.care_family_notes r where r.id=care_read_note.id;
  else raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if n is null or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read')
    or (kind='family' and not private.care_scope(pid,'care.family.read'))
    or (author is distinct from auth.uid() and not exists(select 1 from private.care_note_readers g where g.note_id=care_read_note.id and g.kind=care_read_note.kind and g.user_id=auth.uid()))
    then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.note.read.'||kind,id);
  return n;
end $$;
create function public.care_read_note(id uuid,kind text default 'reserved') returns jsonb language sql security invoker set search_path='' as $$ select private.care_read_note(id,kind) $$;
-- Each function is denied by default, then deliberately exposed only to signed-in callers.
revoke all on function private.care_can(text),private.care_scope(uuid,text),private.care_self(uuid),private.care_is_technical_admin(),
  private.care_directory(text,integer,boolean),private.care_manage(text,jsonb),private.care_read_note(uuid,text),
  public.care_directory(text,integer,boolean),public.care_manage(text,jsonb),public.care_read_note(uuid,text),
  private.care_patient_identity(uuid),public.care_patient_identity(uuid),private.care_team(),public.care_team(),
  private.care_responsibles(uuid),public.care_responsibles(uuid) from public,anon,authenticated,service_role;
grant execute on function private.care_can(text),private.care_scope(uuid,text),private.care_self(uuid),private.care_is_technical_admin(),
  private.care_directory(text,integer,boolean),private.care_manage(text,jsonb),private.care_read_note(uuid,text),
  public.care_directory(text,integer,boolean),public.care_manage(text,jsonb),public.care_read_note(uuid,text),
  private.care_patient_identity(uuid),public.care_patient_identity(uuid),private.care_team(),public.care_team(),
  private.care_responsibles(uuid),public.care_responsibles(uuid) to authenticated;
commit;
