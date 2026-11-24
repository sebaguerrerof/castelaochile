-- RC-04: actual communication, distinct from request creation/receipt.
begin;
create table private.care_intervention_communications (
 id uuid not null, revision integer not null check(revision>0), request_id uuid not null references public.care_intervention_requests(id),
 channel text not null check(length(btrim(channel)) between 3 and 100), occurred_at timestamptz not null check(isfinite(occurred_at)),
 recipient_id uuid not null references auth.users(id), actor_id uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(), reason text not null check(length(btrim(reason)) between 3 and 300),
 primary key(id,revision)
);
create index care_communication_request on private.care_intervention_communications(request_id,recorded_at desc);
create index care_communication_recipient on private.care_intervention_communications(recipient_id);
create index care_communication_actor on private.care_intervention_communications(actor_id);
alter table private.care_intervention_communications enable row level security;
revoke all on private.care_intervention_communications from public,anon,authenticated,service_role;

create function private.care_rc_communication_context(req uuid)returns jsonb language plpgsql stable security definer set search_path=''as $$
declare r public.care_intervention_requests;result jsonb;
begin
 select * into r from public.care_intervention_requests where id=req;
 if r.id is null or not private.care_record_allowed(r.record_id) or not private.care_scope(r.patient_id,'care.records.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select jsonb_build_object('can_write',private.care_rc_writer(r.patient_id),'rows',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('recipient_label',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)),'actor_label',coalesce(nullif(a.raw_user_meta_data->>'full_name',''),split_part(a.email,'@',1)))order by c.recorded_at desc,c.id,c.revision desc)from private.care_intervention_communications c join auth.users u on u.id=c.recipient_id join auth.users a on a.id=c.actor_id where c.request_id=req),'[]'::jsonb),
 'recipients',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)))order by u.id)from auth.users u join public.care_staff_capabilities c on c.user_id=u.id where (private.care_delegate_eligible(r.patient_id,u.id)or private.care_delegate_eligible(r.patient_id,u.id,true))and c.capabilities@>array['care.records.read']),'[]'::jsonb))into result;
 return result;
end $$;
create function private.care_rc_communication_write(p jsonb)returns uuid language plpgsql security definer set search_path=''as $$
declare rid uuid:=(p->>'request_id')::uuid;cid uuid:=(p->>'id')::uuid;expected integer:=(p->>'version')::integer;
 r public.care_intervention_requests;prior private.care_intervention_communications;recipient uuid:=(p->>'recipient_id')::uuid;
 channel text:=btrim(p->>'channel');why text:=btrim(p->>'reason');happened timestamptz:=(p->>'occurred_at')::timestamptz;
begin
 select * into r from public.care_intervention_requests where id=rid for share;
 if r.id is null or not private.care_rc_writer(r.patient_id)or not private.care_scope(r.patient_id,'care.records.read')or not private.care_record_allowed(r.record_id)then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if (p->>'confirm')::boolean is distinct from true or channel is null or length(channel)not between 3 and 100 or why is null or length(why)not between 3 and 300 or happened is null or not isfinite(happened)or happened>now() or cid is null or expected is null then raise exception 'Confirma comunicación realizada, canal, fecha y motivo';end if;
 if not (private.care_delegate_eligible(r.patient_id,recipient)or private.care_delegate_eligible(r.patient_id,recipient,true))or not exists(select 1 from public.care_staff_capabilities where user_id=recipient and capabilities@>array['care.records.read'])then raise exception 'Destinatario profesional no autorizado' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,92));
 select * into prior from private.care_intervention_communications where id=cid order by revision desc limit 1;
 if prior.id is not null and (prior.actor_id<>auth.uid()or prior.request_id<>rid)then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if coalesce(prior.revision,0)<>expected then raise exception 'La constancia cambió; recarga' using errcode='40001';end if;
 insert into private.care_intervention_communications(id,revision,request_id,channel,occurred_at,recipient_id,actor_id,reason)values(cid,expected+1,rid,channel,happened,recipient,auth.uid(),why);
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'care.recovery.communication',cid);
 return cid;
end $$;
create function public.care_rc_communication_context(req uuid)returns jsonb language sql security invoker set search_path=''as $$select private.care_rc_communication_context(req)$$;
create function public.care_rc_communication_write(p jsonb)returns uuid language sql security invoker set search_path=''as $$select private.care_rc_communication_write(p)$$;
revoke all on function private.care_rc_communication_context(uuid),private.care_rc_communication_write(jsonb),public.care_rc_communication_context(uuid),public.care_rc_communication_write(jsonb)from public,anon,authenticated,service_role;
grant execute on function private.care_rc_communication_context(uuid),private.care_rc_communication_write(jsonb),public.care_rc_communication_context(uuid),public.care_rc_communication_write(jsonb)to authenticated;
commit;
