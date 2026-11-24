-- RC-05: no Recovery panel/expected delivery for unrelated monthly specialties.
begin;
create or replace function private.care_rc_monthly_context(rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.care_informs;pid uuid;begin
 if not private.care_inform_user_allowed(rid,auth.uid()) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 select * into i from private.care_informs where id=rid;
 if i.kind<>'monthly' or cardinality(i.patients)<>1 then return jsonb_build_object('eligible',false);end if;
 pid:=i.patients[1];
 -- Keep the extension out of unrelated specialties, while preserving historical delivered text.
 if not exists(select 1 from public.care_assignments where patient_id=pid and specialty='recovery' and starts_at<=now() and(ends_at is null or ends_at>now()))
 and not exists(select 1 from private.care_inform_versions where inform_id=rid and recovery_text is not null)
 and not exists(select 1 from public.care_session_records where patient_id=pid and specialty='recovery'and status='final'and occurred_at>=i.start_at and occurred_at<i.end_at)
 and not exists(select 1 from public.care_recovery_weeks where patient_id=pid and status='final'and week_start>=i.start_day and week_start<i.end_day)
 then return jsonb_build_object('eligible',false);end if;
 return jsonb_build_object('eligible',true,'patient_id',pid,'can_write',i.created_by=auth.uid() and private.care_rc_writer(pid),
 'can_review',private.care_direction(pid),'recipients',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)))order by u.id)
 from auth.users u where private.care_delegate_eligible(pid,u.id,true) and private.care_inform_user_allowed(rid,u.id)),'[]'::jsonb));
end $$;
commit;
