-- RC-02 verified diagnostic: avoid conflict between row variable and SQL alias.
begin;
create or replace function private.care_rc_govern(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
 insert into private.care_recovery_governance_history(rubric_id,snapshot,actor_id,reason)select rid,to_jsonb(cfg)||jsonb_build_object('participants',(select coalesce(jsonb_agg(patient_id),'[]'::jsonb) from private.care_recovery_pilot_patients where rubric_id=rid)),auth.uid(),op||': '||ref from public.care_recovery_rubrics cfg where cfg.id=rid;
 return rid;
end $$;
commit;
