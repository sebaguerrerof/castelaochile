begin;
create function private.care_rc_rule_options(pid uuid)returns jsonb language plpgsql stable security definer set search_path=''as $$
begin
 if not private.care_job_can()or not private.care_can('care.alerts.review')or not private.care_direction(pid)then raise exception 'Recurso no disponible'using errcode='42501';end if;
 return jsonb_build_object('recipients',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)))order by u.id)from auth.users u join public.care_staff_capabilities c on c.user_id=u.id where private.care_delegate_eligible(pid,u.id,true)and c.capabilities@>array['care.alerts.review']),'[]'::jsonb),
 'commitments',coalesce((select jsonb_agg(to_jsonb(x))from(select c.id,c.title from public.care_commitments c where c.patient_id=pid and c.source_record_id is not null order by c.created_at desc,c.id limit 100)x),'[]'::jsonb),
 'commitment_total',(select count(*)from public.care_commitments where patient_id=pid and source_record_id is not null));
end $$;
create function public.care_rc_rule_options(pid uuid)returns jsonb language sql security invoker set search_path=''as $$select private.care_rc_rule_options(pid)$$;
revoke all on function private.care_rc_rule_options(uuid),public.care_rc_rule_options(uuid)from public,anon,authenticated,service_role;
grant execute on function private.care_rc_rule_options(uuid),public.care_rc_rule_options(uuid)to authenticated;
commit;
