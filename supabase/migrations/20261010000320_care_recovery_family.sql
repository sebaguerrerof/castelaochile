-- Step 7. No seeded rubric, scores, family accounts or clinical defaults.
begin;
create table public.care_recovery_rubrics (
 id uuid primary key, family_id uuid not null, version integer not null check(version>0),name text not null check(length(btrim(name)) between 3 and 100),
 dimensions jsonb not null,ordered boolean not null default false,state text not null default 'draft' check(state in ('draft','approved','retired')),
 revision integer not null default 1,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 approved_by uuid references auth.users(id),approved_at timestamptz,approval_reference text not null default '',unique(family_id,version),
 check(state='draft' or approved_by is not null and approved_at is not null and length(btrim(approval_reference))>=3)
);
create index care_rubric_author on public.care_recovery_rubrics(created_by);
create index care_rubric_approver on public.care_recovery_rubrics(approved_by);
create table private.care_rubric_history(id bigint generated always as identity primary key,rubric_id uuid not null references public.care_recovery_rubrics(id),snapshot jsonb not null,actor_id uuid not null references auth.users(id),reason text not null,recorded_at timestamptz not null default now());
create index care_rubric_history_parent on private.care_rubric_history(rubric_id,id);
create index care_rubric_history_actor on private.care_rubric_history(actor_id);
create table public.care_autonomy_observations (
 id uuid primary key,patient_id uuid not null references public.patient_profiles(id),record_id uuid not null references public.care_session_records(id),source_revision integer not null,
 dimension text not null check(dimension in ('organisation','schedule','obligations','independence','initiative','coherence','family_support','habits')),
 rubric_id uuid references public.care_recovery_rubrics(id),author_id uuid not null references auth.users(id),occurred_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','final')),version integer not null default 1,revision integer not null default 0,
 first_finalized_at timestamptz,created_at timestamptz not null default now(),unique(record_id,dimension)
);
create index care_autonomy_patient on public.care_autonomy_observations(patient_id,occurred_at,id);
create index care_autonomy_author on public.care_autonomy_observations(author_id);
create index care_autonomy_rubric on public.care_autonomy_observations(rubric_id);
create table private.care_autonomy_drafts(observation_id uuid primary key references public.care_autonomy_observations(id),payload jsonb not null,occurred_at timestamptz not null,saved_at timestamptz not null default now());
create table private.care_autonomy_versions(id uuid primary key default gen_random_uuid(),observation_id uuid not null references public.care_autonomy_observations(id),revision integer not null,occurred_at timestamptz not null,payload jsonb not null,reason text not null,actor_id uuid not null references auth.users(id),recorded_at timestamptz not null default now(),unique(observation_id,revision));
create index care_autonomy_version_actor on private.care_autonomy_versions(actor_id);
create table public.care_family_records (
 id uuid primary key,patient_id uuid not null references public.patient_profiles(id),event_id uuid not null references public.care_events(id),author_id uuid not null references auth.users(id),
 occurred_at timestamptz not null,status text not null default 'draft' check(status in ('draft','final')),version integer not null default 1,revision integer not null default 0,
 first_finalized_at timestamptz,created_at timestamptz not null default now(),unique(patient_id,event_id,author_id)
);
create index care_family_record_patient on public.care_family_records(patient_id,occurred_at,id);
create index care_family_record_event on public.care_family_records(event_id);
create index care_family_record_author on public.care_family_records(author_id);
create table private.care_family_drafts(record_id uuid primary key references public.care_family_records(id),payload jsonb not null,reserved_note text not null default '',occurred_at timestamptz not null,saved_at timestamptz not null default now());
create table private.care_family_versions(id uuid primary key default gen_random_uuid(),record_id uuid not null references public.care_family_records(id),revision integer not null,occurred_at timestamptz not null,payload jsonb not null,reserved_note_id uuid references private.care_family_notes(id),reason text not null,actor_id uuid not null references auth.users(id),recorded_at timestamptz not null default now(),unique(record_id,revision));
create index care_family_version_reserve on private.care_family_versions(reserved_note_id);
create index care_family_version_actor on private.care_family_versions(actor_id);
create table private.care_family_agreements (
 id uuid primary key,record_id uuid not null references public.care_family_records(id),source_revision integer not null,patient_id uuid not null references public.patient_profiles(id),
 title text not null,responsible text not null,due_at timestamptz not null,state text not null default 'pending' check(state in ('pending','completed','cancelled')),
 share_patient boolean not null default false,patient_body text not null default '',result text not null default '',completed_at timestamptz,version integer not null default 1,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),
 check(length(btrim(title)) between 3 and 160),check(length(btrim(responsible)) between 2 and 80),check(length(result)<=300),check(not share_patient or length(btrim(patient_body)) between 3 and 300)
);
create index care_family_agreement_record on private.care_family_agreements(record_id);
create index care_family_agreement_patient on private.care_family_agreements(patient_id,due_at,id);
create index care_family_agreement_author on private.care_family_agreements(created_by);
create index care_family_agreement_actor on private.care_family_agreements(updated_by);
create table private.care_family_agreement_history(id bigint generated always as identity primary key,agreement_id uuid not null references private.care_family_agreements(id),snapshot jsonb not null,reason text not null,actor_id uuid not null references auth.users(id),recorded_at timestamptz not null default now());
create index care_family_agreement_history_parent on private.care_family_agreement_history(agreement_id,id);
create index care_family_agreement_history_actor on private.care_family_agreement_history(actor_id);
alter table public.care_recovery_rubrics enable row level security;
alter table public.care_autonomy_observations enable row level security;
alter table public.care_family_records enable row level security;
alter table private.care_rubric_history enable row level security;
alter table private.care_autonomy_drafts enable row level security;
alter table private.care_autonomy_versions enable row level security;
alter table private.care_family_drafts enable row level security;
alter table private.care_family_versions enable row level security;
alter table private.care_family_agreements enable row level security;
alter table private.care_family_agreement_history enable row level security;
revoke all on public.care_recovery_rubrics,public.care_autonomy_observations,public.care_family_records,private.care_rubric_history,private.care_autonomy_drafts,private.care_autonomy_versions,private.care_family_drafts,private.care_family_versions,private.care_family_agreements,private.care_family_agreement_history from public,anon,authenticated,service_role;
grant select on public.care_recovery_rubrics,public.care_autonomy_observations,public.care_family_records to authenticated;
create policy care_rubric_read on public.care_recovery_rubrics for select to authenticated using(private.care_can('care.records.read') and (state<>'draft' or private.care_can('care.decisions.manage')));
create policy care_autonomy_read on public.care_autonomy_observations for select to authenticated using(private.care_scope(patient_id,'care.patient.read') and (status='final' and private.care_scope(patient_id,'care.records.read') or author_id=(select auth.uid()) and private.care_scope(patient_id,'care.records.create')));
create policy care_family_record_read on public.care_family_records for select to authenticated using(private.care_scope(patient_id,'care.family.read') and private.care_scope(patient_id,'care.patient.read') and (status='final' and private.care_scope(patient_id,'care.records.read') or author_id=(select auth.uid()) and private.care_scope(patient_id,'care.records.create')));

create function private.care_recovery_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p->>'id')::uuid;pid uuid;src uuid;happened timestamptz;expected integer:=(p->>'version')::integer;final boolean;payload jsonb:=p->'payload';a public.care_autonomy_observations;f public.care_family_records;rub public.care_recovery_rubrics;rec public.care_session_records;ev public.care_events;ag private.care_family_agreements;dim jsonb;item jsonb;level jsonb;reserve uuid;ref text;reader uuid;note uuid;family uuid;
begin
 if auth.uid() is null or rid is null or expected is null or p is null then raise exception 'Recurso no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('recovery-family:'||rid::text,0));
 if op in ('rubric_save','rubric_approve','rubric_retire') then
  if not private.care_can('care.decisions.manage') or not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('rubric:'||coalesce(p->>'family_id',rid::text),0));select * into rub from public.care_recovery_rubrics where id=rid for update;
  if rub.id is not null and rub.revision<>expected then raise exception 'El registro cambió' using errcode='40001';end if;
  if op='rubric_save' then
   if rub.id is not null and rub.state<>'draft' then raise exception 'Una rúbrica aprobada es inmutable';end if;
   if jsonb_typeof(p->'dimensions') is distinct from 'array' or jsonb_array_length(p->'dimensions') not between 1 and 8 or length(btrim(coalesce(p->>'name',''))) not between 3 and 100 then raise exception 'Define nombre y dimensiones';end if;
   if (select count(distinct d->>'key') from jsonb_array_elements(p->'dimensions')d)<>jsonb_array_length(p->'dimensions') then raise exception 'Dimensiones repetidas';end if;
   for dim in select * from jsonb_array_elements(p->'dimensions') loop
    if jsonb_typeof(dim) is distinct from 'object' or exists(select 1 from jsonb_object_keys(dim)k where k not in ('key','levels')) or coalesce(dim->>'key','') not in ('organisation','schedule','obligations','independence','initiative','coherence','family_support','habits') or jsonb_typeof(dim->'levels') is distinct from 'array' or jsonb_array_length(dim->'levels') not between 2 and 6 then raise exception 'Dimensión o niveles inválidos';end if;
    if (select count(distinct l->>'label') from jsonb_array_elements(dim->'levels')l)<>jsonb_array_length(dim->'levels') or (select count(distinct l->>'key') from jsonb_array_elements(dim->'levels')l)<>jsonb_array_length(dim->'levels') then raise exception 'Niveles repetidos';end if;
    for level in select * from jsonb_array_elements(dim->'levels') loop
     if jsonb_typeof(level) is distinct from 'object' or exists(select 1 from jsonb_object_keys(level)k where k not in ('key','label')) or jsonb_typeof(level->'label') is distinct from 'string' or length(btrim(coalesce(level->>'label',''))) not between 2 and 80 or coalesce(level->>'key','') !~ '^[a-z0-9_]{1,30}$' then raise exception 'Nivel inválido';end if;
    end loop;
   end loop;
   if rub.id is null then
    if expected<>0 then raise exception 'Versión inválida' using errcode='40001';end if;
    family:=coalesce(nullif(p->>'family_id','')::uuid,rid);
    if family<>rid and not exists(select 1 from public.care_recovery_rubrics r where r.family_id=family) then raise exception 'Familia de rúbrica no disponible';end if;
    insert into public.care_recovery_rubrics(id,family_id,version,name,dimensions,ordered,created_by) values(rid,family,coalesce((select max(r.version)+1 from public.care_recovery_rubrics r where r.family_id=family),1),btrim(p->>'name'),p->'dimensions',coalesce((p->>'ordered')::boolean,false),auth.uid());
   else update public.care_recovery_rubrics set name=btrim(p->>'name'),dimensions=p->'dimensions',ordered=coalesce((p->>'ordered')::boolean,false),revision=revision+1 where id=rid;end if;
  elsif op='rubric_approve' then
   if rub.state is distinct from 'draft' or not coalesce((p->>'confirm_approval')::boolean,false) or length(btrim(coalesce(p->>'approval_reference',''))) not between 3 and 300 then raise exception 'Acredita aprobación del equipo y referencia';end if;
   update public.care_recovery_rubrics set state='approved',approved_by=auth.uid(),approved_at=now(),approval_reference=btrim(p->>'approval_reference'),revision=revision+1 where id=rid;
  else
   if rub.state is distinct from 'approved' or length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Indica motivo de retiro';end if;
   update public.care_recovery_rubrics set state='retired',revision=revision+1 where id=rid;
  end if;
  insert into private.care_rubric_history(rubric_id,snapshot,actor_id,reason)select rid,to_jsonb(r),auth.uid(),coalesce(nullif(btrim(p->>'reason'),''),op) from public.care_recovery_rubrics r where id=rid;
 elsif op in ('autonomy_draft','autonomy_final','autonomy_amend') then
  select * into a from public.care_autonomy_observations where id=rid for update;
  src:=coalesce(a.record_id,(p->>'record_id')::uuid);select * into rec from public.care_session_records where id=src for share;pid:=rec.patient_id;
  if not exists(select 1 from public.care_assignments ca where ca.patient_id=pid and ca.professional_id=auth.uid() and ca.specialty='recovery' and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now())) or rec.id is null or rec.specialty<>'recovery' or rec.status<>'final' or rec.author_id<>auth.uid() or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if a.id is not null and (a.author_id<>auth.uid() or a.version<>expected) then raise exception 'El registro cambió' using errcode='40001';end if;
  if a.id is null and expected<>0 then raise exception 'Versión inválida' using errcode='40001';end if;
  select * into rub from public.care_recovery_rubrics where id=case when a.id is not null then a.rubric_id else nullif(p->>'rubric_id','')::uuid end for share;
  if a.id is null and nullif(p->>'rubric_id','') is not null and (rub.state is distinct from 'approved' or exists(select 1 from public.care_recovery_rubrics newer where newer.family_id=rub.family_id and newer.state<>'draft' and newer.version>rub.version)) then raise exception 'Selecciona una versión vigente y aprobada';end if;
  ref:=coalesce(a.dimension,p->>'dimension');
  if ref is null or ref not in ('organisation','schedule','obligations','independence','initiative','coherence','family_support','habits') then raise exception 'Selecciona dimensión';end if;
  if rub.id is not null and not exists(select 1 from jsonb_array_elements(rub.dimensions)d where d->>'key'=ref) then raise exception 'Dimensión ajena a la rúbrica';end if;
  happened:=(p->>'occurred_at')::timestamptz;final:=op<>'autonomy_draft';
  if happened is null or not isfinite(happened) or happened>now() or jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload)k where k not in ('status','level','evidence')) or exists(select 1 from jsonb_each(payload)j where jsonb_typeof(j.value)<>'string') or length(coalesce(payload->>'evidence',''))>600 then raise exception 'Observación inválida';end if;
  if coalesce(payload->>'status','') not in ('','evaluated','not_evaluable') then raise exception 'Estado inválido';end if;
  if final and (payload->>'status' not in ('evaluated','not_evaluable') or nullif(payload->>'status','') is null or length(btrim(coalesce(payload->>'evidence','')))<3 or not coalesce((p->>'confirm_final')::boolean,false)) then raise exception 'Confirma evaluación o no evaluable y evidencia';end if;
  if nullif(payload->>'level','') is not null and (rub.id is null or payload->>'status'<>'evaluated' or not exists(select 1 from jsonb_array_elements(rub.dimensions)d cross join jsonb_array_elements(d->'levels')l where d->>'key'=ref and l->>'key'=payload->>'level')) then raise exception 'Nivel no autorizado';end if;
  if final and rub.id is not null and payload->>'status'='evaluated' and nullif(payload->>'level','') is null then raise exception 'Selecciona nivel aprobado';end if;
  if (op='autonomy_amend') is distinct from (coalesce(a.status,'draft')='final') and final then raise exception 'Usa enmienda para preservar original';end if;
  if op='autonomy_amend' and length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Motivo de enmienda requerido';end if;
  if a.id is null then insert into public.care_autonomy_observations(id,patient_id,record_id,source_revision,dimension,rubric_id,author_id,occurred_at)values(rid,pid,src,rec.revision,ref,rub.id,auth.uid(),happened);else update public.care_autonomy_observations set version=version+1 where id=rid;end if;
  if final then
   update public.care_autonomy_observations set status='final',occurred_at=happened,revision=revision+1,first_finalized_at=coalesce(first_finalized_at,now()) where id=rid returning * into a;
   insert into private.care_autonomy_versions(observation_id,revision,occurred_at,payload,reason,actor_id)values(rid,a.revision,happened,payload,case when op='autonomy_amend' then btrim(p->>'reason') else 'Finalización original' end,auth.uid());delete from private.care_autonomy_drafts where observation_id=rid;
  else insert into private.care_autonomy_drafts(observation_id,payload,occurred_at)values(rid,payload,happened)on conflict(observation_id)do update set payload=excluded.payload,occurred_at=excluded.occurred_at,saved_at=now();end if;
 elsif op in ('family_draft','family_final','family_amend') then
  select * into f from public.care_family_records where id=rid for update;src:=coalesce(f.event_id,(p->>'event_id')::uuid);pid:=coalesce(f.patient_id,(p->>'patient_id')::uuid);select * into ev from public.care_events where id=src for share;
  if ev.id is null or ev.kind<>'family' or ev.professional_id<>auth.uid() or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.records.create') or not exists(select 1 from public.care_event_participants t where t.event_id=src and t.patient_id=pid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if f.id is not null and (f.author_id<>auth.uid() or f.version<>expected) then raise exception 'El registro cambió' using errcode='40001';end if;
  if f.id is null and expected<>0 then raise exception 'Versión inválida' using errcode='40001';end if;
  happened:=(p->>'occurred_at')::timestamptz;final:=op<>'family_draft';
  if happened is null or not isfinite(happened) or happened>now() or jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload)k where k not in ('objective','participants','source','communication','limits','responsibilities','support','progress','observations')) or length(coalesce(p->>'reserved_note',''))>2000 then raise exception 'Registro inválido';end if;
  for ref,item in select * from jsonb_each(payload) loop if ref<>'participants' and (jsonb_typeof(item)<>'string' or length(item#>>'{}')>600) then raise exception 'Campo inválido';end if;end loop;
  if jsonb_typeof(payload->'participants') is distinct from 'array' or jsonb_array_length(payload->'participants')>6 then raise exception 'Participantes inválidos';end if;
  for item in select * from jsonb_array_elements(payload->'participants') loop if jsonb_typeof(item)<>'object' or length(btrim(coalesce(item->>'label',''))) not between 2 and 60 or length(btrim(coalesce(item->>'relationship',''))) not between 2 and 50 or exists(select 1 from jsonb_object_keys(item)k where k not in ('label','relationship')) then raise exception 'Usa identificación mínima y vínculo';end if;end loop;
  if final and (length(btrim(coalesce(payload->>'objective','')))<3 or jsonb_array_length(payload->'participants')<1 or coalesce(payload->>'source','') not in ('observed','family_report','patient_report') or not coalesce((p->>'confirm_final')::boolean,false) or ev.status<>'completed' or ev.ends_at>now() or not exists(select 1 from public.care_event_participants t where t.event_id=src and t.patient_id=pid and t.attendance<>'pending')) then raise exception 'Confirma fuente, objetivo, participantes y actividad realizada';end if;
  if final and (op='family_amend') is distinct from (coalesce(f.status,'draft')='final') then raise exception 'Usa enmienda para preservar original';end if;
  if op='family_amend' and length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Motivo de enmienda requerido';end if;
  if f.id is null then insert into public.care_family_records(id,patient_id,event_id,author_id,occurred_at)values(rid,pid,src,auth.uid(),happened);else update public.care_family_records set version=version+1 where id=rid;end if;
  if final then
   update public.care_family_records set status='final',occurred_at=happened,revision=revision+1,first_finalized_at=coalesce(first_finalized_at,now()) where id=rid returning * into f;
   if length(btrim(coalesce(p->>'reserved_note','')))>0 then insert into private.care_family_notes(patient_id,author_id,body,occurred_at)values(pid,auth.uid(),btrim(p->>'reserved_note'),happened)returning id into reserve;end if;
   insert into private.care_family_versions(record_id,revision,occurred_at,payload,reserved_note_id,reason,actor_id)values(rid,f.revision,happened,payload,reserve,case when op='family_amend' then btrim(p->>'reason') else 'Finalización original' end,auth.uid());delete from private.care_family_drafts where record_id=rid;
  else insert into private.care_family_drafts(record_id,payload,reserved_note,occurred_at)values(rid,payload,coalesce(p->>'reserved_note',''),happened)on conflict(record_id)do update set payload=excluded.payload,reserved_note=excluded.reserved_note,occurred_at=excluded.occurred_at,saved_at=now();end if;
 elsif op in ('family_grant','family_revoke') then
  select * into f from public.care_family_records where id=rid for update;pid:=f.patient_id;reader:=(p->>'reader')::uuid;note:=(p->>'note_id')::uuid;
  if f.id is null or f.author_id<>auth.uid() or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if op='family_grant' then
   if not exists(select 1 from private.care_family_versions v where v.record_id=rid and v.reserved_note_id=note) or not exists(select 1 from public.care_assignments ca join public.admin_users u on u.user_id=ca.professional_id and u.is_active join public.care_staff_capabilities c on c.user_id=u.user_id where ca.patient_id=pid and ca.professional_id=reader and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()) and c.capabilities @> array['care.patient.read','care.records.read','care.family.read']) then raise exception 'Lector no autorizado';end if;
   insert into private.care_note_readers(note_id,kind,user_id,granted_by)values(note,'family',reader,auth.uid())on conflict do nothing;
  else delete from private.care_note_readers g using private.care_family_versions v where v.record_id=rid and v.reserved_note_id=g.note_id and g.kind='family' and g.user_id=reader;end if;
 elsif op in ('agreement','agreement_complete','agreement_cancel','agreement_unshare') then
  select * into ag from private.care_family_agreements where id=rid for update;src:=coalesce(ag.record_id,(p->>'record_id')::uuid);select * into f from public.care_family_records where id=src for share;pid:=f.patient_id;
  if f.id is null or f.status<>'final' or not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.records.create') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if ag.id is not null and (ag.version<>expected or ag.state<>'pending' and op<>'agreement_unshare') then raise exception 'El registro cambió o ya se cerró' using errcode='40001';end if;
  if ag.id is null and (expected<>0 or op<>'agreement') then raise exception 'Acuerdo no disponible';end if;
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Motivo requerido';end if;
  if op='agreement_unshare' then
   update private.care_family_agreements set share_patient=false,version=version+1,updated_by=auth.uid(),updated_at=now() where id=rid;
  elsif op='agreement' then
   if nullif(p->>'due_at','') is null or not isfinite((p->>'due_at')::timestamptz) or length(btrim(coalesce(p->>'title',''))) not between 3 and 160 or length(btrim(coalesce(p->>'responsible',''))) not between 2 and 80 or length(coalesce(p->>'patient_body',''))>300 or coalesce((p->>'share_patient')::boolean,false) and (not coalesce((p->>'confirm_publish')::boolean,false) or length(btrim(coalesce(p->>'patient_body','')))<3) then raise exception 'Revisa acuerdo, responsable, fecha y publicación';end if;
   if ag.id is null then insert into private.care_family_agreements(id,record_id,source_revision,patient_id,title,responsible,due_at,share_patient,patient_body,created_by,updated_by)values(rid,src,f.revision,pid,btrim(p->>'title'),btrim(p->>'responsible'),(p->>'due_at')::timestamptz,coalesce((p->>'share_patient')::boolean,false),coalesce(p->>'patient_body',''),auth.uid(),auth.uid());
   else update private.care_family_agreements set title=btrim(p->>'title'),responsible=btrim(p->>'responsible'),due_at=(p->>'due_at')::timestamptz,share_patient=coalesce((p->>'share_patient')::boolean,false),patient_body=coalesce(p->>'patient_body',''),version=version+1,updated_by=auth.uid(),updated_at=now() where id=rid;end if;
  else
   if op='agreement_complete' and length(btrim(coalesce(p->>'result','')))<3 then raise exception 'Resultado requerido';end if;
   update private.care_family_agreements set state=case when op='agreement_complete' then 'completed' else 'cancelled' end,result=coalesce(p->>'result',''),completed_at=case when op='agreement_complete' then now() end,version=version+1,updated_by=auth.uid(),updated_at=now() where id=rid;
  end if;
  insert into private.care_family_agreement_history(agreement_id,snapshot,reason,actor_id)select rid,to_jsonb(x),btrim(p->>'reason'),auth.uid() from private.care_family_agreements x where id=rid;
 else raise exception 'Acción no disponible';end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.recovery_family.'||op,rid);return rid;
end $$;
create function public.care_recovery_write(op text,p jsonb)returns uuid language sql security invoker set search_path='' as $$select private.care_recovery_write(op,p)$$;

create function private.care_recovery_rubrics()returns jsonb language plpgsql security definer set search_path='' as $$
begin if not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;return coalesce((select jsonb_agg(to_jsonb(r) order by r.family_id,r.version desc)from public.care_recovery_rubrics r where r.state<>'draft' or private.care_can('care.decisions.manage')),'[]'::jsonb);end $$;
create function public.care_recovery_rubrics()returns jsonb language sql security invoker set search_path='' as $$select private.care_recovery_rubrics()$$;

create function private.care_autonomy_read(oid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.care_autonomy_observations;writer boolean;
begin select * into a from public.care_autonomy_observations where id=oid;writer:=a.author_id=auth.uid() and private.care_scope(a.patient_id,'care.records.create') and exists(select 1 from public.care_assignments ca where ca.patient_id=a.patient_id and ca.professional_id=auth.uid() and ca.specialty='recovery' and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()));
 if a.id is null or not private.care_scope(a.patient_id,'care.patient.read') or not(writer or a.status='final' and private.care_scope(a.patient_id,'care.records.read'))then raise exception 'Recurso no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.autonomy.read',oid);
 return jsonb_build_object('observation',to_jsonb(a),'can_write',writer,'rubric',(select to_jsonb(r)from public.care_recovery_rubrics r where r.id=a.rubric_id),'draft',case when writer then (select to_jsonb(d) from private.care_autonomy_drafts d where observation_id=oid)end,'versions',coalesce((select jsonb_agg(to_jsonb(v)order by v.revision desc)from private.care_autonomy_versions v where v.observation_id=oid),'[]'::jsonb));end $$;
create function public.care_autonomy_read(oid uuid)returns jsonb language sql security invoker set search_path='' as $$select private.care_autonomy_read(oid)$$;

create function private.care_recovery_start(pid uuid,period text)returns timestamptz language plpgsql stable security definer set search_path='' as $$
begin if period is null or period not in ('7','30','90','episode')then raise exception 'Periodo inválido';end if; if period='episode' then return(select started_at from public.care_episodes e where e.patient_id=pid and e.started_at<=now()order by started_at desc limit 1);end if;return private.care_dashboard_start(period::integer,now());end $$;
create function private.care_autonomy_list(pid uuid,period text default '30',page integer default 1)returns jsonb language plpgsql security definer set search_path='' as $$
declare start_at timestamptz;result jsonb;series jsonb;total bigint;
begin if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read') or page is null or page<1 or page>10000 then raise exception 'Recurso no disponible' using errcode='42501';end if;start_at:=private.care_recovery_start(pid,period);
 with rows as materialized(select a.* from public.care_autonomy_observations a where a.patient_id=pid and (a.status='final' or a.author_id=auth.uid() and private.care_scope(pid,'care.records.create')) and a.occurred_at>=start_at and a.occurred_at<=now()),paged as(select * from rows order by occurred_at desc,id offset(page-1)*25 limit 25)select(select count(*)from rows),coalesce((select jsonb_agg(to_jsonb(paged))from paged),'[]'::jsonb)into total,result;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'dimension',a.dimension,'rubric_id',a.rubric_id,'author_id',a.author_id,'occurred_at',v.occurred_at,'revision',v.revision,'status',v.payload->>'status','level',v.payload->>'level')order by v.occurred_at,a.id),'[]'::jsonb)into series from public.care_autonomy_observations a join lateral(select v.* from private.care_autonomy_versions v where v.observation_id=a.id order by v.revision desc limit 1)v on true where a.patient_id=pid and a.status='final' and v.occurred_at>=start_at and v.occurred_at<=now();
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.autonomy.list',pid);
 return jsonb_build_object('start_at',start_at,'cutoff',now(),'total',total,'rows',result,'series',series);end $$;
create function public.care_autonomy_list(pid uuid,period text default '30',page integer default 1)returns jsonb language sql security invoker set search_path='' as $$select private.care_autonomy_list(pid,period,page)$$;

create function private.care_family_read(rid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.care_family_records;writer boolean;versions jsonb;
begin select * into f from public.care_family_records where id=rid;writer:=f.author_id=auth.uid() and private.care_scope(f.patient_id,'care.records.create');
 if f.id is null or not private.care_scope(f.patient_id,'care.records.read') or not private.care_scope(f.patient_id,'care.patient.read') or not private.care_scope(f.patient_id,'care.family.read') or not(writer or f.status='final' and private.care_scope(f.patient_id,'care.records.read'))then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('reserved_note',case when writer or exists(select 1 from private.care_note_readers g where g.note_id=v.reserved_note_id and g.kind='family' and g.user_id=auth.uid())then (select n.body from private.care_family_notes n where n.id=v.reserved_note_id)end)order by v.revision desc),'[]'::jsonb)into versions from private.care_family_versions v where v.record_id=rid;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.family.read',rid);
 return jsonb_build_object('record',to_jsonb(f),'can_write',writer,'draft',case when writer then (select to_jsonb(d)from private.care_family_drafts d where d.record_id=rid)end,'versions',versions,'eligible_readers',case when writer then coalesce((select jsonb_agg(distinct ca.professional_id)from public.care_assignments ca join public.admin_users u on u.user_id=ca.professional_id and u.is_active join public.care_staff_capabilities c on c.user_id=u.user_id where ca.patient_id=f.patient_id and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now()) and c.capabilities @> array['care.patient.read','care.records.read','care.family.read']),'[]'::jsonb)else '[]'::jsonb end,'readers',case when writer then coalesce((select jsonb_agg(jsonb_build_object('note_id',g.note_id,'user_id',g.user_id))from private.care_note_readers g join private.care_family_versions v on v.reserved_note_id=g.note_id where v.record_id=rid and g.kind='family'),'[]'::jsonb)else '[]'::jsonb end,'agreements',coalesce((select jsonb_agg(to_jsonb(ag)||jsonb_build_object('history',(select jsonb_agg(to_jsonb(h)order by h.id desc)from private.care_family_agreement_history h where h.agreement_id=ag.id))order by ag.due_at,ag.id)from private.care_family_agreements ag where ag.record_id=rid),'[]'::jsonb));end $$;
create function public.care_family_read(rid uuid)returns jsonb language sql security invoker set search_path='' as $$select private.care_family_read(rid)$$;
create function private.care_family_list(pid uuid,period text default '30',page integer default 1)returns jsonb language plpgsql security definer set search_path='' as $$
declare start_at timestamptz;result jsonb;total bigint;expected bigint;performed bigint;finalized bigint;source_rows jsonb;due bigint;completed bigint;events jsonb;
begin if not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.family.read') or not private.care_scope(pid,'care.records.read') or page is null or page<1 or page>10000 then raise exception 'Recurso no disponible' using errcode='42501';end if;start_at:=private.care_recovery_start(pid,period);
 with rows as materialized(select r.* from public.care_family_records r where r.patient_id=pid and (r.status='final' or r.author_id=auth.uid() and private.care_scope(pid,'care.records.create')) and r.occurred_at>=start_at and r.occurred_at<=now()),paged as(select * from rows order by occurred_at desc,id offset(page-1)*25 limit 25)select(select count(*)from rows),coalesce((select jsonb_agg(to_jsonb(paged))from paged),'[]'::jsonb)into total,result;
 select count(*),count(*)filter(where e.status='completed' and e.closed_at<=now()),count(*)filter(where e.status='completed' and e.closed_at<=now() and exists(select 1 from public.care_family_records r where r.patient_id=pid and r.event_id=e.id and r.status='final'))into expected,performed,finalized from public.care_events e join public.care_event_participants t on t.event_id=e.id and t.patient_id=pid where e.kind='family' and e.status<>'cancelled' and e.ends_at<=now() and e.starts_at>=start_at and e.starts_at<now();
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)into source_rows from(select e.id,e.title,e.starts_at,e.status from public.care_events e join public.care_event_participants t on t.event_id=e.id and t.patient_id=pid where e.kind='family' and e.status<>'cancelled' and e.ends_at<=now() and e.starts_at>=start_at and e.starts_at<now() order by e.starts_at desc,e.id offset(page-1)*25 limit 25)x;
 select count(*),count(*)filter(where ag.state='completed')into due,completed from private.care_family_agreements ag where ag.patient_id=pid and ag.state<>'cancelled' and ag.due_at>=start_at and ag.due_at<now();
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'starts_at',x.starts_at)),'[]'::jsonb)into events from(select e.* from public.care_events e join public.care_event_participants t on t.event_id=e.id and t.patient_id=pid where e.kind='family' and e.professional_id=auth.uid() and e.status='completed' and e.ends_at<=now() order by e.starts_at desc limit 25)x;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.family.list',pid);
 return jsonb_build_object('start_at',start_at,'cutoff',now(),'total',total,'rows',result,'sessions',jsonb_build_object('expected',expected,'performed',performed,'finalized',finalized),'agreements',jsonb_build_object('due',due,'completed',completed),'events',events,'sources',source_rows);end $$;
create function public.care_family_list(pid uuid,period text default '30',page integer default 1)returns jsonb language sql security invoker set search_path='' as $$select private.care_family_list(pid,period,page)$$;

create function private.care_family_shared(pid uuid,page integer default 1)returns jsonb language plpgsql security definer set search_path='' as $$
declare rows jsonb;total bigint;
begin if not private.care_self(pid) or page is null or page<1 or page>10000 then raise exception 'Recurso no disponible' using errcode='42501';end if;
 with src as materialized(select a.id,a.patient_body,a.due_at,a.state,a.completed_at,a.updated_at from private.care_family_agreements a join public.care_family_records r on r.id=a.record_id and r.status='final' where a.patient_id=pid and a.share_patient),paged as(select * from src order by due_at,id offset(page-1)*25 limit 25)select(select count(*)from src),coalesce((select jsonb_agg(to_jsonb(paged))from paged),'[]'::jsonb)into total,rows;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.family.shared',pid);return jsonb_build_object('total',total,'rows',rows);end $$;
create function public.care_family_shared(pid uuid,page integer default 1)returns jsonb language sql security invoker set search_path='' as $$select private.care_family_shared(pid,page)$$;
revoke all on function private.care_recovery_write(text,jsonb),public.care_recovery_write(text,jsonb),private.care_recovery_rubrics(),public.care_recovery_rubrics(),private.care_autonomy_read(uuid),public.care_autonomy_read(uuid),private.care_recovery_start(uuid,text),private.care_autonomy_list(uuid,text,integer),public.care_autonomy_list(uuid,text,integer),private.care_family_read(uuid),public.care_family_read(uuid),private.care_family_list(uuid,text,integer),public.care_family_list(uuid,text,integer),private.care_family_shared(uuid,integer),public.care_family_shared(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.care_recovery_write(text,jsonb),public.care_recovery_write(text,jsonb),private.care_recovery_rubrics(),public.care_recovery_rubrics(),private.care_autonomy_read(uuid),public.care_autonomy_read(uuid),private.care_autonomy_list(uuid,text,integer),public.care_autonomy_list(uuid,text,integer),private.care_family_read(uuid),public.care_family_read(uuid),private.care_family_list(uuid,text,integer),public.care_family_list(uuid,text,integer),private.care_family_shared(uuid,integer),public.care_family_shared(uuid,integer) to authenticated;
commit;
