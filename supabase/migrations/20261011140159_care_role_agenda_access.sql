-- Role defaults are operational; Direction never needs an individual patient assignment for own agenda.
begin;
create or replace function private.care_can(cap text) returns boolean language sql stable security definer set search_path='' as $$
 select cap=any(private.care_role_capabilities('superadmin')) and exists(
   select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active and (
     cap=any(private.care_role_capabilities(a.role::text)) or exists(
       select 1 from public.care_staff_capabilities c where c.user_id=a.user_id and cap=any(c.capabilities))))
$$;
insert into public.care_staff_capabilities(user_id,capabilities)
 select user_id,private.care_role_capabilities(role::text)from public.admin_users
 where role::text in ('superadmin','psychologist','psychiatrist','recovery_coach')
 on conflict(user_id)do update set capabilities=excluded.capabilities,updated_at=now();
create or replace function private.care_supervision(days integer default 30,page integer default 1,mode text default 'tasks',professional uuid default null,state text default 'all',pid uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz:=now();start_at timestamptz:=private.care_dashboard_start(days,cutoff);team boolean;result jsonb;
begin
 if not private.care_can('care.patient.read') or not (private.care_can('care.records.create') or private.care_can('care.records.read')) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 team:=private.care_can('care.decisions.manage') and private.care_can('care.records.read');
 if professional is not null and not team and professional<>auth.uid() then raise exception 'Profesional no disponible' using errcode='42501';end if;
 if pid is not null and not private.care_scope(pid,'care.patient.read') then raise exception 'Paciente no disponible' using errcode='42501';end if;
 if page is null or page<1 or page>10000 or mode not in ('tasks','agenda','records','alerts') or state not in ('all','pending','overdue','reported','completed','cancelled','scheduled','in_progress','open','received','resolved') then raise exception 'Consulta inválida';end if;
 with scope as materialized(select p.id,p.display_name from public.patient_profiles p where private.care_scope(p.id,'care.patient.read') and (pid is null or p.id=pid)),
 people as materialized(select distinct u.user_id,coalesce(nullif(a.raw_user_meta_data->>'full_name',''),'Profesional') as label from public.admin_users u join auth.users a on a.id=u.user_id where u.is_active and (private.care_is_director(u.user_id) or exists(select 1 from public.care_assignments ca join scope s on s.id=ca.patient_id where ca.professional_id=u.user_id and ca.starts_at<=cutoff and (ca.ends_at is null or ca.ends_at>cutoff))) and (team or u.user_id=auth.uid())),
 task_rows as(select t.id source_id,t.patient_id,s.display_name,t.instruction label,t.assignee_id professional_id,u.label professional_label,t.created_at occurred_at,case when t.event_id is null then t.due_at else e.ends_at end due_at,
 t.state,t.event_id,null::text specialty,null::uuid record_id from private.care_delegated_tasks t join scope s on s.id=t.patient_id join people u on u.user_id=t.assignee_id left join public.care_events e on e.id=t.event_id and e.status<>'cancelled'
 where (team or t.assignee_id=auth.uid()) and private.care_delegate_eligible(t.patient_id,t.assignee_id,false) and (professional is null or t.assignee_id=professional) and (t.created_at>=start_at or t.state not in ('completed','cancelled'))),
 agenda_rows as(select e.id source_id,a.patient_id,s.display_name,e.title label,e.professional_id,u.label professional_label,e.starts_at occurred_at,e.ends_at due_at,e.status state,e.id event_id,null::text specialty,null::uuid record_id
 from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.id=a.patient_id join people u on u.user_id=e.professional_id where e.starts_at>=start_at and e.starts_at<cutoff+interval '7 days' and private.care_delegate_eligible(a.patient_id,e.professional_id,false) and (team or e.professional_id=auth.uid()) and (professional is null or e.professional_id=professional)),
 record_rows as(select e.id source_id,a.patient_id,s.display_name,e.title label,e.professional_id,u.label professional_label,e.ends_at occurred_at,null::timestamptz due_at,case when r.id is null then 'pending' else 'completed' end state,e.id event_id,x.specialty,r.id record_id
 from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.id=a.patient_id join people u on u.user_id=e.professional_id
 join lateral(select distinct ca.specialty from public.care_assignments ca where ca.professional_id=e.professional_id and ca.patient_id=a.patient_id and ca.starts_at<=cutoff and (ca.ends_at is null or ca.ends_at>cutoff) and private.care_delegate_eligible(a.patient_id,ca.professional_id,false) and ((e.kind in ('group','individual') and ca.specialty='psychology') or e.kind=ca.specialty) union select case when e.kind in ('group','individual') then 'psychology' else e.kind end where private.care_is_director(e.professional_id) and e.kind in ('group','individual','recovery','psychiatry'))x on true
 left join public.care_session_records r on r.patient_id=a.patient_id and r.event_id=e.id and r.author_id=e.professional_id and r.specialty=x.specialty and r.status='final'
 where e.status='completed' and e.closed_at<=cutoff and e.ends_at>=start_at and e.ends_at<=cutoff and (team or e.professional_id=auth.uid()) and (professional is null or e.professional_id=professional)
 union all select e.id,a.patient_id,s.display_name,e.title,e.professional_id,u.label,e.ends_at,null::timestamptz,case when exists(select 1 from public.care_family_records f where f.patient_id=a.patient_id and f.event_id=e.id and f.author_id=e.professional_id and f.status='final') then 'completed' else 'pending' end,e.id,'family'::text,(select f.id from public.care_family_records f where f.patient_id=a.patient_id and f.event_id=e.id and f.author_id=e.professional_id and f.status='final' limit 1)
 from public.care_events e join public.care_event_participants a on a.event_id=e.id join scope s on s.id=a.patient_id join people u on u.user_id=e.professional_id
 where e.kind='family' and e.status='completed' and e.closed_at<=cutoff and e.ends_at>=start_at and e.ends_at<=cutoff and private.care_scope(a.patient_id,'care.family.read') and private.care_delegate_eligible(a.patient_id,e.professional_id,false)
 and exists(select 1 from public.care_staff_capabilities c where c.user_id=e.professional_id and 'care.family.read'=any(c.capabilities)) and (team or e.professional_id=auth.uid()) and (professional is null or e.professional_id=professional)),
 alert_rows as(select a.id source_id,a.patient_id,s.display_name,a.kind label,auth.uid() professional_id,'Asignada a mi alcance'::text professional_label,a.triggered_at occurred_at,null::timestamptz due_at,a.state,null::uuid event_id,null::text specialty,null::uuid record_id from public.care_alerts a join scope s on s.id=a.patient_id where private.care_scope(a.patient_id,'care.records.read') and (a.triggered_at>=start_at or a.state<>'resolved') and (professional is null or private.care_is_director(professional) or exists(select 1 from public.care_assignments ca where ca.patient_id=a.patient_id and ca.professional_id=professional and ca.starts_at<=cutoff and (ca.ends_at is null or ca.ends_at>cutoff)))),
 raw as(select * from task_rows where mode='tasks' union all select * from agenda_rows where mode='agenda' union all select * from record_rows where mode='records' union all select * from alert_rows where mode='alerts'),
 marked as(select raw.*,case when raw.state in ('pending','in_progress') and raw.due_at<cutoff then 'overdue' else raw.state end category from raw),
 filtered as(select * from marked m where care_supervision.state='all' or m.category=care_supervision.state or (care_supervision.state='pending' and m.category='in_progress')),
 paged as(select * from filtered order by (category='overdue') desc,occurred_at desc,patient_id,source_id,specialty offset (page-1)*25 limit 25)
 select jsonb_build_object('cutoff',cutoff,'start_at',start_at,'team',team,'total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),
 'summary',jsonb_build_object('total',(select count(*) from marked),'pending',(select count(*) from marked where category in ('pending','in_progress','scheduled','open','received')),'overdue',(select count(*) from marked where category='overdue'),'reported',(select count(*) from marked where category='reported'),'completed',(select count(*) from marked where category in ('completed','resolved')),'cancelled',(select count(*) from marked where category='cancelled')),
 'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'label',label) order by label,user_id) from people),'[]'::jsonb)) into result;
 if professional is not null and team and not private.care_is_director(professional) and not exists(select 1 from public.care_assignments ca where ca.professional_id=professional and private.care_scope(ca.patient_id,'care.patient.read') and ca.starts_at<=now() and (ca.ends_at is null or ca.ends_at>now())) then raise exception 'Profesional no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action) values(auth.uid(),'care.supervision.read');return result;
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
    if exists(select 1 from public.admin_users where user_id=uid and role::text in ('superadmin','psychologist','psychiatrist','recovery_coach')) then raise exception 'Los accesos se asignan automáticamente por el rol del usuario' using errcode='42501';end if;
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
commit;
