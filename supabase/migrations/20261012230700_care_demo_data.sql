-- User-requested, removable demonstration. Existing accounts and institutional settings are protected.
begin;
create table private.demo_batches(
 id uuid primary key default gen_random_uuid(),label text not null default 'Demostración del centro',
 state text not null default 'preparing' check(state in('preparing','active','failed','removing','removed')),
 created_by uuid references auth.users(id)on delete set null,created_at timestamptz not null default now(),removed_at timestamptz,
 patient_ids uuid[] not null default '{}',group_ids uuid[] not null default '{}',summary jsonb not null default '{}',
 files jsonb not null default '[]',analytics jsonb not null default '[]',user_fingerprints jsonb not null default '{}',staff_fingerprints jsonb not null default '{}'
);
create table private.demo_accounts(
 batch_id uuid not null references private.demo_batches(id),slot text not null,
 user_id uuid not null unique,email text not null,primary key(batch_id,slot),
 check(slot in('direction','psychology','psychiatry','recovery','editor','patient_a','patient_b','patient_c'))
);
create table private.demo_relations(relation regclass primary key);
insert into private.demo_relations
 select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and n.nspname in('public','private') and(
 c.relname like 'care_%' or c.relname in('admin_users','therapeutic_staff_permissions','patient_profiles','therapy_groups','therapy_group_memberships','therapy_areas',
 'patient_library_folders','patient_library_materials','patient_library_group_grants','patient_library_patient_grants','patient_library_attachments','patient_library_user_state','patient_library_audit',
 'content_posts','blog_categories','blog_post_categories','cms_pages','cms_page_sections','professionals','contact_submissions','contact_notes','admin_audit_log'))
 and c.relname<>'care_scheduler_state';
insert into private.demo_relations values('auth.users');
create table private.demo_objects(batch_id uuid not null references private.demo_batches(id),relation regclass not null references private.demo_relations(relation),row_key jsonb not null,primary key(batch_id,relation,row_key));
create table private.demo_baseline(batch_id uuid not null references private.demo_batches(id),relation regclass not null references private.demo_relations(relation),row_key jsonb not null,primary key(batch_id,relation,row_key));
create index demo_batches_state on private.demo_batches(state,created_at desc);
create index demo_batches_creator on private.demo_batches(created_by);
do $$declare t text;begin foreach t in array array['demo_batches','demo_accounts','demo_relations','demo_objects','demo_baseline']loop execute format('alter table private.%I enable row level security',t);execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);end loop;end$$;

create function private.demo_key_expr(rel regclass,alias text)returns text language sql stable set search_path='' as $$
 select 'jsonb_build_object('||string_agg(format('%L,%I.%I',a.attname,alias,a.attname),','order by k.n)||')'
 from pg_index i cross join lateral unnest(i.indkey)with ordinality k(att,n) join pg_attribute a on a.attrelid=rel and a.attnum=k.att
 where i.indrelid=rel and i.indisprimary
$$;
create function private.demo_user_fingerprints(bid uuid)returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(id,hash),'{}')from(
 select u.id::text id,md5((to_jsonb(u)-array['last_sign_in_at','updated_at','confirmation_sent_at','recovery_sent_at','reauthentication_sent_at'])::text)hash
 from auth.users u where not exists(select 1 from private.demo_accounts a where a.batch_id=bid and a.user_id=u.id)
 )s
$$;
create function private.demo_staff_fingerprints(bid uuid)returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(a.user_id::text,md5(to_jsonb(a)::text)),'{}')from public.admin_users a where not exists(select 1 from private.demo_accounts d where d.batch_id=bid and d.user_id=a.user_id)
$$;
create function private.demo_key_match(rel regclass,alias text,param text)returns text language sql stable set search_path='' as $$
 select string_agg(format('%I.%I=(%s->>%L)::%s',alias,a.attname,param,a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod)),' and 'order by k.n)
 from pg_index i cross join lateral unnest(i.indkey)with ordinality k(att,n)join pg_attribute a on a.attrelid=rel and a.attnum=k.att where i.indrelid=rel and i.indisprimary
$$;
create function private.demo_begin(actor uuid)returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid;r record;expr text;
begin
 if not private.care_is_director(actor)then raise exception 'Solo Dirección administra la demostración'using errcode='42501';end if;
 perform pg_advisory_xact_lock(818710121);
 select id into bid from private.demo_batches where created_by=actor and state in('preparing','active','failed')order by created_at desc limit 1;
 if bid is not null then return bid;end if;
 insert into private.demo_batches(created_by)values(actor)returning id into bid;
 update private.demo_batches set user_fingerprints=private.demo_user_fingerprints(bid),staff_fingerprints=private.demo_staff_fingerprints(bid)where id=bid;
 for r in select relation from private.demo_relations loop
  expr:=private.demo_key_expr(r.relation,'x');if expr is null then raise exception 'Relation without a primary key';end if;
  execute format('insert into private.demo_baseline select $1,%L::regclass,%s from %s x',r.relation::text,expr,r.relation)using bid;
 end loop;
 return bid;
end$$;
create function private.demo_register_account(bid uuid,slot_name text,uid uuid)returns void language plpgsql security definer set search_path='' as $$
declare em text;
begin
 if not exists(select 1 from private.demo_batches where id=bid and state='preparing')then raise exception 'Demo no disponible';end if;
 select email into em from auth.users where id=uid and raw_app_meta_data->>'castelao_demo_batch'=bid::text and email like 'demo-%@example.invalid';
 if em is null or exists(select 1 from private.demo_baseline where batch_id=bid and relation='auth.users'::regclass and row_key=jsonb_build_object('id',uid))then raise exception 'Cuenta ajena a la demostración';end if;
 insert into private.demo_accounts values(bid,slot_name,uid,em)on conflict(batch_id,slot)do nothing;
 if not exists(select 1 from private.demo_accounts where batch_id=bid and slot=slot_name and user_id=uid)then raise exception 'Slot de demostración ocupado';end if;
 insert into private.demo_objects values(bid,'auth.users',jsonb_build_object('id',uid))on conflict do nothing;
end$$;

-- Follow FK descendants only; never traverse upwards into existing patients, staff or catalogues.
create function private.demo_collect(bid uuid)returns void language plpgsql security definer set search_path='' as $$
declare fk record;join_expr text;expr text;added integer;foreign_patient boolean;total integer;turn integer:=0;demo_patients uuid[];
begin
 select patient_ids into demo_patients from private.demo_batches where id=bid;
 -- Recover identities created just before a network interruption in create/register.
 insert into private.demo_accounts(batch_id,slot,user_id,email)
 select bid,s.slot,u.id,u.email from auth.users u cross join unnest(array['direction','psychology','psychiatry','recovery','editor','patient_a','patient_b','patient_c'])s(slot)
 where u.raw_app_meta_data->>'castelao_demo_batch'=bid::text and u.email='demo-'||bid::text||'-'||s.slot||'@example.invalid'
 and not exists(select 1 from private.demo_baseline p where p.batch_id=bid and p.relation='auth.users'::regclass and p.row_key=jsonb_build_object('id',u.id))on conflict do nothing;
 insert into private.demo_objects select bid,'auth.users'::regclass,jsonb_build_object('id',user_id)from private.demo_accounts where batch_id=bid on conflict do nothing;
 loop
  total:=0;turn:=turn+1;if turn>40 then raise exception 'Dependencias de demo fuera de límite';end if;
  for fk in select c.* from pg_constraint c join private.demo_relations d on d.relation=c.conrelid
   where c.contype='f' and c.confrelid in(select distinct relation from private.demo_objects where batch_id=bid)and c.conrelid<>'auth.users'::regclass loop
   select string_agg(format('child.%I=parent.%I',ca.attname,pa.attname),' and 'order by k.n)into join_expr
   from unnest(fk.conkey,fk.confkey)with ordinality k(ca,pa,n)
   join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=k.ca join pg_attribute pa on pa.attrelid=fk.confrelid and pa.attnum=k.pa;
   expr:=private.demo_key_expr(fk.conrelid,'child');
   execute format('insert into private.demo_objects select distinct $1,%L::regclass,%s from %s child join %s parent on %s join private.demo_objects owned on owned.batch_id=$1 and owned.relation=%L::regclass and %s on conflict do nothing',fk.conrelid::regclass::text,expr,fk.conrelid::regclass,fk.confrelid::regclass,join_expr,fk.confrelid::regclass::text,private.demo_key_match(fk.confrelid,'parent','owned.row_key'))using bid;
   get diagnostics added=row_count;total:=total+added;
  end loop;
  exit when total=0;
  if(select count(*)from private.demo_objects where batch_id=bid)>10000 then raise exception 'Demostración fuera del límite de limpieza';end if;
 end loop;
 if exists(select 1 from private.demo_objects o join private.demo_baseline p using(batch_id,relation,row_key)where o.batch_id=bid)then raise exception 'Hay vínculos con datos existentes. Retira esos vínculos antes de eliminar la demo.';end if;
 -- A real patient linked to a demo event/group must never be swept into removal.
 for fk in select distinct relation from private.demo_objects where batch_id=bid and relation<>'auth.users'::regclass loop
  if exists(select 1 from pg_attribute where attrelid=fk.relation and attname='patient_id'and not attisdropped)then
   execute format('select exists(select 1 from %s x join private.demo_objects o on o.batch_id=$1 and o.relation=%L::regclass and to_jsonb(x)@>o.row_key where x.patient_id is not null and not(x.patient_id=any($2)))',fk.relation,fk.relation::text)into foreign_patient using bid,demo_patients;
   if foreign_patient then raise exception 'Hay un paciente real vinculado a la demo. Retira el vínculo antes de eliminar.';end if;
  end if;
 end loop;
 if exists(select 1 from public.patient_profiles p join private.demo_objects o on o.batch_id=bid and o.relation='public.patient_profiles'::regclass and o.row_key=jsonb_build_object('id',p.id)where not(p.id=any(demo_patients)))then raise exception 'Hay un perfil externo vinculado a la demo';end if;
end$$;

create function private.demo_seed(bid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.demo_batches;u jsonb;dir uuid;psy uuid;pqt uuid;coach uuid;editor uuid;patients uuid[];groups uuid[];phase uuid;area uuid;folder uuid;
 pid uuid;ep uuid;evt uuid;rid uuid;rv uuid;review uuid;ob uuid;rule uuid;commitment uuid;decision uuid;weekid uuid;
 token text;name text;specialty text;professional uuid;stamp timestamptz;day date;monday date;payload jsonb;dims jsonb;i integer;w integer;j integer;is_present boolean;
 material_ids uuid[]:='{}';record_ids uuid[]:='{}';rubric uuid;old_actor text;report_id uuid;weekly_report uuid;job uuid;source_record uuid;field_names text[];
begin
 perform pg_advisory_xact_lock(818710121);select * into b from private.demo_batches where id=bid for update;
 if not found or b.state not in('preparing','active')then raise exception 'Demo no disponible';end if;
 if cardinality(b.patient_ids)>0 then return b.summary;end if;
 if(select count(*)from private.demo_accounts where batch_id=bid)<>8 then raise exception 'Faltan las ocho identidades nuevas de demo';end if;
 select jsonb_object_agg(slot,user_id)into u from private.demo_accounts where batch_id=bid;
 dir:=(u->>'direction')::uuid;psy:=(u->>'psychology')::uuid;pqt:=(u->>'psychiatry')::uuid;coach:=(u->>'recovery')::uuid;editor:=(u->>'editor')::uuid;
 token:=left(bid::text,8);day:=(now()at time zone 'America/Santiago')::date;monday:=day-(extract(isodow from day)::int-1);
 old_actor:=current_setting('request.jwt.claim.sub',true);perform set_config('request.jwt.claim.sub',dir::text,true);
 insert into public.admin_users(user_id,role,is_active)values(dir,'superadmin',true),(psy,'psychologist',true),(pqt,'psychiatrist',true),(coach,'recovery_coach',true),(editor,'editor',true);
 patients:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];groups:=array[gen_random_uuid(),gen_random_uuid()];phase:=gen_random_uuid();area:=gen_random_uuid();folder:=gen_random_uuid();
 update private.demo_batches set patient_ids=patients,group_ids=groups where id=bid;
 for i in 1..3 loop
  pid:=patients[i];name:=(array['DEMO · Alba Ríos','DEMO · Bruno Torres','DEMO · Carla Vidal'])[i];
  insert into public.patient_profiles(id,auth_user_id,email,display_name)values(pid,(u->>('patient_'||(array['a','b','c'])[i]))::uuid,(select email from private.demo_accounts where batch_id=bid and slot='patient_'||(array['a','b','c'])[i]),name);
  insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)values(pid,psy,'psychology',now()-interval '45 days',dir),(pid,pqt,'psychiatry',now()-interval '45 days',dir),(pid,coach,'recovery',now()-interval '45 days',dir);
 end loop;
 insert into public.care_phases(id,label)values(phase,'DEMO · Fase de acompañamiento');
 insert into public.therapy_areas(id,name,sort_order)values(area,'DEMO · Recursos de muestra',99);
 insert into public.therapy_groups(id,name,description)values(groups[1],'DEMO · Grupo de inicio','Grupo ficticio para recorrer el panel'),(groups[2],'DEMO · Grupo de continuidad','Solo pacientes de demostración');
 insert into public.therapy_group_memberships(group_id,patient_id)values(groups[1],patients[1]),(groups[1],patients[2]),(groups[2],patients[2]),(groups[2],patients[3]);
 insert into public.patient_library_folders(id,area_id,name)values(folder,area,'DEMO · Material para el recorrido');
 insert into private.demo_objects values(bid,'public.care_phases',jsonb_build_object('id',phase)),(bid,'public.therapy_areas',jsonb_build_object('id',area)),(bid,'public.therapy_groups',jsonb_build_object('id',groups[1])),(bid,'public.therapy_groups',jsonb_build_object('id',groups[2])),(bid,'public.patient_library_folders',jsonb_build_object('id',folder));
 for i in 1..3 loop
  ep:=gen_random_uuid();insert into public.care_episodes(id,patient_id,started_at,status,phase_id,created_by)values(ep,patients[i],now()-interval '42 days',case when i=3 then 'paused'else 'active'end,phase,dir);
  insert into public.care_episode_history(episode_id,status,phase_id,effective_at,reason,actor_id,version)values(ep,case when i=3 then 'paused'else 'active'end,phase,now()-interval '42 days','DEMO · Ingreso ficticio para mostrar la trayectoria',dir,1);
  insert into public.care_patient_goals(patient_id,objectives,updated_by)values(patients[i],'DEMO · Organizar una semana de práctica, participar en actividades de ejemplo y revisar acuerdos.',dir);
  insert into public.care_goal_history(patient_id,version,objectives,actor_id)values(patients[i],1,'DEMO · Objetivos ficticios de acompañamiento',dir);
  insert into public.care_personal_plans(patient_id,title,planned_for,created_by)values(patients[i],'DEMO · Preparar la planificación semanal',(day+1+time '10:00')at time zone 'America/Santiago',(u->>('patient_'||(array['a','b','c'])[i]))::uuid);
  for w in 1..4 loop
   for j in 1..3 loop
    specialty:=(array['psychology','psychiatry','recovery'])[j];professional:=(array[psy,pqt,coach])[j];stamp:=(monday-w*7+j+time '10:00')at time zone 'America/Santiago';evt:=gen_random_uuid();rid:=gen_random_uuid();rv:=gen_random_uuid();is_present:=mod(i+w+j,7)<>0;
    insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)values(evt,'DEMO · '||case j when 1 then 'Sesión psicológica'when 2 then 'Consulta psiquiátrica'else 'Actividad Recovery'end,case j when 1 then 'individual'when 2 then 'psychiatry'else 'recovery'end,stamp,stamp+interval '45 minutes',professional,'in_person','completed',stamp+interval '45 minutes',professional);
    insert into public.care_event_participants(event_id,patient_id,attendance,observed_by,recorded_at)values(evt,patients[i],case when is_present then 'present'else 'absent'end,professional,stamp+interval '45 minutes');
    if is_present then
     payload:=jsonb_build_object('objective','DEMO · Mostrar un registro estructurado','facts','DEMO · Participación ficticia en una tarea de práctica','evolution','not_evaluable','progress','DEMO · Tarea de ejemplo realizada','difficulties','DEMO · Se requirió recordar una instrucción','support','occasional','support_details','DEMO · Apoyo ocasional de muestra','evidence_source','observed','evidence','DEMO · Observación ficticia, sin valor clínico','no_commitment_reason','DEMO · Sin nuevo acuerdo en esta muestra','activity_type','individual','recovery_participation','full','participation_reason','');
     field_names:=array['objective','evolution','facts','account','interpretation','difficulties','participation','commitment_note','next_action']||case j when 1 then array['motivation','progress','recommendations'] when 2 then array['control','adherence_reported','adherence_observed','medical_indications','medical_changes','next_visit','shareable_alert'] else array['punctuality_observation','responsibilities','autonomy','organisation','initiative','behaviour','activity_type','recovery_participation','participation_reason','support','support_details','progress','evidence','evidence_source','no_commitment_reason','recovery_commitment_id','commitment_title','commitment_due_at','commitment_review_at','commitment_method','commitment_responsible'] end;
     select jsonb_object_agg(f,coalesce(payload->>f,''))into payload from unnest(field_names)f;
     if j=3 and w=1 then
      insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at)values(rid,patients[i],evt,professional,specialty,stamp);
      insert into private.care_record_drafts(record_id,payload,summary_visibility,request_intervention)values(rid,payload,'none',false);
     else
      insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at,status,revision,first_finalized_at)values(rid,patients[i],evt,professional,specialty,stamp,'final',1,stamp+interval '1 hour');
      insert into private.care_record_versions(id,record_id,revision,occurred_at,payload,reason,actor_id)values(rv,rid,1,stamp,payload,'DEMO · Registro ficticio para presentación',professional);
      insert into public.care_record_summaries(record_id,revision,visibility,body)values(rid,1,'patient','DEMO · Resumen compartido ficticio para mostrar la lectura del paciente');
      record_ids:=array_append(record_ids,rid);
     end if;
    end if;
   end loop;
  end loop;
  evt:=gen_random_uuid();insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,created_by)values(evt,'DEMO · Próxima actividad Recovery','recovery',(day+1+time '11:00')at time zone 'America/Santiago',(day+1+time '11:45')at time zone 'America/Santiago',coach,'in_person','scheduled',coach);
  insert into public.care_event_participants(event_id,patient_id)values(evt,patients[i]);
  commitment:=gen_random_uuid();insert into public.care_commitments(id,patient_id,title,responsible_kind,visibility,due_at,origin,status,created_by)values(commitment,patients[i],'DEMO · Revisar la planificación de práctica','patient','patient',now()+interval '2 days','professional','pending',coach);
  review:=gen_random_uuid();insert into public.care_followup_reviews(id,patient_id,color,occurred_at,review_at,actor_id)values(review,patients[i],(array['green','yellow','red'])[i],now()-interval '2 hours',now()+interval '7 days',dir);
  insert into private.care_followup_notes(review_id,reason,record_id,record_revision)values(review,'DEMO · Valoración manual ficticia para mostrar la coordinación, no un resultado clínico',record_ids[cardinality(record_ids)],1);
 end loop;
 -- A future-only rule is never selected as the effective institutional rule for real patients.
 rule:=gen_random_uuid();insert into public.care_report_rules(id,kind,effective_on,opens_local,closes_local,close_next_day,basis,weekdays,fields,required_fields,approved_by,reason)
 values(rule,'morning','9999-12-31','08:00','12:00',false,'active_days',array[1,2,3,4,5,6,7],array['state','planning'],array['state'],dir,'DEMO · Regla no vigente; solo sustenta instantáneas ficticias');
 for i in 1..3 loop
  for w in 1..14 loop
   stamp:=(day-w+time '08:00')at time zone 'America/Santiago';ob:=gen_random_uuid();
   insert into public.care_report_obligations(id,patient_id,local_day,kind,rule_id,opens_at,closes_at,fields,required_fields,required,requirement_reason,generated_at,closed_at)values(ob,patients[i],day-w,'morning',rule,stamp,stamp+interval '4 hours',array['state','planning'],array['state'],true,'DEMO · Obligación ficticia',stamp+interval '5 minutes',stamp+interval '4 hours');
   if mod(i+w,5)<>0 then
    payload:=jsonb_build_object('state','DEMO · Autorreporte ficticio','planning','DEMO · Actividad de práctica y revisión de acuerdos');
    insert into public.care_daily_reports(id,patient_id,author_id,answers,first_submitted_at)values(ob,patients[i],(u->>('patient_'||(array['a','b','c'])[i]))::uuid,payload,stamp+interval '1 hour');
    insert into public.care_report_revisions(report_id,submission_key,answers,reason,actor_id,recorded_at,version)values(ob,gen_random_uuid(),payload,'DEMO · Envío de ejemplo',(u->>('patient_'||(array['a','b','c'])[i]))::uuid,stamp+interval '1 hour',1);
   elsif w<=4 then
    insert into public.care_alerts(patient_id,kind,source_id,triggered_at,updated_by)values(patients[i],'report_omitted',ob,stamp+interval '5 hours',dir);
   end if;
  end loop;
 end loop;
 select id into rubric from public.care_recovery_rubrics where document_code='ICC-REC-AUT-001'and governance_state='proposal'order by created_at limit 1;
 if rubric is not null then
  for i in 1..3 loop for w in 1..4 loop
   select r.id into source_record from public.care_session_records r where r.patient_id=patients[i]and r.specialty='recovery'and r.status='final'and(r.occurred_at at time zone 'America/Santiago')::date between monday-w*7 and monday-w*7+6 limit 1;
   commitment:=null;
   if source_record is not null then
    commitment:=gen_random_uuid();insert into public.care_commitments(id,patient_id,title,responsible_kind,visibility,due_at,origin,status,created_by,source_record_id,review_at,verification_method)values(commitment,patients[i],'DEMO · Revisar práctica de organización','patient','coordination',now()+interval '2 days','professional','pending',coach,source_record,now()+interval '7 days','DEMO · Revisar registro de práctica');
   end if;
   weekid:=gen_random_uuid();select jsonb_agg(jsonb_build_object('key',d->>'key','status',case when source_record is null then 'SE'else 'qualitative'end,'level',null,'evidence','DEMO · Evidencia ficticia de práctica semanal','evidence_sufficient',false,'support','DEMO · Apoyo ocasional','result','DEMO · Tarea de muestra completada','difficulties','DEMO · Recordatorio de una instrucción','se_reason',case when source_record is null then 'DEMO · Sin registro final en esta semana de muestra'else ''end,'record_ids',case when source_record is null then '[]'::jsonb else jsonb_build_array(source_record)end,'commitment_ids','[]'::jsonb,'next_commitment_id',commitment))into dims from public.care_recovery_rubrics r cross join lateral jsonb_array_elements(r.dimensions)d where r.id=rubric;
   perform set_config('request.jwt.claim.sub',coach::text,true);
   perform public.care_rc_week_write('finalize',jsonb_build_object('id',weekid,'patient_id',patients[i],'rubric_id',rubric,'week_start',monday-w*7,'version',0,'confirm',true,'reason','DEMO · Muestra cualitativa; sin puntajes ni aprobación','evaluated_at',now()-interval '1 hour','occurred_at',(monday-w*7+6+time '12:00')at time zone 'America/Santiago','payload',jsonb_build_object('dimensions',dims)));
   perform set_config('request.jwt.claim.sub',dir::text,true);
  end loop;end loop;
 end if;
 for i in 1..3 loop
  select r.id into source_record from public.care_session_records r where r.patient_id=patients[i]and r.specialty='recovery'and r.status='final'order by r.occurred_at desc limit 1;
  perform set_config('request.jwt.claim.sub',coach::text,true);
  perform public.care_recovery_write('autonomy_final',jsonb_build_object('id',gen_random_uuid(),'record_id',source_record,'dimension','organisation','version',0,'occurred_at',now()-interval '1 day','confirm_final',true,'payload',jsonb_build_object('status','not_evaluable','level','','evidence','DEMO · Observación cualitativa ficticia sin nivel aprobado')));
  perform set_config('request.jwt.claim.sub',dir::text,true);
  evt:=gen_random_uuid();stamp:=now()-interval '2 days';
  insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)values(evt,'DEMO · Actividad familiar','family',stamp,stamp+interval '45 minutes',dir,'in_person','completed',stamp+interval '45 minutes',dir);
  insert into public.care_event_participants(event_id,patient_id,attendance,observed_by,recorded_at)values(evt,patients[i],'present',dir,stamp+interval '45 minutes');
  perform public.care_recovery_write('family_final',jsonb_build_object('id',gen_random_uuid(),'patient_id',patients[i],'event_id',evt,'version',0,'occurred_at',stamp,'confirm_final',true,'payload',jsonb_build_object('objective','DEMO · Mostrar coordinación familiar','source','observed','participants',jsonb_build_array(jsonb_build_object('label','DEMO · Referente','relationship','Familiar de muestra')),'communication','DEMO · Conversación ficticia','limits','','responsibilities','DEMO · Acuerdo de práctica','support','DEMO · Apoyo ficticio','progress','','observations','DEMO · Sin datos de familias reales')));
  insert into private.care_operational_rules(patient_id,kind,enabled,grace_hours,approved_by,reason)values(patients[i],'commitment_overdue',false,24,dir,'DEMO · Regla desactivada para recorrido');
 end loop;
 insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)values(patients[1],dir,'recovery',now()-interval '45 days',dir);
 decision:=gen_random_uuid();perform public.care_decision_write('decision_final',jsonb_build_object('id',decision,'patient_id',patients[1],'version',0,'situation','DEMO · Coordinación ficticia','evaluation','DEMO · Revisión de actividades de muestra','decision','DEMO · Acordar una revisión de práctica','responsible_id',dir,'planned_at',now()+interval '1 day','review_at',now()+interval '7 days','confirm_final',true));
 perform public.care_task_write('task_save',jsonb_build_object('id',gen_random_uuid(),'decision_id',decision,'version',0,'assignee_id',coach,'instruction','DEMO · Preparar una revisión de la planificación','due_at',now()+interval '2 days'));
 for i in 1..3 loop
  rid:=gen_random_uuid();material_ids:=array_append(material_ids,rid);
  insert into public.patient_library_materials(id,area_id,folder_id,title,description,kind,body,tags,audience,status,author_id)values(rid,area,folder,(array['DEMO · Guía para el recorrido','DEMO · Planificación semanal','DEMO · Ejercicio de organización'])[i],'Recurso ficticio para mostrar Biblioteca; no usar como instrucción terapéutica','guide','<p>DEMO · Este material permite recorrer la aplicación sin datos de personas reales.</p><p>Practica la búsqueda, abre la lectura y revisa los destinatarios.</p>',array['demo','presentación'],'groups','published',dir);
  insert into public.patient_library_group_grants(material_id,group_id)values(rid,groups[1]);
 end loop;
 for i in 1..3 loop
  insert into public.content_posts(kind,slug,title,summary,body,content_html,content_text,status,author_id,author_name)values(case when i=3 then 'news'::public.content_kind else 'blog'::public.content_kind end,'demo-'||token||'-contenido-'||i,'DEMO · '||(array['Conoce el acompañamiento','Organizar una semana de práctica','Novedad del centro de ejemplo'])[i],'Borrador ficticio para presentar el editor institucional. No debe publicarse como información real.','DEMO · Contenido editorial de muestra','<p>DEMO · Borrador preparado exclusivamente para recorrer el editor.</p>','DEMO · Borrador preparado exclusivamente para recorrer el editor.','draft',editor,'DEMO · Equipo editorial');
  insert into public.professionals(slug,full_name,role,short_bio,bio,status,updated_by)values('demo-'||token||'-profesional-'||i,'DEMO · '||(array['Ana Ejemplo','Pablo Ejemplo','Clara Ejemplo'])[i],(array['Psicóloga de muestra','Psiquiatra de muestra','Coach Recovery de muestra'])[i],'Perfil ficticio para presentar el módulo del equipo.','<p>DEMO · Perfil no publicado y sin datos de una persona real.</p>','draft',editor);
  insert into public.contact_submissions(name,email,message,status,source_path,idempotency_key,assigned_to)values('DEMO · Consulta '||i,'demo-consulta-'||token||'-'||i||'@example.invalid','DEMO · Consulta ficticia para mostrar la bandeja. No enviar comunicaciones.',case i when 1 then 'new'::public.contact_submission_status when 2 then 'in_progress'::public.contact_submission_status else 'closed'::public.contact_submission_status end,'/demo-cliente',gen_random_uuid(),editor);
 end loop;
 rid:=gen_random_uuid();insert into public.cms_pages(id,slug,path,title,nav_label,status,updated_by)values(rid,'demo-'||token,'/demo-'||token,'DEMO · Página institucional','DEMO · Página','draft',editor);
 insert into public.cms_page_sections(page_id,section_type,data)values(rid,'rich_text',jsonb_build_object('title','DEMO · Página de muestra','html','<p>Borrador de demostración: no se publica en el sitio.</p>'));
 weekly_report:=public.care_inform_write('generate',jsonb_build_object('kind','weekly','start_day',monday-7,'patient_id',patients[1]));
 report_id:=public.care_inform_write('generate',jsonb_build_object('kind','monthly','start_day',(date_trunc('month',day)::date-interval '1 month')::date,'patient_id',patients[1]));
 job:=gen_random_uuid();insert into private.care_jobs(id,owner_id,kind,patients,context_key,include_family,include_decisions,enabled,next_due_at,reason)values(job,dir,'weekly',patients,'demo-'||bid,false,false,false,now()+interval '100 years','DEMO · Programación desactivada para mostrar el módulo');
 insert into private.care_job_runs(job_id,job_version,period_key,start_day,state,attempts,inform_id,finished_at)values(job,1,'demo-'||token,monday-7,'succeeded',1,weekly_report,now());
 update public.patient_profiles set is_active=false where id=patients[3];
 perform private.demo_collect(bid);
 if not(b.user_fingerprints <@ private.demo_user_fingerprints(bid))or not(b.staff_fingerprints <@ private.demo_staff_fingerprints(bid))then raise exception 'Las cuentas existentes deben permanecer intactas';end if;
 update private.demo_batches set summary=jsonb_build_object('patients',cardinality(patients),'staff',5,'groups',cardinality(groups),'materials',cardinality(material_ids),'sessions',(select count(*)from public.care_events where created_by=any(array[dir,psy,pqt,coach])),'weeks',(select count(*)from public.care_recovery_weeks where patient_id=any(patients)),'drafts',7,'coach_id',coach,'material_id',material_ids[1],'area_id',area,'recovery_week',monday-14,'weekly_report_id',weekly_report,'monthly_report_id',report_id),analytics=(select jsonb_agg(jsonb_build_object('date',day-n,'value',40+(n*7)%35,'visitors',15+(n*3)%16)order by n desc)from generate_series(0,6)n)where id=bid;
 perform set_config('request.jwt.claim.sub',coalesce(old_actor,''),true);
 return(select summary from private.demo_batches where id=bid);
end$$;

create function private.demo_file(bid uuid,mid uuid,file_bytes integer)returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.patient_library_attachments;
begin
 if not exists(select 1 from private.demo_batches where id=bid and state in('preparing','active'))or not exists(select 1 from public.patient_library_materials m join private.demo_accounts u on u.batch_id=bid and u.user_id=m.author_id where m.id=mid)then raise exception 'Material ajeno a demo';end if;
 select * into a from public.patient_library_attachments where material_id=mid and original_name='DEMO-guia.pdf'and state in('pending','ready')order by created_at limit 1;
 if a.id is null then insert into public.patient_library_attachments(material_id,original_name,mime,bytes)values(mid,'DEMO-guia.pdf','application/pdf',file_bytes)returning * into a;end if;
 return to_jsonb(a);
end$$;
create function private.demo_activate(bid uuid)returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.demo_batches where id=bid and cardinality(patient_ids)=3 and state in('preparing','active'))then raise exception 'Demo incompleta';end if;
 if not exists(select 1 from public.patient_library_attachments a join public.patient_library_materials m on m.id=a.material_id join private.demo_accounts u on u.user_id=m.author_id and u.batch_id=bid where a.state='ready')then raise exception 'Falta verificar el PDF demo';end if;
 perform private.demo_collect(bid);update private.demo_batches set state='active'where id=bid;
end$$;

create function private.demo_status()returns jsonb language plpgsql security definer set search_path='' as $$
declare answer jsonb;
begin
 if not private.care_is_director()then raise exception 'Solo Dirección administra la demostración'using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'state',b.state,'created_at',b.created_at,'summary',b.summary,'analytics',b.analytics,
 'patients',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name)order by p.display_name),'[]')from public.patient_profiles p where p.id=any(b.patient_ids)),
 'jobs',(select coalesce(jsonb_agg(jsonb_build_object('kind',j.kind,'enabled',j.enabled,'runs',(select count(*)from private.care_job_runs r where r.job_id=j.id))),'[]')from private.care_jobs j join private.demo_accounts a on a.user_id=j.owner_id and a.batch_id=b.id))order by b.created_at desc),'[]')into answer
 from private.demo_batches b where state<>'removed';return answer;
end$$;
create function private.demo_remove_data(bid uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.demo_batches;r record;removed integer;progress integer;leftover integer;turn integer:=0;targets jsonb;before_users jsonb;before_staff jsonb;
begin
 if not private.care_is_director()then raise exception 'Solo Dirección administra la demostración'using errcode='42501';end if;
 perform pg_advisory_xact_lock(818710121);select * into b from private.demo_batches where id=bid for update;
 if not found then raise exception 'Demo no disponible';end if;
 if b.state='removed'then return jsonb_build_object('state','removed','files','[]'::jsonb,'accounts','[]'::jsonb);end if;
 if b.state<>'removing'then
  before_users:=private.demo_user_fingerprints(bid);
  before_staff:=private.demo_staff_fingerprints(bid);
  perform private.demo_collect(bid);
  select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket,'key',key)),'[]')into targets from(
   select 'patient-library'::text bucket,a.object_key key from public.patient_library_attachments a join private.demo_objects o on o.batch_id=bid and o.relation='public.patient_library_attachments'::regclass and o.row_key=jsonb_build_object('id',a.id)
   union select 'care-informs',e.object_key from private.care_inform_exports e join private.demo_objects o on o.batch_id=bid and o.relation='private.care_inform_exports'::regclass and o.row_key=jsonb_build_object('id',e.id)
  )files;
  update private.demo_batches set files=targets,state='removing'where id=bid;
  loop
   progress:=0;turn:=turn+1;if turn>100 then raise exception 'No fue posible resolver las dependencias de demo';end if;
   for r in select relation,row_key from private.demo_objects where batch_id=bid and relation<>'auth.users'::regclass order by relation,row_key loop
    begin
     execute format('delete from %s x where %s',r.relation,private.demo_key_match(r.relation,'x','$1'))using r.row_key;
     delete from private.demo_objects where batch_id=bid and relation=r.relation and row_key=r.row_key;
     progress:=progress+1;
    exception when foreign_key_violation then null;end;
   end loop;
   select count(*)into leftover from private.demo_objects where batch_id=bid and relation<>'auth.users'::regclass;
   exit when leftover=0;if progress=0 then raise exception 'Hay relaciones fuera de la demo. No se eliminó ningún registro.';end if;
  end loop;
  -- Hash only protected identity fields; volatile sign-in metadata is excluded.
  if before_users is distinct from private.demo_user_fingerprints(bid)or before_staff is distinct from private.demo_staff_fingerprints(bid)then raise exception 'Las cuentas anteriores deben conservarse intactas';end if;
  insert into public.admin_audit_log(actor_id,action,resource_type,resource_id,metadata)values(auth.uid(),'demo.data_removed','demonstration',bid,jsonb_build_object('synthetic',true));
 end if;
 return jsonb_build_object('state','removing','files',(select files from private.demo_batches where id=bid),'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'email',email)),'[]')from private.demo_accounts where batch_id=bid));
end$$;

create function private.demo_service_state(bid uuid)returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('state',b.state,'summary',b.summary,'accounts',(select coalesce(jsonb_agg(jsonb_build_object('slot',a.slot,'id',a.user_id,'email',a.email)),'[]')from private.demo_accounts a where a.batch_id=bid))from private.demo_batches b where b.id=bid
$$;
create function public.demo_seed(bid uuid)returns jsonb language sql security invoker set search_path='' as $$select private.demo_seed(bid)$$;
create function public.demo_file(bid uuid,mid uuid,file_bytes integer)returns jsonb language sql security invoker set search_path='' as $$select private.demo_file(bid,mid,file_bytes)$$;
create function public.demo_activate(bid uuid)returns void language sql security invoker set search_path='' as $$select private.demo_activate(bid)$$;
create function public.demo_service_state(bid uuid)returns jsonb language sql security invoker set search_path='' as $$select private.demo_service_state(bid)$$;
create function private.demo_finish_removal(bid uuid)returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.care_is_director()then raise exception 'Solo Dirección administra la demostración'using errcode='42501';end if;
 if not exists(select 1 from private.demo_batches where id=bid and state='removing')then raise exception 'Demo no disponible';end if;
 if exists(select 1 from auth.users u join private.demo_accounts a on a.user_id=u.id where a.batch_id=bid)then raise exception 'Quedan cuentas de demostración por retirar';end if;
 if exists(select 1 from storage.objects s join private.demo_batches b on b.id=bid where exists(select 1 from jsonb_array_elements(b.files)f where f->>'bucket'=s.bucket_id and f->>'key'=s.name))then raise exception 'Quedan archivos de demostración por retirar';end if;
 delete from private.demo_objects where batch_id=bid;delete from private.demo_baseline where batch_id=bid;
 update private.demo_batches set state='removed',removed_at=now(),files='[]',analytics='[]',user_fingerprints='{}',staff_fingerprints='{}'where id=bid;
end$$;

create function public.demo_status()returns jsonb language sql security invoker set search_path='' as $$select private.demo_status()$$;
create function public.demo_remove_data(bid uuid)returns jsonb language sql security invoker set search_path='' as $$select private.demo_remove_data(bid)$$;
create function public.demo_finish_removal(bid uuid)returns void language sql security invoker set search_path='' as $$select private.demo_finish_removal(bid)$$;
create function public.demo_begin(actor uuid)returns uuid language sql security invoker set search_path='' as $$select private.demo_begin(actor)$$;
create function public.demo_register_account(bid uuid,slot_name text,uid uuid)returns void language sql security invoker set search_path='' as $$select private.demo_register_account(bid,slot_name,uid)$$;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private')and p.proname like 'demo_%'loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);end loop;end$$;
grant execute on function public.demo_status(),private.demo_status(),public.demo_remove_data(uuid),private.demo_remove_data(uuid),public.demo_finish_removal(uuid),private.demo_finish_removal(uuid)to authenticated;
grant execute on function public.demo_begin(uuid),private.demo_begin(uuid),public.demo_register_account(uuid,text,uuid),private.demo_register_account(uuid,text,uuid)to service_role;
grant execute on function public.demo_seed(uuid),private.demo_seed(uuid),public.demo_file(uuid,uuid,integer),private.demo_file(uuid,uuid,integer),public.demo_activate(uuid),private.demo_activate(uuid),public.demo_service_state(uuid),private.demo_service_state(uuid)to service_role;
commit;
