-- Extend existing private report versions, without a parallel report or mail flow.
begin;
alter table private.care_inform_versions
 add column recovery_text jsonb,
 add column recovery_delivered_by uuid references auth.users(id),
 add column recovery_delivered_at timestamptz,
 add column recovery_recipient_id uuid references auth.users(id),
 add column recovery_reviewed_by uuid references auth.users(id),
 add column recovery_reviewed_at timestamptz,
 add column recovery_review_note text;
create index care_recovery_monthly_recipient on private.care_inform_versions(recovery_recipient_id,recovery_delivered_at) where recovery_delivered_at is not null;
alter function private.care_inform_sources(uuid[],timestamptz,timestamptz,timestamptz) rename to care_inform_previous_sources;
revoke all on function private.care_inform_previous_sources(uuid[],timestamptz,timestamptz,timestamptz) from public,anon,authenticated,service_role;
create function private.care_inform_sources(patients uuid[],lo timestamptz,hi timestamptz,seen timestamptz)
returns table(patient_id uuid,source_id uuid,metric text,category text,occurred_at timestamptz,label text,revision integer,body text,author_id uuid,carried boolean)
language sql stable security definer set search_path='' as $$
 select * from private.care_inform_previous_sources(patients,lo,hi,seen)
 union all select w.patient_id,w.id,'recovery_weekly',v.mode,w.week_start::timestamp at time zone 'America/Santiago',
 'ICC-REC-AUT-001 v'||r.document_version,v.revision,
 (select string_agg((select d->>'label' from jsonb_array_elements(r.dimensions)d where d->>'key'=item->>'key')||': '||
 case when item->>'status'='SE' then 'SE — Sin evaluar. Motivo: '||coalesce(item->>'se_reason','')
 else case when item->>'status'='qualitative' then 'Cualitativa sin nivel' else coalesce((select l->>'label' from jsonb_array_elements(r.dimensions)d cross join lateral jsonb_array_elements(d->'levels')l where d->>'key'=item->>'key' and l->>'key'=item->>'level'),'Nivel sin etiqueta') end
 ||'. Resultado: '||coalesce(item->>'result','')||'. Evidencia: '||coalesce(item->>'evidence','')||'. Apoyo: '||coalesce(item->>'support','')||'. Dificultades: '||coalesce(item->>'difficulties','') end,E'\n' order by n)
 from jsonb_array_elements(v.payload->'dimensions')with ordinality x(item,n)),v.actor_id,false
 from public.care_recovery_weeks w join public.care_recovery_rubrics r on r.id=w.rubric_id
 join lateral(select * from private.care_recovery_week_versions v where v.week_id=w.id and v.recorded_at<=seen order by revision desc limit 1)v on true
 where w.patient_id=any(patients) and w.week_start::timestamp at time zone 'America/Santiago'>=lo and w.week_start::timestamp at time zone 'America/Santiago'<hi
$$;
alter function private.care_inform_write(text,jsonb) rename to care_inform_previous_write;
revoke all on function private.care_inform_previous_write(text,jsonb) from public,anon,authenticated,service_role;
create function private.care_rc_monthly_context(rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.care_informs;pid uuid;begin
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into i from private.care_informs where id=rid;
 if i.kind<>'monthly' or cardinality(i.patients)<>1 then return jsonb_build_object('eligible',false);end if;
 pid:=i.patients[1];
 return jsonb_build_object('eligible',true,'patient_id',pid,'can_write',i.created_by=auth.uid() and private.care_rc_writer(pid),
 'can_review',private.care_direction(pid),'recipients',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)))order by u.id)
 from auth.users u where private.care_delegate_eligible(pid,u.id,true) and private.care_inform_user_allowed(rid,u.id)),'[]'::jsonb));
end $$;
create function public.care_rc_monthly_context(rid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_rc_monthly_context(rid) $$;
create function private.care_inform_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=nullif(p->>'id','')::uuid;i private.care_informs;v private.care_inform_versions;data jsonb:=p->'recovery_text';item jsonb;note text:=btrim(coalesce(p->>'reason',''));recipient uuid:=nullif(p->>'recipient_id','')::uuid;result uuid;
begin
 if op not in ('recovery_draft','recovery_deliver','recovery_review') then
  if op='review' then select * into v from private.care_inform_versions where inform_id=rid and revision=(p->>'version')::integer;end if;
  result:=private.care_inform_previous_write(op,p);
  if op='review' and v.recovery_text is not null then update private.care_inform_versions set recovery_text=v.recovery_text,recovery_delivered_by=v.recovery_delivered_by,recovery_delivered_at=v.recovery_delivered_at,recovery_recipient_id=v.recovery_recipient_id,recovery_reviewed_by=v.recovery_reviewed_by,recovery_reviewed_at=v.recovery_reviewed_at,recovery_review_note=v.recovery_review_note where inform_id=result and revision=v.revision+1;end if;
  return result;
 end if;
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text,91));select * into i from private.care_informs where id=rid for update;
 if i.kind<>'monthly' or cardinality(i.patients)<>1 then raise exception 'Selecciona informe mensual individual';end if;
 if i.revision is distinct from (p->>'version')::integer then raise exception 'El informe cambió' using errcode='40001';end if;
 select * into v from private.care_inform_versions where inform_id=rid and revision=i.revision;
 if length(note) not between 3 and 600 then raise exception 'Registra motivo o evidencia';end if;
 if op='recovery_draft' then
  if i.created_by<>auth.uid() or not private.care_rc_writer(i.patients[1]) then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if jsonb_typeof(data) is distinct from 'object' or (select array_agg(k order by k)from jsonb_object_keys(data)k) is distinct from array['advances','changes','coverage','difficulties','next_goals','support'] then raise exception 'Resumen mensual incompleto';end if;
  if exists(select 1 from jsonb_each(data)e where e.key<>'changes' and (jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>600)) then raise exception 'Texto breve de hasta 600 caracteres';end if;
  if jsonb_typeof(data->'changes') is distinct from 'object' or (select array_agg(k order by k)from jsonb_object_keys(data->'changes')k) is distinct from (select array_agg(d->>'key' order by d->>'key')from public.care_recovery_rubrics r cross join lateral jsonb_array_elements(r.dimensions)d where r.id='c0000000-0000-4000-8000-000000000001') or exists(select 1 from jsonb_each(data->'changes')e where jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>600) then raise exception 'Ocho dimensiones, sin conclusiones automáticas';end if;
  insert into private.care_inform_versions(inform_id,revision,snapshot,state,generated_by,generated_at,reason,recovery_text)values(rid,i.revision+1,v.snapshot,'generated',auth.uid(),v.generated_at,note,data);
 elsif op='recovery_deliver' then
  if i.created_by<>auth.uid() or not private.care_rc_writer(i.patients[1]) then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if not coalesce((p->>'confirm')::boolean,false) or v.recovery_text is null or v.recovery_delivered_at is not null then raise exception 'Confirma entregar un resumen editado aún no entregado';end if;
  if exists(select 1 from jsonb_each(v.recovery_text)e where e.key<>'changes' and length(btrim(e.value#>>'{}'))<3) or exists(select 1 from jsonb_each(v.recovery_text->'changes')e where length(btrim(e.value#>>'{}'))<3) then raise exception 'Completa el resumen o constancias de información insuficiente';end if;
  if not private.care_delegate_eligible(i.patients[1],recipient,true) or not private.care_inform_user_allowed(rid,recipient) then raise exception 'Destinatario de Dirección no autorizado' using errcode='42501';end if;
  insert into private.care_inform_versions(inform_id,revision,snapshot,state,generated_by,generated_at,reason,recovery_text,recovery_delivered_by,recovery_delivered_at,recovery_recipient_id)values(rid,i.revision+1,v.snapshot,'generated',v.generated_by,v.generated_at,note,v.recovery_text,auth.uid(),now(),recipient);
 else
  if not private.care_direction(i.patients[1]) or v.recovery_delivered_at is null then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if not coalesce((p->>'confirm')::boolean,false) or v.recovery_reviewed_at is not null then raise exception 'Confirma revisión humana de esta entrega';end if;
  insert into private.care_inform_versions(inform_id,revision,snapshot,state,generated_by,generated_at,reason,reviewed_by,reviewed_at,review_note,recovery_text,recovery_delivered_by,recovery_delivered_at,recovery_recipient_id,recovery_reviewed_by,recovery_reviewed_at,recovery_review_note)
  values(rid,i.revision+1,v.snapshot,'reviewed',v.generated_by,v.generated_at,note,auth.uid(),now(),note,v.recovery_text,v.recovery_delivered_by,v.recovery_delivered_at,v.recovery_recipient_id,auth.uid(),now(),note);
 end if;
 update private.care_informs set revision=revision+1 where id=rid;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'inform_'||op,rid);return rid;
end $$;
create or replace function public.care_inform_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_inform_write(op,p) $$;
create or replace function private.care_inform_list(page integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare total integer;rows jsonb;begin
 if not private.care_can('care.reports.export') or not private.care_can('care.patient.read') or not private.care_can('care.records.read') or not private.care_can('care.directory.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>1000 then raise exception 'Página inválida';end if;
 select count(*)into total from private.care_informs i where private.care_inform_user_allowed(i.id,auth.uid());
 select coalesce(jsonb_agg(to_jsonb(x)),'[]')into rows from(select i.id,i.kind,i.start_day,i.end_day,i.revision,v.state,cardinality(i.patients)population,
 v.recovery_delivered_at,v.recovery_reviewed_at,v.recovery_recipient_id=auth.uid() as recovery_assigned_review
 from private.care_informs i join private.care_inform_versions v on v.inform_id=i.id and v.revision=i.revision
 where private.care_inform_user_allowed(i.id,auth.uid()) order by (v.recovery_recipient_id=auth.uid() and v.recovery_delivered_at is not null and v.recovery_reviewed_at is null) desc nulls last,i.created_at desc,i.id limit 25 offset(page-1)*25)x;
 return jsonb_build_object('total',total,'rows',rows);
end $$;
revoke all on function private.care_inform_sources(uuid[],timestamptz,timestamptz,timestamptz),private.care_rc_monthly_context(uuid),public.care_rc_monthly_context(uuid),private.care_inform_write(text,jsonb),public.care_inform_write(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.care_rc_monthly_context(uuid),public.care_rc_monthly_context(uuid),private.care_inform_write(text,jsonb),public.care_inform_write(text,jsonb) to authenticated;
commit;
