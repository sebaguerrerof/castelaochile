-- Preserve optional individual scope for existing jobs.
begin;
create or replace function private.care_job_write(op text,p jsonb)returns uuid language plpgsql security definer set search_path=''as $$
declare pid uuid:=nullif(p->>'patient_id','')::uuid;prior uuid;result uuid;enabled boolean:=(p->>'enabled')::boolean;
 why text:=btrim(p->>'reason');exclusions text:=btrim(p->>'exclusions');excluded uuid[];recipient uuid:=nullif(p->>'recipient_id','')::uuid;
 threshold integer:=nullif(p->>'threshold','')::integer;window_days integer:=nullif(p->>'window_days','')::integer;review timestamptz:=nullif(p->>'review_at','')::timestamptz;
begin
 if op<>'recovery_rule' then return private.care_job_previous_write(op,p);end if;
 if not private.care_job_can()or not private.care_can('care.alerts.review')or pid is null or not private.care_direction(pid)then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if enabled is null or (p->>'confirm')::boolean is distinct from true or why is null or length(why)not between 3 and 600 then raise exception 'Confirma la regla y su referencia de validación';end if;
 if jsonb_typeof(p->'excluded_commitments')is distinct from 'array' then raise exception 'Declara exclusiones explícitas';end if;
 select coalesce(array_agg(x::uuid),'{}'::uuid[])into excluded from jsonb_array_elements_text(p->'excluded_commitments')x;
 if cardinality(excluded)>100 or exists(select 1 from unnest(excluded)id where not exists(select 1 from public.care_commitments c where c.id=id and c.patient_id=pid))then raise exception 'Exclusión de otro paciente o fuera de límites';end if;
 if recipient is not null and(not private.care_delegate_eligible(pid,recipient,true)or not exists(select 1 from public.care_staff_capabilities where user_id=recipient and capabilities@>array['care.alerts.review']))then raise exception 'Destinatario de Dirección no autorizado' using errcode='42501';end if;
 if enabled and(threshold is null or window_days is null or exclusions is null or length(exclusions)<3 or recipient is null or review is null or review<=now()or not isfinite(review))then raise exception 'Define umbral, ventana, exclusiones, destinatario y revisión futura antes de activar';end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text||'recovery_repeated_unfulfilled',101));
 select id into prior from private.care_operational_rules where patient_id=pid and kind='recovery_repeated_unfulfilled'order by revision desc limit 1;
 if prior is distinct from nullif(p->>'previous','')::uuid then raise exception 'La regla cambió; recarga' using errcode='40001';end if;
 insert into private.care_operational_rules(patient_id,kind,enabled,grace_hours,approved_by,reason,threshold,window_days,exclusions,excluded_commitments,recipient_id,review_at)values(pid,'recovery_repeated_unfulfilled',enabled,0,auth.uid(),why,threshold,window_days,exclusions,excluded,recipient,review)returning id into result;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.recovery.rule.version',result);return result;
end $$;
commit;
