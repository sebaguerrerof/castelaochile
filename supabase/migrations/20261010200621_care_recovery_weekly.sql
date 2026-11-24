-- RC-02 additive extension of the existing rubric registry, not a second instrument registry.
begin;
alter table public.care_recovery_rubrics
 add column document_code text,
 add column document_version text,
 add column source_reference text,
 add column governance_state text check(governance_state in ('proposal','pilot','approved','retired')),
 add column effective_from date,
 add column pilot_start date,
 add column pilot_end date,
 add column criteria_enabled boolean not null default false,
 add column criteria_reference text;
alter table public.care_recovery_rubrics alter column created_by drop not null;
alter table public.care_recovery_rubrics add constraint care_rubric_document_import check(created_by is not null or coalesce(document_code='ICC-REC-AUT-001' and source_reference is not null,false));
create unique index care_rubric_document_version on public.care_recovery_rubrics(document_code,document_version) where document_code is not null;
create table private.care_recovery_pilot_patients(rubric_id uuid not null references public.care_recovery_rubrics(id),patient_id uuid not null references public.patient_profiles(id),primary key(rubric_id,patient_id));
create index care_rc_pilot_patient on private.care_recovery_pilot_patients(patient_id);
create table private.care_recovery_governance_history(id bigint generated always as identity primary key,rubric_id uuid not null references public.care_recovery_rubrics(id),snapshot jsonb not null,actor_id uuid references auth.users(id),reason text not null,recorded_at timestamptz not null default now());
create index care_rc_governance_parent on private.care_recovery_governance_history(rubric_id,id);
create index care_rc_governance_actor on private.care_recovery_governance_history(actor_id);
create table public.care_recovery_weeks(
 id uuid primary key,patient_id uuid not null references public.patient_profiles(id),week_start date not null check(extract(isodow from week_start)=1),rubric_id uuid not null references public.care_recovery_rubrics(id),
 author_id uuid not null references auth.users(id),status text not null default 'draft' check(status in ('draft','final')),version integer not null default 1,revision integer not null default 0,
 evaluated_at timestamptz not null,occurred_at timestamptz not null,mode text not null check(mode in ('proposal','pilot','approved')),created_at timestamptz not null default now(),
 unique(patient_id,week_start,rubric_id));
create index care_rc_weeks_rubric on public.care_recovery_weeks(rubric_id);
create index care_rc_weeks_author on public.care_recovery_weeks(author_id);
create table private.care_recovery_week_drafts(week_id uuid primary key references public.care_recovery_weeks(id),payload jsonb not null,evaluated_at timestamptz not null,occurred_at timestamptz not null,saved_at timestamptz not null default now());
create table private.care_recovery_week_versions(week_id uuid not null references public.care_recovery_weeks(id),revision integer not null,payload jsonb not null,source_snapshots jsonb not null,evaluated_at timestamptz not null,occurred_at timestamptz not null,mode text not null,actor_id uuid not null references auth.users(id),reason text not null,recorded_at timestamptz not null default now(),primary key(week_id,revision));
create index care_rc_week_version_actor on private.care_recovery_week_versions(actor_id);
-- A human decision keeps its original four-week snapshot. Amendments only flag review.
create table private.care_recovery_validations(id uuid primary key,patient_id uuid not null references public.patient_profiles(id),rubric_id uuid not null references public.care_recovery_rubrics(id),window_end date not null,decision text not null check(decision in ('validated','rejected','correction_requested')),evidence_snapshot jsonb not null,actor_id uuid not null references auth.users(id),reason text not null,recorded_at timestamptz not null default now(),requires_review boolean not null default false);
create index care_rc_validation_patient on private.care_recovery_validations(patient_id,window_end);
create index care_rc_validation_rubric on private.care_recovery_validations(rubric_id);
create index care_rc_validation_actor on private.care_recovery_validations(actor_id);
alter table private.care_recovery_pilot_patients enable row level security;
alter table private.care_recovery_governance_history enable row level security;
alter table public.care_recovery_weeks enable row level security;
alter table private.care_recovery_week_drafts enable row level security;
alter table private.care_recovery_week_versions enable row level security;
alter table private.care_recovery_validations enable row level security;
revoke all on private.care_recovery_pilot_patients,private.care_recovery_governance_history,public.care_recovery_weeks,private.care_recovery_week_drafts,private.care_recovery_week_versions,private.care_recovery_validations from public,anon,authenticated,service_role;
grant select on public.care_recovery_weeks to authenticated;
create policy care_rc_weeks_read on public.care_recovery_weeks for select to authenticated using(private.care_scope(patient_id,'care.records.read') and (status='final' or author_id=auth.uid()));
insert into public.care_recovery_rubrics(id,family_id,version,name,dimensions,ordered,created_by,document_code,document_version,source_reference,governance_state)
values('c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',1,'Autonomía funcional Recovery',$proposal$[{"key": "planificacion_personal", "label": "Planificación personal", "description": "Organiza y ejecuta una planificación semanal realista.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "cumplimiento", "label": "Cumplimiento", "description": "Cumple compromisos dentro de los plazos acordados.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "autonomia_cotidiana", "label": "Autonomía cotidiana", "description": "Resuelve obligaciones sin depender permanentemente de terceros.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "responsabilidad", "label": "Responsabilidad", "description": "Reconoce incumplimientos y realiza acciones correctivas.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "iniciativa", "label": "Iniciativa", "description": "Actúa sin esperar instrucciones para cada tarea.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "habitos_constancia", "label": "Hábitos y constancia", "description": "Sostiene orden, puntualidad y autocuidado.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "organizacion_ocupacional", "label": "Organización ocupacional", "description": "Administra obligaciones laborales, académicas o personales.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}, {"key": "coherencia_conductual", "label": "Coherencia conductual", "description": "Existe correspondencia verificable entre lo acordado y lo realizado.", "levels": [{"key": "1", "label": "Dependencia alta", "description": "No sostiene sus responsabilidades sin supervisión constante."}, {"key": "2", "label": "Autonomía inicial", "description": "Cumple parcialmente y requiere recordatorios o apoyo frecuente."}, {"key": "3", "label": "Autonomía funcional", "description": "Cumple habitualmente sus responsabilidades con apoyo ocasional."}, {"key": "4", "label": "Autonomía consolidada", "description": "Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales."}, {"key": "SE", "label": "Sin evaluar", "description": "No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero."}]}]$proposal$::jsonb,true,null,'ICC-REC-AUT-001','1.0','Panel_Recovery_Coach_para_Sebastian.docx · 10/10/2026 · propuesta documental','proposal');
insert into private.care_recovery_governance_history(rubric_id,snapshot,actor_id,reason)select id,to_jsonb(r),null,'Importación documental: propuesta pendiente, sin decisión humana' from public.care_recovery_rubrics r where id='c0000000-0000-4000-8000-000000000001';

-- Keep the original record-bound dimensions and RPC isolated from this instrument.
alter function private.care_recovery_write(text,jsonb) rename to care_recovery_legacy_write;
revoke all on function private.care_recovery_legacy_write(text,jsonb) from public,anon,authenticated,service_role;
create function private.care_recovery_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.care_recovery_rubrics where document_code is not null and (id=nullif(p->>'id','')::uuid or id=nullif(p->>'rubric_id','')::uuid or family_id=nullif(p->>'family_id','')::uuid)) then raise exception 'Utiliza la configuración y revisión semanal del instrumento documental';end if;
 return private.care_recovery_legacy_write(op,p);
end $$;
create or replace function private.care_recovery_rubrics() returns jsonb language plpgsql security definer set search_path='' as $$
begin if not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.family_id,r.version desc) from public.care_recovery_rubrics r where document_code is null and (r.state<>'draft' or private.care_can('care.decisions.manage'))),'[]'::jsonb);end $$;
create function private.care_rc_catalog() returns jsonb language plpgsql security definer set search_path='' as $$
begin if not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('participants',case when private.care_can('care.decisions.manage') then (select coalesce(jsonb_agg(patient_id),'[]'::jsonb) from private.care_recovery_pilot_patients where rubric_id=r.id) else '[]'::jsonb end,'history',case when private.care_can('care.decisions.manage') then (select coalesce(jsonb_agg(to_jsonb(h) order by h.id desc),'[]'::jsonb) from private.care_recovery_governance_history h where h.rubric_id=r.id) else '[]'::jsonb end) order by r.version desc) from public.care_recovery_rubrics r where document_code='ICC-REC-AUT-001'),'[]'::jsonb);
end $$;
create function public.care_rc_catalog() returns jsonb language sql security invoker set search_path='' as $$select private.care_rc_catalog()$$;
create function private.care_rc_govern(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.care_recovery_rubrics;rid uuid:=(p->>'id')::uuid;pid uuid;ref text:=btrim(p->>'reference');keys text[];item jsonb;
begin
 if not private.care_can('care.decisions.manage') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if op not in ('pilot','approve','criteria','retire','new_version') or coalesce(length(ref),0) not between 3 and 300 or not coalesce((p->>'confirm')::boolean,false) then raise exception 'Confirma la decisión y registra su referencia';end if;
 perform pg_advisory_xact_lock(hashtextextended('rc-govern',0));
 select * into r from public.care_recovery_rubrics where id=rid and document_code='ICC-REC-AUT-001' for update;
 if r.id is null then raise exception 'Instrumento no disponible' using errcode='42501';end if;
 if r.revision is distinct from (p->>'version')::integer then raise exception 'La configuración cambió' using errcode='40001';end if;
 if op='new_version' then
  if (p->>'document_version')!~'^[0-9]+\.[0-9]+$' or p->>'document_version'='1.0' or nullif(p->>'effective_from','') is null or jsonb_typeof(p->'dimensions')<>'array' or jsonb_array_length(p->'dimensions')<>8 then raise exception 'Nueva versión explícita con fecha y ocho dimensiones';end if;
  select array_agg(d->>'key' order by d->>'key') into keys from jsonb_array_elements(p->'dimensions')d;
  if keys<>(select array_agg(d->>'key' order by d->>'key') from jsonb_array_elements(r.dimensions)d) then raise exception 'Conserva las ocho claves documentales';end if;
  for item in select * from jsonb_array_elements(p->'dimensions') loop
   if length(btrim(item->>'label')) not between 3 and 100 or length(btrim(item->>'description')) not between 3 and 600 or jsonb_typeof(item->'levels')<>'array' or jsonb_array_length(item->'levels')<>5 then raise exception 'Dimensión y niveles incompletos';end if;
   if (select array_agg(d->>'key' order by d->>'key')from jsonb_array_elements(item->'levels')d)<>array['1','2','3','4','SE'] then raise exception 'Conserva categorías 1–4 y SE';end if;
   if exists(select 1 from jsonb_array_elements(item->'levels')d where length(btrim(d->>'label')) not between 3 and 100 or length(btrim(d->>'description')) not between 3 and 600) then raise exception 'Niveles incompletos';end if;
  end loop;
  rid:=(p->>'new_id')::uuid;
  insert into public.care_recovery_rubrics(id,family_id,version,name,dimensions,ordered,created_by,document_code,document_version,source_reference,governance_state,effective_from)
   values(rid,r.family_id,(select max(version)+1 from public.care_recovery_rubrics where family_id=r.family_id),r.name,p->'dimensions',true,auth.uid(),r.document_code,p->>'document_version',ref,'proposal',(p->>'effective_from')::date);
 elsif op='pilot' then
  if r.governance_state not in ('proposal','pilot') or (p->>'pilot_start')::date>(p->>'pilot_end')::date or jsonb_typeof(p->'participants')<>'array' or jsonb_array_length(p->'participants')=0 or nullif(p->>'pilot_start','') is null or nullif(p->>'pilot_end','') is null then raise exception 'Selecciona periodo y participantes del piloto';end if;
  delete from private.care_recovery_pilot_patients where rubric_id=rid;
  for pid in select value::text::uuid from jsonb_array_elements_text(p->'participants') loop
   if not private.care_scope(pid,'care.patient.read') then raise exception 'Participante fuera de alcance' using errcode='42501';end if;
   insert into private.care_recovery_pilot_patients values(rid,pid);
  end loop;
  update public.care_recovery_rubrics set governance_state='pilot',pilot_start=(p->>'pilot_start')::date,pilot_end=(p->>'pilot_end')::date,revision=revision+1 where id=rid;
 elsif op='approve' then
  if r.governance_state not in ('proposal','pilot') or nullif(p->>'effective_from','') is null then raise exception 'La aprobación requiere fecha efectiva y propuesta vigente';end if;
  update public.care_recovery_rubrics set state='approved',governance_state='approved',approved_by=auth.uid(),approved_at=now(),approval_reference=ref,effective_from=(p->>'effective_from')::date,revision=revision+1 where id=rid;
 elsif op='criteria' then
  if r.governance_state<>'approved' or not coalesce((p->>'confirm_window')::boolean,false) then raise exception 'Aprueba primero y confirma cuatro semanas cerradas comunes, sin mezcla de versiones ni piloto';end if;
  update public.care_recovery_rubrics set criteria_enabled=(p->>'enabled')::boolean,criteria_reference=ref,revision=revision+1 where id=rid;
 else
  update public.care_recovery_rubrics set governance_state='retired',state=case when state='approved' then 'retired' else state end,criteria_enabled=false,revision=revision+1 where id=rid;
  update private.care_recovery_validations set requires_review=true where rubric_id=rid;
 end if;
 insert into private.care_recovery_governance_history(rubric_id,snapshot,actor_id,reason)select rid,to_jsonb(r)||jsonb_build_object('participants',(select coalesce(jsonb_agg(patient_id),'[]'::jsonb) from private.care_recovery_pilot_patients where rubric_id=rid)),auth.uid(),op||': '||ref from public.care_recovery_rubrics r where id=rid;
 return rid;
end $$;
create function public.care_rc_govern(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_rc_govern(op,p)$$;
create function private.care_rc_writer(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_scope(pid,'care.records.create') and exists(select 1 from public.care_assignments where patient_id=pid and professional_id=auth.uid() and specialty in ('recovery','direction') and starts_at<=now() and (ends_at is null or ends_at>now()))$$;
create function private.care_rc_levels(pid uuid,rid uuid,wday date) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_recovery_rubrics r where r.id=rid and (r.governance_state='approved' and r.effective_from<=wday or r.governance_state='pilot' and wday>=r.pilot_start and wday+6<=r.pilot_end and (now() at time zone 'America/Santiago')::date between r.pilot_start and r.pilot_end and exists(select 1 from private.care_recovery_pilot_patients pp where pp.rubric_id=rid and pp.patient_id=pid)))$$;
create function private.care_rc_week_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare wid uuid:=(p->>'id')::uuid;pid uuid:=(p->>'patient_id')::uuid;rid uuid:=(p->>'rubric_id')::uuid;wday date:=(p->>'week_start')::date;
 w public.care_recovery_weeks;r public.care_recovery_rubrics;payload jsonb:=p->'payload';d jsonb;src uuid;final boolean:=op<>'draft';snapshots jsonb:='[]'::jsonb;current_mode text;keyset text[];evaluated timestamptz:=(p->>'evaluated_at')::timestamptz;happened timestamptz:=(p->>'occurred_at')::timestamptz;
begin
 if not private.care_rc_writer(pid) or not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if op not in ('draft','finalize','amend') or wid is null or wday is null or extract(isodow from wday)<>1 or not isfinite(wday) or evaluated is null or happened is null or not isfinite(evaluated) or not isfinite(happened) or evaluated>now() or evaluated<happened or (happened at time zone 'America/Santiago')::date not between wday and wday+6 then raise exception 'Revisa semana local, fecha del hecho y evaluación';end if;
 select * into r from public.care_recovery_rubrics where id=rid and document_code='ICC-REC-AUT-001' for share;
 if r.id is null then raise exception 'Propuesta no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text||rid::text,0));select * into w from public.care_recovery_weeks where id=wid for update;
 if w.id is not null and (w.patient_id<>pid or w.rubric_id<>rid or w.week_start<>wday or w.author_id<>auth.uid()) then raise exception 'Revisión fuera de alcance' using errcode='42501';end if;
 if coalesce(w.version,0) is distinct from (p->>'version')::integer then raise exception 'La revisión cambió' using errcode='40001';end if;
 if w.id is null and exists(select 1 from public.care_recovery_weeks where patient_id=pid and rubric_id=rid and week_start=wday) then raise exception 'Ya existe revisión de esta semana y versión' using errcode='40001';end if;
 if op='finalize' and w.status='final' or op='amend' and w.status is distinct from 'final' then raise exception 'Usa enmienda para conservar el original';end if;
 current_mode:=case when private.care_rc_levels(pid,rid,wday) then r.governance_state else 'proposal' end;
 if final and (not coalesce((p->>'confirm')::boolean,false) or op='amend' and coalesce(length(btrim(p->>'reason')),0) not between 3 and 300) then raise exception 'Confirma finalizar y motiva la enmienda';end if;
 if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'dimensions') is distinct from 'array' or jsonb_array_length(payload->'dimensions')<>8 or exists(select 1 from jsonb_object_keys(payload)k where k<>'dimensions') then raise exception 'Ocho dimensiones requeridas';end if;
 select array_agg(x->>'key' order by x->>'key') into keyset from jsonb_array_elements(payload->'dimensions')x;
 if keyset<>(select array_agg(x->>'key' order by x->>'key')from jsonb_array_elements(r.dimensions)x) then raise exception 'Dimensiones duplicadas o distintas de esta versión';end if;
 for d in select * from jsonb_array_elements(payload->'dimensions') loop
  if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'status') is distinct from 'string' or coalesce(d->>'status','') not in ('','qualitative','evaluated','SE') or jsonb_typeof(d->'commitment_ids') is distinct from 'array' or jsonb_typeof(d->'record_ids') is distinct from 'array' or jsonb_array_length(d->'commitment_ids')>20 or jsonb_array_length(d->'record_ids')>20 or jsonb_typeof(d->'evidence_sufficient') is distinct from 'boolean' or exists(select 1 from jsonb_object_keys(d)k where k not in ('key','status','level','evidence','evidence_sufficient','support','result','difficulties','commitment_ids','record_ids','next_commitment_id','se_reason')) then raise exception 'Revisa categoría y referencias';end if;
  if exists(select 1 from jsonb_each(d) e where e.key in ('evidence','support','result','difficulties','se_reason') and (jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>600)) then raise exception 'Texto demasiado largo';end if;
  if nullif(d->>'level','') is not null and (current_mode='proposal' or d->>'status'<>'evaluated' or d->>'level' not in ('1','2','3','4')) then raise exception 'Nivel manual solo con uso autorizado y categoría evaluada';end if;
  if final then
   if d->>'status'='' or d->>'status' is null or d->>'status'='SE' and (coalesce(length(btrim(d->>'se_reason')),0)<3 or nullif(d->>'level','') is not null or coalesce((d->>'evidence_sufficient')::boolean,false)) then raise exception 'SE exige motivo y no lleva nivel ni evidencia suficiente';end if;
   if d->>'status'<>'SE' then
    if exists(select 1 from unnest(array['evidence','support','result','difficulties'])k where coalesce(length(btrim(d->>k)),0)<3) or jsonb_array_length(d->'commitment_ids')+jsonb_array_length(d->'record_ids')=0 then raise exception 'Cada dimensión requiere resultado, apoyo, dificultades, evidencia y fuente enlazada';end if;
    if d->>'status'='evaluated' and (nullif(d->>'level','') is null or not coalesce((d->>'evidence_sufficient')::boolean,false)) then raise exception 'Nivel exige evidencia declarada suficiente';end if;
    if d->>'status'='qualitative' and nullif(d->>'level','') is not null then raise exception 'Cualitativo sin nivel';end if;
    if nullif(d->>'next_commitment_id','') is null then raise exception 'Enlaza siguiente compromiso y su revisión';end if;
   end if;
  end if;
  for src in select value::uuid from jsonb_array_elements_text(d->'record_ids') loop
   if not exists(select 1 from public.care_session_records sr where sr.id=src and sr.patient_id=pid and sr.specialty='recovery' and sr.status='final' and (sr.occurred_at at time zone 'America/Santiago')::date between wday and wday+6) then raise exception 'Registro fuente no corresponde a la semana o paciente' using errcode='42501';end if;
   snapshots:=snapshots||jsonb_build_array((select jsonb_build_object('kind','record','id',id,'revision',revision)from public.care_session_records where id=src));
  end loop;
  for src in select value::uuid from jsonb_array_elements_text(d->'commitment_ids') loop
   if not exists(select 1 from public.care_commitments c where c.id=src and c.patient_id=pid and c.source_record_id is not null and c.visibility='coordination') then raise exception 'Compromiso fuente no disponible' using errcode='42501';end if;
   snapshots:=snapshots||jsonb_build_array((select jsonb_build_object('kind','commitment','id',id,'version',version)from public.care_commitments where id=src));
  end loop;
  if nullif(d->>'next_commitment_id','') is not null then
   if not exists(select 1 from public.care_commitments c where c.id=(d->>'next_commitment_id')::uuid and c.patient_id=pid and c.source_record_id is not null and c.status='pending' and c.review_at is not null and c.verification_method is not null) then raise exception 'Siguiente compromiso vigente con fecha de revisión requerida' using errcode='42501';end if;
  end if;
 end loop;
 if w.id is null then insert into public.care_recovery_weeks(id,patient_id,week_start,rubric_id,author_id,evaluated_at,occurred_at,mode)values(wid,pid,wday,rid,auth.uid(),evaluated,happened,current_mode) returning * into w;
 else update public.care_recovery_weeks set version=version+1 where id=wid returning * into w;end if;
 if not final then
  insert into private.care_recovery_week_drafts(week_id,payload,evaluated_at,occurred_at)values(wid,payload,evaluated,happened)on conflict(week_id)do update set payload=excluded.payload,evaluated_at=excluded.evaluated_at,occurred_at=excluded.occurred_at,saved_at=now();
 else
  update public.care_recovery_weeks set status='final',revision=revision+1,evaluated_at=evaluated,occurred_at=happened,mode=current_mode where id=wid returning * into w;
  insert into private.care_recovery_week_versions values(wid,w.revision,payload,snapshots,evaluated,happened,current_mode,auth.uid(),coalesce(nullif(btrim(p->>'reason'),''),'Revisión original'),now());
  delete from private.care_recovery_week_drafts where week_id=wid;
  update private.care_recovery_validations set requires_review=true where patient_id=pid and rubric_id=rid and wday between window_end-21 and window_end;
 end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'recovery_week_'||op,wid);
 return wid;
end $$;
create function public.care_rc_week_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_rc_week_write(op,p)$$;
create function private.care_rc_week_read(wid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.care_recovery_weeks;begin select * into w from public.care_recovery_weeks where id=wid;
 if w.id is null or not private.care_scope(w.patient_id,'care.records.read') or w.status='draft' and w.author_id<>auth.uid() then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return jsonb_build_object('week',to_jsonb(w),'can_write',w.author_id=auth.uid() and private.care_rc_writer(w.patient_id),'draft',case when w.author_id=auth.uid() then (select to_jsonb(d) from private.care_recovery_week_drafts d where week_id=wid)end,'versions',(select coalesce(jsonb_agg(to_jsonb(v) order by revision desc),'[]'::jsonb)from private.care_recovery_week_versions v where week_id=wid),'levels_allowed',private.care_rc_levels(w.patient_id,w.rubric_id,w.week_start));
end $$;
create function public.care_rc_week_read(wid uuid) returns jsonb language sql security invoker set search_path='' as $$select private.care_rc_week_read(wid)$$;
create function private.care_rc_candidate(pid uuid,rid uuid,wend date) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.care_recovery_rubrics;w public.care_recovery_weeks;offset_week integer;d jsonb;snapshot jsonb:='[]'::jsonb;v private.care_recovery_week_versions;
begin select * into r from public.care_recovery_rubrics where id=rid;
 if r.id is null or r.governance_state<>'approved' or not r.criteria_enabled then return jsonb_build_object('eligible',false,'reason','Criterio desactivado o versión no aprobada');end if;
 if extract(isodow from wend)<>1 or wend+7>(now() at time zone 'America/Santiago')::date then return jsonb_build_object('eligible',false,'reason','Se requieren semanas cerradas');end if;
 for offset_week in 0..3 loop
  select * into w from public.care_recovery_weeks where patient_id=pid and rubric_id=rid and week_start=wend-offset_week*7 and status='final' and mode='approved';
  if w.id is null then return jsonb_build_object('eligible',false,'reason','Semana ausente, piloto o versión diferente');end if;
  select * into v from private.care_recovery_week_versions where week_id=w.id and revision=w.revision;
  for d in select * from jsonb_array_elements(v.payload->'dimensions')loop
   if d->>'status'<>'evaluated' or d->>'level' not in ('3','4') or not coalesce((d->>'evidence_sufficient')::boolean,false) then return jsonb_build_object('eligible',false,'reason','Una dimensión no alcanza nivel 3 con evidencia suficiente');end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(v.source_snapshots)s where s->>'kind'='record' and not exists(select 1 from public.care_session_records sr where sr.id=(s->>'id')::uuid and sr.revision=(s->>'revision')::integer) or s->>'kind'='commitment' and not exists(select 1 from public.care_commitments c where c.id=(s->>'id')::uuid and c.version=(s->>'version')::integer)) then return jsonb_build_object('eligible',false,'reason','Una fuente cambió; revisa la evidencia semanal');end if;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',w.id,'revision',w.revision,'week_start',w.week_start,'source_snapshots',v.source_snapshots));
 end loop;
 return jsonb_build_object('eligible',true,'reason','Evidencia candidata para revisión','weeks',snapshot,'window_end',wend,'rubric_id',rid);
end $$;
create function private.care_rc_validation_write(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid:=(p->>'patient_id')::uuid;rid uuid:=(p->>'rubric_id')::uuid;id uuid:=(p->>'id')::uuid;c jsonb;src jsonb;
begin
 if not private.care_scope(pid,'care.decisions.manage') or not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text||rid::text,0));
 perform 1 from public.care_recovery_rubrics where public.care_recovery_rubrics.id=rid for share;
 perform 1 from public.care_recovery_weeks where patient_id=pid and rubric_id=rid and week_start between (p->>'window_end')::date-21 and (p->>'window_end')::date for share;
 c:=private.care_rc_candidate(pid,rid,(p->>'window_end')::date);
 for src in select distinct s from jsonb_array_elements(coalesce(c->'weeks','[]'::jsonb))w cross join lateral jsonb_array_elements(w->'source_snapshots')s loop
  if src->>'kind'='record' then perform 1 from public.care_session_records where public.care_session_records.id=(src->>'id')::uuid for share;
  else perform 1 from public.care_commitments where public.care_commitments.id=(src->>'id')::uuid for share;end if;
 end loop;
 c:=private.care_rc_candidate(pid,rid,(p->>'window_end')::date);
 if not (c->>'eligible')::boolean or c->'weeks' is distinct from p->'weeks' or coalesce(length(btrim(p->>'reason')),0) not between 3 and 600 or p->>'decision' not in ('validated','rejected','correction_requested') or not coalesce((p->>'confirm')::boolean,false) then raise exception 'Candidatura cambió o decisión incompleta';end if;
 insert into private.care_recovery_validations(id,patient_id,rubric_id,window_end,decision,evidence_snapshot,actor_id,reason)values(id,pid,rid,(p->>'window_end')::date,p->>'decision',c,auth.uid(),btrim(p->>'reason'));
 return id;
end $$;
create function public.care_rc_validation_write(p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_rc_validation_write(p)$$;
create function private.care_rc_weeks(pid uuid,first_day date,last_day date) returns jsonb language plpgsql security definer set search_path='' as $$
declare rows jsonb;validations jsonb;begin
 if not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if first_day is null or last_day is null or first_day>last_day or last_day-first_day>366 then raise exception 'Periodo máximo de un año';end if;
 select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object('payload',v.payload,'source_snapshots',v.source_snapshots) order by w.week_start desc),'[]'::jsonb) into rows from public.care_recovery_weeks w left join private.care_recovery_week_versions v on v.week_id=w.id and v.revision=w.revision where w.patient_id=pid and w.week_start between first_day and last_day and (w.status='final' or w.author_id=auth.uid());
 select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('requires_review',d.requires_review or private.care_rc_candidate(pid,d.rubric_id,d.window_end)->'weeks' is distinct from d.evidence_snapshot->'weeks') order by d.recorded_at desc),'[]'::jsonb) into validations from private.care_recovery_validations d where d.patient_id=pid and d.window_end between first_day and last_day;
 return jsonb_build_object('rows',rows,'validations',validations,'cutoff',now());
end $$;
create function public.care_rc_weeks(pid uuid,first_day date,last_day date) returns jsonb language sql security invoker set search_path='' as $$select private.care_rc_weeks(pid,first_day,last_day)$$;
create function private.care_rc_candidate_read(pid uuid,rid uuid,wend date) returns jsonb language plpgsql security definer set search_path='' as $$
begin if not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;return private.care_rc_candidate(pid,rid,wend);end $$;
create function public.care_rc_candidate_read(pid uuid,rid uuid,wend date) returns jsonb language sql security invoker set search_path='' as $$select private.care_rc_candidate_read(pid,rid,wend)$$;
revoke all on function private.care_recovery_write(text,jsonb),public.care_recovery_write(text,jsonb),private.care_rc_catalog(),public.care_rc_catalog(),private.care_rc_govern(text,jsonb),public.care_rc_govern(text,jsonb),private.care_rc_week_write(text,jsonb),public.care_rc_week_write(text,jsonb),private.care_rc_week_read(uuid),public.care_rc_week_read(uuid),private.care_rc_validation_write(jsonb),public.care_rc_validation_write(jsonb),private.care_rc_weeks(uuid,date,date),public.care_rc_weeks(uuid,date,date),private.care_rc_candidate_read(uuid,uuid,date),public.care_rc_candidate_read(uuid,uuid,date) from public,anon,authenticated,service_role;
grant execute on function private.care_recovery_write(text,jsonb),public.care_recovery_write(text,jsonb),private.care_rc_catalog(),public.care_rc_catalog(),private.care_rc_govern(text,jsonb),public.care_rc_govern(text,jsonb),private.care_rc_week_write(text,jsonb),public.care_rc_week_write(text,jsonb),private.care_rc_week_read(uuid),public.care_rc_week_read(uuid),private.care_rc_validation_write(jsonb),public.care_rc_validation_write(jsonb),private.care_rc_weeks(uuid,date,date),public.care_rc_weeks(uuid,date,date),private.care_rc_candidate_read(uuid,uuid,date),public.care_rc_candidate_read(uuid,uuid,date) to authenticated;
revoke all on function private.care_rc_writer(uuid),private.care_rc_levels(uuid,uuid,date),private.care_rc_candidate(uuid,uuid,date) from public,anon,authenticated,service_role;
commit;
