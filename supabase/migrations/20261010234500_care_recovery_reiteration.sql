-- RC-04: opt-in operational rule in the existing scheduler/alert engine.
begin;
alter table private.care_operational_rules drop constraint care_operational_rules_kind_check;
alter table private.care_operational_rules add constraint care_operational_rules_kind_check check(kind in('report_omitted','commitment_overdue','recovery_repeated_unfulfilled'));
alter table private.care_operational_rules add column threshold integer check(threshold between 1 and 100);
alter table private.care_operational_rules add column window_days integer check(window_days between 1 and 365);
alter table private.care_operational_rules add column exclusions text check(length(exclusions)<=600);
alter table private.care_operational_rules add column excluded_commitments uuid[];
alter table private.care_operational_rules add column recipient_id uuid references auth.users(id);
alter table private.care_operational_rules add column review_at timestamptz;
alter table private.care_operational_rules add constraint care_rc_rule_activation check(kind<>'recovery_repeated_unfulfilled' or not enabled or(threshold is not null and window_days is not null and length(btrim(exclusions))>=3 and exclusions is not null and excluded_commitments is not null and recipient_id is not null and review_at is not null and isfinite(review_at)));
create index care_rc_rule_recipient on private.care_operational_rules(recipient_id);
alter table public.care_alerts drop constraint care_alerts_kind_check;
alter table public.care_alerts add constraint care_alerts_kind_check check(kind in('report_omitted','commitment_overdue','recovery_repeated_unfulfilled'));
create table private.care_recovery_alert_evidence (
 alert_id uuid primary key references public.care_alerts(id), recipient_id uuid not null references auth.users(id),
 rule_snapshot jsonb not null, sources jsonb not null, recorded_at timestamptz not null default now()
);
create index care_rc_alert_recipient on private.care_recovery_alert_evidence(recipient_id);
alter table private.care_recovery_alert_evidence enable row level security;
revoke all on private.care_recovery_alert_evidence from public,anon,authenticated,service_role;

alter function private.care_job_write(text,jsonb) rename to care_job_previous_write;
revoke all on function private.care_job_previous_write(text,jsonb)from public,anon,authenticated,service_role;
create function private.care_job_write(op text,p jsonb)returns uuid language plpgsql security definer set search_path=''as $$
declare pid uuid:=(p->>'patient_id')::uuid;prior uuid;result uuid;enabled boolean:=(p->>'enabled')::boolean;
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
create or replace function public.care_job_write(op text,p jsonb)returns uuid language sql security invoker set search_path=''as $$select private.care_job_write(op,p)$$;
revoke all on function private.care_job_write(text,jsonb)from public,anon,authenticated,service_role;
grant execute on function private.care_job_write(text,jsonb)to authenticated;

alter function private.care_operational_sync(uuid[])rename to care_operational_previous_sync;
revoke all on function private.care_operational_previous_sync(uuid[])from public,anon,authenticated,service_role;
create function private.care_operational_sync(patients uuid[])returns integer language plpgsql security definer set search_path=''as $$
declare added integer:=private.care_operational_previous_sync(patients);r private.care_operational_rules;sources jsonb;aid uuid;
begin
 for r in select x.*from (select distinct on(patient_id)z.*from private.care_operational_rules z where kind='recovery_repeated_unfulfilled'order by patient_id,revision desc)x join private.care_dashboard_scope()s on s.pid=x.patient_id
 where x.enabled and x.review_at>now()and(patients is null or x.patient_id=any(patients))loop
  if not private.care_delegate_eligible(r.patient_id,r.recipient_id,true)or not exists(select 1 from public.care_staff_capabilities where user_id=r.recipient_id and capabilities@>array['care.alerts.review'])then continue;end if;
  select coalesce(jsonb_agg(jsonb_build_object('commitment_id',c.id,'title',c.title,'review_id',v.id,'revision',v.version,'recorded_at',v.recorded_at,'actor_id',v.actor_id,'evidence',v.evidence,'result',v.result)order by c.id),'[]'::jsonb)into sources
  from public.care_commitments c join lateral(select *from private.care_recovery_commitment_reviews where commitment_id=c.id order by version desc limit 1)v on true
  where c.patient_id=r.patient_id and c.status<>'cancelled'and c.source_record_id is not null and v.outcome='unfulfilled'and v.recorded_at>=now()-make_interval(days=>r.window_days)and v.recorded_at<=now()and not(c.id=any(r.excluded_commitments));
  if jsonb_array_length(sources)<r.threshold then continue;end if;
  aid:=null;
  insert into public.care_alerts(patient_id,kind,source_id,triggered_at,rule_version,operational_rule_id)values(r.patient_id,'recovery_repeated_unfulfilled',r.id,now(),r.revision,r.id)on conflict(patient_id,kind,source_id)do nothing returning id into aid;
  if aid is not null then
   insert into private.care_recovery_alert_evidence(alert_id,recipient_id,rule_snapshot,sources)values(aid,r.recipient_id,to_jsonb(r),sources);added:=added+1;
   insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.recovery.reiteration',aid);
  end if;
 end loop;return added;
end $$;
revoke all on function private.care_operational_sync(uuid[])from public,anon,authenticated,service_role;
create or replace function private.care_dashboard_sync()returns integer language sql security definer set search_path=''as $$select private.care_operational_sync(null)$$;

create function private.care_rc_alert_read(aid uuid)returns jsonb language plpgsql stable security definer set search_path=''as $$
declare a public.care_alerts;e private.care_recovery_alert_evidence;
begin
 select *into a from public.care_alerts where id=aid;
 if a.id is null or a.kind<>'recovery_repeated_unfulfilled'or not private.care_scope(a.patient_id,'care.patient.read')or not private.care_scope(a.patient_id,'care.records.read')then raise exception 'Recurso no disponible'using errcode='42501';end if;
 select *into e from private.care_recovery_alert_evidence where alert_id=aid;
 return to_jsonb(e)||jsonb_build_object('patient_id',a.patient_id,'recipient_label',(select coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1))from auth.users where id=e.recipient_id),
 'requires_review',exists(select 1 from jsonb_array_elements(e.sources)s join public.care_commitments c on c.id=(s->>'commitment_id')::uuid join lateral(select *from private.care_recovery_commitment_reviews where commitment_id=c.id order by version desc limit 1)v on true where c.status='cancelled'or v.id<>(s->>'review_id')::uuid));
end $$;
create function public.care_rc_alert_read(aid uuid)returns jsonb language sql security invoker set search_path=''as $$select private.care_rc_alert_read(aid)$$;
revoke all on function private.care_rc_alert_read(uuid),public.care_rc_alert_read(uuid)from public,anon,authenticated,service_role;
grant execute on function private.care_rc_alert_read(uuid),public.care_rc_alert_read(uuid)to authenticated;
commit;
