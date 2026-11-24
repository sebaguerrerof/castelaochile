begin;
create or replace function private.care_rc_catalog() returns jsonb language plpgsql security definer set search_path='' as $$
begin if not private.care_can('care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('participants',case when private.care_can('care.decisions.manage') then (select coalesce(jsonb_agg(patient_id),'[]'::jsonb) from private.care_recovery_pilot_patients pp where pp.rubric_id=r.id and private.care_scope(pp.patient_id,'care.patient.read')) else '[]'::jsonb end,'history',case when private.care_can('care.decisions.manage') then (select coalesce(jsonb_agg((to_jsonb(h)-'snapshot')||jsonb_build_object('snapshot',h.snapshot-'participants') order by h.id desc),'[]'::jsonb) from private.care_recovery_governance_history h where h.rubric_id=r.id) else '[]'::jsonb end) order by r.version desc) from public.care_recovery_rubrics r where document_code='ICC-REC-AUT-001'),'[]'::jsonb);
end $$;
create or replace function private.care_rc_levels(pid uuid,rid uuid,wday date) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_recovery_rubrics r where r.id=rid and (r.governance_state='approved' and r.effective_from<=wday and not exists(select 1 from public.care_recovery_rubrics newer where newer.family_id=r.family_id and newer.version>r.version and newer.governance_state='approved' and newer.effective_from<=wday) or r.governance_state='pilot' and wday>=r.pilot_start and wday+6<=r.pilot_end and (now() at time zone 'America/Santiago')::date between r.pilot_start and r.pilot_end and exists(select 1 from private.care_recovery_pilot_patients pp where pp.rubric_id=rid and pp.patient_id=pid)))$$;
create function private.care_rc_week_context(pid uuid,rid uuid,wday date) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.care_recovery_weeks;begin
 if not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if wday is null or not isfinite(wday) or extract(isodow from wday)<>1 or not exists(select 1 from public.care_recovery_rubrics where id=rid and document_code='ICC-REC-AUT-001') then raise exception 'Semana o instrumento inválidos';end if;
 select * into w from public.care_recovery_weeks where patient_id=pid and rubric_id=rid and week_start=wday;
 return jsonb_build_object('levels_allowed',private.care_rc_levels(pid,rid,wday),'can_write',private.care_rc_writer(pid) and (w.id is null or w.author_id=auth.uid()) and (w.id is not null or exists(select 1 from public.care_recovery_rubrics where id=rid and governance_state<>'retired')),'blocked',w.status='draft' and w.author_id<>auth.uid(),'detail',case when w.id is not null and (w.status='final' or w.author_id=auth.uid()) then private.care_rc_week_read(w.id)end,'cutoff',now());
end $$;
create function public.care_rc_week_context(pid uuid,rid uuid,wday date) returns jsonb language sql security invoker set search_path='' as $$select private.care_rc_week_context(pid,rid,wday)$$;
revoke all on function private.care_rc_week_context(uuid,uuid,date),public.care_rc_week_context(uuid,uuid,date) from public,anon,authenticated,service_role;
grant execute on function private.care_rc_week_context(uuid,uuid,date),public.care_rc_week_context(uuid,uuid,date) to authenticated;
create or replace function private.care_rc_week_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare wid uuid:=(p->>'id')::uuid;pid uuid:=(p->>'patient_id')::uuid;rid uuid:=(p->>'rubric_id')::uuid;wday date:=(p->>'week_start')::date;
 w public.care_recovery_weeks;r public.care_recovery_rubrics;payload jsonb:=p->'payload';d jsonb;src uuid;final boolean:=op<>'draft';snapshots jsonb:='[]'::jsonb;current_mode text;keyset text[];evaluated timestamptz:=(p->>'evaluated_at')::timestamptz;happened timestamptz:=(p->>'occurred_at')::timestamptz;
begin
 if not private.care_rc_writer(pid) or not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if op not in ('draft','finalize','amend') or wid is null or wday is null or extract(isodow from wday)<>1 or not isfinite(wday) or evaluated is null or happened is null or not isfinite(evaluated) or not isfinite(happened) or evaluated>now() or evaluated<happened or (happened at time zone 'America/Santiago')::date not between wday and wday+6 then raise exception 'Revisa semana local, fecha del hecho y evaluación';end if;
 select * into r from public.care_recovery_rubrics where id=rid and document_code='ICC-REC-AUT-001' for share;
 if r.id is null then raise exception 'Propuesta no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text||rid::text,0));select * into w from public.care_recovery_weeks where id=wid for update;
 if w.id is not null and (w.patient_id<>pid or w.rubric_id<>rid or w.week_start<>wday or w.author_id<>auth.uid()) then raise exception 'Revisión fuera de alcance' using errcode='42501';end if;
 if w.id is null and r.governance_state='retired' then raise exception 'Versión retirada para nuevas revisiones';end if;
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
   if not exists(select 1 from public.care_commitments c where c.id=src and c.patient_id=pid and c.source_record_id is not null) then raise exception 'Compromiso fuente no disponible' using errcode='42501';end if;
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
commit;
