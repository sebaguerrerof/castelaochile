-- Direction can inspect complete weekly history; professional assignments must match their profile.
begin;
create or replace function private.care_rc_week_context(pid uuid,rid uuid,wday date) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.care_recovery_weeks;begin
 if not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if wday is null or not isfinite(wday) or extract(isodow from wday)<>1 or not exists(select 1 from public.care_recovery_rubrics where id=rid and document_code='ICC-REC-AUT-001') then raise exception 'Semana o instrumento inválidos';end if;
 select * into w from public.care_recovery_weeks where patient_id=pid and rubric_id=rid and week_start=wday;
 return jsonb_build_object('levels_allowed',private.care_rc_levels(pid,rid,wday),'can_write',private.care_rc_writer(pid) and (w.id is null or w.author_id=auth.uid()) and (w.id is not null or exists(select 1 from public.care_recovery_rubrics where id=rid and governance_state<>'retired')),'blocked',w.status='draft' and w.author_id<>auth.uid() and not private.care_is_director(),'detail',case when w.id is not null and (private.care_is_director() or w.status='final' or w.author_id=auth.uid()) then private.care_rc_week_read(w.id)end,'cutoff',now());
end $$;

create or replace function private.care_rc_weeks(pid uuid,first_day date,last_day date) returns jsonb language plpgsql security definer set search_path='' as $$
declare rows jsonb;validations jsonb;begin
 if not private.care_scope(pid,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if first_day is null or last_day is null or first_day>last_day or last_day-first_day>366 then raise exception 'Periodo máximo de un año';end if;
 select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object('payload',v.payload,'source_snapshots',v.source_snapshots) order by w.week_start desc),'[]'::jsonb) into rows from public.care_recovery_weeks w left join private.care_recovery_week_versions v on v.week_id=w.id and v.revision=w.revision where w.patient_id=pid and w.week_start between first_day and last_day and (private.care_is_director() or w.status='final' or w.author_id=auth.uid());
 select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('requires_review',d.requires_review or private.care_rc_candidate(pid,d.rubric_id,d.window_end)->'weeks' is distinct from d.evidence_snapshot->'weeks') order by d.recorded_at desc),'[]'::jsonb) into validations from private.care_recovery_validations d where d.patient_id=pid and d.window_end between first_day and last_day;
 return jsonb_build_object('rows',rows,'validations',validations,'cutoff',now());
end $$;

create or replace function private.care_manage(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; pid uuid; uid uuid; effective timestamptz; old public.care_episodes; aid public.care_assignments;
  phase uuid; state text; note_author uuid; note_patient uuid; note_kind text;
begin
  if auth.uid() is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if op='assignment' and exists(select 1 from public.admin_users a where a.user_id=(p->>'professional_id')::uuid and a.role::text in ('psychologist','psychiatrist','recovery_coach') and a.role::text<>case p->>'specialty' when 'psychology' then 'psychologist' when 'psychiatry' then 'psychiatrist' when 'recovery' then 'recovery_coach' else '' end) then raise exception 'La función debe coincidir con el perfil profesional';end if;
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

create or replace function private.care_job_allowed(jid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.care_is_director() and exists(select 1 from private.care_jobs where id=jid) or private.care_job_can() and exists(select 1 from private.care_jobs j where j.id=jid and j.owner_id=auth.uid()
 and j.context_key=private.care_job_context(j.patients) and not exists(select 1 from unnest(j.patients)pid where not private.care_scope(pid,'care.patient.read') or not private.care_scope(pid,'care.records.read')))
$$;
commit;
