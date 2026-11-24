-- Additive patient library. Prepare locally; apply remotely only with explicit approval.
begin;
create table public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  email text not null unique check (email = lower(btrim(email)) and length(email) between 3 and 254),
  display_name text not null check (length(display_name) between 2 and 100),
  is_active boolean not null default true,
  invitation_state text not null default 'pending' check (invitation_state in ('pending','sending','sent','failed','linked')),
  invitation_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.therapeutic_staff_permissions (
  user_id uuid primary key references public.admin_users(user_id) on delete cascade,
  manage_access boolean not null default false,
  manage_content boolean not null default false,
  read_content boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.therapy_groups (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 2 and 100),
  description text not null default '' check (length(description) <= 300), is_active boolean not null default true
);
create table public.therapy_group_memberships (
  group_id uuid not null references public.therapy_groups(id) on delete restrict,
  patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  is_active boolean not null default true, primary key (group_id, patient_id)
);
create index library_membership_patient on public.therapy_group_memberships(patient_id, group_id) where is_active;
create table public.therapy_areas (
  id uuid primary key default gen_random_uuid(), name text not null unique check (length(name) between 2 and 100),
  sort_order integer not null default 0, is_active boolean not null default true
);
insert into public.therapy_areas(name, sort_order) values ('Terapia grupal',1),('Terapia psicológica',2),('Coaching Recovery',3);
create table public.patient_library_folders (
  id uuid primary key default gen_random_uuid(), area_id uuid not null references public.therapy_areas(id) on delete restrict,
  parent_id uuid references public.patient_library_folders(id) on delete restrict,
  name text not null check (length(name) between 1 and 120), sort_order integer not null default 0,
  is_active boolean not null default true
);
create index library_folder_parent on public.patient_library_folders(parent_id, area_id);
create table public.patient_library_materials (
  id uuid primary key default gen_random_uuid(), area_id uuid not null references public.therapy_areas(id) on delete restrict,
  folder_id uuid references public.patient_library_folders(id) on delete restrict,
  title text not null check (length(title) between 3 and 160),
  description text not null default '' check (length(description) <= 600),
  kind text not null check (kind in ('activity','guide','summary','report','exercise','other')),
  body text not null default '' check (length(body) <= 100000), tags text[] not null default '{}',
  session_date date, audience text not null check (audience in ('all','groups','patients')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  author_id uuid not null references auth.users(id) on delete restrict,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (kind <> 'report' or audience = 'patients'), check (cardinality(tags) <= 20)
);
create index library_material_page on public.patient_library_materials(status, updated_at desc, id);
create index library_material_folder on public.patient_library_materials(folder_id, area_id);
create index library_material_date on public.patient_library_materials(session_date);
create index library_material_search on public.patient_library_materials using gin
  (to_tsvector('spanish', title || ' ' || description));
create index library_material_tags on public.patient_library_materials using gin(tags);
create table public.patient_library_group_grants (
  material_id uuid not null references public.patient_library_materials(id) on delete cascade,
  group_id uuid not null references public.therapy_groups(id) on delete restrict, primary key(material_id,group_id)
);
create index library_group_grant on public.patient_library_group_grants(group_id, material_id);
create table public.patient_library_patient_grants (
  material_id uuid not null references public.patient_library_materials(id) on delete cascade,
  patient_id uuid not null references public.patient_profiles(id) on delete restrict, primary key(material_id,patient_id)
);
create index library_patient_grant on public.patient_library_patient_grants(patient_id, material_id);
create table public.patient_library_attachments (
  id uuid primary key default gen_random_uuid(), material_id uuid not null references public.patient_library_materials(id) on delete restrict,
  object_key text not null unique default gen_random_uuid()::text check (object_key ~ '^[a-f0-9-]{36}$'),
  original_name text not null check (length(original_name) between 1 and 180 and original_name !~ '[\r\n/\\]'),
  mime text not null check (mime in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg','image/png','image/webp')),
  bytes integer not null check (bytes between 1 and 20971520),
  state text not null default 'pending' check (state in ('pending','ready','failed','retired')),
  replaces_id uuid references public.patient_library_attachments(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index library_attachment_material on public.patient_library_attachments(material_id, state);
create table public.patient_library_user_state (
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  material_id uuid not null references public.patient_library_materials(id) on delete cascade,
  favorite boolean not null default false, first_opened_at timestamptz, primary key(patient_id,material_id)
);
create table public.patient_library_audit (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
  action text not null, resource_id uuid, created_at timestamptz not null default now()
);

-- Non-exposed, narrowly scoped definers prevent recursive RLS. They never use user_metadata.
create function private.library_can(cap text) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.therapeutic_staff_permissions p join public.admin_users a on a.user_id=p.user_id
    where p.user_id=auth.uid() and a.is_active and case cap
      when 'access' then p.manage_access when 'content' then p.manage_content
      when 'read' then p.read_content or p.manage_content else false end)
$$;
create function private.library_patient() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.patient_profiles where auth_user_id=auth.uid() and is_active and auth.uid() is not null
$$;
create function private.library_patient_access(mid uuid, pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (pid=private.library_patient() or private.library_can('read')) and exists (
    select 1 from public.patient_library_materials m join public.patient_profiles p on p.id=pid and p.is_active
    join public.therapy_areas a on a.id=m.area_id and a.is_active
    where m.id=mid and m.status='published' and (
      m.audience='all' or (m.audience='patients' and exists (select 1 from public.patient_library_patient_grants g where g.material_id=m.id and g.patient_id=pid))
      or (m.audience='groups' and exists (select 1 from public.patient_library_group_grants g
        join public.therapy_groups t on t.id=g.group_id and t.is_active
        join public.therapy_group_memberships x on x.group_id=g.group_id and x.patient_id=pid and x.is_active where g.material_id=m.id))))
$$;
create function private.library_folder_visible(fid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  with recursive tree as (
    select id from public.patient_library_folders where id=fid
    union all select f.id from public.patient_library_folders f join tree t on f.parent_id=t.id
  ) select auth.uid() is not null and exists (select 1 from public.patient_library_materials m
    where m.folder_id in (select id from tree) and private.library_patient_access(m.id,private.library_patient()))
$$;

do $$ declare t text; begin
  foreach t in array array['patient_profiles','therapeutic_staff_permissions','therapy_groups','therapy_group_memberships','therapy_areas',
    'patient_library_folders','patient_library_materials','patient_library_group_grants','patient_library_patient_grants',
    'patient_library_attachments','patient_library_user_state','patient_library_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
create policy library_profiles on public.patient_profiles for select to authenticated using (private.library_can('access') or (auth_user_id=auth.uid() and is_active));
create policy library_permissions on public.therapeutic_staff_permissions for select to authenticated using
  (user_id=auth.uid() or exists(select 1 from public.admin_users where user_id=auth.uid() and is_active and role='superadmin'));
create policy library_groups on public.therapy_groups for select to authenticated using (private.library_can('access') or private.library_can('content'));
create policy library_members on public.therapy_group_memberships for select to authenticated using (private.library_can('access'));
create policy library_areas on public.therapy_areas for select to authenticated using (private.library_can('read') or
  (is_active and exists(select 1 from public.patient_library_materials m where m.area_id=therapy_areas.id)));
create policy library_folders on public.patient_library_folders for select to authenticated using (private.library_can('read') or private.library_folder_visible(id));
create policy library_materials on public.patient_library_materials for select to authenticated using (private.library_can('read') or private.library_patient_access(id,private.library_patient()));
create policy library_group_grants on public.patient_library_group_grants for select to authenticated using (private.library_can('read'));
create policy library_patient_grants on public.patient_library_patient_grants for select to authenticated using (private.library_can('read'));
create policy library_attachments on public.patient_library_attachments for select to authenticated using
  (private.library_can('read') or (state='ready' and private.library_patient_access(material_id,private.library_patient())));
create policy library_user_state on public.patient_library_user_state for select to authenticated using
  (patient_id=private.library_patient() and private.library_patient_access(material_id,patient_id));
create policy library_audit on public.patient_library_audit for select to authenticated using (private.library_can('access'));

-- All management is transactional, explicitly guarded and audited; no browser table mutations.
create function private.library_manage(op text, p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare rid uuid; rowdata public.patient_profiles; mat public.patient_library_materials; f public.patient_library_folders;
  cursor_id uuid; depth integer; aid uuid; recipients uuid[]; cap text;
begin
  if auth.uid() is null then raise exception 'Acceso denegado' using errcode='42501'; end if;
  cap := case when op in ('patient','patient_status','group','membership','invitation_claim','invitation_result') then 'access' else 'content' end;
  if op='permission' then
    if not exists(select 1 from public.admin_users where user_id=auth.uid() and is_active and role='superadmin') then
      raise exception 'Acceso denegado' using errcode='42501'; end if;
    rid := (p->>'user_id')::uuid;
    if not exists(select 1 from public.admin_users where user_id=rid and is_active) then raise exception 'Selecciona staff activo'; end if;
    insert into public.therapeutic_staff_permissions(user_id,manage_access,manage_content,read_content)
      values(rid,(p->>'manage_access')::boolean,(p->>'manage_content')::boolean,(p->>'read_content')::boolean)
      on conflict(user_id) do update set manage_access=excluded.manage_access,manage_content=excluded.manage_content,read_content=excluded.read_content,updated_at=now();
  else
    if not private.library_can(cap) then raise exception 'Acceso denegado' using errcode='42501'; end if;
    -- Serialize structural/content changes to prevent cycles, grant/attachment races and lost updates.
    perform pg_advisory_xact_lock(81871008);
    if op='patient' then
      insert into public.patient_profiles(email,display_name,auth_user_id,invitation_state)
        select lower(btrim(p->>'email')),p->>'display_name',u.id,case when u.id is null then 'pending' else 'linked' end
        from (select 1) x left join auth.users u on lower(u.email)=lower(btrim(p->>'email'))
        on conflict(email) do update set display_name=excluded.display_name,updated_at=now()
        returning * into rowdata;
      rid:=rowdata.id;
    elsif op='patient_status' then
      rid:=(p->>'id')::uuid;
      update public.patient_profiles set is_active=(p->>'is_active')::boolean,updated_at=now() where id=rid;
      if not found then raise exception 'Perfil no disponible'; end if;
    elsif op='invitation_claim' then
      rid:=(p->>'id')::uuid;
      select * into rowdata from public.patient_profiles where id=rid and is_active for update;
      if not found then raise exception 'Perfil no disponible'; end if;
      -- Recover an Auth user created by an earlier attempt without changing any CMS role.
      select id into aid from auth.users where lower(email)=rowdata.email;
      if aid is not null then
        update public.patient_profiles set auth_user_id=aid,invitation_state='linked',updated_at=now() where id=rid;
        insert into public.patient_library_audit(actor_id,action,resource_id) values(auth.uid(),'library.invitation_link',rid);
        return jsonb_build_object('existing',true,'email',rowdata.email);
      end if;
      if rowdata.invitation_state='sending' and rowdata.invitation_at > now()-interval '5 minutes' then raise exception 'Invitación en curso; espera antes de reintentar'; end if;
      update public.patient_profiles set invitation_state='sending',invitation_at=now(),updated_at=now() where id=rid;
      insert into public.patient_library_audit(actor_id,action,resource_id) values(auth.uid(),'library.invitation_claim',rid);
      return jsonb_build_object('email',rowdata.email);
    elsif op='invitation_result' then
      rid:=(p->>'id')::uuid;
      select * into rowdata from public.patient_profiles where id=rid for update;
      select id into aid from auth.users where lower(email)=rowdata.email;
      update public.patient_profiles set auth_user_id=coalesce(auth_user_id,aid),invitation_state=case when aid is null or not coalesce((p->>'success')::boolean,false) then 'failed' else 'sent' end,updated_at=now() where id=rid;
    elsif op='group' then
      rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
      insert into public.therapy_groups(id,name,description,is_active) values(rid,p->>'name',coalesce(p->>'description',''),(p->>'is_active')::boolean)
        on conflict(id) do update set name=excluded.name,description=excluded.description,is_active=excluded.is_active;
    elsif op='membership' then
      rid:=(p->>'patient_id')::uuid;
      if (p->>'is_active')::boolean and (not exists(select 1 from public.patient_profiles where id=rid and is_active)
        or not exists(select 1 from public.therapy_groups where id=(p->>'group_id')::uuid and is_active)) then raise exception 'Selecciona paciente y grupo activos'; end if;
      insert into public.therapy_group_memberships(group_id,patient_id,is_active) values((p->>'group_id')::uuid,rid,(p->>'is_active')::boolean)
        on conflict(group_id,patient_id) do update set is_active=excluded.is_active;
    elsif op='area' then
      rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
      if coalesce((p->>'is_active')::boolean,true)=false and exists(select 1 from public.patient_library_materials where area_id=rid and status='published') then
        raise exception 'Archiva o traslada primero los materiales publicados'; end if;
      insert into public.therapy_areas(id,name,is_active) values(rid,p->>'name',coalesce((p->>'is_active')::boolean,true))
        on conflict(id) do update set name=excluded.name,is_active=excluded.is_active;
    elsif op='folder' then
      rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid()); aid:=(p->>'area_id')::uuid; cursor_id:=nullif(p->>'parent_id','')::uuid; depth:=1;
      while cursor_id is not null loop
        if cursor_id=rid or depth>=4 then raise exception 'Carpeta circular o profundidad mayor a cuatro'; end if;
        select * into f from public.patient_library_folders where id=cursor_id and is_active and area_id=aid;
        if not found then raise exception 'Carpeta padre no válida'; end if;
        cursor_id:=f.parent_id; depth:=depth+1;
      end loop;
      -- Existing subtrees may be renamed/archived when empty; moving a subtree requires moving leaves first.
      if exists(select 1 from public.patient_library_folders where parent_id=rid) and exists
        (select 1 from public.patient_library_folders where id=rid and (parent_id is distinct from nullif(p->>'parent_id','')::uuid or area_id<>aid or not (p->>'is_active')::boolean)) then
        raise exception 'Traslada o archiva primero las subcarpetas'; end if;
      if exists(select 1 from public.patient_library_materials where folder_id=rid and (area_id<>aid or not (p->>'is_active')::boolean)) then
        raise exception 'Traslada primero todos los materiales de la carpeta'; end if;
      insert into public.patient_library_folders(id,area_id,parent_id,name,is_active) values(rid,aid,nullif(p->>'parent_id','')::uuid,p->>'name',(p->>'is_active')::boolean)
        on conflict(id) do update set area_id=excluded.area_id,parent_id=excluded.parent_id,name=excluded.name,is_active=excluded.is_active;
    elsif op='material' then
      rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
      select * into mat from public.patient_library_materials where id=rid for update;
      if found and mat.version is distinct from (p->>'version')::integer then raise exception 'El material cambió. Recarga antes de guardar.' using errcode='40001'; end if;
      if found and (mat.audience is distinct from p->>'audience'
        or (select array_agg(patient_id order by patient_id) from public.patient_library_patient_grants where material_id=rid) is distinct from
          (select array_agg(v::uuid order by v::uuid) from jsonb_array_elements_text(coalesce(p->'patients','[]')) v)
        or (select array_agg(group_id order by group_id) from public.patient_library_group_grants where material_id=rid) is distinct from
          (select array_agg(v::uuid order by v::uuid) from jsonb_array_elements_text(coalesce(p->'groups','[]')) v))
        and not coalesce((p->>'confirm_audience')::boolean,false) then raise exception 'Confirma explícitamente el cambio de destinatarios'; end if;
      aid:=(p->>'area_id')::uuid;
      if not exists(select 1 from public.therapy_areas where id=aid and is_active) then raise exception 'Área no disponible'; end if;
      if nullif(p->>'folder_id','') is not null and not exists(select 1 from public.patient_library_folders where id=(p->>'folder_id')::uuid and area_id=aid and is_active) then raise exception 'Carpeta no válida para el área'; end if;
      recipients:=array(select distinct v::uuid from jsonb_array_elements_text(case when p->>'audience'='groups' then p->'groups' else p->'patients' end) v);
      if p->>'audience'<>'all' and coalesce(cardinality(recipients),0)=0 then raise exception 'Selecciona destinatarios'; end if;
      if p->>'kind'='report' and (p->>'audience'<>'patients' or cardinality(recipients)<>1) then raise exception 'Un informe requiere exactamente un paciente'; end if;
      if p->>'audience'='all' and (jsonb_array_length(coalesce(p->'patients','[]'))>0 or jsonb_array_length(coalesce(p->'groups','[]'))>0) then raise exception 'Audiencia incompatible'; end if;
      if p->>'audience'='groups' and (jsonb_array_length(coalesce(p->'patients','[]'))>0 or exists(select 1 from unnest(recipients) x where not exists(select 1 from public.therapy_groups where id=x and is_active))) then raise exception 'Grupos no válidos'; end if;
      if p->>'audience'='patients' and (jsonb_array_length(coalesce(p->'groups','[]'))>0 or exists(select 1 from unnest(recipients) x where not exists(select 1 from public.patient_profiles where id=x and is_active))) then raise exception 'Pacientes no válidos'; end if;
      if p->>'status'='published' then
        if not coalesce((p->>'confirm_publish')::boolean,false) then raise exception 'Revisa y confirma la audiencia antes de publicar'; end if;
        if exists(select 1 from public.patient_library_attachments where material_id=rid and state in ('pending','failed')) then raise exception 'Resuelve o retira las cargas pendientes o fallidas'; end if;
        if length(btrim(regexp_replace(coalesce(p->>'body',''),'<[^>]*>','','g')))=0 and not exists(select 1 from public.patient_library_attachments where material_id=rid and state='ready') then raise exception 'Agrega texto o un archivo listo'; end if;
      end if;
      insert into public.patient_library_materials(id,area_id,folder_id,title,description,kind,body,tags,session_date,audience,status,author_id)
        values(rid,aid,nullif(p->>'folder_id','')::uuid,p->>'title',coalesce(p->>'description',''),p->>'kind',coalesce(p->>'body',''),
          array(select jsonb_array_elements_text(coalesce(p->'tags','[]'))),nullif(p->>'session_date','')::date,p->>'audience',p->>'status',auth.uid())
        on conflict(id) do update set area_id=excluded.area_id,folder_id=excluded.folder_id,title=excluded.title,description=excluded.description,
          kind=excluded.kind,body=excluded.body,tags=excluded.tags,session_date=excluded.session_date,audience=excluded.audience,status=excluded.status,
          version=patient_library_materials.version+1,updated_at=now();
      delete from public.patient_library_group_grants where material_id=rid;
      delete from public.patient_library_patient_grants where material_id=rid;
      if p->>'audience'='groups' then insert into public.patient_library_group_grants select rid,unnest(recipients); end if;
      if p->>'audience'='patients' then insert into public.patient_library_patient_grants select rid,unnest(recipients); end if;
    elsif op='attachment_begin' then
      rid:=(p->>'material_id')::uuid;
      select * into mat from public.patient_library_materials where id=rid for update;
      if not found or mat.version is distinct from (p->>'version')::integer then raise exception 'El material cambió. Recarga antes de cargar.' using errcode='40001'; end if;
      if nullif(p->>'replaces_id','') is not null then
        if not exists(select 1 from public.patient_library_attachments where id=(p->>'replaces_id')::uuid and material_id=rid and state='ready')
          or exists(select 1 from public.patient_library_attachments where replaces_id=(p->>'replaces_id')::uuid and state in ('pending','failed')) then raise exception 'Reemplazo no válido; retira el intento previo'; end if;
      elsif (select count(*) from public.patient_library_attachments where material_id=rid and state in ('ready','pending','failed'))>=5 then raise exception 'Máximo cinco adjuntos. Retira uno antes de continuar'; end if;
      insert into public.patient_library_attachments(material_id,original_name,mime,bytes,replaces_id)
        values(rid,p->>'original_name',p->>'mime',(p->>'bytes')::integer,nullif(p->>'replaces_id','')::uuid) returning id into aid;
      insert into public.patient_library_audit(actor_id,action,resource_id) values(auth.uid(),'library.upload_pending',aid);
      return (select to_jsonb(a) from public.patient_library_attachments a where id=aid);
    elsif op='attachment_retire' then
      rid:=(p->>'id')::uuid;
      select m.* into mat from public.patient_library_materials m join public.patient_library_attachments a on a.material_id=m.id where a.id=rid for update of m;
      if not found or mat.version is distinct from (p->>'version')::integer then raise exception 'El material cambió. Recarga antes de retirar.' using errcode='40001'; end if;
      if mat.status='published' and length(btrim(regexp_replace(mat.body,'<[^>]*>','','g')))=0 and
        not exists(select 1 from public.patient_library_attachments where material_id=mat.id and id<>rid and state='ready') then raise exception 'Archiva o añade contenido antes de retirar el último adjunto'; end if;
      update public.patient_library_attachments set state='retired' where id=rid;
      update public.patient_library_materials set version=version+1,updated_at=now() where id=mat.id;
    else raise exception 'Operación no admitida'; end if;
  end if;
  insert into public.patient_library_audit(actor_id,action,resource_id) values(auth.uid(),'library.'||op,rid);
  return jsonb_build_object('id',rid);
end $$;
create function public.library_manage(op text,p jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select private.library_manage(op,p) $$;

-- Verified upload completion is server-only: clients cannot mark arbitrary objects as safe.
create function public.library_finish_attachment(aid uuid, ready boolean, actor uuid) returns void language plpgsql security definer set search_path = '' as $$
declare mid uuid;
begin
  perform pg_advisory_xact_lock(81871008);
  select material_id into mid from public.patient_library_attachments where id=aid and state='pending' for update;
  if not found then raise exception 'Carga no disponible'; end if;
  if not exists(select 1 from public.therapeutic_staff_permissions p join public.admin_users a on a.user_id=p.user_id where p.user_id=actor and a.is_active and p.manage_content) then raise exception 'Acceso denegado'; end if;
  if ready and not exists(select 1 from storage.objects o join public.patient_library_attachments a on o.name=a.object_key where a.id=aid and o.bucket_id='patient-library') then raise exception 'Objeto no disponible'; end if;
  if ready then
    update public.patient_library_attachments set state='retired' where id=(select replaces_id from public.patient_library_attachments where id=aid);
  end if;
  update public.patient_library_attachments set state=case when ready then 'ready' else 'failed' end where id=aid;
  update public.patient_library_materials set version=version+1,updated_at=now() where id=mid;
  insert into public.patient_library_audit(actor_id,action,resource_id) values(actor,case when ready then 'library.upload_ready' else 'library.upload_failed' end,aid);
end $$;
revoke all on function public.library_finish_attachment(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.library_finish_attachment(uuid,boolean,uuid) to service_role;

create function private.library_state(mid uuid, fav boolean, opened boolean) returns void language plpgsql security definer set search_path = '' as $$
declare pid uuid:=private.library_patient();
begin
  if not private.library_patient_access(mid,pid) then raise exception 'Material no disponible' using errcode='42501'; end if;
  insert into public.patient_library_user_state(patient_id,material_id,favorite,first_opened_at)
    values(pid,mid,coalesce(fav,false),case when opened then now() end)
    on conflict(patient_id,material_id) do update set favorite=coalesce(fav,patient_library_user_state.favorite),
      first_opened_at=coalesce(patient_library_user_state.first_opened_at,excluded.first_opened_at);
end $$;
create function public.library_state(mid uuid,fav boolean default null,opened boolean default false) returns void language sql security invoker set search_path = '' as $$ select private.library_state(mid,fav,opened) $$;

-- Search remains an invoker query: RLS applies before pagination and count, never indexes bodies.
create function public.library_search(q text default '',area uuid default null,folder uuid default null,kind_filter text default null,
  date_from date default null,date_to date default null,favorites boolean default false,page integer default 1,staff boolean default false,status_filter text default null)
returns table(id uuid,title text,description text,kind text,area_id uuid,folder_id uuid,session_date date,updated_at timestamptz,status text,version integer,favorite boolean,is_new boolean,total_count bigint)
language sql stable security invoker set search_path = '' as $$
  select m.id,m.title,m.description,m.kind,m.area_id,m.folder_id,m.session_date,m.updated_at,m.status,m.version,coalesce(s.favorite,false),s.first_opened_at is null,count(*) over()
  from public.patient_library_materials m left join public.patient_library_user_state s on s.material_id=m.id and s.patient_id=private.library_patient()
  where (coalesce(q,'')='' or to_tsvector('spanish',m.title||' '||m.description||' '||array_to_string(m.tags,' ')) @@ websearch_to_tsquery('spanish',left(q,120)))
    and (area is null or m.area_id=area) and (folder is null or m.folder_id=folder) and (kind_filter is null or m.kind=kind_filter)
    and (date_from is null or m.session_date>=date_from) and (date_to is null or m.session_date<=date_to) and (not favorites or s.favorite)
    and ((staff and private.library_can('read')) or (not staff and private.library_patient_access(m.id,private.library_patient())))
    and (not staff or status_filter is null or m.status=status_filter)
  order by m.updated_at desc,m.id limit 24 offset (least(greatest(page,1),10000)-1)*24
$$;
create function private.library_preview(mid uuid,pid uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.library_can('read') or not private.library_patient_access(mid,pid) then return null; end if;
  return (select jsonb_build_object('material',to_jsonb(m),'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'original_name',a.original_name,'mime',a.mime,'bytes',a.bytes)) from public.patient_library_attachments a where a.material_id=m.id and a.state='ready'),'[]'::jsonb)) from public.patient_library_materials m where m.id=mid);
end $$;
create function public.library_preview(mid uuid,pid uuid) returns jsonb language sql stable security invoker set search_path = '' as $$ select private.library_preview(mid,pid) $$;

create function private.library_recipients() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.library_can('content') and not private.library_can('read') then raise exception 'Acceso denegado' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'display_name',display_name)) from public.patient_profiles where is_active),'[]'::jsonb);
end $$;
create function public.library_recipients() returns jsonb language sql stable security invoker set search_path = '' as $$ select private.library_recipients() $$;

create function private.library_patient_material(mid uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.library_patient_access(mid,private.library_patient()) then return null; end if;
  return (select jsonb_build_object('material',jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'kind',m.kind,'body',m.body,'tags',m.tags,'session_date',m.session_date,'area_id',m.area_id,'folder_id',m.folder_id),
    'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'original_name',a.original_name,'mime',a.mime,'bytes',a.bytes)) from public.patient_library_attachments a where a.material_id=m.id and a.state='ready'),'[]'::jsonb)) from public.patient_library_materials m where m.id=mid);
end $$;
create function public.library_patient_material(mid uuid) returns jsonb language sql stable security invoker set search_path = '' as $$ select private.library_patient_material(mid) $$;
create function private.library_navigation() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if private.library_patient() is null then return jsonb_build_object('areas','[]'::jsonb,'folders','[]'::jsonb); end if;
  return jsonb_build_object('areas',coalesce((select jsonb_agg(to_jsonb(a) order by a.sort_order,a.name) from public.therapy_areas a where a.is_active and exists(select 1 from public.patient_library_materials m where m.area_id=a.id and private.library_patient_access(m.id,private.library_patient()))),'[]'::jsonb),
    'folders',coalesce((select jsonb_agg(to_jsonb(f) order by f.sort_order,f.name) from public.patient_library_folders f where private.library_folder_visible(f.id)),'[]'::jsonb));
end $$;
create function public.library_navigation() returns jsonb language sql stable security invoker set search_path = '' as $$ select private.library_navigation() $$;

do $$ declare signature text; begin
  foreach signature in array array['private.library_can(text)','private.library_patient()','private.library_patient_access(uuid,uuid)',
    'private.library_folder_visible(uuid)','private.library_manage(text,jsonb)','private.library_state(uuid,boolean,boolean)','private.library_preview(uuid,uuid)',
    'public.library_manage(text,jsonb)','public.library_state(uuid,boolean,boolean)','public.library_search(text,uuid,uuid,text,date,date,boolean,integer,boolean,text)','public.library_preview(uuid,uuid)',
    'private.library_recipients()','public.library_recipients()','private.library_patient_material(uuid)','public.library_patient_material(uuid)',
    'private.library_navigation()','public.library_navigation()'] loop
    execute 'revoke all on function '||signature||' from public, anon, service_role';
    execute 'grant execute on function '||signature||' to authenticated';
  end loop;
end $$;
grant usage on schema private to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('patient-library','patient-library',false,20971520,array[
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png','image/webp']);
-- Restrictive policy protects against future broad permissive policies on shared Storage.
create policy library_no_direct_storage on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'patient-library') with check(bucket_id<>'patient-library');
commit;
